import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/failure_atlas")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Create all tables if they don't exist and set up Full-Text Search"""
    Base.metadata.create_all(bind=engine)
    
    with engine.connect() as conn:
        # Enable pgcrypto extension for gen_random_uuid()
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
        conn.commit()
        
        # Remove old embedding infrastructure
        conn.execute(text("DROP INDEX IF EXISTS posts_embedding_hnsw"))
        conn.execute(text("ALTER TABLE posts DROP COLUMN IF EXISTS embedding"))
        conn.commit()
        
        # Add Full-Text Search column if it doesn't exist
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'posts' AND column_name = 'search_tsv'
        """))
        
        if result.fetchone() is None:
            # Add search_tsv column
            conn.execute(text("ALTER TABLE posts ADD COLUMN search_tsv tsvector"))
            conn.commit()
            print("Added search_tsv column to posts table")
            
            # Backfill existing rows
            conn.execute(text("""
                UPDATE posts 
                SET search_tsv = to_tsvector('english',
                    coalesce(title, '') || ' ' ||
                    coalesce(product, '') || ' ' ||
                    coalesce(category, '') || ' ' ||
                    coalesce(cause, '') || ' ' ||
                    coalesce(severity, '') || ' ' ||
                    coalesce(summary, '') || ' ' ||
                    coalesce(
                        (SELECT string_agg(t.name, ' ')
                         FROM tags t
                         JOIN post_tags pt ON t.id = pt.tag_id
                         WHERE pt.post_id = posts.id),
                        ''
                    )
                )
                WHERE search_tsv IS NULL
            """))
            conn.commit()
            print("Backfilled search_tsv for existing posts")
        
        # Create GIN index for Full-Text Search
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS posts_search_tsv_gin 
            ON posts USING gin(search_tsv)
        """))
        conn.commit()
        print("Ensured GIN index for Full-Text Search exists")
        
        # Create users table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                created_at TIMESTAMPTZ DEFAULT now(),
                github_id VARCHAR(255) UNIQUE,
                github_username VARCHAR(255),
                github_name VARCHAR(255),
                github_avatar_url VARCHAR(512)
            )
        """))
        conn.commit()
        print("Ensured users table exists")
        
        # Add GitHub OAuth columns if they don't exist (for existing tables)
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'github_id'
        """))
        if result.fetchone() is None:
            conn.execute(text("ALTER TABLE users ADD COLUMN github_id VARCHAR(255) UNIQUE"))
            conn.execute(text("ALTER TABLE users ADD COLUMN github_username VARCHAR(255)"))
            conn.execute(text("ALTER TABLE users ADD COLUMN github_name VARCHAR(255)"))
            conn.execute(text("ALTER TABLE users ADD COLUMN github_avatar_url VARCHAR(512)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id)"))
            conn.commit()
            print("Added GitHub OAuth columns to users table")
        
        # Create votes table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS votes (
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
                value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
                created_at TIMESTAMPTZ DEFAULT now(),
                PRIMARY KEY (user_id, post_id)
            )
        """))
        conn.commit()
        print("Ensured votes table exists")
        
        # Create saves table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS saves (
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ DEFAULT now(),
                PRIMARY KEY (user_id, post_id)
            )
        """))
        conn.commit()
        print("Ensured saves table exists")
        
        # Create comments table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS comments (
                id BIGSERIAL PRIMARY KEY,
                post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now()
            )
        """))
        conn.commit()
        print("Ensured comments table exists")
        
        # Create indexes for better performance
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_votes_post_id ON votes(post_id)
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_saves_user_id ON saves(user_id)
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)
        """))
        conn.commit()
        print("Ensured indexes exist for votes, saves, and comments")
        
        # Create repos table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS repos (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                visibility VARCHAR(20) NOT NULL DEFAULT 'private',
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now(),
                UNIQUE(owner_id, name)
            )
        """))
        conn.commit()
        print("Ensured repos table exists")
        
        # Ensure repos.id has default UUID (handle existing tables without default)
        # Check if the column exists and doesn't have a default
        result = conn.execute(text("""
            SELECT column_default 
            FROM information_schema.columns 
            WHERE table_name = 'repos' AND column_name = 'id'
        """))
        row = result.fetchone()
        if row and not row[0]:
            # Column exists but has no default, add it
            conn.execute(text("ALTER TABLE repos ALTER COLUMN id SET DEFAULT gen_random_uuid()"))
            conn.commit()
            print("Added DEFAULT gen_random_uuid() to repos.id column")
        
        # Create indexes for repos
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_repos_owner_id ON repos(owner_id)
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_repos_name ON repos(name)
        """))
        conn.commit()
        print("Ensured indexes exist for repos")
        
        # Add repo_id column to posts if it doesn't exist
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'posts' AND column_name = 'repo_id'
        """))
        if result.fetchone() is None:
            conn.execute(text("ALTER TABLE posts ADD COLUMN repo_id UUID REFERENCES repos(id) ON DELETE SET NULL"))
            conn.commit()
            print("Added repo_id column to posts table")
        
        # Create index on posts.repo_id
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_posts_repo_id ON posts(repo_id)
        """))
        conn.commit()
        print("Ensured index exists on posts.repo_id")
        
        # Add source_path and content_hash columns to posts if they don't exist
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'posts' AND column_name = 'source_path'
        """))
        if result.fetchone() is None:
            conn.execute(text("ALTER TABLE posts ADD COLUMN source_path TEXT"))
            conn.commit()
            print("Added source_path column to posts table")
        
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'posts' AND column_name = 'content_hash'
        """))
        if result.fetchone() is None:
            conn.execute(text("ALTER TABLE posts ADD COLUMN content_hash TEXT"))
            conn.commit()
            print("Added content_hash column to posts table")
        
        # Add body column to posts if it doesn't exist (for BugJournal format)
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'posts' AND column_name = 'body'
        """))
        if result.fetchone() is None:
            conn.execute(text("ALTER TABLE posts ADD COLUMN body TEXT"))
            conn.commit()
            print("Added body column to posts table")
        
        # Add status column to posts if it doesn't exist (for BugJournal format)
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'posts' AND column_name = 'status'
        """))
        if result.fetchone() is None:
            conn.execute(text("ALTER TABLE posts ADD COLUMN status VARCHAR(20)"))
            conn.commit()
            print("Added status column to posts table")
        
        # Create partial unique indexes for idempotency
        # Only enforce uniqueness when the columns are NOT NULL
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_repo_source_path 
            ON posts(repo_id, source_path) 
            WHERE repo_id IS NOT NULL AND source_path IS NOT NULL
        """))
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_repo_content_hash 
            ON posts(repo_id, content_hash) 
            WHERE repo_id IS NOT NULL AND content_hash IS NOT NULL
        """))
        conn.commit()
        print("Ensured partial unique indexes exist for posts idempotency")

