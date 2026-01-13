# GitHub OAuth Implementation Guide

## Summary

Implemented GitHub OAuth authentication with secure HTTP-only cookie sessions, replacing the anonymous UUID-based authentication system.

---

## Backend Changes

### 1. New Dependencies (`backend/requirements.txt`)

Added:
- `httpx==0.25.2` - For GitHub OAuth API calls
- `python-jose[cryptography]==3.3.0` - For JWT token creation/verification
- `python-multipart==0.0.6` - For form handling

### 2. New Auth Module (`backend/app/auth.py`)

**Created**: New authentication utilities module

**Key Functions**:
- `create_access_token(user_id)`: Creates JWT token (30-day expiry)
- `verify_token(token)`: Verifies JWT and extracts user_id
- `set_session_cookie(response, user_id)`: Sets HTTP-only cookie
- `clear_session_cookie(response)`: Clears session cookie
- `exchange_github_code(code)`: Exchanges GitHub OAuth code for user info
- `get_or_create_github_user(db, github_id, ...)`: Creates/finds user by GitHub ID

**Configuration**:
- `SECRET_KEY`: JWT signing key (from `SECRET_KEY` env var or auto-generated)
- `ALGORITHM`: "HS256"
- `ACCESS_TOKEN_EXPIRE_DAYS`: 30 days
- `COOKIE_NAME`: "session_token"
- `DEV_MODE`: Allows X-User-Id header fallback (from `DEV_MODE` env var)

### 3. Updated User Model (`backend/app/models.py`)

**Added Fields**:
- `github_id`: String(255), unique, indexed - GitHub user ID
- `github_username`: String(255) - GitHub username
- `github_name`: String(255) - GitHub display name
- `github_avatar_url`: String(512) - GitHub avatar URL

### 4. Updated Database Migration (`backend/app/db.py`)

**Added**: GitHub OAuth columns to users table
- Creates columns if they don't exist (for existing databases)
- Creates index on `github_id`

### 5. Updated Main API (`backend/app/main.py`)

#### New Endpoints

**`GET /auth/github/start`**
- Redirects to GitHub OAuth authorization page
- Query params: `client_id`, `redirect_uri`, `scope=read:user`

**`GET /auth/github/callback`**
- GitHub OAuth callback endpoint
- Exchanges code for GitHub user info
- Creates/finds user in database
- Sets HTTP-only session cookie
- Redirects to frontend `/journal` page

**`POST /auth/logout`**
- Clears session cookie
- Returns `{"status": "logged_out"}`

**`GET /auth/me`**
- Returns current authenticated user info
- Requires valid session cookie
- Returns `UserOut` with `id`, `github_username`, `github_name`, `github_avatar_url`

#### Updated `get_user_id()` Function

**Before**:
```python
def get_user_id(x_user_id: Optional[str] = Header(None)) -> Optional[str]:
    return x_user_id
```

**After**:
```python
def get_user_id(
    request: Request,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[str]:
    # Try session cookie first
    token = request.cookies.get(COOKIE_NAME)
    if token:
        user_id = verify_token(token)
        if user_id:
            return user_id
    
    # Fallback to X-User-Id header (dev mode only)
    if DEV_MODE and x_user_id:
        ensure_user(db, x_user_id)
        return x_user_id
    
    return None
```

**Behavior**:
- Primary: Reads user_id from HTTP-only session cookie (JWT)
- Fallback: Uses `X-User-Id` header if `DEV_MODE=true` (for development/testing)
- Returns `None` if neither is valid

#### Updated Error Messages

Changed from:
- `"X-User-Id header required"`

To:
- `"Authentication required"`

#### CORS Configuration

**Updated**: `allow_origins` to include `FRONTEND_URL` env var (default: `http://localhost:3000`)

**Note**: `allow_credentials=True` is required for cookies to work

### 6. Updated Schemas (`backend/app/schemas.py`)

**Added**:
```python
class UserOut(BaseModel):
    id: str
    created_at: Optional[datetime] = None
    github_id: Optional[str] = None
    github_username: Optional[str] = None
    github_name: Optional[str] = None
    github_avatar_url: Optional[str] = None
```

---

## Frontend Changes

