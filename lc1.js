require('dotenv').config();
const axios = require('axios');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { OAuth2Client } = require('google-auth-library');

// --- Hardcoded Configuration ---
// Production mode - no test flags
const WAIT_BEFORE_CANCELLATION = 5; // Wait time in seconds bef processing cancellations
const ACCESS_TOKEN = process.env.MOMENCE_ACCESS_TOKEN;
const ALL_COOKIES = process.env.MOMENCE_ALL_COOKIES;
const HOST_ID = 13752;
const MEMBERS_API_URL = `https://api.momence.com/host/${HOST_ID}/customers?filters=%7B%22type%22:%22and%22,%22customerTags%22:%7B%22type%22:null,%22tags%22:[166700,164561],%22customerHaveTag%22:%22have%22%7D%7D&query=&page=0&pageSize=200`;
const HISTORY_API_BASE = `https://readonly-api.momence.com/host/${HOST_ID}/customers`;
const CANCEL_API_BASE = `https://api.momence.com/host/${HOST_ID}/session-bookings`;
const LATE_CANCELLATION_ASYNC_API_URL = `https://api.momence.com/host/${HOST_ID}/reports/late-cancellations/async`;
const LATE_CANCELLATION_REPORT_API_BASE = `https://api.momence.com/host/${HOST_ID}/reports/late-cancellations/report-runs`;
const TAG_ASSIGNMENT_API_URL = `https://api.momence.com/host/${HOST_ID}/tags/assign`;

// Google Sheets Configuration with OAuth from Environment Variables
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || '1Y_fz6N_5Qu5o6Y8epfrb9K1wGsrff_s5P-yv21nLlhU';
const SHEET_NAME = 'MembersCancellation';
const LATE_CANCELLATION_SHEET_NAME = 'Late Cancelled';
const GOOGLE_OAUTH = {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
    TOKEN_URL: "https://oauth2.googleapis.com/token"
};

// Environment detection
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
const environment = isGitHubActions ? 'GitHub Actions' : 'Local';

// Debug logging for Railway troubleshooting
console.log(`🔍 Debug - Environment: ${environment}`);
console.log(`🔍 Debug - GOOGLE_SHEET_ID from env: ${process.env.GOOGLE_SHEET_ID ? 'SET' : 'NOT SET'}`);
console.log(`🔍 Debug - Final GOOGLE_SHEET_ID: ${GOOGLE_SHEET_ID}`);
console.log(`🔍 Debug - Is default?: ${GOOGLE_SHEET_ID === '1Y_fz6N_5Qu5o6Y8epfrb9K1wGsrff_s5P-yv21nLlhU'}`);

