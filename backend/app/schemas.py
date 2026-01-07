from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

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

