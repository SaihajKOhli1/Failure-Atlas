# GitHub OAuth Setup - Quick Start Guide

## Summary

GitHub OAuth authentication has been implemented with secure HTTP-only cookie sessions. Users can now sign in with GitHub to access their journals across devices.

---

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

**New dependencies added**:
- `httpx==0.25.2`
- `python-jose[cryptography]==3.3.0`
- `python-multipart==0.0.6`

### 2. Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name**: `BugJournal Local Dev` (or any name)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/auth/github/callback`
4. Click **"Register application"**
5. Copy the **Client ID** and generate a **Client Secret**

### 3. Configure Environment Variables

Create/update `backend/.env`:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/failure_atlas

# GitHub OAuth (REQUIRED)
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback

# Frontend URL (for CORS and redirects)
FRONTEND_URL=http://localhost:3000

# JWT Secret (optional - auto-generated if not set)
SECRET_KEY=your-random-secret-key-here

# Dev mode: Allow X-User-Id header fallback (optional, default: false)
DEV_MODE=false

# Environment (for secure cookies: "development" or "production")
ENVIRONMENT=development
```

**Important**: 
- Set `ENVIRONMENT=production` and use HTTPS in production for secure cookies
- Keep `DEV_MODE=false` in production (set to `true` only for development/testing)

### 4. Run Database Migration

The database migration runs automatically on startup via `init_db()`. It will:
- Add `github_id`, `github_username`, `github_name`, `github_avatar_url` columns to `users` table
- Create index on `github_id`

To manually run:
```bash
cd backend
python -c "from app.db import init_db; init_db()"
```

### 5. Start Backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

---

## Frontend Setup

### 1. Configure Environment Variables (Optional)

**Step 1**: Copy the example file:
```bash
cd frontend
cp .env.example .env.local
```

**Step 2**: Edit `frontend/.env.local` if needed (has defaults):

```env
# Backend API base URL
# Default: http://127.0.0.1:8000
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

**Note**: The frontend will work with default values, but you can override `NEXT_PUBLIC_API_BASE_URL` if your backend runs on a different URL.

