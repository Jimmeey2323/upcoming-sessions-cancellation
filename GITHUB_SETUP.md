# 🔄 GitHub Actions Activation Guide

## 📋 Prerequisites
1. GitHub repository with your code
2. Momence API credentials

## 🚀 Step-by-Step Setup

### 1. Push Code to GitHub
```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Add optimized member cancellation with Google Sheets"

# Add GitHub remote and push
git remote add origin https://github.com/yourusername/momence-cancellation.git
git branch -M main
git push -u origin main
```

### 2. Add Required Secrets
1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these secrets:

| Secret Name | Value |
|-------------|--------|
| `MOMENCE_ACCESS_TOKEN` | Your Momence API token |
| `MOMENCE_ALL_COOKIES` | Your complete cookie string |

### 3. Enable GitHub Actions
1. Go to **Actions** tab in your repository
2. If prompted, click **"I understand my workflows, go ahead and enable them"**
3. GitHub Actions will now be active

### 4. Test the Workflow
1. Go to **Actions** tab
2. Click on **"Momence Member Cancellation Automation"**
3. Click **"Run workflow"** → **"Run workflow"** (manual trigger)
4. Watch the execution in real-time

### 5. Verify Scheduled Execution
⚠️ **IMPORTANT: GitHub Actions Scheduling Limitations**
- While configured for every 5 minutes, GitHub Actions does not guarantee precise scheduling
- **Actual execution**: Typically every 1-3 hours (not every 5 minutes)
- This is a documented GitHub platform limitation affecting all repositories
- For immediate execution, use manual "Run workflow" button
- See [GITHUB_ACTIONS_SCHEDULE_LIMITATIONS.md](GITHUB_ACTIONS_SCHEDULE_LIMITATIONS.md) for full details

**To verify:**
- Check the **Actions** tab to see execution history
- Each run will show detailed logs and results
- Note the timing between scheduled runs (typically 1-3 hours apart)

## 🔧 Workflow Features

### ✅ What's Included:
- **Automatic scheduling** (configured for every 5 minutes, actual timing varies - see note above)
- **Manual trigger** option from GitHub UI (for immediate execution)
- **Concurrency control** - prevents overlapping runs
- **Comprehensive logging** with timestamps
- **Error handling** and failure notifications
- **Secret validation** before execution
- **Artifact upload** on failures for debugging
- **Timeout protection** (30 minutes max)

### 📊 Monitoring:
- **Real-time logs** during execution
- **Success/failure notifications**
- **Execution history** in Actions tab
- **Performance metrics** and timing
- **Error artifacts** for troubleshooting

## 🚨 Important Notes

### GitHub Actions Limits:
- **Free tier**: 2,000 minutes/month
- **Usage**: ~2 minutes per run
- **Actual schedule**: ~12-24 runs/day (every 1-3 hours) = ~50-100 minutes/month ✅
- **Well within free tier**: No billing concerns with current usage
- **Recommendation**: Monitor usage in Settings → Billing if you add more workflows

### Timezone Considerations:
- GitHub Actions uses **UTC time**
- Current cron `*/5 * * * *` is configured for every 5 minutes in UTC
- **However**: GitHub does not guarantee this timing (see scheduling limitations above)
- Actual runs occur at GitHub's discretion based on platform load

### Security Best Practices:
- ✅ Secrets are encrypted and secure
- ✅ No credentials exposed in logs
- ✅ Repository secrets are only accessible to workflows
- ✅ Workflow runs are isolated

## 📈 Expected Performance

### Timing:
- **Startup**: ~30-60 seconds (dependency installation)
- **Execution**: 1-5 minutes (depending on member count)
- **Total**: 2-6 minutes per run

### Resources:
- **CPU**: Minimal GitHub runner usage
- **Memory**: <512MB
- **Storage**: Negligible (logs only)

## 🔄 Workflow Status

After setup, you can:
1. **View live execution**: Actions tab → Latest workflow run
2. **Check results**: Google Sheets will be updated automatically
3. **Monitor performance**: Each run shows timing and statistics
4. **Debug issues**: Failed runs provide detailed logs and artifacts

## ⚡ Alternative: Reduce Frequency

If you want to run less frequently to save GitHub Actions minutes:

```yaml
# Every 30 minutes
- cron: '*/30 * * * *'

# Every hour
- cron: '0 * * * *'

# Every 2 hours
- cron: '0 */2 * * *'

# Business hours only (9 AM - 5 PM UTC, Monday-Friday)
- cron: '*/15 9-17 * * 1-5'
```

Your GitHub Actions workflow is now **production-ready** with enterprise-level features! 🎉