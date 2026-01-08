from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, func as sql_func, text
from app.models import Post, Tag
from typing import Optional
import random
import uuid

def get_posts(
    db: Session,
    q: Optional[str] = None,
    cause: str = "all",
    severity: str = "all",
    sort: str = "hot",
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[str] = None
):
    # If search query is provided, use Full-Text Search
    if q and q.strip():
        return _get_posts_with_fts(db, q.strip(), cause, severity, sort, skip, limit, user_id)
    
    # Otherwise use regular filtering
    query = db.query(Post)

    # Cause filter
    if cause != "all":
        query = query.filter(Post.cause == cause.lower())

    # Severity filter
    if severity != "all":
        query = query.filter(Post.severity == severity.lower())

    # Sorting
    if sort == "new":
        query = query.order_by(desc(Post.year))
    elif sort == "top":
        query = query.order_by(desc(Post.votes))
    else:  # hot
        # hot = (votes + (year - 2010) * 6) desc
        query = query.order_by(desc(Post.votes + (Post.year - 2010) * 6))

    total = query.count()
    posts = query.offset(skip).limit(limit).all()

    # Convert to dict format with tags as string array
    result = []
    post_ids = [post.id for post in posts]
    
    # Fetch user-specific data if user_id provided
    user_votes = {}
    user_saves = set()
    comment_counts = {}
    
    if user_id:
        # Get user votes
        votes_result = db.execute(
            text("SELECT post_id, value FROM votes WHERE user_id = :user_id AND post_id = ANY(:post_ids)"),
            {"user_id": user_id, "post_ids": post_ids}
        )
        user_votes = {row[0]: row[1] for row in votes_result}
        
        # Get user saves
        saves_result = db.execute(
            text("SELECT post_id FROM saves WHERE user_id = :user_id AND post_id = ANY(:post_ids)"),
            {"user_id": user_id, "post_ids": post_ids}
        )
        user_saves = {row[0] for row in saves_result}
        
        # Get comment counts
        counts_result = db.execute(
            text("SELECT post_id, COUNT(*) as cnt FROM comments WHERE post_id = ANY(:post_ids) GROUP BY post_id"),
            {"post_ids": post_ids}
        )
        comment_counts = {row[0]: row[1] for row in counts_result}
    
    # Get comment counts for all posts if no user_id
    if not user_id:
        counts_result = db.execute(
            text("SELECT post_id, COUNT(*) as cnt FROM comments WHERE post_id = ANY(:post_ids) GROUP BY post_id"),
            {"post_ids": post_ids}
        )
        comment_counts = {row[0]: row[1] for row in counts_result}
    
    for post in posts:
        post_dict = {
            "id": post.id,
            "votes": post.votes,
            "title": post.title,
            "product": post.product,
            "year": post.year,
            "category": post.category,
            "cause": post.cause,
            "severity": post.severity,
            "summary": post.summary,
            "tags": [tag.name for tag in post.tags],
            "created_at": post.created_at,
            "user_vote": user_votes.get(post.id, 0),
            "saved": post.id in user_saves,
            "comment_count": comment_counts.get(post.id, 0)
        }
        result.append(post_dict)

    return result, total

