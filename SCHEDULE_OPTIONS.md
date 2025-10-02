# GitHub Actions Schedule Options for Cost Optimization

## Current Schedule (VERY EXPENSIVE for private repos)
```yaml
- cron: '*/5 * * * *'   # Every 5 minutes = 25,920 minutes/month ❌❌
```

## Optimized Schedules (Within FREE limits)

### Option 1: Every 30 minutes (RECOMMENDED)
```yaml
- cron: '*/30 * * * *'  # Every 30 minutes = 4,320 minutes/month ⚠️ Still over limit
```

### Option 2: Every hour (SAFE)
```yaml  
- cron: '0 * * * *'     # Every hour = 2,160 minutes/month ✅ Within free limit
```

### Option 3: Every 2 hours (VERY SAFE)
```yaml
- cron: '0 */2 * * *'   # Every 2 hours = 1,080 minutes/month ✅ Well within limit
```

### Option 4: Business hours only (OPTIMAL)
```yaml
- cron: '*/15 9-17 * * 1-5'  # Every 15 min, 9AM-5PM, Mon-Fri = 1,440 minutes/month ✅
```

### Option 5: Peak hours (SMART)
```yaml
- cron: '*/30 8-20 * * *'    # Every 30 min, 8AM-8PM daily = 1,560 minutes/month ✅
```

## Implementation
To change the schedule, edit `.github/workflows/schedule.yml` line 6:

```yaml
on:
  schedule:
    - cron: '0 */2 * * *'  # Replace with your chosen schedule
```

## Schedule Syntax Reference
```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
* * * * *
```

Examples:
- `*/15 * * * *` = Every 15 minutes
- `0 */2 * * *` = Every 2 hours at minute 0
- `*/30 9-17 * * 1-5` = Every 30 minutes from 9AM-5PM, Mon-Fri
- `0 9,12,15,18 * * *` = At 9AM, 12PM, 3PM, 6PM daily