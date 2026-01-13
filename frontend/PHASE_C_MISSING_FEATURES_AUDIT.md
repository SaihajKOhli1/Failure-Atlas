# PHASE C: Missing Features Audit

## Backend Features → UI Coverage

### ✅ Implemented in UI

| Backend Feature | Endpoint | Is Visible in UI? | UI Location | Notes |
|----------------|----------|-------------------|-------------|-------|
| **Repo Listing** | `GET /repos` | ✅ Yes | `/journal` page | Repo selector dropdown |
| **Repo Creation** | `POST /repos` | ✅ Yes | `/journal` page | "Connect GitHub" flow |
| **Entry Listing** | `GET /repos/{repo_id}/entries` | ✅ Yes | `/journal` page | Journals section |
| **Entry Detail** | `GET /posts/{post_id}` | ✅ Yes | `/journal` page | Entry modal/drawer |
| **Anonymous User Creation** | `POST /auth/anon` | ✅ Yes | `/journal` page | Auto-created on mount |

---

### ❌ Missing from UI

| Backend Feature | Endpoint | Is Visible in UI? | Suggested UI Location | Implementation Notes |
|----------------|----------|-------------------|----------------------|---------------------|
| **Voting** | `POST /posts/{post_id}/vote` | ❌ No | Entry modal or Journal list item | Add upvote/downvote buttons |
| **Saving Posts** | `POST /posts/{post_id}/save`<br>`DELETE /posts/{post_id}/save`<br>`GET /me/saved` | ❌ No | Entry modal or Journal list item | Add "Save" button, show saved posts view |
| **Comments** | `GET /posts/{post_id}/comments`<br>`POST /posts/{post_id}/comments` | ❌ No | Entry modal | Add comments section below entry body |
| **Analytics/Top Causes** | `GET /analytics/top-causes` | ❌ No | `/journal` page (insights tab?) or separate page | Show analytics sidebar or section |
| **Post Search** | `GET /posts?q={query}` | ❌ No | `/journal` page | Add search input/filter |
| **Filter by Cause** | `GET /posts?cause={cause}` | ❌ No | `/journal` page | Add filter dropdown/chips |
| **Filter by Severity** | `GET /posts?severity={severity}` | ❌ No | `/journal` page | Add filter dropdown/chips |
| **Sort Options** | `GET /posts?sort={hot\|new\|top}` | ❌ No | `/journal` page | Add sort selector |
| **Bulk Entry Creation** | `POST /repos/{repo_id}/entries/bulk` | ❌ No | CLI only (expected) | N/A - intended for CLI |
| **Repo Disconnect/Delete** | N/A | ❌ No | `/journal` page (repo selector) | Backend doesn't have delete endpoint yet |

---

### ⚠️ Partially Implemented

| Backend Feature | Status | Notes |
|----------------|--------|-------|
| **Commits** | ⚠️ Partial | **Not in backend** - currently fetching directly from GitHub API (`https://api.github.com/repos/{owner}/{repo}/commits`). Should be implemented as `GET /repos/{repo_id}/commits` endpoint in backend. |

---

## Detailed Feature Analysis

### 1. Voting (`POST /posts/{post_id}/vote`)

**Backend Status**: ✅ Implemented
- Endpoint: `POST /posts/{post_id}/vote`
- Body: `{ value: -1 | 0 | 1 }` (downvote, remove, upvote)
- Response: `{ post_id: int, votes: int, user_vote: int }`
- Auth: Requires `X-User-Id` header

**UI Status**: ❌ Not Implemented
- **Suggested Location**: 
  - Entry modal: Add upvote/downvote buttons next to title
  - Journal list item: Add vote count and quick vote buttons
- **Implementation**: 
  - Add vote buttons (⬆️ ⬇️) in entry modal
  - Show vote count in journal list items
  - Update UI optimistically on vote

---

### 2. Saving Posts

**Backend Status**: ✅ Implemented
- Endpoints:
  - `POST /posts/{post_id}/save` - Save post
  - `DELETE /posts/{post_id}/save` - Unsave post
  - `GET /me/saved` - List saved posts (requires `X-User-Id`)
- Auth: Requires `X-User-Id` header

