# Railway Deployment Guide

## Overview

This guide covers deploying the Failure Atlas application to Railway with GitHub OAuth authentication.

---

## Architecture

Railway deployment consists of two services:
1. **Backend** (FastAPI) - API server with database
2. **Frontend** (Next.js) - Web application

---

## Backend Service Configuration

### Required Environment Variables

Set these in Railway's backend service environment variables:

| Variable | Description | Example/Notes |
|----------|-------------|---------------|
| `DATABASE_URL` | PostgreSQL connection string | **Auto-provided by Railway** if using Railway Postgres. Otherwise: `postgresql://user:pass@host:port/db` |
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID | From GitHub OAuth app settings |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret | From GitHub OAuth app settings |
| `SECRET_KEY` | JWT token signing key | **REQUIRED in production**. Generate: `python -c "import secrets; print(secrets.token_urlsafe(32))"` |

### Optional Environment Variables

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `ENVIRONMENT` | Environment mode | Not set | Set to `production` for secure cookies (HTTPS) |
| `FRONTEND_URL` | Frontend URL for CORS/redirects | `http://localhost:3000` | Set to your Railway frontend URL (e.g., `https://yourapp.railway.app`) |
| `GITHUB_REDIRECT_URI` | GitHub OAuth callback URL | `http://localhost:3000/auth/github/callback` | Set to `https://yourapp.railway.app/auth/github/callback` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `FRONTEND_URL` | Additional origins if needed (e.g., custom domain) |
| `DEV_MODE` | Enable X-User-Id header fallback | `false` | **Must be `false` in production** |

### Railway Backend Environment Variables (Recommended)

```env
# Required
DATABASE_URL=<auto-provided by Railway Postgres>
GITHUB_CLIENT_ID=your_production_github_client_id
GITHUB_CLIENT_SECRET=your_production_github_client_secret
SECRET_KEY=<generate a secure random string>

# Production settings
ENVIRONMENT=production
FRONTEND_URL=https://yourapp.railway.app
GITHUB_REDIRECT_URI=https://yourapp.railway.app/auth/github/callback
DEV_MODE=false
```

---

## Frontend Service Configuration

### Required Environment Variables

**None** - Frontend works with defaults.

### Optional Environment Variables

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | `http://127.0.0.1:8000` | Set to your Railway backend URL (e.g., `https://backend.railway.app`) |

### Railway Frontend Environment Variables (Recommended)

```env
# Optional (only if backend URL differs from default)
NEXT_PUBLIC_API_BASE_URL=https://backend.railway.app
```

**Note**: If backend and frontend are on the same Railway service, you can use relative URLs or Railway's internal networking.

---

## GitHub OAuth App Configuration

### Create Production OAuth App

1. Go to https://github.com/settings/developers
2. Click **"New OAuth App"** (or edit existing)
3. Fill in:
   - **Application name**: `Failure Atlas Production` (or your app name)
   - **Homepage URL**: `https://yourapp.railway.app`
   - **Authorization callback URL**: `https://yourapp.railway.app/auth/github/callback`
4. Click **"Register application"**
5. Copy **Client ID** and generate **Client Secret**

### Update Railway Variables

Set in Railway backend service:
- `GITHUB_CLIENT_ID` = Your production OAuth app Client ID
- `GITHUB_CLIENT_SECRET` = Your production OAuth app Client Secret
- `GITHUB_REDIRECT_URI` = `https://yourapp.railway.app/auth/github/callback`

---

## Railway Setup Steps

### 1. Create Railway Project

