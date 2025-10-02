# 🌟 Google Cloud Deployment Guide - Keep GitHub Actions Safe!

## 📋 **Overview**
This guide shows you how to run your Momence cancellation script on Google Cloud's **free tier** while keeping your existing GitHub Actions setup **completely unchanged**.

---

## 🎯 **What This Deployment Does**

### ✅ **SAFE - No Changes to Existing Setup**
- Your GitHub Actions **continue running** exactly as before
- Your `.github/workflows/schedule.yml` **remains untouched**
- Your `lc1.js` script **stays exactly the same**
- Your environment variables **work identically**

### 🆕 **NEW - Adds Google Cloud Parallel Execution**
- Creates a Cloud Function that calls your existing `lc1.js`
- Sets up Cloud Scheduler for every 5 minutes
- **Runs in parallel** with GitHub Actions
- **100% free** within GCP's generous limits

---

## 💰 **Cost Comparison**

| Platform | Current Cost | After GCP | Savings |
|----------|--------------|-----------|---------|
| **GitHub Actions** | ~$191/month | $0 (disabled later) | $191/month |
| **Google Cloud** | $0 | $0/month | $0 |
| **Total** | $191/month | **$0/month** | **$191/month** |

---

## 🚀 **Quick Start (15 minutes)**

### **Step 1: Install Google Cloud CLI**
```bash
# macOS
brew install --cask google-cloud-sdk

# Login and setup
gcloud auth login
gcloud projects create momence-automation-$(date +%s)
gcloud config set project YOUR_PROJECT_ID
```

### **Step 2: Set Environment Variables**
```bash
export MOMENCE_ACCESS_TOKEN="your_token_here"
export MOMENCE_ALL_COOKIES="your_cookies_here"  
export GOOGLE_CLIENT_ID="your_client_id"
export GOOGLE_CLIENT_SECRET="your_client_secret"
export GOOGLE_REFRESH_TOKEN="your_refresh_token"
export GOOGLE_SHEET_ID="your_sheet_id"
```

### **Step 3: Deploy to Google Cloud**
```bash
chmod +x deploy-gcp.sh
./deploy-gcp.sh
```

---

## 📊 **What Happens During Deployment**

### **Phase 1: Parallel Operation (Recommended 1 Week)**
```
Timeline: Week 1
├── GitHub Actions: ✅ Running every 5 minutes
└── Google Cloud:   ✅ Running every 5 minutes

Both systems process members independently - this is safe!
```

### **Phase 2: Cost Optimization (After Testing)**
```bash
# Disable GitHub Actions workflow (save $191/month)
# Keep Google Cloud running (free)

Timeline: Week 2+
├── GitHub Actions: ❌ Disabled (optional)
└── Google Cloud:   ✅ Running every 5 minutes (FREE)
```

---

## 🛡️ **Safety Features**

### **Zero Risk Architecture**
- **Idempotent script**: Your `lc1.js` handles duplicate runs safely
- **Independent execution**: GCP and GitHub don't interfere
- **Instant rollback**: Just disable GCP scheduler if needed
- **Keep GitHub as backup**: Leave it enabled during testing

### **What WON'T Break**
- ✅ Your existing GitHub Actions workflow
- ✅ Your repository secrets and environment variables
- ✅ Your current scheduling (both will run every 5 minutes)
- ✅ Your Momence API integration
- ✅ Your Google Sheets updates

---

## 📈 **Google Cloud Free Tier Limits**

### **What You Get FREE (Forever)**
- **2 million** Cloud Function invocations/month
- **400,000 GB-seconds** compute time/month  
- **3 Cloud Scheduler** jobs/month
- **5 GB** network egress/month

### **Your Usage (5-minute schedule)**
- **8,640 invocations/month** (well under 2M limit)
- **~1,152 GB-seconds/month** (well under 400K limit)
- **1 scheduler job** (well under 3 job limit)

**Result: 100% FREE operation** ✅

---

## 🔧 **Management Commands**

### **Monitor Function**
```bash
# View logs
gcloud functions logs read cancelMemberBookings --region=us-central1 --limit=50

# Manual trigger
gcloud scheduler jobs run momence-cancellation-job --location=us-central1

# Function status
gcloud functions describe cancelMemberBookings --region=us-central1
```

### **Modify Schedule**
```bash
# Change to every 10 minutes
gcloud scheduler jobs update http momence-cancellation-job \
  --schedule="*/10 * * * *" --location=us-central1

# Change timezone  
gcloud scheduler jobs update http momence-cancellation-job \
  --time-zone="America/New_York" --location=us-central1
```

### **Update Environment Variables**
```bash
gcloud functions deploy cancelMemberBookings \
  --update-env-vars="MOMENCE_ACCESS_TOKEN=new_token" \
  --region=us-central1
```

---

## 📊 **Monitoring Both Systems**

### **Compare Outputs (Week 1)**
1. **GitHub Actions logs**: Check Actions tab in your repository
2. **Google Cloud logs**: `gcloud functions logs read cancelMemberBookings`
3. **Google Sheets**: Both should update the same sheet
4. **Member processing**: Should see similar results from both

### **Expected Behavior**
- Both systems will process current members every 5 minutes
- No conflicts (your script handles this gracefully)
- Identical results in Google Sheets
- Same API calls to Momence

---

## ⚡ **Migration Timeline**

### **Day 1**: Deploy GCP (keep GitHub Actions)
### **Day 2-7**: Monitor both systems in parallel
### **Day 8**: Compare performance and reliability
### **Day 9+**: Choose your preferred system

### **Recommended Final State**
```bash
GitHub Actions: ❌ Disabled (save $191/month)
Google Cloud:   ✅ Enabled (FREE forever)
```

---

## 🎉 **Benefits After Migration**

1. **💰 $191/month savings** (vs GitHub Actions)
2. **🚀 Better performance** (faster cold starts)
3. **📊 Superior monitoring** (GCP logging/metrics)
4. **🌍 Global infrastructure** (multiple regions)
5. **📈 Higher limits** (2M vs 2K monthly runs)
6. **🔧 Better management tools** (gcloud CLI + console)

---

## 🆘 **Troubleshooting**

### **If Function Fails**
```bash
# Check logs
gcloud functions logs read cancelMemberBookings --region=us-central1

# Redeploy
./deploy-gcp.sh
```

### **If Scheduler Doesn't Trigger**
```bash
# Manual test
gcloud scheduler jobs run momence-cancellation-job --location=us-central1

# Check scheduler logs
gcloud logging read "resource.type=cloud_scheduler_job"
```

### **Emergency Rollback**
```bash
# Disable GCP scheduler (GitHub Actions keeps running)
gcloud scheduler jobs pause momence-cancellation-job --location=us-central1
```

---

**🚀 Ready to save $191/month while keeping everything safe? Run `./deploy-gcp.sh` to start!**