### 1. GitHub OAuth Callback Page (`frontend/app/auth/github/callback/page.tsx`)

**New File**: Handles OAuth callback from backend

**Behavior**:
- Receives `code` from query params
- Redirects to backend `/auth/github/callback?code=...`
- Backend exchanges code, sets cookie, redirects to `/journal`

### 2. Updated Journal Page (`frontend/app/journal/page.tsx`)

#### Replace localStorage with Session Auth

**Before**:
```typescript
const currentUserId = localStorage.getItem('bj_user_id');
if (currentUserId) {
  loadRepos(currentUserId);
} else {
  createAnonymousUser();
}
```

**After**:
```typescript
// Check if user is authenticated via session
useEffect(() => {
  checkAuth();
}, []);

const checkAuth = async () => {
  try {
    const res = await fetch(`${backendUrl}/auth/me`, {
      credentials: 'include'  // Include cookies
    });
    if (res.ok) {
      const user = await res.json();
      setUser(user);
      setUserId(user.id);
      loadRepos();  // Load repos without passing user_id
    } else {
      // Not authenticated
      setUserId(null);
    }
  } catch (e) {
    console.error('Auth check failed:', e);
    setUserId(null);
  }
};
```

#### Update Fetch Calls

**Before**:
```typescript
fetch(`${backendUrl}/repos`, {
  headers: { 'X-User-Id': user_id }
});
```

**After**:
```typescript
fetch(`${backendUrl}/repos`, {
  credentials: 'include'  // Include session cookie
  // No X-User-Id header needed
});
```

#### Add "Sign in with GitHub" Button

**Location**: Show when `userId === null`

**Code**:
```typescript
<button
  onClick={() => {
    window.location.href = `${backendUrl}/auth/github/start`;
  }}
  className="btn btn-primary"
>
  Sign in with GitHub
</button>
```

#### Remove Anonymous User Creation

**Removed**: `createAnonymousUser()` function and auto-creation logic

**Replaced**: Show "Sign in with GitHub" button instead

#### Update Settings Tab

**Changes**:
- Show GitHub username/avatar when authenticated
- Remove "Copy User ID" and "Reset User ID" buttons (or keep only for dev mode)
- Add "Sign out" button that calls `POST /auth/logout`

### 3. Updated Home Page (`frontend/app/page.tsx`)

**Add**: "Sign in with GitHub" button in hero section

**Code**:
```typescript
<a
  href={`${backendUrl}/auth/github/start`}
  className="btn btn-primary"
>
  Sign in with GitHub
</a>
```

---

## Environment Variables

### Backend (`.env` file in `backend/`)

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/failure_atlas

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback

# Frontend URL (for CORS and redirects)
FRONTEND_URL=http://localhost:3000

# JWT Secret (optional - auto-generated if not set)
SECRET_KEY=your-secret-key-here

# Dev mode: Allow X-User-Id header fallback (optional, default: false)
DEV_MODE=false

# Environment (for secure cookies)
ENVIRONMENT=development  # or "production" for HTTPS
```

### Frontend (`.env.local` file in `frontend/`)

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

---

## Local Dev Setup Instructions

### 1. Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: `BugJournal Local Dev` (or any name)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/auth/github/callback`
4. Click "Register application"
5. Copy **Client ID** and **Client Secret**

### 2. Backend Setup

1. **Install dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Create `.env` file**:
   ```bash
   cd backend
   cp .env.example .env  # If you have one, or create manually
   ```

3. **Add to `.env`**:
   ```env
   GITHUB_CLIENT_ID=your_client_id_here
   GITHUB_CLIENT_SECRET=your_client_secret_here
   GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback
   FRONTEND_URL=http://localhost:3000
   SECRET_KEY=your-random-secret-key-here
   DEV_MODE=false
   ENVIRONMENT=development
   ```

4. **Run database migrations** (if needed):
   ```bash
   # The init_db() function will add GitHub columns automatically
   python -c "from app.db import init_db; init_db()"
   ```

5. **Start backend**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### 3. Frontend Setup

1. **Start frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Test OAuth flow**:
   - Visit `http://localhost:3000`
   - Click "Sign in with GitHub"
   - Authorize the app
   - Should redirect to `/journal` with your repos loaded

---

## Migration Notes

