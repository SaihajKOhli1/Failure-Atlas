# Failure Atlas: Database Map & Migration Plan

## Executive Summary

**Current State**: The codebase uses **raw SQL migrations** in `db.py` (not Alembic). There is a **mismatch** between SQLAlchemy models (only `Post` and `Tag`) and actual database tables (includes `users`, `votes`, `saves`, `comments` created via raw SQL).

**Target State**: GitHub-style bug journal platform with `repos`, `entries`, optional `entry_versions`, maintaining backward compatibility.

---

## 1. EXISTING DATABASE MODELS

### 1.1 SQLAlchemy Models (in `app/models.py`)

#### `Post`
- **Table**: `posts`
- **Primary Key**: `id` (Integer, auto-increment)
- **Columns**:
  - `id` INTEGER PRIMARY KEY (indexed)
  - `votes` INTEGER NOT NULL DEFAULT 0
  - `title` TEXT NOT NULL
  - `product` TEXT NOT NULL
  - `year` INTEGER NOT NULL
  - `category` TEXT NOT NULL
  - `cause` TEXT NOT NULL (stored lowercase)
  - `severity` VARCHAR(10) NOT NULL ('low', 'med', 'high')
  - `summary` TEXT NOT NULL
  - `created_at` TIMESTAMPTZ DEFAULT now()
  - `search_tsv` TSVECTOR (added via raw SQL, not in model)
- **Foreign Keys**: None (root entity)
- **Indexes**: 
  - Primary key index on `id`
  - GIN index on `search_tsv` (created via raw SQL)
- **Relationships**: 
  - Many-to-many with `Tag` via `post_tags` join table

#### `Tag`
- **Table**: `tags`
- **Primary Key**: `id` (Integer, auto-increment)
- **Columns**:
  - `id` INTEGER PRIMARY KEY (indexed)
  - `name` TEXT NOT NULL UNIQUE
- **Foreign Keys**: None
- **Indexes**: 
  - Primary key index on `id`
  - Unique constraint on `name`
- **Relationships**: 
  - Many-to-many with `Post` via `post_tags` join table

#### `post_tags` (Join Table)
- **Table**: `post_tags`
- **Primary Key**: Composite (`post_id`, `tag_id`)
- **Columns**:
  - `post_id` INTEGER (FK to `posts.id` ON DELETE CASCADE)
  - `tag_id` INTEGER (FK to `tags.id` ON DELETE CASCADE)
- **Foreign Keys**:
  - `post_id` → `posts.id` (CASCADE delete)
  - `tag_id` → `tags.id` (CASCADE delete)
- **Indexes**: Composite primary key

---

## 2. LIVE DATABASE SCHEMA (from `db.py` raw SQL)

### 2.1 Tables Created via Raw SQL (NOT in SQLAlchemy models)

#### `users`
- **Created**: Raw SQL in `init_db()` (line 77-82)
- **Primary Key**: `id` (UUID, default gen_random_uuid())
- **Columns**:
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `created_at` TIMESTAMPTZ DEFAULT now()
- **Foreign Keys**: None
- **Indexes**: Primary key index
- **Note**: Used by `votes`, `saves`, `comments` but not modeled in SQLAlchemy

#### `votes`
- **Created**: Raw SQL in `init_db()` (line 86-95)
- **Primary Key**: Composite (`user_id`, `post_id`)
- **Columns**:
  - `user_id` UUID NOT NULL (FK to `users.id` ON DELETE CASCADE)
  - `post_id` INTEGER NOT NULL (FK to `posts.id` ON DELETE CASCADE)
  - `value` SMALLINT NOT NULL CHECK (value IN (-1, 1))
  - `created_at` TIMESTAMPTZ DEFAULT now()
- **Foreign Keys**:
  - `user_id` → `users.id` (CASCADE delete)
  - `post_id` → `posts.id` (CASCADE delete)
- **Indexes**: 
  - Composite primary key
  - `idx_votes_post_id` on `post_id` (line 126)

