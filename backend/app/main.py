from fastapi import FastAPI, Depends, Query, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import os
from app.db import get_db, init_db
from app.auth import (
    get_or_create_github_user, exchange_github_code,
    set_session_cookie, clear_session_cookie, verify_token, COOKIE_NAME, DEV_MODE
)
from app.schemas import (
    PostOut, PostDetailOut, PostsResponse,
    AuthResponse,
    RepoIn, RepoOut, ReposResponse, BulkEntriesRequest, BulkEntriesResponse,
    BulkEntryIn, BugJournalEntryIn, UserOut
)
from app.crud import (
    create_anonymous_user,
    create_repo, get_repos, get_repo_by_id, create_bulk_entries, get_repo_entries,
    get_post_detail
)
from app.models import Repo

app = FastAPI(title="Failure Atlas API")

# Get frontend URL for redirects
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database tables on startup
@app.on_event("startup")
def startup_event():
    # Validate required environment variables (fail fast in production)
    is_production = os.getenv("ENVIRONMENT") == "production" or os.getenv("RAILWAY_ENVIRONMENT") == "production"
    
    missing_vars = []
    if not os.getenv("GITHUB_CLIENT_ID"):
        missing_vars.append("GITHUB_CLIENT_ID")
    if not os.getenv("GITHUB_CLIENT_SECRET"):
        missing_vars.append("GITHUB_CLIENT_SECRET")
    if not os.getenv("DATABASE_URL"):
        missing_vars.append("DATABASE_URL")
    if is_production and not os.getenv("SECRET_KEY"):
        missing_vars.append("SECRET_KEY (required in production)")
    
    if missing_vars:
        error_msg = f"❌ Missing required environment variables: {', '.join(missing_vars)}"
        if is_production:
            raise RuntimeError(error_msg + " - Application cannot start without these variables.")
        else:
            print(f"⚠️  {error_msg}")
            if "GITHUB_CLIENT_ID" in missing_vars or "GITHUB_CLIENT_SECRET" in missing_vars:
                print("   GitHub OAuth will not work without these variables.")
    
    init_db()

@app.get("/health")
def health_check():
    return {"status": "ok"}

def get_user_id(
    request: Request,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[str]:
    """Get user ID from session cookie, or fallback to X-User-Id header (dev mode only)"""
    # Try to get from session cookie
    token = request.cookies.get(COOKIE_NAME)
    if token:
        user_id = verify_token(token)
        if user_id:
            return user_id
    
    # Fallback to X-User-Id header (dev mode only)
    if DEV_MODE and x_user_id:
        # Ensure user exists in DB (for backward compatibility)
        from app.crud import ensure_user
        ensure_user(db, x_user_id)
        return x_user_id
    
    return None

@app.post("/auth/anon", response_model=AuthResponse)
def create_anon_user(db: Session = Depends(get_db)):
    """Create an anonymous user (legacy endpoint, kept for backward compatibility)"""
    user_id = create_anonymous_user(db)
    return AuthResponse(user_id=user_id)

@app.get("/auth/github/start")
def github_oauth_start():
    """Start GitHub OAuth flow - redirect to GitHub"""
    from app.auth import GITHUB_CLIENT_ID, GITHUB_REDIRECT_URI
    if not GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET"
        )
    
    # GitHub OAuth URL
    github_oauth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={GITHUB_REDIRECT_URI}"
        f"&scope=read:user"
    )
    return RedirectResponse(url=github_oauth_url)

@app.get("/auth/github/callback")
async def github_oauth_callback(code: str, db: Session = Depends(get_db)):
    """GitHub OAuth callback - exchange code for user info and create session"""
    try:
        # Exchange code for GitHub user info
        github_user = await exchange_github_code(code)
        
        # Get or create user in database
        user_id = get_or_create_github_user(
            db,
            github_user["github_id"],
            github_user["github_username"],
            github_user.get("github_name"),
            github_user.get("github_avatar_url"),
        )
        
        # Create response and set session cookie
        response = RedirectResponse(url=f"{FRONTEND_URL}/journal")
        set_session_cookie(response, user_id)
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth error: {str(e)}")

@app.post("/auth/logout")
def logout(response: Response):
    """Logout user - clear session cookie"""
    clear_session_cookie(response)
    return {"status": "logged_out"}

