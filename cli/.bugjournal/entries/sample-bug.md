---
title: Database connection timeout in production
product: BugJournal
year: 2026
category: bug
cause: configuration
severity: high
tags: [bug, production, database, urgent]
status: open
---

# Description

Database connections are timing out after 30 seconds in production environment, causing API requests to fail intermittently.

## Steps to Reproduce

1. Deploy application to production
2. Wait for normal traffic load
3. Observe timeout errors in logs after ~30 seconds of inactivity

## Expected Behavior

Database connections should remain alive or be properly pooled with automatic reconnection.

## Actual Behavior

Connections timeout and are not automatically reconnected, causing request failures.

## Additional Context

- Occurs only in production environment
- Development environment uses local database
- Connection pool size: 10
- Timeout setting: 30 seconds
