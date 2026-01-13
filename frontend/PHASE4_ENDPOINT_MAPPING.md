# PHASE 4: Connect Frontend to Backend - Endpoint Mapping

## Backend API Endpoints (from backend/app/main.py)

### Authentication
- `POST /auth/anon` → Creates anonymous user, returns `{ user_id: string }`

### Repositories
- `GET /repos` → List repos (requires `X-User-Id` header), returns `{ items: Repo[], total: number }`
- `POST /repos` → Create repo (requires `X-User-Id` header), body: `{ name: string, visibility: string }`, returns `Repo`
- `GET /repos/{repo_id}/entries` → List entries in repo (optional `X-User-Id`), returns `{ items: Post[], total: number }`
- `POST /repos/{repo_id}/entries/bulk` → Bulk create entries (requires `X-User-Id`), body: `{ entries: [...] }`, returns `{ created: int, updated: int, skipped: int }`

### Posts/Entries
- `GET /posts` → List posts (optional `X-User-Id`), query params: `q`, `cause`, `severity`, `sort`, returns `{ items: Post[], total: number }`
- `POST /posts` → Create post (optional `X-User-Id`), body: `PostIn`, returns `PostOut`
- `GET /posts/{post_id}` → Get post detail (optional `X-User-Id`), returns `PostDetailOut` (includes `body` and `status`)
- `GET /posts/{post_id}/comments` → List comments, returns `{ items: Comment[] }`
- `POST /posts/{post_id}/comments` → Create comment (requires `X-User-Id`), body: `{ content: string }`, returns `Comment`
- `POST /posts/{post_id}/vote` → Vote on post (requires `X-User-Id`), body: `{ value: -1|0|1 }`, returns `{ post_id, votes, user_vote }`

### Analytics
- `GET /analytics/top-causes` → Get top causes, returns `{ items: CauseAnalytics[], total: number }`

## Frontend Pages → Backend Endpoints Mapping

### `/` (Home Page)

**Current Behavior (from static HTML)**:
- Shows demo entries by default
- Has "Live Mode" toggle
- "Connect Github Repo" button opens modal
- Modal accepts GitHub repo URL (owner/repo)
- When Live Mode ON + repo connected:
  - Creates/gets repo: `POST /repos` or `GET /repos` to find existing
  - Fetches entries: `GET /repos/{repo_id}/entries`
  - Renders entries in journal list
- When Live Mode OFF:
  - Shows demo entries (hardcoded)

**Endpoints Used**:
- `POST /auth/anon` - Get/create user ID (stored in localStorage as `bj_user_id`)
- `POST /repos` - Create repo (if doesn't exist)
- `GET /repos` - List repos to find existing one
- `GET /repos/{repo_id}/entries` - Get entries for repo

**Status**: ✅ Already connected in Phase 1 (code preserved from original HTML)

### `/how-it-works` and `/project`
- Static documentation pages
- No backend connection needed

## Questions/Blockers

Before proceeding with Phase 4, need to confirm:

1. **Entry Format Mismatch**:
   - Static HTML expects entries with `frontmatter.title`, `frontmatter.status`, `frontmatter.tags`, `content`
   - Backend returns `PostOut` with `title`, `status`, `tags`, `body`
   - The current code already maps backend format, but needs verification

2. **Repo Creation Logic**:
   - Static HTML creates repo with name `${owner}-${name}` (e.g., "saihajkohli-my-bug-journal")
   - Backend repo model may have different structure
   - Need to verify repo creation works correctly

3. **Entry List Response Format**:
   - Static HTML expects array: `entries.map(...)`
   - Backend returns: `{ items: Post[], total: number }`
   - Current code handles both: `entriesData.items || entriesData`

4. **No Breaking Changes Needed**:
   - Static HTML already has backend integration code
   - It's preserved exactly as-is in Phase 1
   - Should work as-is if backend endpoints match expectations

## Recommendation

**Phase 4 is already partially complete** - the static HTML had backend integration code which has been preserved in `app/page.tsx`. The code:
- ✅ Handles auth (creates/get user_id)
- ✅ Creates/finds repos
- ✅ Fetches entries from backend
- ✅ Maps backend format to UI format

**Action needed**: Test the existing integration:
1. Start backend: `cd backend && uvicorn app.main:app --reload --port 8000`
2. Start frontend: `cd frontend && npm run dev`
3. On home page:
   - Click "Connect Github Repo"
   - Enter any repo (e.g., "test/test")
   - Toggle "Live Mode" ON
   - Verify entries load from backend

If there are issues, we'll need to adjust the mapping in `app/page.tsx` to match the actual backend response format.