**Important**: 
- ⚠️ **Never commit `.env.local` files to git** (they're in `.gitignore`)
- `NEXT_PUBLIC_*` variables are exposed to the browser - **do not put secrets here**

### 2. Start Frontend

```bash
cd frontend
npm run dev
```

---

## Testing the OAuth Flow

### 1. Test Sign In

1. Visit `http://localhost:3000`
2. Click **"Sign in with GitHub"** button
3. Should redirect to GitHub authorization page
4. Authorize the app
5. Should redirect back to `/journal` with your repos loaded

### 2. Test Session Persistence

1. Sign in via GitHub
2. Close browser
3. Reopen and visit `/journal`
4. Should still be signed in (session cookie persists)

### 3. Test Sign Out

1. Go to Settings tab in `/journal`
2. Click **"Sign Out"** button
3. Session should be cleared
4. `/journal` should show "Sign in with GitHub" button

### 4. Test Dev Mode (Optional)

If `DEV_MODE=true` in backend `.env`:

1. Can still use `X-User-Id` header for API testing:
   ```bash
   curl -H "X-User-Id: your-uuid-here" http://localhost:8000/repos
   ```
2. Frontend can fall back to anonymous user creation if needed

---

## API Endpoints

### Authentication

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/auth/github/start` | No | Redirects to GitHub OAuth |
| GET | `/auth/github/callback` | No | OAuth callback (sets cookie) |
| POST | `/auth/logout` | No | Clears session cookie |
| GET | `/auth/me` | Yes (session) | Get current user info |
| POST | `/auth/anon` | No | Create anonymous user (legacy) |

### User Info

**`GET /auth/me`** returns:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2024-01-15T10:30:00Z",
  "github_id": "12345678",
  "github_username": "yourusername",
  "github_name": "Your Name",
  "github_avatar_url": "https://avatars.githubusercontent.com/u/12345678"
}
```

---

## Files Changed

### Backend
- ✅ `backend/requirements.txt` - Added dependencies
- ✅ `backend/app/auth.py` - **NEW** - Auth utilities
- ✅ `backend/app/models.py` - Added GitHub fields
- ✅ `backend/app/main.py` - Updated endpoints, `get_user_id()` function
- ✅ `backend/app/schemas.py` - Added `UserOut` schema
- ✅ `backend/app/db.py` - Added GitHub columns migration

### Frontend
- ✅ `frontend/app/auth/github/callback/page.tsx` - **NEW** - OAuth callback page
- ✅ `frontend/app/journal/page.tsx` - Updated to use session auth
- ✅ `frontend/app/page.tsx` - Added "Sign in with GitHub" button

---

## Migration Notes

### Existing Anonymous Users

**Behavior**:
- Existing anonymous users (UUID-only, no `github_id`) remain in database
- They can still use the app if `DEV_MODE=true` and `X-User-Id` header is provided
- **No automatic conversion**: Anonymous users must sign in with GitHub to get persistent sessions

**Optional Migration**:
To link an anonymous user to a GitHub account:
1. User signs in with GitHub → creates new user record
2. Old anonymous user remains in database (no data loss)
3. User's repos/votes/comments are now associated with GitHub user

**Recommendation**: 
- In production, require GitHub OAuth for new sign-ups
- Allow anonymous users to continue using `DEV_MODE=true` only for testing
- Consider adding a migration script later to link anonymous users to GitHub accounts

---

## Troubleshooting

### OAuth callback fails

**Error**: `Failed to exchange GitHub code`

**Check**:
1. `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set correctly
2. `GITHUB_REDIRECT_URI` matches GitHub OAuth app callback URL exactly
3. GitHub OAuth app is registered and secret is valid

### Session cookie not set

**Check**:
1. Backend CORS allows `credentials: true`
2. Frontend uses `credentials: 'include'` in fetch calls
3. `FRONTEND_URL` matches frontend domain
4. In production, use HTTPS and set `ENVIRONMENT=production`

### Dev mode X-User-Id header not working

**Check**:
1. `DEV_MODE=true` in backend `.env`
2. Header is `X-User-Id` (case-sensitive)
3. User ID is valid UUID format

---

## Production Deployment

### Backend Environment Variables

Create `backend/.env` with production values:

```env
# Required
GITHUB_CLIENT_ID=prod_client_id
GITHUB_CLIENT_SECRET=prod_client_secret
DATABASE_URL=postgresql://user:password@host:port/database

# Production settings
GITHUB_REDIRECT_URI=https://yourdomain.com/auth/github/callback
FRONTEND_URL=https://yourdomain.com
SECRET_KEY=strong-random-secret-key  # Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
ENVIRONMENT=production
DEV_MODE=false
```

### Frontend Environment Variables

Create `frontend/.env.local` (optional, if backend URL differs):

```env
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

### GitHub OAuth App (Production)

1. Create new OAuth app or update existing at https://github.com/settings/developers
2. Set **Authorization callback URL** to: `https://yourdomain.com/auth/github/callback`
3. Use production client ID and secret

### Secure Cookies

With `ENVIRONMENT=production`:
- Cookies are `Secure` (HTTPS only)
- Cookies have `SameSite=Lax` (CSRF protection)
- JWT tokens expire after 30 days

### Security Checklist

- ✅ `SECRET_KEY` is set (not auto-generated)
- ✅ `ENVIRONMENT=production` (HTTPS cookies)
- ✅ `DEV_MODE=false` (no header fallback)
- ✅ `.env` files are not committed to git
- ✅ HTTPS is enabled (required for secure cookies)

---

## Status

✅ **Backend Implementation**: Complete  
✅ **Frontend Implementation**: Complete  
✅ **Documentation**: Complete

**Ready for testing!**

