require('dotenv').config();
const axios = require('axios');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { OAuth2Client } = require('google-auth-library');

// --- Hardcoded Configuration ---
const ACCESS_TOKEN = process.env.MOMENCE_ACCESS_TOKEN;
const ALL_COOKIES = process.env.MOMENCE_ALL_COOKIES;
const HOST_ID = 13752;
const MEMBERS_API_URL = `https://api.momence.com/host/${HOST_ID}/customers?filters=%7B%22type%22:%22and%22,%22customerTags%22:%7B%22type%22:null,%22tags%22:[166700,164561],%22customerHaveTag%22:%22have%22%7D%7D&query=&page=0&pageSize=200`;
const HISTORY_API_BASE = `https://readonly-api.momence.com/host/${HOST_ID}/customers`;
const CANCEL_API_BASE = `https://api.momence.com/host/${HOST_ID}/session-bookings`;

// Google Sheets Configuration with OAuth from Environment Variables
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || '1Y_fz6N_5Qu5o6Y8epfrb9K1wGsrff_s5P-yv21nLlhU';
const SHEET_NAME = 'MembersCancellation';
const GOOGLE_OAUTH = {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
    TOKEN_URL: "https://oauth2.googleapis.com/token"
};

// Environment detection
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
const environment = isGitHubActions ? 'GitHub Actions' : 'Local';

// Validation
if (!ALL_COOKIES || !ACCESS_TOKEN) {
    console.error("❌ FATAL: MOMENCE credentials missing");
    if (isGitHubActions) {
        console.error("💡 Add MOMENCE_ACCESS_TOKEN and MOMENCE_ALL_COOKIES to GitHub repository secrets");
    }
    process.exit(1);
}

if (!GOOGLE_OAUTH.CLIENT_ID || !GOOGLE_OAUTH.CLIENT_SECRET || !GOOGLE_OAUTH.REFRESH_TOKEN) {
    console.error("❌ FATAL: Google OAuth credentials missing");
    console.error("💡 Required environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN");
    if (isGitHubActions) {
        console.error("💡 Add Google OAuth credentials to GitHub repository secrets");
    }
    process.exit(1);
}

if (!GOOGLE_SHEET_ID || GOOGLE_SHEET_ID === '1Y_fz6N_5Qu5o6Y8epfrb9K1wGsrff_s5P-yv21nLlhU') {
    console.warn("⚠️  Using default Sheet ID - update GOOGLE_SHEET_ID for production");
}

console.log(`🚀 Starting optimized member cancellation [${environment}]...`);
console.log(`📊 Target Sheet: ${GOOGLE_SHEET_ID}`);

// Global Headers object using the new authentication method
const headers = {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'Cookie': ALL_COOKIES,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
};

/**
 * Format date to IST timezone in DD-MM-YYYY, HH:MM:SS format
 */
function formatDateIST(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
    const istDate = new Date(date.getTime() + istOffset);
    
    const day = String(istDate.getUTCDate()).padStart(2, '0');
    const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
    const year = istDate.getUTCFullYear();
    const hours = String(istDate.getUTCHours()).padStart(2, '0');
    const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(istDate.getUTCSeconds()).padStart(2, '0');
    
    return `${day}-${month}-${year}, ${hours}:${minutes}:${seconds}`;
}

/**
 * Get current IST timestamp
 */
function getCurrentISTTimestamp() {
    return formatDateIST(new Date().toISOString());
}

/**
 * Fetches members with optimized error handling and timeout
 */
async function fetchMembers() {
    console.log("📞 Fetching members from Momence API...");
    try {
        const response = await axios.get(MEMBERS_API_URL, { 
            headers,
            timeout: 30000,
            validateStatus: (status) => status < 500
        });
        
        if (response.status >= 400) {
            throw new Error(`API Error ${response.status}: ${response.statusText}`);
        }
        
        const members = response.data?.payload || [];
        console.log(`✅ Found ${members.length} members`);
        return members;
        
    } catch (error) {
        const msg = error.response?.status 
            ? `API Error ${error.response.status}: ${error.response.statusText}` 
            : `Network: ${error.message}`;
        throw new Error(`❌ Failed to fetch members: ${msg}`);
    }
}

/**
 * Initialize Google Sheets with OAuth2 authentication
 */
