from pydantic import BaseModel, Field
from typing import List, Optional
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

