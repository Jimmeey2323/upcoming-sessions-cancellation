# ⚡ Quick Reference Guide

## 🔥 Most Common Questions

### Q: Why isn't my workflow running every 5 minutes?
**A:** This is normal GitHub Actions behavior. See [GITHUB_ACTIONS_SCHEDULE_LIMITATIONS.md](GITHUB_ACTIONS_SCHEDULE_LIMITATIONS.md)

**Quick Facts:**
- ✅ Configuration is correct
- ⚠️ GitHub doesn't guarantee timing
- 📊 Expect runs every 1-3 hours (not 5 minutes)
- 🎮 Use manual trigger for immediate execution

---

### Q: How do I run the workflow immediately?
**A:** Go to Actions tab → "Momence Member Cancellation Automation" → "Run workflow" button

---

### Q: Is my configuration wrong?
**A:** No, your configuration is correct. This is a GitHub platform limitation.

---

### Q: What can I do about it?
**A:** See [GITHUB_ACTIONS_SCHEDULE_LIMITATIONS.md](GITHUB_ACTIONS_SCHEDULE_LIMITATIONS.md) for 5 solution options:
1. Accept it + use manual triggers (easiest)
2. Change to 30min/1hr schedule (more reliable)
3. Self-hosted runner (full control)
4. External scheduler (reliable, no infrastructure)
5. Combination approach (best flexibility)

---

## 📚 Documentation Index

| File | Purpose | Size |
|------|---------|------|
| [README.md](README.md) | Main project overview | 7.5KB |
| [ISSUE_RESOLUTION_SUMMARY.md](ISSUE_RESOLUTION_SUMMARY.md) | Why script not running every 5min | 6.9KB |
| [GITHUB_ACTIONS_SCHEDULE_LIMITATIONS.md](GITHUB_ACTIONS_SCHEDULE_LIMITATIONS.md) | Complete guide to scheduling issue | 9KB |
| [GITHUB_SETUP.md](GITHUB_SETUP.md) | GitHub Actions setup guide | 4.4KB |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Complete deployment guide | 6.1KB |
| [OAUTH_SETUP.md](OAUTH_SETUP.md) | Google OAuth configuration | 4.5KB |
| [SCHEDULE_OPTIONS.md](SCHEDULE_OPTIONS.md) | Schedule interval options | 1.8KB |

---

## 🎯 Quick Commands

### Local Testing
```bash
npm start                    # Single run
npm run schedule            # Local scheduler
```

### Manual GitHub Actions Trigger
1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/actions`
2. Click "Momence Member Cancellation Automation"
3. Click "Run workflow" → "Run workflow"

### Check Last Run
```bash
gh run list --workflow=schedule.yml --limit 5
```

### View Workflow Logs
```bash
gh run view <RUN_ID> --log
```

---

## 🚨 Troubleshooting

| Issue | Solution | Doc Link |
|-------|----------|----------|
| Workflow not running frequently | This is normal | [Schedule Limits](GITHUB_ACTIONS_SCHEDULE_LIMITATIONS.md) |
| Need immediate run | Use manual trigger | [GitHub Setup](GITHUB_SETUP.md) |
| Secrets missing | Add in repo settings | [GitHub Setup](GITHUB_SETUP.md) |
| Google Sheets error | Check OAuth credentials | [OAuth Setup](OAUTH_SETUP.md) |
| Momence API error | Update token/cookies | [Deployment Guide](DEPLOYMENT_GUIDE.md) |

---

## 🔗 External Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Schedule Event Docs](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)
- [Cron Expression Syntax](https://crontab.guru/)

---

## ⚡ TL;DR

**Your workflow is configured correctly but GitHub Actions doesn't guarantee scheduled timing. This is normal and documented.**

**What to do:**
1. Read [ISSUE_RESOLUTION_SUMMARY.md](ISSUE_RESOLUTION_SUMMARY.md) for quick overview
2. Read [GITHUB_ACTIONS_SCHEDULE_LIMITATIONS.md](GITHUB_ACTIONS_SCHEDULE_LIMITATIONS.md) for solutions
3. Use manual triggers when you need immediate execution
4. Accept ~2 hour intervals for automated runs OR implement alternative solution

---

*Last updated: October 2, 2025*
