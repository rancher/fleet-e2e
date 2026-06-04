---
name: troubleshoot-ci-failures
description: Debug GitHub Actions CI test failures
---

# CI Diagnostics Commands

```bash
gh run list --limit 10
gh run view <run-id>
gh run view <run-id> --log
gh run download <run-id>
```

# Common Issues

**Wrong selector**: Check actual DOM elements vs test selectors
**Timing**: CI slower than local - check if elements exist before timeouts
**Resources**: CI has 8 CPU, 32GB RAM
**Network**: Different connectivity than local

# Debug Steps

1. Check screenshots/videos in artifacts
2. Compare with passing run logs
3. Check if selector/element actually exists in UI
4. Verify test waits for elements to load, not just arbitrary timeouts

# CRITICAL: When User Says "Check X"

When user says "check X" (selectors, logs, timing, etc.) → DO EXACTLY THAT. Don't guess, don't add timeouts.

**Example - "check selectors" or "is it a locator issue?":**
1. Read test code - find actual selector string
2. Check screenshot/DOM for actual element
3. Compare selector vs element attributes
4. Fix selector, don't add waits

**Do what user says. Not what seems easier.**
