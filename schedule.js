const cron = require('node-cron');
const { exec } = require('child_process');

console.log('🚀 Momence Member Cancellation Scheduler Started');
console.log('⏰ Running every 15 minutes...');

// Schedule to run every 15 minutes
cron.schedule('*/15 * * * *', () => {
    const timestamp = new Date().toISOString();
    console.log(`\n⏰ [${timestamp}] Starting scheduled cancellation process...`);
    
    exec('node lc-7.js', (error, stdout, stderr) => {
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
    timezone: "America/New_York" // Change to your timezone
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