// Validation
if (!ALL_COOKIES) {
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

console.log(`🚀 Starting member cancellation process`);

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
 * Create unique identifier for late cancellation record
 */
function createCancellationId(cancellation) {
    // Use combination of memberId, cancelledDate, and sessionDate as unique identifier
    const cancelledDate = formatDateIST(cancellation.cancelledDate);
    const sessionDate = formatDateIST(cancellation.sessionDate);
    return `${cancellation.memberId}_${cancelledDate}_${sessionDate}`;
}

/**
 * Parse date string in DD-MM-YYYY, HH:MM:SS format to Date object
 */
function parseISTDateString(dateString) {
    if (!dateString) return null;
    
    try {
        const datePart = dateString.split(',')[0].trim(); // Get DD-MM-YYYY part
        const timePart = dateString.split(',')[1]?.trim() || '00:00:00'; // Get HH:MM:SS part
        
        const [day, month, year] = datePart.split('-').map(num => parseInt(num));
        const [hour, minute, second] = timePart.split(':').map(num => parseInt(num));
        
        // Create date object (month - 1 because JS months are 0-indexed)
        return new Date(year, month - 1, day, hour, minute, second);
    } catch (error) {
        console.warn(`Failed to parse date: ${dateString}`);
        return null;
    }
}

/**
 * Check if a member should be tagged based on all criteria:
 * 1. cancelledDate >= 01/10/2025
 * 2. membership includes 'unlimited'
 * 3. 3 qualifying cancellations within 7-day window
 * 4. Tag on every 3rd qualifying occurrence
 */
function shouldTagMember(memberCancellations, currentCancellation) {
    const cutoffDate = new Date(2025, 9, 1, 0, 0, 0); // October 1, 2025
    
    // Add current cancellation to the list
    const allCancellations = [...memberCancellations, currentCancellation];
    
    // Filter to only include cancellations that meet ALL criteria:
    // 1. On or after October 1st, 2025
    // 2. Membership includes 'unlimited'
    const qualifyingCancellations = allCancellations.filter(cancellation => {
        const cancelDate = parseISTDateString(cancellation.cancelledDate);
        const membershipName = (cancellation.membershipName || '').toLowerCase();
        
        return cancelDate && 
               cancelDate >= cutoffDate && 
               membershipName.includes('unlimited');
    });
    
    // Need at least 3 qualifying cancellations to potentially tag
    if (qualifyingCancellations.length < 3) {
        const membershipName = (currentCancellation.membershipName || '').toLowerCase();
        if (!membershipName.includes('unlimited')) {
            return {
                shouldTag: false,
                reason: `Membership '${currentCancellation.membershipName}' does not include 'unlimited'`,
                cancellationsInWindow: [],
                qualifyingCount: qualifyingCancellations.length
            };
        }
        return {
            shouldTag: false,
            reason: `Only ${qualifyingCancellations.length} qualifying cancellations (need 3 for tagging)`,
            cancellationsInWindow: [],
            qualifyingCount: qualifyingCancellations.length
        };
    }
    
    // Sort qualifying cancellations by cancelled date (most recent first)
    qualifyingCancellations.sort((a, b) => {
        const dateA = parseISTDateString(a.cancelledDate);
        const dateB = parseISTDateString(b.cancelledDate);
        return dateB - dateA;
    });
    
    // Check if this is a 3rd, 6th, 9th, etc. qualifying cancellation
    const isTaggingOccurrence = qualifyingCancellations.length % 3 === 0;
    
    if (!isTaggingOccurrence) {
        return {
            shouldTag: false,
            reason: `${qualifyingCancellations.length} qualifying cancellations (tag triggers at multiples of 3)`,
            cancellationsInWindow: [],
            qualifyingCount: qualifyingCancellations.length
        };
    }
    
    // Check if the last 3 qualifying cancellations are within 7 days
    const lastThree = qualifyingCancellations.slice(0, 3);
    const mostRecent = parseISTDateString(lastThree[0].cancelledDate);
    const oldest = parseISTDateString(lastThree[2].cancelledDate);
    
    if (mostRecent && oldest) {
        const daysDifference = (mostRecent - oldest) / (1000 * 60 * 60 * 24);
        
        if (daysDifference <= 7) {
            return {
                shouldTag: true,
                reason: `${qualifyingCancellations.length}${getOrdinalSuffix(qualifyingCancellations.length)} qualifying cancellation triggers tag (3 within ${daysDifference.toFixed(1)} days: ${lastThree[2].cancelledDate} to ${lastThree[0].cancelledDate})`,
                cancellationsInWindow: lastThree,
                qualifyingCount: qualifyingCancellations.length
            };
        } else {
            return {
                shouldTag: false,
                reason: `${qualifyingCancellations.length}${getOrdinalSuffix(qualifyingCancellations.length)} qualifying cancellation, but last 3 span ${daysDifference.toFixed(1)} days (>7)`,
                cancellationsInWindow: [],
                qualifyingCount: qualifyingCancellations.length
            };
        }
    }
    
    return {
        shouldTag: false,
        reason: `${qualifyingCancellations.length} qualifying cancellations, but date parsing failed`,
        cancellationsInWindow: [],
        qualifyingCount: qualifyingCancellations.length
    };
}

/**
 * Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
}

/**
 * Check and add missing columns to a sheet
 */
async function ensureSheetColumns(sheet, requiredColumns) {
    // Load the sheet headers
    await sheet.loadHeaderRow();
    const existingHeaders = sheet.headerValues || [];
    const missingColumns = requiredColumns.filter(col => !existingHeaders.includes(col));
    
    if (missingColumns.length > 0) {
        console.log(`📋 Adding missing columns to ${sheet.title}: ${missingColumns.join(', ')}`);
        
        // Get all existing data first
        const existingRows = await sheet.getRows();
        
        // Clear and reset with new headers
        await sheet.clear();
        await sheet.setHeaderRow(requiredColumns);
        
        // Re-add existing data with empty values for new columns
        if (existingRows.length > 0) {
            const updatedRows = existingRows.map(row => {
                const newRow = {};
                requiredColumns.forEach(col => {
                    newRow[col] = row.get(col) || '';
                });
                return newRow;
            });
            await sheet.addRows(updatedRows);
            console.log(`✅ Preserved ${existingRows.length} existing rows with new columns`);
        }
    }
    
    return missingColumns.length;
}

/**
 * Initiates async late cancellations report generation
 */
async function startReportGeneration() {
    console.log("📞 Initiating late cancellations report generation...");
    
    const payload = {
        "timeZone": "Asia/Kolkata",
        "groupRecurring": false,
        "computedSaleValue": true,
        "includeVatInRevenue": true,
        "useBookedEntityDateRange": false,
        "excludeMembershipRenews": false,
        "day": "2025-10-02T00:00:00.000Z",
        "moneyCreditSalesFilter": "filterOutSalesPaidByMoneyCredits",
        "hideVoided": false,
        "excludeInactiveMembers": false,
        "includeRefunds": false,
        "showOnlySpotfillerRevenue": false,
        "startDate": "2025-09-30T18:30:00.000Z",
        "endDate": "2025-12-31T18:29:00.000Z",
        "startDate2": "2025-09-30T18:30:00.000Z",
        "endDate2": "2025-10-31T18:29:59.999Z",
        "datePreset": -1,
        "datePreset2": 4
    };
    
    try {
        const response = await axios.post(LATE_CANCELLATION_ASYNC_API_URL, payload, {
            headers,
            timeout: 30000,
            validateStatus: (status) => status < 500
        });
        
        if (response.status >= 400) {
            const errorData = response.data ? JSON.stringify(response.data).substring(0, 200) : '';
            throw new Error(`API Error ${response.status}: ${response.statusText} ${errorData}`);
        }
        
        const reportRunId = response.data?.reportRunId;
        if (!reportRunId) {
            throw new Error(`No reportRunId received in response: ${JSON.stringify(response.data)}`);
        }
        
        console.log(`✅ Report initiated with ID: ${reportRunId}`);
        return reportRunId;
        
    } catch (error) {
        let msg;
        if (error.response?.status) {
            const errorData = error.response.data ? JSON.stringify(error.response.data).substring(0, 200) : '';
            msg = `API Error ${error.response.status}: ${error.response.statusText} ${errorData}`;
        } else {
            msg = `Network: ${error.message}`;
        }
        throw new Error(`❌ Failed to initiate late cancellations report: ${msg}`);
    }
}

/**
 * Fetches late cancellations report data using reportRunId
 */
async function fetchLateCancellationsReport(reportRunId) {
    console.log(`� Fetching late cancellations report data (ID: ${reportRunId})...`);
    
    const reportUrl = `${LATE_CANCELLATION_REPORT_API_BASE}/${reportRunId}`;
    
    // Poll for report completion with retries
    const maxRetries = 10;
    const retryDelay = 2000; // 2 seconds
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await axios.get(reportUrl, {
                headers,
                timeout: 30000,
                validateStatus: (status) => status < 500
            });
            
            if (response.status >= 400) {
                const errorData = response.data ? JSON.stringify(response.data).substring(0, 200) : '';
                throw new Error(`API Error ${response.status}: ${response.statusText} ${errorData}`);
            }
            
            // Check if report is ready
            const reportData = response.data;
            if (reportData?.status === 'completed' || reportData?.reportData?.items) {
                const lateCancellations = reportData?.reportData?.items || [];
                console.log(`✅ Found ${lateCancellations.length} late cancellations`);
                return lateCancellations;
            }
            
            // Report still processing
            if (attempt < maxRetries) {
                console.log(`⏳ Report still processing (attempt ${attempt}/${maxRetries}), retrying in ${retryDelay/1000}s...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            } else {
                throw new Error(`Report did not complete after ${maxRetries} attempts. Status: ${reportData?.status || 'unknown'}`);
            }
            
        } catch (error) {
            if (attempt === maxRetries) {
                let msg;
                if (error.response?.status) {
                    const errorData = error.response.data ? JSON.stringify(error.response.data).substring(0, 200) : '';
                    msg = `API Error ${error.response.status}: ${error.response.statusText} ${errorData}`;
                } else {
                    msg = `Network: ${error.message}`;
                }
                throw new Error(`❌ Failed to fetch late cancellations report: ${msg}`);
            }
            
            // Retry on network errors
            console.log(`⚠️ Error on attempt ${attempt}, retrying in ${retryDelay/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
}

/**
 * Main function to fetch late cancellations using async workflow
 */
async function fetchLateCancellations() {
    try {
        // Step 1: Initiate the report
        const reportRunId = await startReportGeneration();
        
        // Step 2: Fetch the report data
        const lateCancellations = await fetchLateCancellationsReport(reportRunId);
        
        return lateCancellations;
        
    } catch (error) {
        throw new Error(`❌ Failed to fetch late cancellations: ${error.message}`);
    }
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
        
        // Initialize Late Cancellation sheet
        const requiredLateCancelColumns = ['memberId', 'customerName', 'customerEmail', 'cancelledEvent', 
                                         'cancelledDate', 'sessionDate', 'paid', 'paymentMethod', 
                                         'membershipName', 'homeLocation', 'chargedPenaltyAmountInCurrency', 
                                         'occurrenceCount', 'action', 'status', 'processingReason', 'actualAction'];
        
        let lateCancelSheet = doc.sheetsByTitle[LATE_CANCELLATION_SHEET_NAME];
        if (!lateCancelSheet) {
            console.log(`🆕 Creating new sheet: ${LATE_CANCELLATION_SHEET_NAME}`);
            lateCancelSheet = await doc.addSheet({ 
                title: LATE_CANCELLATION_SHEET_NAME,
                headerValues: requiredLateCancelColumns
            });
        } else {
            console.log(`📋 Found existing sheet: ${LATE_CANCELLATION_SHEET_NAME}`);
            await ensureSheetColumns(lateCancelSheet, requiredLateCancelColumns);
        }
        
        // Initialize Members Cancellation sheet
        const requiredMemberColumns = ['memberId', 'email', 'firstName', 'lastName', 
                                     'phoneNumber', 'firstSeen', 'lastSeen', 'status', 
                                     'message', 'lastProcessed', 'successfulCancellations', 
                                     'failedCancellations', 'totalBookings', 'processingReason', 'actualAction'];
        
        let sheet = doc.sheetsByTitle[SHEET_NAME];
        if (!sheet) {
            console.log(`🆕 Creating new sheet: ${SHEET_NAME}`);
            sheet = await doc.addSheet({ 
                title: SHEET_NAME,
                headerValues: requiredMemberColumns
            });
        } else {
            console.log(`📋 Found existing sheet: ${SHEET_NAME}`);
            await ensureSheetColumns(sheet, requiredMemberColumns);
        }
        
        console.log(`✅ Google Sheets '${LATE_CANCELLATION_SHEET_NAME}' and '${SHEET_NAME}' ready`);
        return { doc, sheet, lateCancelSheet };
        
    } catch (error) {
        console.error(`🔑 OAuth Error Details:`, error.message);
        throw new Error(`❌ Google Sheets OAuth init failed: ${error.message}`);
    }
}

/**
 * Assign tags to a member
 */
async function assignTagsToMember(memberId, retries = 2) {
    const payload = {
        tagIds: [164561],
        type: "customer",
        entityId: memberId
    };

    // Production mode - assign tags directly

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await axios.post(TAG_ASSIGNMENT_API_URL, payload, { 
                headers,
                timeout: 10000,
                validateStatus: (status) => status < 500
            });
            
            if (response.status >= 400) {
                if (attempt < retries && response.status !== 404) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                    continue;
                }
                return { success: false, memberId, error: `HTTP ${response.status}` };
            }
            
            return { success: true, memberId, response: response.data };
            
        } catch (error) {
            if (attempt < retries && error.code !== 'ECONNABORTED') {
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                continue;
            }
            
            return { 
                success: false, 
                memberId, 
                error: error.response?.status || error.code || 'NETWORK_ERROR' 
            };
        }
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

    // Production mode - cancel bookings directly

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
 * Process late cancellations and update Late Cancelled sheet
 */
async function processLateCancellations(lateCancelSheet, lateCancellations) {
    console.log("🏷️ Processing late cancellations and member occurrences...");
    
    try {
        // Get existing rows to avoid clearing the sheet
        await lateCancelSheet.loadCells();
        const existingRows = await lateCancelSheet.getRows();
        
        // Create maps for duplicate detection and member cancellation tracking
        const existingCancellationIds = new Set();
        const memberCancellationHistory = new Map(); // Map<memberId, Array<cancellation>>
        
        const cutoffDateForHistory = new Date(2025, 9, 1, 0, 0, 0); // October 1, 2025
        
        existingRows.forEach(row => {
            const memberId = parseInt(row.get('memberId'));
            const cancelledDate = row.get('cancelledDate');
            const sessionDate = row.get('sessionDate');
            const customerName = row.get('customerName');
            const membershipName = row.get('membershipName');
            
            if (memberId && cancelledDate && sessionDate) {
                // Track existing records to avoid duplicates
                const existingId = `${memberId}_${cancelledDate}_${sessionDate}`;
                existingCancellationIds.add(existingId);
                
                // Only include in history if on or after October 1st, 2025 for tagging calculations
                const cancelDate = parseISTDateString(cancelledDate);
                if (cancelDate && cancelDate >= cutoffDateForHistory) {
                    if (!memberCancellationHistory.has(memberId)) {
                        memberCancellationHistory.set(memberId, []);
                    }
                    memberCancellationHistory.get(memberId).push({
                        cancelledDate,
                        sessionDate,
                        customerName: customerName || '',
                        membershipName: membershipName || ''
                    });
                }
            }
        });
        
        console.log(`📋 Found ${existingRows.length} existing late cancellation records`);
        console.log(`� Tracking ${memberCancellationHistory.size} members with cancellation history`);
        console.log(`�🔍 Checking ${lateCancellations.length} API records for new entries...`);
        
        // Process ONLY NEW late cancellations
        const newRows = [];
        const membersToTag = [];
        let duplicateCount = 0;
        
        for (const cancellation of lateCancellations) {
            const cancellationId = createCancellationId(cancellation);
            
            // Skip if this record already exists
            if (existingCancellationIds.has(cancellationId)) {
                duplicateCount++;
                continue;
            }
            
            const memberId = cancellation.memberId;
            const formattedCancelledDate = formatDateIST(cancellation.cancelledDate);
            const formattedSessionDate = formatDateIST(cancellation.sessionDate);
            
            // Get existing cancellation history for this member
            const memberHistory = memberCancellationHistory.get(memberId) || [];
            
            // Current cancellation object for analysis
            const currentCancellation = {
                cancelledDate: formattedCancelledDate,
                sessionDate: formattedSessionDate,
                customerName: cancellation.customerName || '',
                membershipName: cancellation.membershipName || ''
            };
            
            // Check if member should be tagged based on 7-day window logic
            const tagAnalysis = shouldTagMember(memberHistory, currentCancellation);
            
            if (tagAnalysis.shouldTag) {
                membersToTag.push(memberId);
            }
            
            // Calculate total count for this member
            const totalCount = memberHistory.length + 1;
            
            const newRow = {
                memberId: memberId,
                customerName: cancellation.customerName || '',
                customerEmail: cancellation.customerEmail || '',
                cancelledEvent: cancellation.cancelledEvent || '',
                cancelledDate: formattedCancelledDate,
                sessionDate: formattedSessionDate,
                paid: cancellation.paid || 0,
                paymentMethod: cancellation.paymentMethod || '',
                membershipName: cancellation.membershipName || '',
                homeLocation: cancellation.homeLocation || '',
                chargedPenaltyAmountInCurrency: cancellation.chargedPenaltyAmountInCurrency || 0,
                occurrenceCount: totalCount,
                action: tagAnalysis.shouldTag ? 'Add Tag' : '',
                status: '',
                processingReason: tagAnalysis.reason,
                actualAction: 'PENDING'
            };
            
            newRows.push(newRow);
            
            // Update member history for subsequent processing
            if (!memberCancellationHistory.has(memberId)) {
                memberCancellationHistory.set(memberId, []);
            }
            memberCancellationHistory.get(memberId).push(currentCancellation);
        }
        
        console.log(`📊 Processing Results: ${newRows.length} new, ${duplicateCount} duplicates, ${membersToTag.length} members to tag`);
        
        // Add new rows to sheet
        if (newRows.length > 0) {
            await lateCancelSheet.addRows(newRows);
            console.log(`✅ Added ${newRows.length} new late cancellation records`);
        }
        
        // Process tag assignments for members that need tagging
        const tagResults = [];
        if (membersToTag.length > 0) {
            for (const memberId of membersToTag) {
                const result = await assignTagsToMember(memberId);
                tagResults.push(result);
                await new Promise(resolve => setTimeout(resolve, 200)); // Reduced delay
            }
            
            // Update status for tagged members
            const allRows = await lateCancelSheet.getRows();
            
            for (const row of allRows) {
                const memberId = parseInt(row.get('memberId'));
                const action = row.get('action');
                const membershipName = row.get('membershipName') || '';
                const status = row.get('status');
                
                if (action === 'Add Tag' && !status) {
                    if (!membershipName.toLowerCase().includes('unlimited')) {
                        row.set('status', 'Skipped - Not Unlimited Membership');
                        row.set('actualAction', 'SKIPPED');
                        await row.save();
                    } else {
                        const tagResult = tagResults.find(r => r.memberId === memberId);
                        if (tagResult) {
                            const status = tagResult.success ? 'Tagged Successfully' : `Tag Failed: ${tagResult.error}`;
                            row.set('status', status);
                            row.set('actualAction', tagResult.success ? 'TAG_ASSIGNED' : 'TAG_FAILED');
                            await row.save();
                        }
                    }
                }
            }
        }
        
        // Return results for summary
        return {
            newRecordsCount: newRows.length,
            duplicateCount: duplicateCount,
            existingIds: existingCancellationIds
        };
        
    } catch (error) {
        throw new Error(`❌ Late cancellation processing failed: ${error.message}`);
    }
}

/**
 * Update Google Sheet with batch operations for maximum speed
 */
async function updateGoogleSheet(sheet, membersData, results) {
    console.log("📋 Updating Google Sheet...");
    
    try {
        const requiredColumns = ['memberId', 'email', 'firstName', 'lastName', 'phoneNumber', 
                                'firstSeen', 'lastSeen', 'status', 'message', 'lastProcessed',
                                'successfulCancellations', 'failedCancellations', 'totalBookings', 'processingReason', 'actualAction'];
        
        await ensureSheetColumns(sheet, requiredColumns);
        await sheet.clear();
        await sheet.setHeaderRow(requiredColumns);
        
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
            
            const processingReason = result.total === 0 ? 'No future bookings found' : 
                `${result.total} future bookings found - ${result.successful.length} successful, ${result.failed.length} failed`;
            const actualAction = result.status === 'COMPLETED' ? 'ALL_CANCELLED' : 
                 result.status === 'PARTIAL' ? 'PARTIAL_CANCELLED' : 
                 result.status === 'FAILED' ? 'CANCELLATION_FAILED' : 'ERROR_OCCURRED';
                
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
                totalBookings: result.total,
                processingReason: processingReason,
                actualAction: actualAction
            };
        });
        
        // Batch insert all rows
        if (rows.length > 0) {
            await sheet.addRows(rows);
        }
        
        console.log(`✅ Updated ${rows.length} member records in Google Sheet`);
        
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
        // Initialize Google Sheets
        const { sheet, lateCancelSheet } = await initializeGoogleSheet();
        
        // 2. Process late cancellations first
        const lateCancellations = await fetchLateCancellations();
        let newLateCancellationsCount = 0;
        
        if (lateCancellations.length > 0) {
            const result = await processLateCancellations(lateCancelSheet, lateCancellations);
            newLateCancellationsCount = result?.newRecordsCount || 0;
        } else {
            console.log("📋 No late cancellations found from API.");
        }
        
        // Wait 5 seconds for tag assignments to propagate before fetching members
        console.log("⏳ Waiting 5 seconds for tag assignments to propagate...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 3. Process member cancellations
        const membersData = await fetchMembers();
        if (membersData.length === 0) {
            console.log("No members found for cancellation processing.");
            return;
        }

        // 4. Process members with controlled concurrency (8 at once for optimal speed)
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

        // 5. Update Google Sheet with all results
        await updateGoogleSheet(sheet, membersData, allResults);
        
        // 6. Summary
        const completed = allResults.filter(r => r.status === 'COMPLETED').length;
        const partial = allResults.filter(r => r.status === 'PARTIAL').length;
        const failed = allResults.filter(r => r.status === 'FAILED').length;
        const errors = allResults.filter(r => r.status === 'ERROR').length;
        const totalCancellations = allResults.reduce((sum, r) => sum + r.successful.length, 0);
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log(`\n🎉 Process completed in ${totalTime}s`);
        console.log(`📊 Late Cancellations: ${newLateCancellationsCount} new records added`);
        console.log(`📊 Member Cancellations: ${completed} completed, ${partial} partial, ${failed} failed, ${errors} errors`);
        console.log(`🎯 Total bookings cancelled: ${totalCancellations}`);
        
        if (isGitHubActions && errors > 0) {
            console.log(`::warning title=Processing Errors::${errors} members encountered errors`);
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