async function initializeGoogleSheet() {
    console.log("📊 Initializing Google Sheets with OAuth...");
    
    try {
        // Create OAuth2 client
        const oAuth2Client = new OAuth2Client({
            clientId: GOOGLE_OAUTH.CLIENT_ID,
            clientSecret: GOOGLE_OAUTH.CLIENT_SECRET,
            redirectUri: 'urn:ietf:wg:oauth:2.0:oob'
        });
        
        // Set refresh token
        oAuth2Client.setCredentials({
            refresh_token: GOOGLE_OAUTH.REFRESH_TOKEN
        });
        
        // Get access token (will auto-refresh if needed)
        await oAuth2Client.getAccessToken();

        const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID, oAuth2Client);
        await doc.loadInfo();
        
        console.log(`📄 Document: "${doc.title}" loaded successfully`);
        
        let sheet = doc.sheetsByTitle[SHEET_NAME];
        if (!sheet) {
            console.log(`🆕 Creating new sheet: ${SHEET_NAME}`);
            sheet = await doc.addSheet({ 
                title: SHEET_NAME,
                headerValues: ['memberId', 'email', 'firstName', 'lastName', 
                             'phoneNumber', 'firstSeen', 'lastSeen', 'status', 
                             'message', 'lastProcessed', 'successfulCancellations', 
                             'failedCancellations', 'totalBookings']
            });
        } else {
            console.log(`📋 Found existing sheet: ${SHEET_NAME}`);
        }
        
        console.log(`✅ Google Sheet '${SHEET_NAME}' ready`);
        return { doc, sheet };
        
    } catch (error) {
        console.error(`🔑 OAuth Error Details:`, error.message);
        throw new Error(`❌ Google Sheets OAuth init failed: ${error.message}`);
    }
}

/**
 * Cancel booking with optimized error handling and retries
 */
async function cancelBooking(memberId, bookingId, sessionId, retries = 2) {
    const cancelUrl = `${CANCEL_API_BASE}/${bookingId}/cancel`;
    const payload = {
        memberId,
        sessionId,
        refund: true,
        currency: "inr",
        disableNotifications: true,
        isLateCancellation: false,
        cancelMemberPaymentPlanInstallments: false
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await axios.post(cancelUrl, payload, { 
                headers,
                timeout: 10000,
                validateStatus: (status) => status < 500
            });
            
            if (response.status >= 400) {
                if (attempt < retries && response.status !== 404) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                    continue;
                }
                return { success: false, bookingId, error: `HTTP ${response.status}` };
            }
            
            return { success: true, bookingId };
            
        } catch (error) {
            if (attempt < retries && error.code !== 'ECONNABORTED') {
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                continue;
            }
            
            return { 
                success: false, 
                bookingId, 
                error: error.response?.status || error.code || 'NETWORK_ERROR' 
            };
        }
    }
}

/**
 * Process member with optimized concurrent cancellations
 */
async function processMember(member) {
    const memberId = member.memberId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const historyUrl = `${HISTORY_API_BASE}/${memberId}/history`;
    
    try {
        // Fetch history with timeout
        const response = await axios.get(historyUrl, { 
            headers,
            timeout: 15000,
            validateStatus: (status) => status < 500
        });
        
        if (response.status >= 400) {
            return {
                memberId,
                status: 'ERROR',
                message: `History fetch failed: ${response.status}`,
                successful: [],
                failed: [],
                total: 0
            };
        }
        
        // Filter future bookings efficiently
        const futureBookings = (response.data || [])
            .filter(item => 
                item.type === 'session' && 
                item.startsAt && 
                new Date(item.startsAt) >= today && 
                !item.deletedAt && 
                !item.isVoided
            );

        if (futureBookings.length === 0) {
            return {
                memberId,
                status: 'COMPLETED',
                message: 'No future bookings',
                successful: [],
                failed: [],
                total: 0
            };
        }

        // Cancel in batches of 3 for optimal speed vs stability
        const batchSize = 3;
        const allResults = [];
        
        for (let i = 0; i < futureBookings.length; i += batchSize) {
            const batch = futureBookings.slice(i, i + batchSize);
            const batchPromises = batch.map(booking => 
                cancelBooking(memberId, booking.bookingId, booking.sessionId)
            );
            const batchResults = await Promise.all(batchPromises);
            allResults.push(...batchResults);
        }

        const successful = allResults.filter(r => r.success).map(r => r.bookingId);
        const failed = allResults.filter(r => !r.success).map(r => `${r.bookingId}(${r.error})`);
        
        return {
            memberId,
            status: failed.length === 0 ? 'COMPLETED' : (successful.length > 0 ? 'PARTIAL' : 'FAILED'),
            message: `${successful.length}/${allResults.length} cancelled`,
            successful,
            failed,
            total: allResults.length
        };
        
    } catch (error) {
        return {
            memberId,
            status: 'ERROR',
            message: `Network error: ${error.code || error.message}`,
            successful: [],
            failed: [],
            total: 0
        };
    }
}

/**
 * Update Google Sheet with batch operations for maximum speed
 */
