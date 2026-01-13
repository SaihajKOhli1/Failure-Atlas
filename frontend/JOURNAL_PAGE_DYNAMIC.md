# Journal Page - Fully Dynamic Implementation

## Summary

Updated `/frontend/app/journal/page.tsx` to be fully dynamic with **ZERO hardcoded demo content**. All data is fetched from backend API endpoints.

---

## Changes Made

### 1. Auth Handling ✅

**Before**: Silently created anonymous user if `bj_user_id` missing  
**After**: Shows explicit UI prompt modal for user ID

**Implementation**:
- On page load, checks `localStorage.getItem('bj_user_id')`
- If missing, shows modal with two options:
  1. Enter existing user ID manually
  2. Click "Create New" to generate anonymous user via `POST /auth/anon`
- User ID is stored in `localStorage` as `bj_user_id`
- All API requests attach `X-User-Id` header

**UI**: Modal prompt with input field and "Create New" button

---

### 2. Connect GitHub Flow (REAL) ✅

**Implementation**:
- Click "Connect GitHub" → Opens modal with URL input
- User enters GitHub URL (`https://github.com/owner/repo`) or `owner/repo`
- On submit:
  1. Parses URL to extract `owner` and `repo`
  2. Creates backend repo: `POST /repos` with body `{ name: "{owner}-{repo}", visibility: "public" }`
  3. Headers: `X-User-Id` (required), `Content-Type: application/json`
  4. If 409 (repo exists): Fetches existing repo via `GET /repos`
  5. On success: Refreshes repos list via `GET /repos`
  6. Selects new repo and stores `bj_last_repo_id` in localStorage
  7. Immediately fetches entries: `GET /repos/{repo_id}/entries`

**Error Handling**: Shows error message in modal if connection fails

---

### 3. Journals List (REAL) ✅

**On Page Load**:
1. If `bj_user_id` exists: `GET /repos` (with `X-User-Id` header)
2. If `bj_last_repo_id` exists: Auto-selects that repo
3. Otherwise: Selects first repo if available
4. Fetches entries: `GET /repos/{repo_id}/entries`

**Entry Mapping**:
- Backend returns `PostOut[]` (from `PostsResponse`)
- Fields: `id`, `title`, `tags`, `created_at`, `summary` (no `body` or `status` in list)
- Frontend maps to `Entry` interface:
  ```typescript
  {
    id: number
    title: string
    status: null  // Will be fetched from detail endpoint
    tags: string[]
    date: string  // Formatted from created_at
    body: ''      // Will be fetched when opening entry
  }
  ```

**Empty State**: Shows "No entries yet. Use 'bugjournal push' locally..." if `entries.length === 0`

**No Placeholder Entries**: Removed all hardcoded demo entries (no `id: 'empty'`, `id: 'loading'`, etc.)

---

### 4. Entry Detail (REAL Full View) ✅

**On Click Entry**:
1. Opens modal immediately (for better UX)
2. Shows loading state: "Loading entry details..."
3. Fetches full entry: `GET /posts/{post_id}` (with `X-User-Id` header if available)
4. Backend returns `PostDetailOut` with:
   - `id`, `title`, `status`, `tags`, `created_at`
   - `body` (full markdown content) or `summary` as fallback
5. Displays:
   - Title, ID, date, status, tags in header
   - Full body with markdown parsing (headers, paragraphs, code)

**Error Handling**: Shows error message in modal if fetch fails, but still displays basic entry info

---

### 5. Commits Section (Honest Implementation) ✅

**Status**: Backend endpoint does NOT exist

**Implementation**:
- **Removed** direct GitHub API calls from browser
- Shows placeholder message:
  ```
  Commits feature not yet available.
  Backend endpoint needed: GET /repos/{repo_id}/commits
  ```

**TODO Note in Code**:
```typescript
// TODO: Commits endpoint not yet implemented in backend
// Proposed endpoint: GET /repos/{repo_id}/commits
// Should return: { items: Commit[], total: number }
// Commit structure: { sha: string, message: string, author: { name, email, date }, committer: { name, email, date }, html_url: string }
// This endpoint should fetch from GitHub API server-side (supports private repos with token)
```

---

## Proposed Backend Endpoint: Commits

### Endpoint
```
GET /repos/{repo_id}/commits
```

### Headers
- `X-User-Id` (optional): For user context
- `X-GitHub-Token` (optional): For private repo access

### Query Parameters
- `per_page` (optional, default: 10): Number of commits to return
- `page` (optional, default: 1): Page number

### Response
```json
{
  "items": [
    {
      "sha": "string",
      "message": "string",
      "author": {
        "name": "string",
        "email": "string",
        "date": "datetime"
      },
      "committer": {
        "name": "string",
        "email": "string",
        "date": "datetime"
      },
      "html_url": "string"
    }
  ],
  "total": number
}
```

