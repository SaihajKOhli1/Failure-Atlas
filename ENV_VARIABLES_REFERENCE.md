# Environment Variables Reference

## Backend Environment Variables

All backend environment variables are read from the `.env` file (loaded via `python-dotenv`).

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID (from GitHub OAuth app settings) | `a1b2c3d4e5f6g7h8i9j0` |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret (from GitHub OAuth app settings) | `secret123456789abcdefghijklmnopqrstuvwxyz` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/failure_atlas` |

**Note**: If `GITHUB_CLIENT_ID` or `GITHUB_CLIENT_SECRET` are missing, GitHub OAuth endpoints will return errors. The app will start but OAuth won't work.

### Optional Variables (with defaults)

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `GITHUB_REDIRECT_URI` | GitHub OAuth callback URL | `http://localhost:3000/auth/github/callback` | Must match GitHub OAuth app callback URL |
| `FRONTEND_URL` | Frontend URL (for CORS and redirects) | `http://localhost:3000` | Used in CORS middleware and OAuth redirects |
| `SECRET_KEY` | JWT token signing key | Auto-generated (random) | **Set this in production!** Generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| `ENVIRONMENT` | Environment mode | Not set (defaults to HTTP cookies) | Set to `production` for HTTPS-only cookies (`Secure` flag) |
| `DEV_MODE` | Enable X-User-Id header fallback | `false` | Set to `true` for development/testing (allows `X-User-Id` header as fallback) |

### Variable Details

#### `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`

**Required for**: GitHub OAuth authentication

**How to get**:
1. Go to https://github.com/settings/developers
2. Create a new OAuth App
3. Set Authorization callback URL: `http://localhost:3000/auth/github/callback` (for local dev)
4. Copy Client ID and generate Client Secret

**Validation**: Checked at runtime when OAuth endpoints are called. If missing, endpoints return 500 error.

#### `DATABASE_URL`

**Required for**: Database connection

**Format**: `postgresql://user:password@host:port/database`

**Default**: `postgresql://postgres:postgres@localhost:5432/failure_atlas`

**Validation**: No explicit validation (SQLAlchemy will fail on connection if invalid)

#### `SECRET_KEY`

**Required for**: JWT token signing (session cookies)

**Behavior**:
- If not set: Auto-generated random key on startup (not recommended for production)
- If set: Used for JWT signing

**Generation**:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Security**: **Must be set in production** - auto-generated keys change on restart, invalidating all sessions

#### `ENVIRONMENT`

**Values**: `development` or `production` (or any other value)

**Effect**:
- If `ENVIRONMENT=production`: Cookies use `Secure` flag (HTTPS only)
- Otherwise: Cookies work over HTTP (for localhost development)

**Production**: Set to `production` when deploying with HTTPS

#### `DEV_MODE`

**Values**: `true` or `false` (case-insensitive, default: `false`)

**Effect**:
- If `DEV_MODE=true`: Allows `X-User-Id` header as fallback authentication (for testing)
- If `DEV_MODE=false`: Only session cookies are accepted (production mode)

**Security**: **Set to `false` in production** - dev mode bypasses OAuth authentication

#### `GITHUB_REDIRECT_URI`

**Default**: `http://localhost:3000/auth/github/callback`

**Usage**: Must match the callback URL configured in your GitHub OAuth app

**Production**: Set to `https://yourdomain.com/auth/github/callback`

#### `FRONTEND_URL`

**Default**: `http://localhost:3000`

**Usage**: 
- CORS allowed origins
- OAuth redirect after successful login

**Production**: Set to `https://yourdomain.com`

---

## Frontend Environment Variables

All frontend environment variables use the `NEXT_PUBLIC_*` prefix (exposed to the browser).

### Optional Variables (with defaults)

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | `http://127.0.0.1:8000` | Used for all API requests |

### Variable Details

#### `NEXT_PUBLIC_API_BASE_URL`

**Required**: No (has default)

**Usage**: Base URL for all backend API requests

**Default**: `http://127.0.0.1:8000`

**Production**: Set to your backend URL (e.g., `https://api.yourdomain.com`)

**Security Note**: This value is exposed to the browser (client-side). Do not put secrets here.

---

## Environment File Locations

### Backend

**File**: `backend/.env`

**Load Order**:
1. System environment variables
2. `.env` file (loaded by `python-dotenv` in `backend/app/db.py`)

**Git Status**: Ignored (in `.gitignore`)

**Example File**: `backend/.env.example`

### Frontend

**File**: `frontend/.env.local` (or `.env`)

**Load Order**: Next.js loads `.env.local` automatically (takes precedence over `.env`)

**Git Status**: Ignored (in `frontend/.gitignore`)

**Example File**: `frontend/.env.example`

---

## Validation and Error Handling

### Backend

**Startup Validation**:
- Warnings are printed if `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` are missing
- Warnings are printed if `SECRET_KEY` is not set in production

**Runtime Validation**:
- `/auth/github/start`: Returns 500 error if `GITHUB_CLIENT_ID` is missing
- `/auth/github/callback`: Returns 500 error if `GITHUB_CLIENT_SECRET` is missing
- OAuth endpoints fail gracefully with clear error messages

### Frontend

**No Validation**: Frontend uses defaults if env vars are not set

---

## Security Checklist

- [ ] `.env` files are in `.gitignore` (verified)
- [ ] `.env.example` files exist (no secrets)
- [ ] `SECRET_KEY` is set in production (not auto-generated)
- [ ] `ENVIRONMENT=production` in production (HTTPS cookies)
- [ ] `DEV_MODE=false` in production (no header fallback)
- [ ] `GITHUB_CLIENT_SECRET` is never exposed to browser
- [ ] No secrets in `NEXT_PUBLIC_*` variables
- [ ] No secrets in console logs (verified)

---

## Quick Setup

### Local Development

1. **Backend**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
   ```

2. **Frontend**:
   ```bash
   cd frontend
   cp .env.example .env.local
   # Edit .env.local if needed (optional, has defaults)
   ```

### Production

1. Set all required backend env vars
2. Set `ENVIRONMENT=production`
3. Set `DEV_MODE=false`
4. Set `SECRET_KEY` to a secure random string
5. Set `FRONTEND_URL` to production domain
6. Set `GITHUB_REDIRECT_URI` to production callback URL