**UI Status**: ❌ Not Implemented
- **Suggested Location**:
  - Entry modal: Add "Save" / "Unsave" button
  - Journal page: Add "Saved" tab/view to show saved entries
  - Journal list item: Show save indicator (bookmark icon)
- **Implementation**:
  - Add save button in entry modal
  - Add "Saved" section/tab in `/journal` page
  - Call `GET /me/saved` to list saved posts

---

### 3. Comments

**Backend Status**: ✅ Implemented
- Endpoints:
  - `GET /posts/{post_id}/comments` - List comments (no auth required)
  - `POST /posts/{post_id}/comments` - Create comment (requires `X-User-Id`)
- Body: `{ content: string }` (1-2000 chars)
- Response: `CommentOut` with `id`, `post_id`, `user_id`, `content`, `created_at`

**UI Status**: ❌ Not Implemented
- **Suggested Location**: Entry modal - Add comments section below entry body
- **Implementation**:
  - Fetch comments when entry modal opens: `GET /posts/{post_id}/comments`
  - Display comments list with author, date, content
  - Add comment form at bottom (text area + submit button)
  - Call `POST /posts/{post_id}/comments` on submit

---

### 4. Analytics/Top Causes (`GET /analytics/top-causes`)

**Backend Status**: ✅ Implemented
- Endpoint: `GET /analytics/top-causes`
- Response: `{ items: CauseAnalytics[], total: number }`
- `CauseAnalytics`: `{ cause: string, count: int, percent: int }`
- No auth required

**UI Status**: ❌ Not Implemented
- **Suggested Location**: 
  - `/journal` page: Add "Insights" tab/section
  - Separate analytics page: `/analytics`
  - Sidebar in `/journal` page
- **Implementation**:
  - Call `GET /analytics/top-causes`
  - Display cause breakdown (pie chart, bar chart, or list)
  - Show percentages and counts

---

### 5. Post Search (`GET /posts?q={query}`)

**Backend Status**: ✅ Implemented
- Endpoint: `GET /posts?q={query}`
- Uses PostgreSQL Full-Text Search (`ts_rank_cd`)
- Supports combined filters: `?q={query}&cause={cause}&severity={severity}&sort={sort}`

**UI Status**: ❌ Not Implemented
- **Suggested Location**: `/journal` page - Add search input at top
- **Implementation**:
  - Add search input field
  - Debounce search queries
  - Call `GET /posts?q={query}` (or `GET /repos/{repo_id}/entries?q={query}` if repo-scoped)
  - Display results in journal list

---

### 6. Filter by Cause/Severity

**Backend Status**: ✅ Implemented
- Endpoints:
  - `GET /posts?cause={cause}` - Filter by cause (e.g., "trust", "distribution")
  - `GET /posts?severity={severity}` - Filter by severity ("low", "med", "high")
- Can be combined with search and sort

**UI Status**: ❌ Not Implemented
- **Suggested Location**: `/journal` page - Add filter chips/dropdowns
- **Implementation**:
  - Add filter UI (dropdowns or chips)
  - Update URL query params or state
  - Call `GET /posts?cause={cause}&severity={severity}`

---

### 7. Sort Options (`GET /posts?sort={hot|new|top}`)

**Backend Status**: ✅ Implemented
- Endpoint: `GET /posts?sort={hot|new|top}`
- `hot`: votes + (year - 2010) * 6 (desc)
- `new`: year (desc)
- `top`: votes (desc)

**UI Status**: ❌ Not Implemented
- **Suggested Location**: `/journal` page - Add sort selector
- **Implementation**:
  - Add sort dropdown: "Hot", "New", "Top"
  - Call `GET /posts?sort={selected}` or `GET /repos/{repo_id}/entries?sort={selected}`

---

### 8. Commits

**Backend Status**: ❌ **NOT IMPLEMENTED**
- **Current Implementation**: Frontend fetches directly from GitHub API
- **Location**: `/journal` page - "Recent Commits" section
- **Current Code**: `fetch('https://api.github.com/repos/{owner}/{repo}/commits')`

