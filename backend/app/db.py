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