def _get_posts_with_fts(
    db: Session,
    q: str,
    cause: str,
    severity: str,
    sort: str,
    skip: int,
    limit: int,
    user_id: Optional[str] = None
):
    """Get posts using PostgreSQL Full-Text Search"""
    # Build WHERE clause for filters
    where_clauses = ["search_tsv @@ websearch_to_tsquery('english', :q)"]
    params = {"q": q}
    
    if cause != "all":
        where_clauses.append("cause = :cause")
        params["cause"] = cause.lower()
    
    if severity != "all":
        where_clauses.append("severity = :severity")
        params["severity"] = severity.lower()
    
    where_sql = " AND ".join(where_clauses)
    
    # Build ORDER BY clause
    # Primary: relevance rank, Secondary: requested sort
    if sort == "new":
        order_by = "ts_rank_cd(search_tsv, websearch_to_tsquery('english', :q)) DESC, year DESC"
    elif sort == "top":
        order_by = "ts_rank_cd(search_tsv, websearch_to_tsquery('english', :q)) DESC, votes DESC"
    else:  # hot
        order_by = "ts_rank_cd(search_tsv, websearch_to_tsquery('english', :q)) DESC, (votes + (year - 2010) * 6) DESC"
    
    # Get total count
    count_query = text(f"""
        SELECT COUNT(*) 
        FROM posts 
        WHERE {where_sql}
    """)
    total = db.execute(count_query, params).scalar()
    
    # Get posts with tags
    posts_query = text(f"""
        SELECT id, votes, title, product, year, category, cause, severity, summary, created_at
        FROM posts
        WHERE {where_sql}
        ORDER BY {order_by}
        LIMIT :limit OFFSET :offset
    """)
    params["limit"] = limit
    params["offset"] = skip
    
    result = db.execute(posts_query, params)
    rows = result.fetchall()
    
    # Fetch posts with tags
    post_ids = [row[0] for row in rows]
    posts = db.query(Post).filter(Post.id.in_(post_ids)).all()
    
    # Create a map for ordering
    post_map = {post.id: post for post in posts}
    
    # Fetch user-specific data if user_id provided
    user_votes = {}
    user_saves = set()
    comment_counts = {}
    
    if user_id:
        # Get user votes
        votes_result = db.execute(
            text("SELECT post_id, value FROM votes WHERE user_id = :user_id AND post_id = ANY(:post_ids)"),
            {"user_id": user_id, "post_ids": post_ids}
        )
        user_votes = {row[0]: row[1] for row in votes_result}
        
        # Get user saves
        saves_result = db.execute(
            text("SELECT post_id FROM saves WHERE user_id = :user_id AND post_id = ANY(:post_ids)"),
            {"user_id": user_id, "post_ids": post_ids}
        )
        user_saves = {row[0] for row in saves_result}
        
        # Get comment counts
        counts_result = db.execute(
            text("SELECT post_id, COUNT(*) as cnt FROM comments WHERE post_id = ANY(:post_ids) GROUP BY post_id"),
            {"post_ids": post_ids}
        )
        comment_counts = {row[0]: row[1] for row in counts_result}
    
    # Get comment counts for all posts if no user_id
    if not user_id:
        counts_result = db.execute(
            text("SELECT post_id, COUNT(*) as cnt FROM comments WHERE post_id = ANY(:post_ids) GROUP BY post_id"),
            {"post_ids": post_ids}
        )
        comment_counts = {row[0]: row[1] for row in counts_result}
    
    # Convert to dict format maintaining order
    result_list = []
    for post_id in post_ids:
        if post_id in post_map:
            post = post_map[post_id]
            result_list.append({
                "id": post.id,
                "votes": post.votes,
                "title": post.title,
                "product": post.product,
                "year": post.year,
                "category": post.category,
                "cause": post.cause,
                "severity": post.severity,
                "summary": post.summary,
                "tags": [tag.name for tag in post.tags],
                "created_at": post.created_at,
                "user_vote": user_votes.get(post.id, 0),
                "saved": post.id in user_saves,
                "comment_count": comment_counts.get(post.id, 0)
            })
    
    return result_list, total

def create_post(db: Session, post_data: dict):
    # Get or create tags
    tag_names = post_data.get("tags", [])
    if not tag_names:
        # Default to cause if no tags provided
        tag_names = [post_data["cause"]]

    tags = []
    for tag_name in tag_names:
        tag = db.query(Tag).filter(Tag.name == tag_name.lower()).first()
        if not tag:
            tag = Tag(name=tag_name.lower())
            db.add(tag)
            db.flush()
        tags.append(tag)

    # Set initial random votes (80-430)
    votes = random.randint(80, 430)

    post = Post(
        title=post_data["title"],
        product=post_data["product"],
        year=post_data["year"],
        category=post_data["category"],
        cause=post_data["cause"].lower(),
        severity=post_data["severity"].lower(),
        summary=post_data["summary"],
        votes=votes,
        tags=tags
    )

    db.add(post)
    db.flush()  # Flush to get post.id
    
    # Update search_tsv column
    tags_str = " ".join([tag.name for tag in tags])
    search_text = f"{post.title} {post.product} {post.category} {post.cause} {post.severity} {post.summary} {tags_str}".strip()
    
    db.execute(
        text("""
            UPDATE posts 
            SET search_tsv = to_tsvector('english', :search_text)
            WHERE id = :post_id
        """),
        {"search_text": search_text, "post_id": post.id}
    )
    
    db.commit()
    db.refresh(post)

    # Return as dict with tags array
    return {
        "id": post.id,
        "votes": post.votes,
        "title": post.title,
        "product": post.product,
        "year": post.year,
        "category": post.category,
        "cause": post.cause,
        "severity": post.severity,
        "summary": post.summary,
        "tags": [tag.name for tag in post.tags],
        "created_at": post.created_at
    }