**Required Backend Work**:
- **Endpoint**: `GET /repos/{repo_id}/commits`
- **Headers**: `X-User-Id` (optional), optionally `X-GitHub-Token` (for private repos)
- **Response**:
```json
{
  "items": [
    {
      "sha": "string",
      "message": "string",
      "author": { "name": "string", "email": "string", "date": "datetime" },
      "committer": { "name": "string", "email": "string", "date": "datetime" },
      "html_url": "string"
    }
  ],
  "total": number
}
```

**Minimal Backend Changes**:
1. Store `owner` and `repo` name separately in `Repo` model (currently only stores `name` as `{owner}-{repo}`)
2. Add endpoint `GET /repos/{repo_id}/commits` that:
   - Fetches from GitHub API: `https://api.github.com/repos/{owner}/{repo}/commits`
   - Optionally uses `X-GitHub-Token` header for authenticated requests
   - Returns formatted commit list

---

### 9. Repo Disconnect/Delete

**Backend Status**: ❌ **NOT IMPLEMENTED**
- No endpoint exists for deleting/disconnecting repos
- **Current**: Repos persist indefinitely once created

**Required Backend Work**:
- **Endpoint**: `DELETE /repos/{repo_id}`
- **Headers**: `X-User-Id` (required)
- **Response**: `{ status: "deleted", repo_id: string }`
- **Auth**: Verify user owns repo before deletion

**UI Status**: ❌ Not Implemented
- **Suggested Location**: `/journal` page - Repo selector dropdown with "Remove" option

---

## Summary Table

| Feature Category | Backend | UI | Priority | Location |
|-----------------|---------|----|----------|----------| 
| **Repo Management** |
| List repos | ✅ | ✅ | - | `/journal` |
| Create repo | ✅ | ✅ | - | `/journal` |
| Delete repo | ❌ | ❌ | Low | `/journal` |
| **Entry Management** |
| List entries | ✅ | ✅ | - | `/journal` |
| View entry detail | ✅ | ✅ | - | `/journal` (modal) |
| Create entry | ✅ (bulk only) | ❌ | Low | CLI only (expected) |
| **Interaction Features** |
| Vote | ✅ | ❌ | Medium | Entry modal |
| Save/Unsave | ✅ | ❌ | Medium | Entry modal |
| Comments | ✅ | ❌ | High | Entry modal |
| **Discovery Features** |
| Search | ✅ | ❌ | High | `/journal` |
| Filter (cause/severity) | ✅ | ❌ | Medium | `/journal` |
| Sort | ✅ | ❌ | Medium | `/journal` |
| **Analytics** |
| Top causes | ✅ | ❌ | Low | `/journal` or `/analytics` |
| **GitHub Integration** |
| Commits | ❌ | ⚠️ (direct API) | High | Backend endpoint needed |

---

## Recommended Implementation Priority

### High Priority
1. **Comments** - Core feature for discussion/collaboration
2. **Search** - Essential for finding entries
3. **Commits Backend Endpoint** - Currently using direct GitHub API (should proxy through backend)

### Medium Priority
4. **Voting** - Enhances engagement
5. **Save/Unsave** - Personal organization feature
6. **Filter & Sort** - Improves usability

### Low Priority
7. **Analytics** - Nice-to-have insights
8. **Repo Delete** - Administrative feature (backend endpoint needed first)

---

## Notes

- **Commits**: Currently implemented via direct GitHub API call in frontend. This works but:
  - Doesn't support private repos (requires GitHub token)
  - No rate limiting protection
  - Bypasses backend entirely
  - **Recommendation**: Implement `GET /repos/{repo_id}/commits` endpoint in backend

- **Entry Creation**: Bulk entry creation (`POST /repos/{repo_id}/entries/bulk`) is CLI-only, which is expected for this use case. No UI needed.

- **Search**: Full-text search is implemented in backend using PostgreSQL `ts_rank_cd`. Should work with `/repos/{repo_id}/entries` if backend supports it (needs verification).

- **Filter/Sort on Repo Entries**: Current endpoint `GET /repos/{repo_id}/entries` doesn't support query params like `?q=`, `?cause=`, `?severity=`, `?sort=`. Would need backend enhancement to add these filters to repo-scoped entry listing.

