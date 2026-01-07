from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base

# Join table for many-to-many relationship
post_tags = Table(
    'post_tags',
    Base.metadata,
    Column('post_id', Integer, ForeignKey('posts.id', ondelete='CASCADE'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True)
)

class Post(Base):
    __tablename__ = 'posts'

    id = Column(Integer, primary_key=True, index=True)
    votes = Column(Integer, nullable=False, default=0)
    title = Column(Text, nullable=False)
    product = Column(Text, nullable=False)
    year = Column(Integer, nullable=False)
    category = Column(Text, nullable=False)
    cause = Column(Text, nullable=False)  # lowercase cause
    severity = Column(String(10), nullable=False)  # 'low', 'med', 'high'
    summary = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # search_tsv is added via migration, not defined here to avoid SQLAlchemy type issues
    # We use raw SQL for Full-Text Search operations

    tags = relationship("Tag", secondary=post_tags, back_populates="posts")

class Tag(Base):
    __tablename__ = 'tags'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(Text, unique=True, nullable=False)

    posts = relationship("Post", secondary=post_tags, back_populates="tags")

