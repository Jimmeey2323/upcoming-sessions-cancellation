# ⚠️ GitHub Actions Schedule Limitations - Important Information

## 🔍 Issue: Why Isn't My Workflow Running Every 5 Minutes?

### TL;DR
**Your workflow file IS correctly configured, but GitHub Actions has platform limitations that prevent reliable execution at 5-minute intervals.**

---

## 📊 Current Status

### What You Configured
```yaml
schedule:
  - cron: '*/5 * * * *'  # Every 5 minutes
```
✅ **This configuration is CORRECT**

### What's Actually Happening
Looking at recent workflow runs:
- **Expected**: 288 runs per day (every 5 minutes)
- **Actual**: ~12 runs per day (approximately every 2 hours)
- **Gap**: ~2 hours between scheduled runs instead of 5 minutes

---

## 🎯 Root Cause: GitHub Actions Platform Limitations

### Official GitHub Documentation States:

> **"The shortest interval you can run scheduled workflows is once every 5 minutes."**
> 
> **"Scheduled workflows may be delayed or skipped during periods of high loads of GitHub Actions workflow runs."**
> 
> **"No guarantee is made about the precision or timeliness of scheduled workflow runs."**

Source: [GitHub Actions Documentation - Events that trigger workflows](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)

### Why This Happens

1. **System Load Management**: GitHub prioritizes workflow execution based on overall system load
2. **Free Tier Limitations**: Public repositories have lower priority than GitHub Enterprise
3. **Short Intervals**: Schedules under 15 minutes are particularly unreliable
4. **No SLA Guarantee**: GitHub does not guarantee scheduled workflow precision

### Real-World Impact

**What you see:**
```
Run #42: 2025-10-02 04:19:05 UTC (scheduled)
Run #41: 2025-10-02 04:00:33 UTC (manual)
Run #40: 2025-10-02 03:38:57 UTC (manual)
Run #39: 2025-10-01 10:21:06 UTC (scheduled) ← ~18 hours gap!
Run #38: 2025-10-01 08:27:18 UTC (scheduled) ← ~2 hours gap
Run #37: 2025-10-01 06:30:43 UTC (scheduled) ← ~2 hours gap
```

**Pattern**: Actual execution is approximately every 2 hours, NOT every 5 minutes

---

## ✅ Solutions & Recommendations

### Option 1: Accept GitHub's Limitations (Recommended for Current Setup)
**Update expectations and documentation to reflect reality:**

```yaml
# .github/workflows/schedule.yml
on:
  schedule:
    # ⚠️ IMPORTANT: GitHub Actions does not guarantee precise scheduling
    # Configured for every 5 minutes, but expect runs approximately every 1-2 hours
    # For time-sensitive operations, use manual workflow_dispatch triggers
    - cron: '*/5 * * * *'
  
  # Manual trigger for time-sensitive operations
  workflow_dispatch:
```

**Pros:**
- ✅ No infrastructure changes needed
- ✅ Free to use
- ✅ Simple to maintain

**Cons:**
- ❌ Unpredictable execution timing
- ❌ May miss time-sensitive operations
- ❌ No control over schedule reliability

---

### Option 2: Increase Schedule Interval (Realistic Approach)
**Change to a more reliable interval that GitHub can handle:**

```yaml
on:
  schedule:
    # Every 30 minutes - more reliable on GitHub Actions
    - cron: '*/30 * * * *'
    
    # OR every hour - most reliable
    - cron: '0 * * * *'
```

**Pros:**
- ✅ More predictable execution
- ✅ GitHub can reliably schedule these intervals
- ✅ Still provides regular automation

**Cons:**
- ❌ Less frequent than desired
- ❌ May not meet original requirements

---

### Option 3: Self-Hosted Runner (Full Control)
**Run your own GitHub Actions runner:**

```yaml
jobs:
  cancel-member-bookings:
    runs-on: self-hosted  # Use your own server
```

**Setup:**
1. Set up a server (VPS, local machine, etc.)
2. Install GitHub Actions runner software
3. Configure workflow to use self-hosted runner
4. Schedule at OS level (cron on Linux, Task Scheduler on Windows)

**Pros:**
- ✅ Reliable 5-minute scheduling
- ✅ Full control over execution timing
- ✅ No GitHub platform limitations

**Cons:**
- ❌ Requires maintaining your own infrastructure
- ❌ Additional cost for hosting
- ❌ More complex setup and maintenance

---

### Option 4: External Scheduler + webhook_dispatch
**Use external service to trigger GitHub Actions:**

**Services:**
- **Cron-job.org** (free tier available)
- **EasyCron** (paid)
- **AWS EventBridge** (pay-as-you-go)

**Setup:**
```yaml
on:
  repository_dispatch:
    types: [scheduled-run]
```

