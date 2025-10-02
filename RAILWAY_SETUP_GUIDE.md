# Railway.com Deployment for Momence Cancellation

## 🚀 **Step-by-Step Railway Setup**

### **Step 1: Sign Up for Railway**
1. Go to **[railway.app](https://railway.app)**
2. Click **"Start a New Project"**
3. Click **"Login with GitHub"** 
4. Authorize Railway to access your repositories

### **Step 2: Deploy Your Repository**
1. After login, click **"Deploy from GitHub repo"**
2. Select **"Jimmeey2323/upcoming-sessions-cancellation"**
3. Railway will automatically detect it's a Node.js project
4. Click **"Deploy Now"**

### **Step 3: Configure Environment Variables**
Once deployed, click on your project, then:
1. Click **"Variables"** tab
2. Add these environment variables one by one:

```
MOMENCE_ACCESS_TOKEN = your_access_token_value
MOMENCE_ALL_COOKIES = your_cookies_value  
GOOGLE_CLIENT_ID = your_google_client_id
GOOGLE_CLIENT_SECRET = your_google_client_secret
GOOGLE_REFRESH_TOKEN = your_google_refresh_token
GOOGLE_SHEET_ID = your_google_sheet_id
```

### **Step 4: Redeploy**
1. After adding all variables, click **"Deploy"** again
2. Your app will restart with the environment variables

---

## ✅ **What Happens Next:**

### **Automatic Operation:**
- Railway will run your `schedule.js` file automatically
- Your script will execute every 5 minutes (as configured)
- **Cost: $0/month** (within $5 free credit)
- **No interruptions** - runs 24/7

### **Parallel Operation:**
- 🔵 **GitHub Actions**: Still running every 5 minutes
- 🟢 **Railway.com**: Also running every 5 minutes  
- 📊 **Both will update your Google Sheet** (safe - your script handles duplicates)

---

## 📊 **Monitoring Your Railway App**

### **View Logs:**
1. In Railway dashboard, click your project
2. Click **"Deployments"** tab  
3. Click on latest deployment
4. Click **"View Logs"** to see your script output

### **Check Status:**
- Green dot = Running successfully
- Red dot = Error (check logs)

---

## 💰 **Cost Breakdown:**

| Service | Cost | Usage |
|---------|------|-------|
| **GitHub Actions** | ~$191/month | Every 5 minutes |
| **Railway.com** | $0/month | Every 5 minutes (within $5 credit) |
| **Total Savings** | **$191/month** | Same functionality |

---

## 🛡️ **Safety Features:**

### **No Risk:**
- Your GitHub Actions continue running unchanged
- Railway runs in parallel - no conflicts  
- Both systems process members independently
- Your `lc1.js` script handles duplicate processing gracefully

### **Testing Phase (1 Week):**
1. Monitor both GitHub Actions and Railway logs
2. Verify both are processing members correctly
3. Check Google Sheets for consistent updates
4. After 1 week, disable GitHub Actions to save $191/month

---

## 🔧 **If You Need to Make Changes:**

### **Update Environment Variables:**
1. Go to Railway dashboard
2. Click your project → Variables
3. Edit any variable
4. App will automatically redeploy

### **Update Code:**
1. Just push to your GitHub repository
2. Railway will automatically redeploy
3. No manual intervention needed

---

## 🚨 **Troubleshooting:**

### **If App Doesn't Start:**
1. Check logs in Railway dashboard
2. Verify all environment variables are set
3. Make sure values don't have extra spaces

### **If Script Doesn't Run:**
1. Check that `schedule.js` is being executed
2. Verify the cron schedule is working
3. Look for any error messages in logs

---

## 🎉 **Expected Timeline:**

- **5 minutes**: Railway account setup
- **2 minutes**: Repository connection  
- **3 minutes**: Environment variable setup
- **1 minute**: Deployment verification
- **Total**: 11 minutes to free hosting!

Ready to start? Go to **[railway.app](https://railway.app)** and click "Start a New Project"! 🚀