#### `saves`
- **Created**: Raw SQL in `init_db()` (line 99-107)
- **Primary Key**: Composite (`user_id`, `post_id`)
- **Columns**:
  - `user_id` UUID NOT NULL (FK to `users.id` ON DELETE CASCADE)
  - `post_id` INTEGER NOT NULL (FK to `posts.id` ON DELETE CASCADE)
  - `created_at` TIMESTAMPTZ DEFAULT now()
- **Foreign Keys**:
  - `user_id` → `users.id` (CASCADE delete)
  - `post_id` → `posts.id` (CASCADE delete)
- **Indexes**: 
  - Composite primary key
  - `idx_saves_user_id` on `user_id` (line 129)

#### `comments`
- **Created**: Raw SQL in `init_db()` (line 111-120)
- **Primary Key**: `id` (BIGSERIAL)
- **Columns**:
  - `id` BIGSERIAL PRIMARY KEY
  - `post_id` INTEGER NOT NULL (FK to `posts.id` ON DELETE CASCADE)
  - `user_id` UUID NOT NULL (FK to `users.id` ON DELETE CASCADE)
  - `content` TEXT NOT NULL
  - `created_at` TIMESTAMPTZ DEFAULT now()
- **Foreign Keys**:
  - `post_id` → `posts.id` (CASCADE delete)
  - `user_id` → `users.id` (CASCADE delete)
- **Indexes**: 
  - Primary key index
  - `idx_comments_post_id` on `post_id` (line 132)

### 2.2 Additional Columns Added via Raw SQL

#### `posts.search_tsv`
- **Added**: Raw SQL in `init_db()` (line 41)
- **Type**: TSVECTOR
- **Purpose**: Full-Text Search index
- **Index**: GIN index `posts_search_tsv_gin` (line 70)
- **Update Logic**: Updated via trigger or manual SQL (not in model)

---

## 3. MIGRATION SUMMARY

### 3.1 Current Migration Approach
- **Method**: Raw SQL executed in `init_db()` on application startup
- **No Alembic**: Alembic is not installed or configured
- **Migration Logic**: 
  - Uses `CREATE TABLE IF NOT EXISTS`
  - Uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
  - Uses `CREATE INDEX IF NOT EXISTS`
  - Idempotent operations (safe to run multiple times)

### 3.2 Historical Changes (inferred from code)
1. **Initial**: `posts`, `tags`, `post_tags` tables (via SQLAlchemy)
2. **Added**: Full-Text Search (`posts.search_tsv` column + GIN index)
3. **Added**: `users` table for anonymous authentication
4. **Added**: `votes` table for voting system
5. **Added**: `saves` table for saved posts
6. **Added**: `comments` table for comments
7. **Removed**: `posts.embedding` column (vector embeddings, line 29)

---

## 4. DATABASE MAP

### 4.1 Entity Relationship Diagram

```
┌─────────────┐
│    users    │
│─────────────│
│ id (UUID) PK│
│ created_at  │
└──────┬──────┘
       │
       ├──────────────────────────────┐
       │                              │
       ▼                              ▼
┌─────────────┐              ┌─────────────┐
│    votes    │              │    saves    │
│─────────────│              │─────────────│
│ user_id FK  │◄─────────────┤ user_id FK  │
│ post_id FK  │              │ post_id FK  │
│ value       │              │ created_at  │
│ created_at  │              │             │
│ PK(user,p)  │              │ PK(user,p)  │
└──────┬──────┘              └──────┬──────┘
       │                            │
       │                            │
       ▼                            ▼
┌─────────────┐              ┌─────────────┐
│    posts    │              │  comments   │
│─────────────│              │─────────────│
│ id PK       │◄─────────────┤ id (bigser) │
│ votes       │              │ post_id FK  │
│ title       │              │ user_id FK  │
│ product     │              │ content     │
│ year        │              │ created_at  │
│ category    │              │             │
│ cause       │              └─────────────┘
│ severity    │
│ summary     │
│ created_at  │
│ search_tsv  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  post_tags  │
│─────────────│
│ post_id FK  │
│ tag_id FK   │
│ PK(p,t)     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    tags     │
│─────────────│
│ id PK       │
│ name UNIQUE │
└─────────────┘
```

