const functions = require('@google-cloud/functions-framework');
const { exec } = require('child_process');
const path = require('path');

// HTTP Cloud Function that calls your existing lc1.js
functions.http('cancelMemberBookings', async (req, res) => {
    try {
        console.log('🚀 Starting Momence member cancellation process via Google Cloud...');
        
        // Path to your existing script
        const scriptPath = path.join(__dirname, '..', 'lc1.js');
        
        // Execute your existing lc1.js script
        const result = await new Promise((resolve, reject) => {
            exec(`node ${scriptPath}`, {
                cwd: path.join(__dirname, '..'),
                env: {
                    ...process.env,
                    // Environment variables will be set in Cloud Function config
                    MOMENCE_ACCESS_TOKEN: process.env.MOMENCE_ACCESS_TOKEN,
                    MOMENCE_ALL_COOKIES: process.env.MOMENCE_ALL_COOKIES,
                    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
                    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
                    GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
                    GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
                    GITHUB_ACTIONS: 'false'  // Set to false for GCP
                }
            }, (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Script execution error:', error);
                    reject(error);
                    return;
                }
                
                if (stderr) {
                    console.error('⚠️ Script stderr:', stderr);
                }
                
                console.log('✅ Script output:', stdout);
                resolve({ stdout, stderr });
            });
        });
        
        res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            message: 'Member cancellation completed successfully via Google Cloud',
            platform: 'Google Cloud Functions',
            output: result.stdout
        });
        
    } catch (error) {
        console.error('❌ Cloud Function error:', error);
        res.status(500).json({
            success: false,
            timestamp: new Date().toISOString(),
            platform: 'Google Cloud Functions',
            error: error.message,
            stack: error.stack
        });
    }
});

// For local testing
if (require.main === module) {
    const express = require('express');
    const app = express();
    
    app.use(functions.getFunction('cancelMemberBookings'));
    
    const port = process.env.PORT || 8080;
    app.listen(port, () => {
        console.log(`🌟 Local test server running on port ${port}`);
        console.log(`Test URL: http://localhost:${port}/cancelMemberBookings`);
    });
}