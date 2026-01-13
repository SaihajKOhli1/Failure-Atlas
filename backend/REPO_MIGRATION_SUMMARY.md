# Repository Migration Summary

## Overview

This document summarizes the backend changes made to evolve Failure Atlas into a GitHub-style bug journal platform. All changes are backward-compatible and do not break existing endpoints.

---

## Database Schema Changes

### 1. New `repos` Table

```sql
CREATE TABLE repos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    visibility VARCHAR(20) NOT NULL DEFAULT 'private',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(owner_id, name)
);

CREATE INDEX idx_repos_owner_id ON repos(owner_id);
CREATE INDEX idx_repos_name ON repos(name);
```

### 2. Enhanced `posts` Table

Added columns:
- `repo_id UUID REFERENCES repos(id) ON DELETE SET NULL` (nullable, indexed)
- `source_path TEXT` (nullable, for CLI idempotency)
- `content_hash TEXT` (nullable, for CLI idempotency)

Added partial unique indexes for idempotency:
```sql
CREATE UNIQUE INDEX idx_posts_repo_source_path 
ON posts(repo_id, source_path) 
WHERE repo_id IS NOT NULL AND source_path IS NOT NULL;

CREATE UNIQUE INDEX idx_posts_repo_content_hash 
ON posts(repo_id, content_hash) 
WHERE repo_id IS NOT NULL AND content_hash IS NOT NULL;
```

---

## New SQLAlchemy Models

### Added Models
- `User` - Matches existing `users` table
- `Repo` - New repository model
- `Vote` - Matches existing `votes` table
- `Save` - Matches existing `saves` table
- `Comment` - Matches existing `comments` table

### Updated Models
- `Post` - Added `repo_id`, `source_path`, `content_hash` columns and relationships

---

## New API Endpoints

### 1. Create Repository
```
POST /repos
Headers:
  X-User-Id: <user_uuid>
  Content-Type: application/json
Body:
{
  "name": "my-bug-journal",
  "visibility": "private"  // or "public"
}
```

### 2. List Repositories (Owned by User)
```
GET /repos?skip=0&limit=100
Headers:
  X-User-Id: <user_uuid>
```

### 3. Bulk Create/Update Entries
```
POST /repos/{repo_id}/entries/bulk
Headers:
  X-User-Id: <user_uuid>
  Content-Type: application/json
Body:
{
  "entries": [
    {
      "source_path": "bugs/2024/api-outage.md",
      "content_hash": "abc123...",
      "title": "API Outage",
      "product": "Payment Service",
      "year": 2024,
      "category": "incident",
      "cause": "infra",
      "severity": "high",
      "summary": "Payment API was down for 2 hours...",
      "tags": ["infra", "payment"]
    }
  ]
}
```

### 4. List Repository Entries
```
GET /repos/{repo_id}/entries?skip=0&limit=100
Headers:
  X-User-Id: <user_uuid>  // Optional, for user-specific data enrichment
```

---

## Testing with cURL

### 1. Create an anonymous user (if needed)
```bash
curl -X POST http://localhost:8000/auth/anon
# Response: {"user_id": "550e8400-e29b-41d4-a716-446655440000"}
```

### 2. Create a repository
```bash
USER_ID="550e8400-e29b-41d4-a716-446655440000"

curl -X POST http://localhost:8000/repos \
  -H "Content-Type: application/json" \
  -H "X-User-Id: $USER_ID" \
  -d '{
    "name": "my-bug-journal",
    "visibility": "private"
  }'

# Response:
# {
#   "id": "repo-uuid-here",
#   "owner_id": "550e8400-e29b-41d4-a716-446655440000",
#   "name": "my-bug-journal",
#   "visibility": "private",
#   "created_at": "2024-01-01T12:00:00Z",
#   "updated_at": "2024-01-01T12:00:00Z"
# }
```

### 3. List repositories
```bash
curl -X GET "http://localhost:8000/repos?skip=0&limit=100" \
  -H "X-User-Id: $USER_ID"

# Response:
# {
#   "items": [
#     {
#       "id": "repo-uuid-here",
#       "owner_id": "550e8400-e29b-41d4-a716-446655440000",
#       "name": "my-bug-journal",
#       "visibility": "private",
#       "created_at": "2024-01-01T12:00:00Z",
#       "updated_at": "2024-01-01T12:00:00Z"
#     }
#   ],
#   "total": 1
# }
```

