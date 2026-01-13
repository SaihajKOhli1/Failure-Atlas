from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Union
from datetime import datetime
import uuid

class PostIn(BaseModel):
    title: str
    product: str
    year: int
    category: str
    cause: str
    severity: str
    summary: str
    tags: Optional[List[str]] = None

class PostOut(BaseModel):
    id: int
    votes: int
    title: str
    product: str
    year: int
    category: str
    cause: str
    severity: str
    tags: List[str]
    summary: str
    created_at: Optional[datetime] = None
    user_vote: int = 0  # -1, 0, or 1
    saved: bool = False
    comment_count: int = 0

    class Config:
        from_attributes = True

class PostDetailOut(BaseModel):
    """Detailed post output including full body and status"""
    id: int
    votes: int
    title: str
    product: str
    year: int
    category: str
    cause: str
    severity: str
    tags: List[str]
    summary: str
    body: Optional[str] = None  # Full entry body (for BugJournal format)
    status: Optional[str] = None  # Entry status (e.g., "open", "fixed")
    created_at: Optional[datetime] = None
    user_vote: int = 0  # -1, 0, or 1
    saved: bool = False
    comment_count: int = 0

    class Config:
        from_attributes = True

class PostsResponse(BaseModel):
    items: List[PostOut]
    total: int

class CauseAnalytics(BaseModel):
    cause: str
    count: int
    percent: int

class TopCausesResponse(BaseModel):
    items: List[CauseAnalytics]
    total: int

class AuthResponse(BaseModel):
    user_id: str

class UserOut(BaseModel):
    id: str
    created_at: Optional[datetime] = None
    github_id: Optional[str] = None
    github_username: Optional[str] = None
    github_name: Optional[str] = None
    github_avatar_url: Optional[str] = None

    class Config:
        from_attributes = True

class VoteIn(BaseModel):
    value: int = Field(..., ge=-1, le=1, description="Vote value: -1 (downvote), 0 (remove), 1 (upvote)")

class VoteOut(BaseModel):
    post_id: int
    votes: int
    user_vote: int

class CommentIn(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)

class CommentOut(BaseModel):
    id: int
    post_id: int
    user_id: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class RepoIn(BaseModel):
    github_url: HttpUrl

class RepoOut(BaseModel):
    id: str
    owner_id: str
    name: str
    visibility: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ReposResponse(BaseModel):
    items: List[RepoOut]
    total: int

class BulkEntryIn(BaseModel):
    """Legacy bulk entry format (backward compatible)"""
    source_path: Optional[str] = None
    content_hash: Optional[str] = None
    title: str
    product: str
    year: int
    category: str
    cause: str
    severity: str
    summary: str
    tags: Optional[List[str]] = None

class BugJournalEntryIn(BaseModel):
    """New BugJournal entry format (clean schema)"""
    title: str = Field(..., description="Entry title")
    body: str = Field(..., description="Full entry body/content")
    status: Optional[str] = Field(default="open", pattern="^(open|fixed)$", description="Entry status")
    tags: Optional[List[str]] = Field(default=None, description="Entry tags")
    source_path: Optional[str] = Field(default=None, description="Source file path for idempotency")
    content_hash: Optional[str] = Field(default=None, description="Content hash for idempotency")

class BulkEntriesRequest(BaseModel):
    """Bulk entries request - accepts both legacy and new formats"""
    entries: List[Union[BulkEntryIn, BugJournalEntryIn]]

class BulkEntriesResponse(BaseModel):
    created: int
    updated: int
    skipped: int
    entries: List[PostOut]