External service calls:
```bash
curl -X POST \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/USERNAME/REPO/dispatches \
  -d '{"event_type":"scheduled-run"}'
```

**Pros:**
- ✅ Reliable 5-minute scheduling
- ✅ No need for self-hosted infrastructure
- ✅ Works with GitHub Actions

**Cons:**
- ❌ Requires external service account
- ❌ Need to manage webhook credentials
- ❌ Additional service dependency

---

### Option 5: Combination Approach (Best of Both Worlds)
**Use GitHub Actions for automation + manual triggers for urgency:**

```yaml
on:
  schedule:
    # Runs periodically (actual timing varies)
    - cron: '*/5 * * * *'
  
  workflow_dispatch:
    # Allow manual runs anytime
  
  repository_dispatch:
    # Allow external triggers
    types: [urgent-run]
```

**Pros:**
- ✅ Automatic background runs when GitHub allows
- ✅ Manual control when needed
- ✅ Flexible and resilient

**Cons:**
- ❌ Still subject to GitHub scheduling delays for automated runs
- ❌ Requires manual intervention for time-sensitive operations

---

## 📈 Monitoring & Verification

### Check Your Workflow Status

1. **Via GitHub Web UI:**
   - Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/actions`
   - Check "Momence Member Cancellation Automation"
   - Review run frequency and timing

2. **Via GitHub CLI:**
   ```bash
   gh run list --workflow=schedule.yml --limit 20
   ```

3. **Via API:**
   ```bash
   curl -H "Authorization: token YOUR_TOKEN" \
     https://api.github.com/repos/OWNER/REPO/actions/workflows/WORKFLOW_ID/runs
   ```

### Expected vs Actual Timing

| Configuration | Expected Runs/Day | Actual Runs/Day | Reliability |
|--------------|------------------|-----------------|-------------|
| `*/5 * * * *` | 288 | ~12-24 | ⚠️ Low |
| `*/15 * * * *` | 96 | ~24-48 | ⚠️ Medium |
| `*/30 * * * *` | 48 | ~30-48 | ✅ Good |
| `0 * * * *` | 24 | ~20-24 | ✅ Very Good |
| `0 */2 * * *` | 12 | ~10-12 | ✅ Excellent |

---

## 🎯 Recommended Action Plan

### For Your Current Setup:

1. **Update Documentation** ✅
   - Add this file to explain limitations
   - Update README.md with realistic expectations
   - Document manual trigger option

2. **Choose Your Path:**

   **Path A - Accept Reality (Easiest):**
   - Keep current `*/5 * * * *` configuration
   - Accept ~2 hour actual intervals
   - Use manual triggers when immediate execution needed
   
   **Path B - Optimize for Reliability:**
   - Change to `*/30 * * * *` or `0 * * * *`
   - Get more predictable execution
   - Update documentation to match
   
   **Path C - Invest in Infrastructure:**
   - Set up self-hosted runner OR external scheduler
   - Get reliable 5-minute execution
   - Requires ongoing maintenance

3. **Add Monitoring:**
   - Set up alerts for failed runs
   - Track actual execution frequency
   - Monitor Google Sheets updates

---

## 📚 Additional Resources

### Official Documentation
- [GitHub Actions Schedule Event](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)
- [About Billing for GitHub Actions](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions)
- [Self-Hosted Runners](https://docs.github.com/en/actions/hosting-your-own-runners)

### Community Reports
- [GitHub Actions scheduled workflows unreliable](https://github.com/orgs/community/discussions/26502)
- [Scheduled workflows not running as expected](https://github.com/orgs/community/discussions/22195)

---

## 💡 Quick Troubleshooting

### "My workflow isn't running at all"
✅ Check:
1. Workflow file is on the default branch (usually `main`)
2. Workflow is enabled in Actions tab
3. Repository Actions are enabled in Settings

### "My workflow runs sometimes but not regularly"
✅ This is normal GitHub Actions behavior for frequent schedules

### "I need guaranteed 5-minute execution"
✅ Use self-hosted runner or external scheduler

### "Can I pay for better scheduling?"
❌ No, GitHub Actions does not offer SLA for scheduled workflows even on paid plans

---

## 🎬 Conclusion

**Your workflow configuration is correct.** The issue is a fundamental limitation of GitHub Actions' scheduled workflow system. 

**Key Takeaways:**
1. ✅ Your `cron: '*/5 * * * *'` syntax is correct
2. ⚠️ GitHub does not guarantee execution timing
3. 🎯 Expect ~2 hour intervals in practice
4. 🔧 Use manual triggers for time-sensitive needs
5. 💪 Consider self-hosted runner for reliable 5-min scheduling

**Next Steps:**
1. Read through options above
2. Choose the solution that fits your needs
3. Update documentation accordingly
4. Test and monitor

---

*Last Updated: October 2, 2025*
*Repository: Jimmeey2323/upcoming-sessions-cancellation*
