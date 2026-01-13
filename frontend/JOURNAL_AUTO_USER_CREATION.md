# Journal Page - Auto User Creation Fix

## Issue

When `localStorage` key `bj_user_id` is missing, the `/journal` page showed a manual user ID prompt. Backend endpoints `GET /repos` and `POST /repos` require `X-User-Id` header, so the journal couldn't load without a user ID.

## Solution

Updated `/journal` to **automatically create an anonymous user** on first load when `bj_user_id` is missing, using `POST /auth/anon`.

---

## Changes Made

### 1. Auto-Create User on Mount

**Before**: Showed manual user ID prompt if `bj_user_id` missing  
**After**: Automatically calls `POST /auth/anon` to create user

**Implementation**:
```typescript
useEffect(() => {
  const currentUserId = localStorage.getItem('bj_user_id');
  if (currentUserId) {
    setUserId(currentUserId);
    loadRepos(currentUserId);
  } else {
    // Automatically create anonymous user
    createAnonymousUser();
  }
}, []);
```

### 2. New `createAnonymousUser` Function

Handles automatic user creation:
- Shows loading state: "Creating your account..."
- Calls `POST /auth/anon`
- Stores `user_id` in `localStorage` as `bj_user_id`
- Proceeds to load repos
- On error: Shows fallback modal with manual entry option

```typescript
const createAnonymousUser = async () => {
  setIsLoadingRepos(true);
  setError(null);
  try {
    const res = await fetch(`${backendUrl}/auth/anon`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (res.ok) {
      const data = await res.json();
      const user_id = data.user_id;
      localStorage.setItem('bj_user_id', user_id);
      setUserId(user_id);
      loadRepos(user_id);
    } else {
      // Failed - show error and allow manual entry
      setError(`Failed to create user ID (${res.status}). You can enter one manually.`);
      setShowUserIdPrompt(true);
    }
  } catch (e) {
    // Network error - show error and allow manual entry
    setError('Failed to connect to backend. Please check your connection or enter a user ID manually.');
    setShowUserIdPrompt(true);
  } finally {
    setIsLoadingRepos(false);
  }
};
```

### 3. Loading States

**Creating User** (no user_id yet):
- Shows: "Creating your account..."
- Subtext: "This may take a moment."

**Loading Repos** (user_id exists):
- Shows: "Loading repositories..."

**No Demo Content**: Zero hardcoded repo data shown during any loading state.

### 4. Error Handling

If `POST /auth/anon` fails:
- Shows error message in modal
- Modal title: "User ID Required"
- Options:
  1. Enter existing user ID manually
  2. Click "Try Again" to retry automatic creation

### 5. Empty State

When repos are empty (after successful user creation):
- Header shows: "No repo connected yet"
- Main content: "Your Journal" with "Connect GitHub" button
- **No demo/placeholder repo data**

---

## Backend URL Configuration

**Current Setup**:
```typescript
const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
```

**For Development**:
- Default: `http://127.0.0.1:8000` (direct backend connection)
- Can be overridden with `NEXT_PUBLIC_API_BASE_URL` environment variable
- **No proxy needed**: Direct connection works because:
  - Backend CORS is enabled (allows `*` origins)
  - Backend runs on `http://127.0.0.1:8000`
  - Frontend runs on `http://localhost:3000`
  - Browser allows cross-origin requests to different ports

**For Production**:
- Set `NEXT_PUBLIC_API_BASE_URL` to production backend URL (e.g., `https://api.example.com`)
- Or use Next.js API routes to proxy requests

**Verification**:
- Check browser Network tab: `POST http://127.0.0.1:8000/auth/anon` should appear
- If CORS errors: Check backend CORS configuration
- If connection refused: Ensure backend is running on port 8000

---

## Flow Diagram