1. Sign in to [Railway](https://railway.app)
2. Create a new project
3. Add two services:
   - **Backend** (from GitHub repo, root directory: `backend/`)
   - **Frontend** (from GitHub repo, root directory: `frontend/`)

### 2. Add Database (Backend)

1. In Railway project, click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway automatically provides `DATABASE_URL` to services that need it
3. Connect backend service to the database

### 3. Configure Backend Service

1. Go to backend service settings
2. Add environment variables (see "Railway Backend Environment Variables" above)
3. Set **Root Directory** to `backend` (if not already set)
4. Set **Start Command** (if needed): `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 4. Configure Frontend Service

1. Go to frontend service settings
2. Add environment variables (see "Railway Frontend Environment Variables" above)
3. Set **Root Directory** to `frontend` (if not already set)
4. Railway automatically detects Next.js and builds/runs it

### 5. Get Railway URLs

1. Backend service: Railway provides a public URL (e.g., `https://backend-production-xxxx.up.railway.app`)
2. Frontend service: Railway provides a public URL (e.g., `https://frontend-production-yyyy.up.railway.app`)
3. Or use Railway's custom domain feature for a single domain

### 6. Update Environment Variables

**Backend**:
- `FRONTEND_URL` = Your Railway frontend URL
- `GITHUB_REDIRECT_URI` = `https://your-frontend-url.railway.app/auth/github/callback`
- `CORS_ORIGINS` = Your frontend URL (or comma-separated if multiple)

**Frontend** (if backend is on different service):
- `NEXT_PUBLIC_API_BASE_URL` = Your Railway backend URL

### 7. Generate SECRET_KEY

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copy the output and set as `SECRET_KEY` in Railway backend environment variables.

---

## Cookie & Session Configuration

### Railway Proxy Setup

Railway runs services behind a proxy. The backend automatically:
- Detects production environment (`ENVIRONMENT=production` or `RAILWAY_ENVIRONMENT=production`)
- Sets `Secure` flag on cookies (HTTPS only)
- Uses `SameSite=Lax` for OAuth compatibility
- Sets cookies without a domain (works with Railway's proxy)

### CORS Configuration

- Backend allows credentials (`allow_credentials=True`)
- CORS origins are configurable via `CORS_ORIGINS` or `FRONTEND_URL`
- Frontend includes cookies in requests (`credentials: 'include'`)

---

## Custom Domain Setup (Optional)

If using a custom domain:

1. Configure custom domain in Railway (frontend service)
2. Update GitHub OAuth app callback URL to custom domain
3. Update Railway environment variables:
   - Backend: `FRONTEND_URL` = `https://yourcustomdomain.com`
   - Backend: `GITHUB_REDIRECT_URI` = `https://yourcustomdomain.com/auth/github/callback`
   - Backend: `CORS_ORIGINS` = `https://yourcustomdomain.com`

---

## Verification Checklist

After deployment:

- [ ] Backend service is running (check Railway logs)
- [ ] Frontend service is running (check Railway logs)
- [ ] Database is connected (check backend logs for connection errors)
- [ ] All required environment variables are set (backend logs show no missing vars)
- [ ] GitHub OAuth app callback URL matches Railway frontend URL
- [ ] `SECRET_KEY` is set (not auto-generated)
- [ ] `ENVIRONMENT=production` is set (for secure cookies)
- [ ] `DEV_MODE=false` is set
- [ ] OAuth flow works: Sign in → Redirect → Session cookie set
- [ ] Session persists across page reloads
- [ ] CORS works (no CORS errors in browser console)

---

## Troubleshooting

### Backend fails to start

**Error**: `Missing required environment variables`

**Fix**: Set all required variables in Railway backend service settings:
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `DATABASE_URL` (usually auto-provided)
- `SECRET_KEY` (in production)

### OAuth callback fails

**Check**:
1. `GITHUB_REDIRECT_URI` matches GitHub OAuth app callback URL exactly
2. GitHub OAuth app is configured for production URL
3. Frontend URL is correct in backend `FRONTEND_URL` variable

### Session cookies not working

**Check**:
1. `ENVIRONMENT=production` is set (enables `Secure` flag)
2. Frontend uses HTTPS (Railway provides HTTPS automatically)
3. CORS allows credentials (already configured)
4. Frontend includes `credentials: 'include'` in fetch calls (already implemented)

### CORS errors

**Check**:
1. `FRONTEND_URL` or `CORS_ORIGINS` includes your frontend URL
2. Frontend URL matches exactly (including protocol: `https://`)
3. No trailing slashes in URLs

---

## Environment Variables Summary

### Backend Service (Railway)

**Required**:
- `DATABASE_URL` (auto-provided if using Railway Postgres)
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `SECRET_KEY`

**Recommended**:
- `ENVIRONMENT=production`
- `FRONTEND_URL=https://yourapp.railway.app`
- `GITHUB_REDIRECT_URI=https://yourapp.railway.app/auth/github/callback`
- `DEV_MODE=false`

### Frontend Service (Railway)

**Required**: None

**Optional**:
- `NEXT_PUBLIC_API_BASE_URL=https://backend.railway.app` (if backend is separate service)

---

## Production Callback URLs

**GitHub OAuth App Callback URL**:
```
https://your-frontend-url.railway.app/auth/github/callback
```

Replace `your-frontend-url.railway.app` with your actual Railway frontend URL or custom domain.

---

## Security Notes

- ✅ `SECRET_KEY` is set (not auto-generated in production)
- ✅ `ENVIRONMENT=production` enables secure cookies
- ✅ `DEV_MODE=false` disables header fallback
- ✅ Cookies use `Secure` flag (HTTPS only)
- ✅ Cookies use `HttpOnly` flag (not accessible via JavaScript)
- ✅ Cookies use `SameSite=Lax` (CSRF protection)
- ✅ No secrets in `NEXT_PUBLIC_*` variables
- ✅ Database credentials are auto-provided by Railway (not exposed)

---

## Quick Reference

**Backend Railway Variables**:
```env
DATABASE_URL=<auto>
GITHUB_CLIENT_ID=<from GitHub>
GITHUB_CLIENT_SECRET=<from GitHub>
SECRET_KEY=<generate>
ENVIRONMENT=production
FRONTEND_URL=<railway frontend URL>
GITHUB_REDIRECT_URI=<railway frontend URL>/auth/github/callback
DEV_MODE=false
```

**Frontend Railway Variables**:
```env
NEXT_PUBLIC_API_BASE_URL=<railway backend URL>  # Optional
```

**GitHub OAuth Callback URL**:
```
https://<railway-frontend-url>/auth/github/callback
```

