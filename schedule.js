const cron = require('node-cron');
const { exec } = require('child_process');

console.log('🚀 Momence Member Cancellation Scheduler Started');
console.log('⏰ Running every 2 hours (free plan)...');

// Schedule to run every 2 hours (free alternative)
cron.schedule('0 */2 * * *', () => {
    const timestamp = new Date().toISOString();
    console.log(`\n⏰ [${timestamp}] Starting scheduled cancellation process...`);
    
    exec('node lc1.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Execution error: ${error.message}`);
            return;
        }
        
        if (stderr) {
            console.error(`⚠️ stderr: ${stderr}`);
        }
        
        console.log(stdout);
        console.log(`✅ [${new Date().toISOString()}] Scheduled run completed\n`);
    });
}, {
    scheduled: true,
    timezone: "Asia/Kolkata" // Mumbai, India timezone
});

// Keep the process running
console.log('📅 Schedule active. Press Ctrl+C to stop.');

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Scheduler stopping...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Scheduler terminating...');
    process.exit(0);
});