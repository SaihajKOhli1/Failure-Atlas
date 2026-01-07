from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, func as sql_func, text
from app.models import Post, Tag
from typing import Optional
import random

def get_posts(
    db: Session,
    q: Optional[str] = None,
    cause: str = "all",
    severity: str = "all",
    sort: str = "hot",
    skip: int = 0,
    limit: int = 100
):
    # If search query is provided, use Full-Text Search
    if q and q.strip():
        return _get_posts_with_fts(db, q.strip(), cause, severity, sort, skip, limit)
    
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
            "created_at": post.created_at
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
    limit: int
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
                "created_at": post.created_at
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