@app.get("/auth/me", response_model=UserOut)
def get_current_user(
    user_id: Optional[str] = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Get current authenticated user info"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    from sqlalchemy import text
    result = db.execute(
        text("""
            SELECT id, created_at, github_id, github_username, github_name, github_avatar_url
            FROM users WHERE id = :user_id
        """),
        {"user_id": user_id}
    ).fetchone()
    
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserOut(
        id=result[0],
        created_at=result[1],
        github_id=result[2],
        github_username=result[3],
        github_name=result[4],
        github_avatar_url=result[5],
    )

@app.get("/posts/{post_id}", response_model=PostDetailOut)
def get_post_endpoint(
    post_id: int,
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_user_id)
):
    """Get a single post with full details including body and status"""
    post_detail = get_post_detail(db, post_id, user_id)
    if not post_detail:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return PostDetailOut(**post_detail)

# Repo endpoints
@app.post("/repos", response_model=RepoOut)
def create_repo_endpoint(
    repo: RepoIn,
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_user_id)
):
    """Create a new repository. Requires authentication."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        # Parse GitHub URL to extract owner and repo name
        github_url_str = str(repo.github_url)
        if "github.com" not in github_url_str:
            raise HTTPException(status_code=400, detail="Invalid GitHub URL")
        
        from urllib.parse import urlparse
        parsed = urlparse(github_url_str)
        parts = parsed.path.strip("/").split("/")
        
        if len(parts) < 2:
            raise HTTPException(status_code=400, detail="Invalid GitHub URL format. Expected: https://github.com/owner/repo")
        
        owner = parts[0]
        repo_name = parts[1]
        
        # Format name as "owner-repo" (matching frontend format)
        name = f"{owner}-{repo_name}"
        
        # Default to public visibility (can be enhanced later to check GitHub API)
        visibility = "public"
        
        created = create_repo(db, user_id, name, visibility)
        return RepoOut(**created)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create repository: {str(e)}")

@app.get("/repos", response_model=ReposResponse)
def list_repos(
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_user_id),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """Get repositories owned by the current user. Requires authentication."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    items, total = get_repos(db, user_id, skip=skip, limit=limit)
    return ReposResponse(items=[RepoOut(**item) for item in items], total=total)

@app.post("/repos/{repo_id}/entries/bulk", response_model=BulkEntriesResponse)
def create_bulk_entries_endpoint(
    repo_id: str,
    request: BulkEntriesRequest,
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_user_id)
):
    """Create or update entries in bulk for a repository. Idempotent based on source_path or content_hash.
    
    Accepts both formats:
    - Legacy: BulkEntryIn (title, product, year, category, cause, severity, summary, tags)
    - New: BugJournalEntryIn (title, body, status, tags)
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Verify repo exists and user owns it
    repo = get_repo_by_id(db, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    if repo["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this repository")
    
    try:
        # Normalize entries: convert BugJournalEntryIn to BulkEntryIn format
        normalized_entries = []
        for entry in request.entries:
            if isinstance(entry, BugJournalEntryIn):
                # Normalize BugJournalEntryIn to legacy format
                entry_dict = entry.model_dump()
                body = entry_dict["body"]
                
                # Extract summary from body (first ~140 chars or first paragraph)
                summary = body.strip()[:140]
                # Try to get first paragraph if available
                first_paragraph = body.split("\n\n")[0] if "\n\n" in body else body.split("\n")[0]
                if len(first_paragraph) < 140:
                    summary = first_paragraph[:140]
                
                # Normalize to legacy format
                normalized_entry = {
                    "title": entry_dict["title"],
                    "body": body,  # Store full body
                    "status": entry_dict.get("status", "open"),
                    "product": "BugJournal",  # Default product
                    "year": datetime.now().year,  # Current year
                    "category": "unspecified",  # Default category
                    "cause": "unspecified",  # Default cause
                    "severity": "med",  # Default severity
                    "summary": summary,  # Extracted summary
                    "tags": entry_dict.get("tags", []),
                    "source_path": entry_dict.get("source_path"),
                    "content_hash": entry_dict.get("content_hash"),
                }
                normalized_entries.append(normalized_entry)
            else:
                # Already in legacy format, use as-is
                normalized_entries.append(entry.model_dump())
        
        result = create_bulk_entries(db, repo_id, normalized_entries)
        return BulkEntriesResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/repos/{repo_id}/entries", response_model=PostsResponse)
def list_repo_entries(
    repo_id: str,
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_user_id),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """Get entries for a specific repository."""
    try:
        items, total = get_repo_entries(db, repo_id, skip=skip, limit=limit, user_id=user_id)
        return PostsResponse(items=[PostOut(**item) for item in items], total=total)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