```
1. User visits /journal
   │
   ├─ bj_user_id exists?
   │  ├─ YES → Load repos
   │  └─ NO  → Auto-create user
   │     │
   │     ├─ POST /auth/anon
   │     │
   │     ├─ Success?
   │     │  ├─ YES → Store user_id → Load repos
   │     │  └─ NO  → Show error modal (manual entry fallback)
   │
2. Load repos (GET /repos with X-User-Id)
   │
   ├─ Repos exist?
   │  ├─ YES → Show repos list
   │  └─ NO  → Show "No repo connected yet" state
```

---

## Manual Test Steps

### Test 1: Auto-Create User on First Visit

1. **Clear localStorage**:
   ```javascript
   // In browser console:
   localStorage.removeItem('bj_user_id');
   localStorage.clear(); // Or clear all
   ```

2. **Reload `/journal` page**

3. **Expected Behavior**:
   - ✅ Shows "Creating your account..." message
   - ✅ Calls `POST /auth/anon` automatically
   - ✅ Stores `user_id` in `localStorage` as `bj_user_id`
   - ✅ Proceeds to load repos (shows "Loading repositories...")
   - ✅ If no repos: Shows "No repo connected yet" state
   - ✅ **NO manual prompt appears** (unless creation fails)

4. **Verify localStorage**:
   ```javascript
   // In browser console:
   localStorage.getItem('bj_user_id');
   // Should show a UUID string
   ```

5. **Reload page again**:
   - ✅ Should skip "Creating your account..." (user_id exists)
   - ✅ Shows "Loading repositories..." immediately

### Test 2: Error Handling (Backend Offline)

1. **Stop backend server**:
   ```bash
   # Kill backend process
   ```

2. **Clear localStorage and reload `/journal`**:
   ```javascript
   localStorage.removeItem('bj_user_id');
   // Reload page
   ```

3. **Expected Behavior**:
   - ✅ Shows "Creating your account..." briefly
   - ✅ Shows error modal: "User ID Required"
   - ✅ Error message: "Failed to connect to backend..."
   - ✅ Can enter user ID manually or click "Try Again"
   - ✅ **NO demo/placeholder repo data shown**

### Test 3: Backend Error Response

1. **Simulate backend error** (modify backend temporarily or use network tab):
   - Return 500 or 401 from `POST /auth/anon`

2. **Expected Behavior**:
   - ✅ Shows error modal
   - ✅ Error message includes status code
   - ✅ Manual entry fallback available

### Test 4: No Repos State (After Successful Creation)

1. **Ensure user has no repos**:
   - Use fresh user_id or delete repos in backend

2. **Expected Behavior**:
   - ✅ Header shows: "No repo connected yet"
   - ✅ Main content: "Your Journal" + "Connect GitHub" button
   - ✅ **NO demo/placeholder repos shown**

---

## Verification Checklist

- [x] Auto-creates user when `bj_user_id` missing
- [x] Stores `user_id` in `localStorage` as `bj_user_id`
- [x] Shows "Creating your account..." loading state
- [x] Shows error modal if creation fails
- [x] Manual entry fallback available on error
- [x] Zero hardcoded/demo repo data shown
- [x] Empty state shows "No repo connected yet"
- [x] Backend URL uses `NEXT_PUBLIC_API_BASE_URL` or defaults to `http://127.0.0.1:8000`

---

## Backend Requirements

**Endpoint**: `POST /auth/anon`

**Request**:
- Method: POST
- Headers: `Content-Type: application/json`
- Body: None required

**Response** (Success):
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response** (Error):
- Status: 400, 500, etc.
- Body: Error detail (optional)

**CORS**: Must allow requests from frontend origin (already configured in backend).

---

## Files Changed

1. **`frontend/app/journal/page.tsx`**:
   - Added `createAnonymousUser()` function
   - Updated `useEffect` to auto-create user
   - Updated loading states
   - Updated error handling
   - Updated empty state text

---

## Status: ✅ COMPLETE

The `/journal` page now:
- ✅ Automatically creates user when `bj_user_id` missing
- ✅ Shows proper loading states (no demo content)
- ✅ Handles errors gracefully with fallback
- ✅ Zero hardcoded repo data at any time
- ✅ Empty state shows "No repo connected yet"

Ready for testing!

