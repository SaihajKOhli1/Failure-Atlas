from fastapi import FastAPI, Depends, Query, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional
from app.db import get_db, init_db
from app.schemas import (
    PostIn, PostOut, PostsResponse, TopCausesResponse,
    AuthResponse, VoteIn, VoteOut, CommentIn, CommentOut
)
from app.crud import (
    get_posts, create_post, get_top_causes,
    create_anonymous_user, vote_post, save_post, unsave_post,
    get_saved_posts, get_comments, create_comment
)
from app.models import Post

app = FastAPI(title="Failure Atlas API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database tables on startup
@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/health")
def health_check():
    return {"status": "ok"}

def get_user_id(x_user_id: Optional[str] = Header(None)) -> Optional[str]:
    """Extract user ID from X-User-Id header"""
    return x_user_id

@app.post("/auth/anon", response_model=AuthResponse)
def create_anon_user(db: Session = Depends(get_db)):
    """Create an anonymous user"""
    user_id = create_anonymous_user(db)
    return AuthResponse(user_id=user_id)

@app.get("/posts", response_model=PostsResponse)
def list_posts(
    q: Optional[str] = Query(None, description="Search query"),
    cause: str = Query("all", description="Filter by cause"),
    severity: str = Query("all", description="Filter by severity"),
    sort: str = Query("hot", description="Sort by: hot, new, or top"),
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_user_id)
):
    items, total = get_posts(db, q=q, cause=cause, severity=severity, sort=sort, user_id=user_id)
    return PostsResponse(items=[PostOut(**item) for item in items], total=total)

@app.post("/posts", response_model=PostOut)
def create_new_post(post: PostIn, db: Session = Depends(get_db)):
    post_data = post.model_dump()
    created = create_post(db, post_data)
    return PostOut(**created)

@app.get("/analytics/top-causes", response_model=TopCausesResponse)
def top_causes(db: Session = Depends(get_db)):
    from app.schemas import CauseAnalytics
    items, total = get_top_causes(db, limit=4)
    analytics_items = [CauseAnalytics(**item) for item in items]
    return TopCausesResponse(items=analytics_items, total=total)

@app.post("/posts/{post_id}/vote", response_model=VoteOut)
def vote_on_post(
    post_id: int,
    vote: VoteIn,
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_user_id)
):
    """Vote on a post. Requires X-User-Id header."""
    if not user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header required")
    
    # Validate post exists
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    result = vote_post(db, user_id, post_id, vote.value)
    return VoteOut(**result)

@app.post("/posts/{post_id}/save")
def save_post_endpoint(
    post_id: int,
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_user_id)
):
    """Save a post. Requires X-User-Id header."""
    if not user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header required")
    
    # Validate post exists
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    save_post(db, user_id, post_id)
    return {"status": "saved", "post_id": post_id}

@app.delete("/posts/{post_id}/save")
def unsave_post_endpoint(
    post_id: int,
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_user_id)
):
    """Unsave a post. Requires X-User-Id header."""
    if not user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header required")
    
    unsave_post(db, user_id, post_id)
    return {"status": "unsaved", "post_id": post_id}

@app.get("/me/saved", response_model=PostsResponse)
def get_my_saved_posts(
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_user_id)
):
    """Get saved posts for the current user. Requires X-User-Id header."""
    if not user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header required")
    
    items, total = get_saved_posts(db, user_id)
    return PostsResponse(items=[PostOut(**item) for item in items], total=total)

@app.get("/posts/{post_id}/comments", response_model=dict)
def list_comments(post_id: int, db: Session = Depends(get_db)):
    """Get comments for a post"""
    # Validate post exists
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comments = get_comments(db, post_id)
    return {"items": [CommentOut(**comment) for comment in comments]}

@app.post("/posts/{post_id}/comments", response_model=CommentOut)
def create_comment_endpoint(
    post_id: int,
    comment: CommentIn,
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_user_id)
):
    """Create a comment on a post. Requires X-User-Id header."""
    if not user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header required")
    
    # Validate post exists
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    created = create_comment(db, user_id, post_id, comment.content)
    return CommentOut(**created)

