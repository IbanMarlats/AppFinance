import express from 'express';
import Stripe from 'stripe';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../db.js';
import dotenv from 'dotenv';

dotenv.config({ path: 'server/.env' });

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post('/create-checkout-session', authenticateToken, async (req, res) => {
    try {
        const { priceId, mode } = req.body; // mode: 'subscription' or 'payment'

        if (!priceId) {
            return res.status(400).json({ error: 'Price ID is required' });
        }

        // Optional: Create or retrieve Stripe Customer ID for this user
        // For now, we rely on client_reference_id to link back

        const sessionConfig = {
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: mode || 'subscription',
            success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/cancel`,
            client_reference_id: req.user.id,
            metadata: {
                userId: req.user.id,
                planType: priceId === process.env.STRIPE_PRICE_MONTHLY ? 'monthly' : 'annual' // 'annual' or 'lifetime' not handled perfectly by this simplistic logic, but 'lifetime' is payment mode so not affected by 'subscription_data' below.
                // Correction: The logic above for planType fallback was a bit simplified.
                // Let's rely on what we send.
                // But wait, the previous code had logic: priceId === process.env.STRIPE_PRICE_MONTHLY ? 'monthly' : 'lifetime'
                // Now we might have 'annual' too. 
                // Let's use the 'mode' to distinguish.
            },
        };

        if (mode === 'subscription') {
            sessionConfig.subscription_data = {
                trial_period_days: 14
            };
            // Ensure metadata is correct
            sessionConfig.metadata.planType = priceId === process.env.STRIPE_PRICE_MONTHLY ? 'monthly' : 'annual';
        } else {
            sessionConfig.metadata.planType = 'lifetime';
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

        res.json({ url: session.url });
    } catch (error) {
        console.error('Stripe Checkout Error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/verify-session', authenticateToken, async (req, res) => {
    try {
        const { session_id } = req.query;
        if (!session_id) return res.status(400).json({ error: 'Session ID required' });

        const session = await stripe.checkout.sessions.retrieve(session_id);

        // Accept 'paid' (immediate) or 'no_payment_required' (trial/zero amt)
        if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') {
            console.log("Stripe verify: payment_status is", session.payment_status);

            const planType = session.metadata.planType || 'monthly';
            let trialUntil = null;

            // Fetch Subscription to get real trial end date if applicable
            if (session.subscription) {
                try {
                    const subscription = await stripe.subscriptions.retrieve(session.subscription);
                    console.log("Stripe Subscription Status:", subscription.status);

                    if (subscription.status === 'trialing' && subscription.trial_end) {
                        trialUntil = new Date(subscription.trial_end * 1000).toISOString();
                        console.log("Trial detected! Ends at:", trialUntil);
                    }
                } catch (subErr) {
                    console.error("Error retrieving subscription:", subErr);
                }
            } else {
                // First fallback (legacy logic)
                if (session.payment_status === 'no_payment_required') {
                    const date = new Date();
                    date.setDate(date.getDate() + 14);
                    trialUntil = date.toISOString();
                    console.log("Fallback Trial logic applied (14 days)");
                }
            }

            console.log(`Updating DB for user ${req.user.id}: Plan=${planType}, TrialUntil=${trialUntil}`);

            await new Promise((resolve, reject) => {
                pool.run(
                    `UPDATE users SET is_premium = 1, subscription_plan = ?, trial_until = ? WHERE id = ?`,
                    [planType, trialUntil, req.user.id],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });

            res.json({ success: true, plan: planType });
        } else {
            console.warn("Stripe verify failed: payment_status =", session.payment_status);
            res.json({ success: false, status: session.payment_status });
        }

    } catch (error) {
        console.error('Verify Session Error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
