# PHASE A: Backend API Discovery

## Backend Endpoints (Inspected from backend/app/main.py)

### Authentication
| Endpoint | Method | Returns | Headers Required |
|----------|--------|---------|------------------|
| `/auth/anon` | POST | `{ user_id: string }` | None |
| **Auth Method**: `X-User-Id` header (stored in localStorage as `bj_user_id`) |

### Repositories

| Endpoint | Method | Returns | Headers Required | Body Required |
|----------|--------|---------|------------------|---------------|
| `/repos` | GET | `{ items: Repo[], total: number }` | `X-User-Id` (required) | None |
| `/repos` | POST | `Repo` or 409 if exists | `X-User-Id` (required) | `{ name: string, visibility: "private" \| "public" }` |
| `/repos/{repo_id}/entries` | GET | `{ items: PostOut[], total: number }` | `X-User-Id` (optional) | None |

**Response Shapes**:
```typescript
// RepoOut
{
  id: string          // UUID
  owner_id: string    // UUID
  name: string        // e.g., "owner-repo"
  visibility: string  // "private" | "public"
  created_at: datetime
  updated_at: datetime
}

// PostOut (list view)
{
  id: number
  votes: number
  title: string
  product: string
  year: number
  category: string
  cause: string
  severity: string
  tags: string[]
  summary: string
  created_at: datetime
  user_vote: number   // -1, 0, or 1
  saved: boolean
  comment_count: number
  // Note: No body or status in list view
}

// PostDetailOut (detail view)
{
  // Same as PostOut, plus:
  body: string | null    // Full entry body
  status: string | null  // "open" | "fixed"
}
```

### Entries/Posts

| Endpoint | Method | Returns | Headers Required | Body Required |
|----------|--------|---------|------------------|---------------|
| `/posts/{post_id}` | GET | `PostDetailOut` | `X-User-Id` (optional) | None |
| `/posts/{post_id}/comments` | GET | `{ items: Comment[] }` | None | None |
| `/posts/{post_id}/comments` | POST | `Comment` | `X-User-Id` (required) | `{ content: string }` |

## GitHub Connection Analysis

### Current Implementation (from frontend/app/page.tsx)

**No OAuth**: The backend does NOT have OAuth or GitHub token-based authentication.

**Current "Connection" Flow**:
1. User enters GitHub repo URL (e.g., `https://github.com/owner/repo`)
2. Frontend extracts `owner` and `name` from URL
3. Frontend creates backend repo with name `{owner}-{name}` via `POST /repos`
4. Frontend fetches GitHub metadata directly from GitHub API (`https://api.github.com/repos/{owner}/{name}`) - **no auth needed for public repos**
5. Frontend fetches entries from backend using repo ID

**What This Means**:
- "Connect GitHub" is actually just "Create a backend repo with a name derived from GitHub URL"
- No actual GitHub connection/OAuth is performed
- Backend repo name is `{owner}-{name}` (e.g., `facebook-react`)

### Recommended Flow for Journal Page

Since there's no OAuth, use a **minimal input flow**:
1. Show "Connect GitHub" button
2. On click, show input modal/form asking for GitHub repo URL
3. Parse URL to extract `owner/repo`
4. Create backend repo: `POST /repos` with `name: "{owner}-{repo}"`
5. If 409 (exists), fetch existing repo via `GET /repos`
6. Store selected repo ID in localStorage/state
7. Fetch entries: `GET /repos/{repo_id}/entries`

## ❌ MISSING: Commits Endpoint

**Status**: **NOT IMPLEMENTED**

The backend has **NO endpoint** for fetching GitHub commits.

### Required Backend Work

To support commits, the backend would need:

#### Option 1: Frontend fetches from GitHub API directly
- **Pro**: No backend changes needed
- **Con**: Requires GitHub token for private repos, rate limits
- **Implementation**: Frontend calls `https://api.github.com/repos/{owner}/{repo}/commits` directly

#### Option 2: Backend proxy endpoint (Recommended)
- **Endpoint**: `GET /repos/{repo_id}/commits`
- **Headers**: `X-User-Id` (optional), optionally `X-GitHub-Token` (for private repos)
- **Returns**: 
```json
{
  "items": [
    {
      "sha": "string",
      "message": "string",
      "author": { "name": "string", "email": "string", "date": "datetime" },
      "committer": { "name": "string", "email": "string", "date": "datetime" },
      "url": "string"
    }
  ],
  "total": number
}
```

**Minimal Backend Implementation**:
1. Store `owner` and `repo` name in Repo model (currently only stores `name` as `{owner}-{repo}`)
2. Add endpoint `GET /repos/{repo_id}/commits` that:
   - Fetches from GitHub API: `https://api.github.com/repos/{owner}/{repo}/commits`
   - Optionally uses `X-GitHub-Token` header for authenticated requests
   - Returns formatted commit list

**For Now (Phase B)**: 
- Will implement commits via **Option 1** (frontend fetches directly from GitHub API)
- Document that this is temporary and backend endpoint would be better

## Auth Requirements Summary

| Endpoint Type | Header Required | Storage |
|---------------|----------------|---------|
| Anonymous user creation | None | Store `user_id` in `localStorage` as `bj_user_id` |
| Repo operations | `X-User-Id` | Same as above |
| Entry listing | `X-User-Id` (optional) | Same as above |
| Entry detail | `X-User-Id` (optional) | Same as above |
| Comments (create) | `X-User-Id` (required) | Same as above |

## Endpoint Mapping for Journal Page

| UI Action | Backend Call | Headers | Body | Notes |
|-----------|--------------|---------|------|-------|
| Connect GitHub | `POST /auth/anon` | None | None | If user_id missing |
| Connect GitHub | `POST /repos` | `X-User-Id` | `{ name: "{owner}-{repo}", visibility: "public" }` | Create repo |
| Connect GitHub (if exists) | `GET /repos` | `X-User-Id` | None | Find existing repo |
| List repos | `GET /repos` | `X-User-Id` | None | Show repo selector |
| Load entries | `GET /repos/{repo_id}/entries` | `X-User-Id` (optional) | None | Show journals |
| Open entry | `GET /posts/{post_id}` | `X-User-Id` (optional) | None | Show full entry |
| Load commits | `GET https://api.github.com/repos/{owner}/{repo}/commits` | None | None | **Direct GitHub API** (no backend endpoint) |

## Summary

✅ **Available**:
- Repo creation/listing
- Entry listing/detail
- Auth via `X-User-Id` header

❌ **Missing**:
- Commits endpoint (will use GitHub API directly for now)
- OAuth/GitHub token storage
- Repo model doesn't store separate owner/repo (only combined name)

**Next Steps**:
- Phase B: Implement Journal page with GitHub URL input (no OAuth)
- Phase B: Fetch commits directly from GitHub API (temporary solution)
- Phase C: Document missing backend features