### 4.2 Table Purpose & Usage

| Table | Purpose | Current Usage | Future Usage |
|-------|---------|---------------|--------------|
| `users` | Anonymous user identity | UUID-based auth, referenced by votes/saves/comments | **REUSE** - Will become repo owners |
| `posts` | Failure/bug reports | Main content entity | **RENAME** → `entries` (evolve structure) |
| `tags` | Categorization labels | Many-to-many with posts | **REUSE** - Tags for entries |
| `post_tags` | Post-tag relationships | Join table | **RENAME** → `entry_tags` |
| `votes` | User voting | Upvote/downvote posts | **REUSE** - Voting on entries |
| `saves` | Saved items | User bookmarks | **REUSE** - Saved entries |
| `comments` | Discussion threads | Comments on posts | **REUSE** - Comments on entries |

---

## 5. MIGRATION PLAN: Failure Atlas → GitHub-Style Bug Journal

### 5.1 Target Schema

```
┌─────────────┐
│    users    │ (enhanced)
│─────────────│
│ id (UUID)   │
│ username    │ (NEW)
│ email       │ (NEW, optional)
│ created_at  │
└──────┬──────┘
       │
       │ owns
       │
       ▼
┌─────────────┐
│    repos    │ (NEW)
│─────────────│
│ id (UUID)   │
│ owner_id FK │
│ name        │
│ slug        │ (unique per owner)
│ description │
│ created_at  │
│ updated_at  │
└──────┬──────┘
       │
       │ contains
       │
       ▼
┌─────────────┐       ┌──────────────────┐
│   entries   │──────▶│ entry_versions   │ (NEW, optional)
│─────────────│       │──────────────────│
│ id (UUID)   │       │ id (UUID)        │
│ repo_id FK  │       │ entry_id FK      │
│ title       │       │ version_number   │
│ summary     │       │ content          │
│ status      │       │ created_at       │
│ severity    │       │ created_by FK    │
│ created_at  │       └──────────────────┘
│ updated_at  │
│ created_by  │
└──────┬──────┘
       │
       │ has many
       │
       ▼
┌─────────────┐
│ entry_tags  │ (renamed from post_tags)
└─────────────┘
```

### 5.2 Migration Strategy: Backward-Compatible Evolution

#### Phase 1: Add New Tables (No Breaking Changes)

**Action**: Create new `repos` and `entry_versions` tables without modifying existing tables.

```sql
-- 1. Create repos table
CREATE TABLE IF NOT EXISTS repos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(owner_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_repos_owner_id ON repos(owner_id);
CREATE INDEX IF NOT EXISTS idx_repos_slug ON repos(slug);

-- 2. Create entry_versions table (optional history)
CREATE TABLE IF NOT EXISTS entry_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title TEXT,
    summary TEXT,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(entry_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_entry_versions_entry_id ON entry_versions(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_versions_created_by ON entry_versions(created_by);
```

**Impact**: ✅ Zero breaking changes. Existing code continues to work.

---

#### Phase 2: Enhance Users Table

**Action**: Add optional fields to `users` table (nullable columns).

```sql
-- Add username and email (nullable for backward compatibility)
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE,
    ADD COLUMN IF NOT EXISTS email VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
```

**Impact**: ✅ Backward compatible. Existing anonymous users remain valid.

---

#### Phase 3: Add Foreign Keys to Posts (Prepare for Repos)

**Action**: Add `repo_id` and `created_by` columns to `posts` (nullable initially).