### Existing Anonymous Users

**Behavior**:
- Existing anonymous users (UUID-only, no `github_id`) remain in database
- They can still use the app if `DEV_MODE=true` and `X-User-Id` header is provided
- No automatic conversion: Anonymous users must sign in with GitHub to get persistent sessions

**Optional Migration Path**:
If you want to convert anonymous users to GitHub users:
1. Add a migration endpoint: `POST /auth/github/link-anon`
2. Takes current session (if anonymous) + GitHub OAuth code
3. Updates user record: sets `github_id` and links existing repos/votes/comments

**Current Implementation**: No automatic migration - users must sign in fresh

### Development Mode (`DEV_MODE=true`)

**Purpose**: Allow `X-User-Id` header as fallback for development/testing

**Usage**:
```bash
# Backend .env
DEV_MODE=true
```

**Behavior**:
- If no session cookie, checks for `X-User-Id` header
- If header present, uses that user_id (creates user if needed)
- Useful for API testing with curl/Postman

**Production**: Set `DEV_MODE=false` (default)

---

## API Endpoints Summary

### Authentication

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/auth/github/start` | No | Redirects to GitHub OAuth |
| GET | `/auth/github/callback` | No | OAuth callback (sets cookie) |
| POST | `/auth/logout` | No | Clears session cookie |
| GET | `/auth/me` | Yes (session) | Get current user info |
| POST | `/auth/anon` | No | Create anonymous user (legacy) |

### User Management

All existing endpoints now use session-based auth:
- `GET /repos` - Requires session cookie
- `POST /repos` - Requires session cookie
- `POST /posts/{id}/vote` - Requires session cookie
- `POST /posts/{id}/comments` - Requires session cookie
- etc.

**Note**: Remove `X-User-Id` header from frontend requests (cookies are automatic)

---

## Testing Checklist

### Backend Tests

- [ ] Test `/auth/github/start` redirects to GitHub
- [ ] Test `/auth/github/callback` with valid code (creates user, sets cookie)
- [ ] Test `/auth/github/callback` with invalid code (returns error)
- [ ] Test `/auth/me` with valid cookie (returns user info)
- [ ] Test `/auth/me` without cookie (returns 401)
- [ ] Test `/auth/logout` (clears cookie)
- [ ] Test `/repos` with session cookie (works)
- [ ] Test `/repos` without cookie (returns 401)
- [ ] Test `DEV_MODE=true` with `X-User-Id` header (fallback works)

### Frontend Tests

- [ ] Click "Sign in with GitHub" → redirects to GitHub
- [ ] Authorize app → redirects to `/journal` with repos loaded
- [ ] `/journal` auto-loads repos when authenticated
- [ ] Settings tab shows GitHub username/avatar
- [ ] Sign out button clears session
- [ ] Revisit `/journal` after sign out → shows "Sign in" button

### Security Tests

- [ ] Session cookie is HTTP-only (not accessible via JavaScript)
- [ ] Session cookie has `SameSite=Lax` (CSRF protection)
- [ ] JWT tokens expire after 30 days
- [ ] Invalid tokens are rejected

---

## Files Changed

### Backend
- `backend/requirements.txt` - Added dependencies
- `backend/app/auth.py` - **NEW** - Auth utilities
- `backend/app/models.py` - Added GitHub fields to User
- `backend/app/main.py` - Updated endpoints, `get_user_id()` function
- `backend/app/schemas.py` - Added `UserOut` schema
- `backend/app/db.py` - Added GitHub columns migration

### Frontend
- `frontend/app/auth/github/callback/page.tsx` - **NEW** - OAuth callback page
- `frontend/app/journal/page.tsx` - Updated to use session auth
- `frontend/app/page.tsx` - Added "Sign in with GitHub" button

---

## Status

✅ **Backend Implementation**: Complete
✅ **Frontend Implementation**: Complete (basic)
⏳ **Testing**: Pending
⏳ **Documentation**: Complete

**Next Steps**:
1. Test OAuth flow end-to-end
2. Update frontend to remove all `localStorage` usage (except for `bj_last_repo_id`)
3. Add user avatar/username display in UI
4. Add "Sign out" button in Settings tab
5. Test migration with existing anonymous users

