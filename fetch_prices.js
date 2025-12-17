
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config({ path: 'server/.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const productIds = [
    'prod_TcbheqwFkqmdDN', // Annual
    'prod_TcbhWVYOcC4A7l'  // Monthly
];

async function getPrices() {
    const fs = await import('fs');
    let output = "";
    try {
        const prices = await stripe.prices.list({
            active: true,
            limit: 100,
        });

        productIds.forEach(prodId => {
            const price = prices.data.find(p => p.product === prodId);
            if (price) {
                output += `Product ${prodId}: Price ID: ${price.id} (${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()})\n`;
            } else {
                output += `Product ${prodId}: No price found.\n`;
            }
        });
        fs.writeFileSync('server/prices.txt', output);

    } catch (e) {
        console.error("Error:", e.message);
    }
}

getPrices();