```sql
-- Add repo_id and created_by columns (nullable)
ALTER TABLE posts 
    ADD COLUMN IF NOT EXISTS repo_id UUID REFERENCES repos(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_repo_id ON posts(repo_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_by ON posts(created_by);

-- Update existing posts: set created_by from votes/comments if possible
-- (Optional data migration)
```

**Impact**: ✅ Backward compatible. Existing posts work without repos.

---

#### Phase 4: Migrate Data & Add Constraints (Optional)

**Action**: Migrate existing posts to a default repo, then make `repo_id` required for new entries.

```sql
-- 1. Create default repo for existing posts (one-time)
INSERT INTO repos (id, owner_id, name, slug, description)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM users LIMIT 1), -- Use first user or create system user
    'Legacy Posts',
    'legacy',
    'Migrated from Failure Atlas'
ON CONFLICT DO NOTHING;

-- 2. Update existing posts with default repo (one-time)
UPDATE posts 
SET repo_id = (SELECT id FROM repos WHERE slug = 'legacy' LIMIT 1)
WHERE repo_id IS NULL;

-- 3. Make repo_id NOT NULL for future entries (optional, can be done later)
-- ALTER TABLE posts ALTER COLUMN repo_id SET NOT NULL; -- Defer this step
```

**Impact**: ⚠️ Requires data migration. Can be done incrementally.

---

#### Phase 5: Rename Tables (API Compatibility Layer)

**Action**: Create views or synonyms to maintain API compatibility while renaming tables.

```sql
-- Option A: Create views (PostgreSQL)
CREATE OR REPLACE VIEW entries AS SELECT * FROM posts;
CREATE OR REPLACE VIEW entry_tags AS SELECT * FROM post_tags;

-- Option B: Use ALIAS (requires application-level changes)
-- ALTER TABLE posts RENAME TO entries;
-- ALTER TABLE post_tags RENAME TO entry_tags;
```

**Impact**: ⚠️ Requires application code changes. Views allow gradual migration.

---

### 5.3 Reusability Matrix

| Current Table | Reuse Strategy | Action | Notes |
|---------------|----------------|--------|-------|
| `users` | **REUSE AS-IS** | Add `username`, `email` (nullable) | Keep UUID PK, enhance later |
| `repos` | **NEW TABLE** | Create from scratch | GitHub-style repository model |
| `posts` | **EVOLVE → entries** | Add `repo_id`, `created_by`, keep all columns | Rename in application layer first |
| `tags` | **REUSE AS-IS** | No changes needed | Works for entries |
| `post_tags` | **RENAME → entry_tags** | Rename table, update FKs | After posts → entries rename |
| `votes` | **REUSE AS-IS** | Change FK from `post_id` → `entry_id` (after rename) | Voting logic unchanged |
| `saves` | **REUSE AS-IS** | Change FK from `post_id` → `entry_id` (after rename) | Bookmarking logic unchanged |
| `comments` | **REUSE AS-IS** | Change FK from `post_id` → `entry_id` (after rename) | Commenting logic unchanged |
| `entry_versions` | **NEW TABLE** | Create from scratch | Optional version history |

---

## 6. DEPRECATION PLAN

### 6.1 Tables to Deprecate (Later, Not Now)

**None** - All current tables will be reused or evolved.

### 6.2 Columns to Deprecate (Later)

- `posts.votes` → May become computed from `votes` table in the future
- `posts.product`, `posts.year`, `posts.category` → May move to tags/metadata
- `posts.cause` → May become a tag or status field

**Action**: Mark as deprecated in documentation, remove from new APIs, keep in database for existing data.

---

## 7. CONCRETE MIGRATION STEPS

### Step 1: Create New Tables (Immediate, Zero Risk)

```sql
-- Run in db.py init_db() or separate migration script
-- See Phase 1 SQL above
```

**Validation**: Verify `repos` and `entry_versions` tables exist.

---

### Step 2: Enhance Users (Immediate, Zero Risk)

```sql
-- Run in db.py init_db()
-- See Phase 2 SQL above
```