async function updateGoogleSheet(sheet, membersData, results) {
    console.log("📋 Updating Google Sheet...");
    
    try {
        // Clear existing data
        await sheet.clear();
        
        // Set headers
        await sheet.setHeaderRow([
            'memberId', 'email', 'firstName', 'lastName', 'phoneNumber', 
            'firstSeen', 'lastSeen', 'status', 'message', 'lastProcessed',
            'successfulCancellations', 'failedCancellations', 'totalBookings'
        ]);
        
        // Prepare rows with results and IST formatted dates
        const nowIST = getCurrentISTTimestamp();
        const rows = membersData.map(member => {
            const result = results.find(r => r.memberId === member.memberId) || {
                status: 'NOT_PROCESSED',
                message: 'Skipped',
                successful: [],
                failed: [],
                total: 0
            };
            
            return {
                memberId: member.memberId,
                email: member.email || '',
                firstName: member.firstName || '',
                lastName: member.lastName || '',
                phoneNumber: member.phoneNumber || '',
                firstSeen: formatDateIST(member.firstSeen),
                lastSeen: formatDateIST(member.lastSeen),
                status: result.status,
                message: result.message,
                lastProcessed: nowIST,
                successfulCancellations: result.successful.join(','),
                failedCancellations: result.failed.join(','),
                totalBookings: result.total
            };
        });
        
        // Batch insert all rows
        if (rows.length > 0) {
            await sheet.addRows(rows);
        }
        
        console.log(`✅ Updated ${rows.length} rows in Google Sheet`);
        
    } catch (error) {
        throw new Error(`❌ Sheet update failed: ${error.message}`);
    }
}

/**
 * Optimized main function for fastest execution with Google Sheets
 */
async function main() {
    const startTime = Date.now();
    
    try {
        console.log("🚀 Starting optimized member cancellation process...");
        
        // 1. Initialize Google Sheet first
        const { sheet } = await initializeGoogleSheet();
        
        // 2. Fetch members in parallel with sheet init
        const membersData = await fetchMembers();
        if (membersData.length === 0) {
            console.log("No members found. Exiting.");
            return;
        }

        console.log(`⚡ Processing ${membersData.length} members with optimized concurrency...`);

        // 3. Process members with controlled concurrency (8 at once for optimal speed)
        const concurrencyLimit = 8;
        const allResults = [];
        
        for (let i = 0; i < membersData.length; i += concurrencyLimit) {
            const batch = membersData.slice(i, i + concurrencyLimit);
            const batchNum = Math.floor(i / concurrencyLimit) + 1;
            const totalBatches = Math.ceil(membersData.length / concurrencyLimit);
            
            console.log(`   📦 Batch ${batchNum}/${totalBatches}: ${batch.length} members`);
            
            const batchPromises = batch.map(member => processMember(member));
            const batchResults = await Promise.all(batchPromises);
            allResults.push(...batchResults);
            
            // Brief pause to avoid overwhelming APIs (except last batch)
            if (i + concurrencyLimit < membersData.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // 4. Update Google Sheet with all results
        await updateGoogleSheet(sheet, membersData, allResults);
        
        // 5. Summary
        const completed = allResults.filter(r => r.status === 'COMPLETED').length;
        const partial = allResults.filter(r => r.status === 'PARTIAL').length;
        const failed = allResults.filter(r => r.status === 'FAILED').length;
        const errors = allResults.filter(r => r.status === 'ERROR').length;
        const totalCancellations = allResults.reduce((sum, r) => sum + r.successful.length, 0);
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log(`\n🎉 Process completed in ${totalTime}s!`);
        console.log(`📊 Results: ${membersData.length} members processed`);
        console.log(`   ✅ ${completed} fully completed`);
        console.log(`   ⚠️  ${partial} partially completed`);
        console.log(`   ❌ ${failed} failed`);
        console.log(`   🚫 ${errors} errors`);
        console.log(`   🎯 ${totalCancellations} total bookings cancelled`);
        console.log(`📋 View results: https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}`);
        
        // GitHub Actions specific outputs
        if (isGitHubActions) {
            console.log(`::notice title=Cancellation Complete::Processed ${membersData.length} members, cancelled ${totalCancellations} bookings in ${totalTime}s`);
            if (errors > 0) {
                console.log(`::warning title=Processing Errors::${errors} members encountered errors`);
            }
        }

    } catch (error) {
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(`\n💥 Fatal error after ${totalTime}s:`);
        console.error(`   ${error.message}`);
        if (error.stack) console.error(`   Stack: ${error.stack.split('\n')[1]?.trim()}`);
        process.exit(1);
    }
}

main();