### Implementation Notes
- Backend should fetch from GitHub API: `https://api.github.com/repos/{owner}/{repo}/commits`
- Parse `owner`/`repo` from `Repo.name` (format: `{owner}-{repo}`)
- Support private repos via `X-GitHub-Token` header
- Handle rate limiting and errors gracefully

---

## Loading States

All API calls show proper loading states:
- **Loading repos**: "Loading repositories..."
- **Loading entries**: "Loading..." badge in Journals section
- **Loading entry detail**: "Loading entry details..." in modal
- **No loading state for commits** (placeholder only)

---

## Error Handling

**User ID Errors**:
- 401 on `GET /repos`: Shows user ID prompt modal again
- Failed `POST /auth/anon`: Shows error in prompt modal

**Repo Errors**:
- Failed `POST /repos`: Shows error in connect modal
- 409 (repo exists): Handled gracefully, fetches existing repo

**Entry Errors**:
- Failed `GET /repos/{repo_id}/entries`: Shows error banner, empty entries list
- Failed `GET /posts/{post_id}`: Shows error in entry modal, displays basic entry info

All errors are displayed to user with clear messages.

---

## Data Flow

### Initial Load
```
1. Check localStorage for bj_user_id
   ├─ Exists → Load repos → Select repo → Load entries
   └─ Missing → Show user ID prompt
```

### Connect Repo
```
1. User enters GitHub URL
2. Parse owner/repo
3. POST /repos → Create repo
   ├─ Success → Refresh GET /repos → Select repo → Load entries
   └─ 409 → GET /repos → Find existing → Select repo → Load entries
```

### Open Entry
```
1. User clicks entry
2. Open modal immediately
3. GET /posts/{post_id} → Fetch full details
   ├─ Success → Display full entry with body/status
   └─ Error → Show error, display basic info
```

---

## Manual Test Checklist

### Auth Flow
- [ ] Visit `/journal` without `bj_user_id` in localStorage
- [ ] Verify user ID prompt modal appears
- [ ] Test "Create New" button (generates anonymous user)
- [ ] Test entering existing user ID manually
- [ ] Verify user ID is saved in localStorage

### Connect Repo Flow
- [ ] Click "Connect GitHub" button
- [ ] Enter GitHub URL: `https://github.com/owner/repo`
- [ ] Verify repo is created via `POST /repos`
- [ ] Verify repos list refreshes
- [ ] Verify new repo is selected
- [ ] Verify entries are loaded immediately
- [ ] Test with `owner/repo` format (no URL)
- [ ] Test with existing repo (should handle 409)

### Journals List
- [ ] Verify entries load from `GET /repos/{repo_id}/entries`
- [ ] Verify no placeholder entries (only real data or empty state)
- [ ] Verify entry titles, dates, tags display correctly
- [ ] Verify status icons show correctly (fixed/open/null)
- [ ] Test empty state: "No entries yet..."

### Entry Detail
- [ ] Click an entry in the list
- [ ] Verify modal opens immediately
- [ ] Verify "Loading entry details..." appears
- [ ] Verify full entry details load from `GET /posts/{post_id}`
- [ ] Verify title, ID, date, status, tags display
- [ ] Verify body content displays (markdown parsed)
- [ ] Test with entry that has no body (fallback to summary)

### Repo Selection
- [ ] If multiple repos, verify dropdown appears
- [ ] Select different repo from dropdown
- [ ] Verify entries refresh for selected repo
- [ ] Verify `bj_last_repo_id` is updated in localStorage
- [ ] Reload page, verify last repo is auto-selected

### Error Handling
- [ ] Stop backend server, verify errors display
- [ ] Test with invalid repo ID, verify 404 handling
- [ ] Test with invalid entry ID, verify 404 handling
- [ ] Verify all error messages are user-friendly

### Commits Section
- [ ] Verify placeholder message displays
- [ ] Verify no GitHub API calls are made
- [ ] Verify TODO note is in code comments

---

## Files Changed

1. **`frontend/app/journal/page.tsx`** (643 lines → ~650 lines)
   - Added user ID prompt modal
   - Removed all demo/placeholder entries
   - Removed direct GitHub API commits fetch
   - Added commits placeholder with TODO
   - Improved loading states
   - Better error handling
   - All data now from API endpoints

---

## Status: ✅ COMPLETE

The Journal page is now **fully dynamic** with:
- ✅ Real auth handling (explicit user ID prompt)
- ✅ Real repo connection (POST /repos)
- ✅ Real entries list (GET /repos/{repo_id}/entries)
- ✅ Real entry detail (GET /posts/{post_id})
- ✅ Commits placeholder (honest about missing endpoint)
- ✅ Zero hardcoded demo content
- ✅ Proper loading and error states

The page is ready for testing with real backend data.