**Validation**: Verify `users` table has `username` and `email` columns (nullable).

---

### Step 3: Add Repo Relationship to Posts (Immediate, Low Risk)

```sql
-- Run in db.py init_db()
-- See Phase 3 SQL above
```

**Validation**: Verify `posts` table has `repo_id` and `created_by` columns (nullable).

---

### Step 4: Update SQLAlchemy Models

**File**: `app/models.py`

```python
# Add new models
class Repo(Base):
    __tablename__ = 'repos'
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class EntryVersion(Base):
    __tablename__ = 'entry_versions'
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    entry_id = Column(Integer, ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)
    version_number = Column(Integer, nullable=False)
    title = Column(Text)
    summary = Column(Text)
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(UUID, ForeignKey('users.id', ondelete='SET NULL'))

# Update Post model
class Post(Base):
    # ... existing columns ...
    repo_id = Column(UUID, ForeignKey('repos.id', ondelete='SET NULL'), nullable=True)
    created_by = Column(UUID, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

# Update User model (if not exists)
class User(Base):
    __tablename__ = 'users'
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    username = Column(String(255), unique=True, nullable=True)
    email = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

---

### Step 5: Data Migration (Optional, Later)

Create a script to migrate existing posts to a default repo.

**File**: `app/migrate_to_repos.py`

```python
# One-time migration script
# Run manually after Phase 3 is complete
```

---

### Step 6: API Compatibility Layer

Update API endpoints to support both `posts` and `entries` terminology.

**File**: `app/main.py`

```python
# Add new endpoints while keeping old ones
@app.get("/entries", response_model=PostsResponse)  # New
@app.get("/posts", response_model=PostsResponse)    # Keep for compatibility
```

---

## 8. ANSWERS TO EXPLICIT QUESTIONS

### Which tables can be reused as-is?

✅ **`users`** - Keep UUID PK, add optional `username`/`email`
✅ **`tags`** - No changes needed
✅ **`votes`** - Keep structure, update FK after rename
✅ **`saves`** - Keep structure, update FK after rename
✅ **`comments`** - Keep structure, update FK after rename

### Which should be renamed or repurposed?

🔄 **`posts` → `entries`** - Add `repo_id`, `created_by`, rename in application layer
🔄 **`post_tags` → `entry_tags`** - Rename after `posts` rename

### Which should be deprecated later (but not deleted yet)?

⚠️ **`posts.votes`** - May become computed from `votes` table (keep for now)
⚠️ **`posts.product`**, **`posts.year`**, **`posts.category`** - May move to tags/metadata (keep for now)
⚠️ **`posts.cause`** - May become a tag or status (keep for now)

**Deprecation Strategy**: Mark in docs, remove from new APIs, keep in database for backward compatibility.

---

## 9. RISK ASSESSMENT

| Phase | Risk Level | Breaking Changes | Rollback Strategy |
|-------|------------|------------------|-------------------|
| Phase 1: New tables | ✅ Zero | None | Drop new tables |
| Phase 2: Enhance users | ✅ Zero | None | Drop new columns |
| Phase 3: Add repo_id | ✅ Low | None (nullable) | Drop columns |
| Phase 4: Data migration | ⚠️ Medium | None (optional) | Revert UPDATEs |
| Phase 5: Rename tables | 🔴 High | Requires code changes | Use views/compatibility layer |

**Recommendation**: Execute Phases 1-3 immediately (zero risk). Phase 4-5 require careful planning and testing.

---

## 10. NEXT STEPS

1. ✅ **Execute Phase 1-3 SQL** in `db.py` `init_db()`
2. ✅ **Add SQLAlchemy models** for `Repo`, `EntryVersion`, update `Post`, `User`
3. ✅ **Create API endpoints** for repos (CRUD operations)
4. ⚠️ **Test backward compatibility** - ensure existing endpoints still work
5. ⚠️ **Plan Phase 4-5** - data migration and table renaming (separate PR)

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Author**: Database Migration Analysis

