---
title: Fix CORS error when accessing API from frontend
product: BugJournal
year: 2026
category: bug
cause: configuration
severity: medium
tags: [bug, cors, frontend, fixed]
status: fixed
---

# Description

Frontend was unable to make requests to the backend API due to CORS (Cross-Origin Resource Sharing) errors.

## Root Cause

Backend CORS middleware was not configured to allow requests from the frontend origin (http://localhost:3000).

## Solution

Updated backend CORS configuration to:
- Allow origin: http://localhost:3000
- Enable credentials: true
- Allow all methods and headers

## Testing

- Verified frontend can make GET/POST requests
- Confirmed cookies are sent with requests
- Tested with multiple browsers
