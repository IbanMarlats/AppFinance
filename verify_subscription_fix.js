import { checkSubscriptions } from './server/cron/checkSubscriptions.js';

console.log('🧪 Starting manual subscription check verification...');
checkSubscriptions().then(() => {
    console.log('🏁 Verification run complete. Check logs above for any "Downgrading" messages.');
    process.exit(0);
}).catch(err => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
});