### 4. Bulk create/update entries (idempotent)
```bash
REPO_ID="repo-uuid-here"

curl -X POST "http://localhost:8000/repos/$REPO_ID/entries/bulk" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: $USER_ID" \
  -d '{
    "entries": [
      {
        "source_path": "bugs/2024/api-outage.md",
        "content_hash": "sha256:abc123...",
        "title": "API Outage on Jan 1",
        "product": "Payment Service",
        "year": 2024,
        "category": "incident",
        "cause": "infra",
        "severity": "high",
        "summary": "Payment API was down for 2 hours due to database connection pool exhaustion.",
        "tags": ["infra", "payment", "database"]
      },
      {
        "source_path": "bugs/2024/ui-bug.md",
        "content_hash": "sha256:def456...",
        "title": "UI Rendering Issue",
        "product": "Web App",
        "year": 2024,
        "category": "bug",
        "cause": "ux",
        "severity": "med",
        "summary": "Dashboard fails to render on mobile Safari.",
        "tags": ["ux", "mobile", "safari"]
      }
    ]
  }'

# Response:
# {
#   "created": 2,
#   "updated": 0,
#   "skipped": 0,
#   "entries": [
#     {
#       "id": 1,
#       "votes": 123,
#       "title": "API Outage on Jan 1",
#       ...
#     },
#     {
#       "id": 2,
#       "votes": 89,
#       "title": "UI Rendering Issue",
#       ...
#     }
#   ]
# }
```

### 5. List repository entries
```bash
curl -X GET "http://localhost:8000/repos/$REPO_ID/entries?skip=0&limit=100" \
  -H "X-User-Id: $USER_ID"

# Response:
# {
#   "items": [
#     {
#       "id": 1,
#       "votes": 123,
#       "title": "API Outage on Jan 1",
#       "product": "Payment Service",
#       ...
#       "user_vote": 0,
#       "saved": false,
#       "comment_count": 0
#     }
#   ],
#   "total": 2
# }
```

### 6. Test idempotency (re-run same bulk request)
```bash
# Running the same bulk request again should update existing entries
# based on source_path or content_hash match
curl -X POST "http://localhost:8000/repos/$REPO_ID/entries/bulk" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: $USER_ID" \
  -d '{
    "entries": [
      {
        "source_path": "bugs/2024/api-outage.md",
        "content_hash": "sha256:abc123...",
        "title": "API Outage on Jan 1 - UPDATED",
        "product": "Payment Service",
        "year": 2024,
        "category": "incident",
        "cause": "infra",
        "severity": "critical",
        "summary": "Payment API was down for 2 hours due to database connection pool exhaustion. Root cause: misconfigured connection limits.",
        "tags": ["infra", "payment", "database"]
      }
    ]
  }'

# Response:
# {
#   "created": 0,
#   "updated": 1,
#   "skipped": 0,
#   "entries": [...]
# }
```

---

## Migration Execution

The migrations are executed automatically on application startup via `init_db()` in `app/db.py`. All migrations use `IF NOT EXISTS` clauses to ensure idempotency.

### Manual Migration Check

To verify migrations ran correctly, you can check:

```sql
-- Check repos table exists
SELECT * FROM information_schema.tables WHERE table_name = 'repos';

-- Check posts.repo_id column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'posts' AND column_name IN ('repo_id', 'source_path', 'content_hash');

-- Check partial unique indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'posts' 
  AND indexname IN ('idx_posts_repo_source_path', 'idx_posts_repo_content_hash');
```

---

## Backward Compatibility

✅ **All existing endpoints continue to work:**
- `GET /posts` - Still works, entries without `repo_id` are included
- `POST /posts` - Still works, can create entries without `repo_id`
- `POST /posts/{id}/vote` - Still works
- `POST /posts/{id}/save` - Still works
- `GET /posts/{id}/comments` - Still works
- All other existing endpoints unchanged

✅ **Database changes are non-breaking:**
- New `repos` table doesn't affect existing queries
- `posts.repo_id` is nullable, so existing posts work
- New columns `source_path` and `content_hash` are nullable
- Partial unique indexes only apply when values are NOT NULL

---

## Files Modified

1. **`app/models.py`** - Added SQLAlchemy models for `User`, `Repo`, `Vote`, `Save`, `Comment`, updated `Post`
2. **`app/db.py`** - Added migrations for `repos` table, `posts.repo_id`, `posts.source_path`, `posts.content_hash`, and partial unique indexes
3. **`app/schemas.py`** - Added `RepoIn`, `RepoOut`, `ReposResponse`, `BulkEntryIn`, `BulkEntriesRequest`, `BulkEntriesResponse`
4. **`app/crud.py`** - Added `create_repo`, `get_repos`, `get_repo_by_id`, `create_bulk_entries`, `get_repo_entries`
5. **`app/main.py`** - Added endpoints: `POST /repos`, `GET /repos`, `POST /repos/{repo_id}/entries/bulk`, `GET /repos/{repo_id}/entries`

---

## Next Steps (Not Included in This Phase)

- CLI tool implementation (will use `/repos/{repo_id}/entries/bulk` endpoint)
- Frontend UI for repositories (excluded from this phase)
- Entry versioning table (optional, can be added later)
- Repo permissions/access control beyond ownership
- Repo slug generation and URL-friendly names

