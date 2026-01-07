from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional
from app.db import get_db, init_db
from app.schemas import PostIn, PostOut, PostsResponse, TopCausesResponse
from app.crud import get_posts, create_post, get_top_causes

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

@app.get("/posts", response_model=PostsResponse)
def list_posts(
    q: Optional[str] = Query(None, description="Search query"),
    cause: str = Query("all", description="Filter by cause"),
    severity: str = Query("all", description="Filter by severity"),
    sort: str = Query("hot", description="Sort by: hot, new, or top"),
    db: Session = Depends(get_db)
):
    items, total = get_posts(db, q=q, cause=cause, severity=severity, sort=sort)
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

