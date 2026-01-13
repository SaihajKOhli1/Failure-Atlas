# Railway Environment Variables - Quick Reference

## Backend Service Variables

### Required Variables

```env
DATABASE_URL=<auto-provided by Railway if using Railway Postgres>
GITHUB_CLIENT_ID=<from GitHub OAuth app>
GITHUB_CLIENT_SECRET=<from GitHub OAuth app>
SECRET_KEY=<generate: python -c "import secrets; print(secrets.token_urlsafe(32))">
```

### Recommended Production Variables

```env
ENVIRONMENT=production
FRONTEND_URL=https://your-frontend.railway.app
GITHUB_REDIRECT_URI=https://your-frontend.railway.app/auth/github/callback
DEV_MODE=false
```

### Optional Variables

```env
CORS_ORIGINS=<comma-separated origins, if needed>
```

---

## Frontend Service Variables

### Optional Variables

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend.railway.app
```

(Only needed if backend is on a separate service/URL)

---

## GitHub OAuth Callback URL

Set in GitHub OAuth app settings:
```
https://your-frontend.railway.app/auth/github/callback
```

Replace `your-frontend.railway.app` with your actual Railway frontend URL.

---

## Complete Railway Setup

1. **Backend Service** - Add these variables:
   - `DATABASE_URL` (auto-provided)
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `SECRET_KEY` (generate a secure random string)
   - `ENVIRONMENT=production`
   - `FRONTEND_URL` (your Railway frontend URL)
   - `GITHUB_REDIRECT_URI` (your Railway frontend URL + `/auth/github/callback`)
   - `DEV_MODE=false`

2. **Frontend Service** - Add this variable (if backend is separate):
   - `NEXT_PUBLIC_API_BASE_URL` (your Railway backend URL)

3. **GitHub OAuth App** - Set callback URL:
   - `https://your-frontend.railway.app/auth/github/callback`

See `RAILWAY_DEPLOYMENT.md` for detailed setup instructions.

