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

