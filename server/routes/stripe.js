import express from 'express';
import Stripe from 'stripe';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../db.js';
import { decrypt } from '../utils/crypto.js';
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

        // Get existing customer ID and trial status
        const user = await new Promise((resolve) => {
            pool.get("SELECT stripe_customer_id, email_encrypted, has_used_trial, trial_until FROM users WHERE id = ?", [req.user.id], (err, row) => resolve(row));
        });

        let customerId = user?.stripe_customer_id;

        // If no ID, search by email to avoid duplicates
        if (!customerId && user?.email_encrypted) {
            try {
                const email = decrypt(user.email_encrypted);
                const customers = await stripe.customers.search({
                    query: `email:'${email}'`,
                });
                if (customers.data.length > 0) {
                    customerId = customers.data[0].id;
                    // Save it
                    pool.run("UPDATE users SET stripe_customer_id = ? WHERE id = ?", [customerId, req.user.id]);
                }
            } catch (e) {
                console.warn("Error searching Stripe customer:", e);
            }
        }

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
                planType: priceId === process.env.STRIPE_PRICE_MONTHLY ? 'monthly' : 'annual'
            },
        };

        if (customerId) {
            sessionConfig.customer = customerId;
        }

        if (mode === 'subscription') {
            // Check if user is eligible for trial
            // Legacy check: if they have a trial_until date in the past or future, they used a trial.
            // New check: has_used_trial flag.
            const hasUsedTrial = user?.has_used_trial === 1 || user?.trial_until !== null;

            if (!hasUsedTrial) {
                sessionConfig.subscription_data = {
                    trial_period_days: 14
                };
            }
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

router.post('/create-portal-session', authenticateToken, async (req, res) => {
    try {
        // Get user's stripe_customer_id from DB
        const user = await new Promise((resolve, reject) => {
            pool.get("SELECT stripe_customer_id, email_encrypted FROM users WHERE id = ?", [req.user.id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        let customerId = user?.stripe_customer_id;

        // If missing, search or create
        if (!customerId) {
            console.log(`User ${req.user.id} missing Stripe ID. Searching/Creating...`);
            try {
                const email = decrypt(user.email_encrypted);

                // 1. Search
                const search = await stripe.customers.search({ query: `email:'${email}'` });

                if (search.data.length > 0) {
                    customerId = search.data[0].id;
                    console.log(`Found existing customer ${customerId}. Updating DB.`);
                } else {
                    // 2. Create
                    const newCustomer = await stripe.customers.create({
                        email: email,
                        metadata: { userId: req.user.id }
                    });
                    customerId = newCustomer.id;
                    console.log(`Created new customer ${customerId}. Updating DB.`);
                }

                // Update DB
                await new Promise((resolve) => {
                    pool.run("UPDATE users SET stripe_customer_id = ? WHERE id = ?", [customerId, req.user.id], resolve);
                });

            } catch (err) {
                console.error("Error recovering Stripe Customer:", err);
                return res.status(500).json({ error: "Failed to recover Stripe Customer ID." });
            }
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/profile`,
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Stripe Portal Error:', error);
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
            const planType = session.metadata.planType || 'monthly';
            let trialUntil = null;
            const customerId = session.customer; // Get Stripe Customer ID

            // Fetch Subscription to get real trial end date if applicable
            if (session.subscription) {
                try {
                    const subscription = await stripe.subscriptions.retrieve(session.subscription);

                    if (subscription.status === 'trialing' && subscription.trial_end) {
                        trialUntil = new Date(subscription.trial_end * 1000).toISOString();
                    }
                } catch (subErr) {
                    console.error("Error retrieving subscription:", subErr);
                }
            } else {
                // First fallback (legacy logic for 14 days)
                if (session.payment_status === 'no_payment_required') {
                    const date = new Date();
                    date.setDate(date.getDate() + 14);
                    trialUntil = date.toISOString();
                }
            }

            console.log(`Updating DB for user ${req.user.id}: Plan=${planType}, CustomerID=${customerId}`);

            await new Promise((resolve, reject) => {
                pool.run(
                    `UPDATE users SET is_premium = 1, subscription_plan = ?, trial_until = ?, stripe_customer_id = ?, has_used_trial = 1 WHERE id = ?`,
                    [planType, trialUntil, customerId, req.user.id],
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