def get_top_causes(db: Session, limit: int = 4):
    # Count posts by cause
    cause_counts = (
        db.query(
            Post.cause,
            sql_func.count(Post.id).label('count')
        )
        .group_by(Post.cause)
        .order_by(desc(sql_func.count(Post.id)))
        .limit(limit)
        .all()
    )

    # Get total count
    total_posts = db.query(Post).count()

    result = []
    for cause, count in cause_counts:
        if total_posts == 0:
            percent = 0
        else:
            percent = round(count / total_posts * 100)
            # Cap percent between 0 and 100
            percent = max(0, min(100, percent))
        result.append({
            "cause": cause,
            "count": count,
            "percent": percent
        })

    return result, total_posts

def create_anonymous_user(db: Session) -> str:
    """Create an anonymous user and return the user_id"""
    result = db.execute(text("INSERT INTO users DEFAULT VALUES RETURNING id"))
    user_id = str(result.fetchone()[0])
    db.commit()
    return user_id

def ensure_user(db: Session, user_id: str):
    """Ensure user exists, creating it if needed"""
    db.execute(
        text("INSERT INTO users(id) VALUES (:id) ON CONFLICT DO NOTHING"),
        {"id": user_id}
    )
    db.flush()

def vote_post(db: Session, user_id: str, post_id: int, value: int):
    """Vote on a post. value: -1 (downvote), 0 (remove), 1 (upvote)"""
    # Ensure user exists
    ensure_user(db, user_id)
    
    # Get current vote if exists
    current_vote = db.execute(
        text("SELECT value FROM votes WHERE user_id = :user_id AND post_id = :post_id"),
        {"user_id": user_id, "post_id": post_id}
    ).fetchone()
    
    current_value = current_vote[0] if current_vote else 0
    
    if value == 0:
        # Remove vote
        if current_vote:
            db.execute(
                text("DELETE FROM votes WHERE user_id = :user_id AND post_id = :post_id"),
                {"user_id": user_id, "post_id": post_id}
            )
            # Update post votes
            db.execute(
                text("UPDATE posts SET votes = votes - :current_value WHERE id = :post_id"),
                {"current_value": current_value, "post_id": post_id}
            )
            new_vote_value = 0
    else:
        # Upsert vote
        if current_vote:
            # Update existing vote
            db.execute(
                text("UPDATE votes SET value = :value WHERE user_id = :user_id AND post_id = :post_id"),
                {"value": value, "user_id": user_id, "post_id": post_id}
            )
            # Update post votes: subtract old value, add new value
            db.execute(
                text("UPDATE posts SET votes = votes - :current_value + :new_value WHERE id = :post_id"),
                {"current_value": current_value, "new_value": value, "post_id": post_id}
            )
            new_vote_value = value
        else:
            # Insert new vote
            db.execute(
                text("INSERT INTO votes (user_id, post_id, value) VALUES (:user_id, :post_id, :value)"),
                {"user_id": user_id, "post_id": post_id, "value": value}
            )
            # Update post votes
            db.execute(
                text("UPDATE posts SET votes = votes + :value WHERE id = :post_id"),
                {"value": value, "post_id": post_id}
            )
            new_vote_value = value
    
    db.commit()
    
    # Get updated vote count
    post_votes = db.execute(
        text("SELECT votes FROM posts WHERE id = :post_id"),
        {"post_id": post_id}
    ).fetchone()[0]
    
    return {
        "post_id": post_id,
        "votes": post_votes,
        "user_vote": new_vote_value
    }

