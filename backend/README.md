# Failure Atlas Backend

FastAPI backend for the Failure Atlas application.

## Setup

### 1. Create virtual environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure database

Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/failure_atlas
```

Make sure PostgreSQL is running and the database exists:

```bash
createdb failure_atlas
```

### 4. Seed the database

```bash
python -m app.seed
```

This will populate the database with 6 demo posts matching the frontend.

### 5. Run the server

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Health Check

```bash
curl http://localhost:8000/health
```

Response:
```json
{"status": "ok"}
```

### Get Posts

```bash
# Get all posts
curl http://localhost:8000/posts

# Search posts using Full-Text Search
curl "http://localhost:8000/posts?q=privacy"
curl "http://localhost:8000/posts?q=rollout+db+outage"

# Filter by cause
curl "http://localhost:8000/posts?cause=distribution"

# Filter by severity
curl "http://localhost:8000/posts?severity=high"

# Sort options: hot (default), new, top
curl "http://localhost:8000/posts?sort=new"

# Combine search with filters and sorting
curl "http://localhost:8000/posts?q=privacy&cause=trust&sort=top"
```

**Note:** When `q` parameter is provided, results are ordered by relevance (using `ts_rank_cd`) first, then by the requested sort option (hot/new/top) to break ties.

### Create Post

```bash
curl -X POST http://localhost:8000/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Failure",
    "product": "TestProduct",
    "year": 2024,
    "category": "test",
    "cause": "pricing",
    "severity": "med",
    "summary": "This is a test failure summary"
  }'
```

### Get Top Causes Analytics

```bash
curl http://localhost:8000/analytics/top-causes
```

### Anonymous Authentication

```bash
# Create an anonymous user
curl -X POST http://localhost:8000/auth/anon
```

Response:
```json
{"user_id": "550e8400-e29b-41d4-a716-446655440000"}
```

Use this `user_id` in the `X-User-Id` header for authenticated endpoints.

### Voting

```bash
# Upvote a post
curl -X POST http://localhost:8000/posts/1/vote \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{"value": 1}'

# Downvote a post
curl -X POST http://localhost:8000/posts/1/vote \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{"value": -1}'

# Remove vote (value: 0)
curl -X POST http://localhost:8000/posts/1/vote \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{"value": 0}'
```

Response:
```json
{"post_id": 1, "votes": 123, "user_vote": 1}
```

### Saving Posts

```bash
# Save a post
curl -X POST http://localhost:8000/posts/1/save \
  -H "X-User-Id: 550e8400-e29b-41d4-a716-446655440000"

# Unsave a post
curl -X DELETE http://localhost:8000/posts/1/save \
  -H "X-User-Id: 550e8400-e29b-41d4-a716-446655440000"

# Get saved posts
curl http://localhost:8000/me/saved \
  -H "X-User-Id: 550e8400-e29b-41d4-a716-446655440000"
```

### Comments

```bash
# Get comments for a post
curl http://localhost:8000/posts/1/comments

# Create a comment
curl -X POST http://localhost:8000/posts/1/comments \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{"content": "This is a comment"}'
```

Response:
```json
{
  "id": 1,
  "post_id": 1,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "content": "This is a comment",
  "created_at": "2024-01-01T12:00:00Z"
}
```

### Enriched Post Responses

When you include the `X-User-Id` header in `GET /posts`, the response includes additional fields:

```json
{
  "id": 1,
  "votes": 123,
  "title": "Example Post",
  "user_vote": 1,      // -1, 0, or 1 (0 if no vote)
  "saved": true,       // boolean
  "comment_count": 5,  // integer
  ...
}
```

Without the `X-User-Id` header, `user_vote` defaults to 0 and `saved` defaults to false.

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI app and routes
│   ├── db.py            # Database connection and session
│   ├── models.py        # SQLAlchemy models
│   ├── schemas.py       # Pydantic schemas
│   ├── crud.py          # Database operations
│   └── seed.py          # Seed script
├── requirements.txt     # Python dependencies
└── README.md           # This file
```

## Database Schema

### posts table
- `id` (SERIAL PRIMARY KEY)
- `votes` (INT, default 0)
- `title` (TEXT)
- `product` (TEXT)
- `year` (INT)
- `category` (TEXT)
- `cause` (TEXT, lowercase)
- `severity` (TEXT: 'low', 'med', 'high')
- `summary` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `search_tsv` (TSVECTOR) - Full-Text Search vector, added automatically on startup

### tags table
- `id` (SERIAL PRIMARY KEY)
- `name` (TEXT, UNIQUE)

### post_tags table (many-to-many)
- `post_id` (FK to posts.id, CASCADE delete)
- `tag_id` (FK to tags.id, CASCADE delete)
- PRIMARY KEY (post_id, tag_id)

### users table
- `id` (UUID PRIMARY KEY, auto-generated)
- `created_at` (TIMESTAMPTZ, default now())

### votes table
- `user_id` (UUID, FK to users.id, CASCADE delete)
- `post_id` (INTEGER, FK to posts.id, CASCADE delete)
- `value` (SMALLINT, CHECK value IN (-1, 1))
- `created_at` (TIMESTAMPTZ, default now())
- PRIMARY KEY (user_id, post_id)

### saves table
- `user_id` (UUID, FK to users.id, CASCADE delete)
- `post_id` (INTEGER, FK to posts.id, CASCADE delete)
- `created_at` (TIMESTAMPTZ, default now())
- PRIMARY KEY (user_id, post_id)

### comments table
- `id` (BIGSERIAL PRIMARY KEY)
- `post_id` (INTEGER, FK to posts.id, CASCADE delete)
- `user_id` (UUID, FK to users.id, CASCADE delete)
- `content` (TEXT, NOT NULL, length 1-2000)
- `created_at` (TIMESTAMPTZ, default now())

## Full-Text Search (PostgreSQL FTS)

The backend uses PostgreSQL's built-in Full-Text Search for fast, ranked search across posts:

- **Search Fields:** `title`, `product`, `category`, `cause`, `severity`, `summary`, and `tags`
- **Index:** GIN index on `search_tsv` column for fast search performance
- **Ranking:** Uses `ts_rank_cd` for relevance scoring
- **Query Method:** Uses `websearch_to_tsquery` for user-friendly query parsing

The `search_tsv` column and GIN index are created automatically on startup. When you provide a `q` parameter to `GET /posts`, the system:

1. Filters posts matching the search query using `search_tsv @@ websearch_to_tsquery('english', :q)`
2. Orders results by relevance rank first (`ts_rank_cd`)
3. Then applies the requested sort (hot/new/top) to break ties

**Example searches:**
- `q=privacy` - Finds posts mentioning privacy
- `q=rollout db outage` - Finds posts about rollouts, databases, or outages
- `q="feature flag"` - Exact phrase search (use quotes)

No external dependencies or API keys required - it's all native PostgreSQL!

