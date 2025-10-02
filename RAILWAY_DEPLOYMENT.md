# Railway.com Deployment Guide - FREE Alternative to Google Cloud

## 🚀 **Why Railway.com?**

### ✅ **Advantages over Google Cloud:**
- **$5 free credit monthly** (more than enough for your script)
- **No billing setup required** initially
- **No service account issues**
- **Simpler deployment process**
- **Built-in cron scheduling**
- **Automatic GitHub integration**

### 📊 **Cost Comparison:**
- **GitHub Actions**: ~$191/month
- **Google Cloud**: $0/month (but having setup issues)
- **Railway.com**: $0/month (within $5 free credit)

---

## 🎯 **Quick Railway.com Setup (5 minutes)**

### **Step 1: Sign Up**
1. Go to [railway.app](https://railway.app)
2. Sign up with your GitHub account (connects automatically to your repo)
3. No credit card required initially

### **Step 2: Deploy Your Repository**
1. Click "Deploy from GitHub repo"
2. Select your `upcoming-sessions-cancellation` repository
3. Railway will automatically detect it's a Node.js project

### **Step 3: Add Environment Variables**
In Railway dashboard, add these environment variables:
```
MOMENCE_ACCESS_TOKEN=your_token_here
MOMENCE_ALL_COOKIES=your_cookies_here
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token
GOOGLE_SHEET_ID=your_sheet_id
```

### **Step 4: Setup Cron Job**
Railway will run your `schedule.js` automatically, which is already configured for every 5 minutes!

---

## 🔧 **Alternative: Render.com (750 Free Hours/Month)**

### **Even Simpler Setup:**
1. Go to [render.com](https://render.com)
2. Connect your GitHub repository
3. Deploy as "Background Worker"
4. Add environment variables
5. Your script runs automatically

---

## 💡 **Immediate Action Plan:**

### **Option A: Try Railway.com (Recommended)**
- 5-minute setup
- $5 free monthly credit
- Automatic GitHub integration
- No service account issues

### **Option B: Keep GitHub Actions (Current)**
- Already working perfectly
- Costs $191/month but guaranteed reliability
- No additional setup needed

### **Option C: Fix Google Cloud (If you prefer)**
- Need to contact Google Cloud support about missing service accounts
- More complex but eventually free

---

## 🎯 **My Recommendation:**

**Use Railway.com for now** - it's the fastest path to free hosting without the Google Cloud complexity. Your GitHub Actions will keep running as backup until Railway is proven stable.

Would you like me to help you set up Railway.com, or would you prefer to try contacting Google Cloud support about the service account issue?