def save_post(db: Session, user_id: str, post_id: int):
    """Save a post for a user"""
    # Ensure user exists
    ensure_user(db, user_id)
    
    db.execute(
        text("INSERT INTO saves (user_id, post_id) VALUES (:user_id, :post_id) ON CONFLICT DO NOTHING"),
        {"user_id": user_id, "post_id": post_id}
    )
    db.commit()

def unsave_post(db: Session, user_id: str, post_id: int):
    """Unsave a post for a user"""
    # Ensure user exists
    ensure_user(db, user_id)
    
    db.execute(
        text("DELETE FROM saves WHERE user_id = :user_id AND post_id = :post_id"),
        {"user_id": user_id, "post_id": post_id}
    )
    db.commit()

def get_saved_posts(db: Session, user_id: str, skip: int = 0, limit: int = 100):
    """Get saved posts for a user"""
    # Ensure user exists
    ensure_user(db, user_id)
    
    saved_post_ids = db.execute(
        text("SELECT post_id FROM saves WHERE user_id = :user_id ORDER BY created_at DESC LIMIT :limit OFFSET :skip"),
        {"user_id": user_id, "limit": limit, "skip": skip}
    ).fetchall()
    
    post_ids = [row[0] for row in saved_post_ids]
    
    if not post_ids:
        return [], 0
    
    posts = db.query(Post).filter(Post.id.in_(post_ids)).all()
    
    # Maintain order
    post_map = {post.id: post for post in posts}
    ordered_posts = [post_map[pid] for pid in post_ids if pid in post_map]
    
    # Get user votes, saves, comment counts
    user_votes = {}
    user_saves = set(post_ids)
    comment_counts = {}
    
    votes_result = db.execute(
        text("SELECT post_id, value FROM votes WHERE user_id = :user_id AND post_id = ANY(:post_ids)"),
        {"user_id": user_id, "post_ids": post_ids}
    )
    user_votes = {row[0]: row[1] for row in votes_result}
    
    counts_result = db.execute(
        text("SELECT post_id, COUNT(*) as cnt FROM comments WHERE post_id = ANY(:post_ids) GROUP BY post_id"),
        {"post_ids": post_ids}
    )
    comment_counts = {row[0]: row[1] for row in counts_result}
    
    result = []
    for post in ordered_posts:
        result.append({
            "id": post.id,
            "votes": post.votes,
            "title": post.title,
            "product": post.product,
            "year": post.year,
            "category": post.category,
            "cause": post.cause,
            "severity": post.severity,
            "summary": post.summary,
            "tags": [tag.name for tag in post.tags],
            "created_at": post.created_at,
            "user_vote": user_votes.get(post.id, 0),
            "saved": True,
            "comment_count": comment_counts.get(post.id, 0)
        })
    
    total = db.execute(
        text("SELECT COUNT(*) FROM saves WHERE user_id = :user_id"),
        {"user_id": user_id}
    ).fetchone()[0]
    
    return result, total

def get_comments(db: Session, post_id: int):
    """Get comments for a post"""
    comments = db.execute(
        text("""
            SELECT id, post_id, user_id, content, created_at 
            FROM comments 
            WHERE post_id = :post_id 
            ORDER BY created_at ASC
        """),
        {"post_id": post_id}
    ).fetchall()
    
    return [
        {
            "id": row[0],
            "post_id": row[1],
            "user_id": str(row[2]),
            "content": row[3],
            "created_at": row[4]
        }
        for row in comments
    ]

def create_comment(db: Session, user_id: str, post_id: int, content: str):
    """Create a comment on a post"""
    # Ensure user exists
    ensure_user(db, user_id)
    
    result = db.execute(
        text("""
            INSERT INTO comments (post_id, user_id, content) 
            VALUES (:post_id, :user_id, :content) 
            RETURNING id, post_id, user_id, content, created_at
        """),
        {"post_id": post_id, "user_id": user_id, "content": content}
    )
    row = result.fetchone()
    db.commit()
    
    return {
        "id": row[0],
        "post_id": row[1],
        "user_id": str(row[2]),
        "content": row[3],
        "created_at": row[4]
    }

