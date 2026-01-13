from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table, SmallInteger, BigInteger
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base
import uuid

# Join table for many-to-many relationship
post_tags = Table(
    'post_tags',
    Base.metadata,
    Column('post_id', Integer, ForeignKey('posts.id', ondelete='CASCADE'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True)
)

class User(Base):
    __tablename__ = 'users'

    id = Column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # GitHub OAuth fields
    github_id = Column(String(255), unique=True, nullable=True, index=True)  # GitHub user ID (integer as string)
    github_username = Column(String(255), nullable=True)  # GitHub username
    github_name = Column(String(255), nullable=True)  # GitHub display name
    github_avatar_url = Column(String(512), nullable=True)  # GitHub avatar URL

    # Relationships
    owned_repos = relationship("Repo", back_populates="owner", cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="user", cascade="all, delete-orphan")
    saves = relationship("Save", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")

class Repo(Base):
    __tablename__ = 'repos'

    id = Column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(UUID(as_uuid=False), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    visibility = Column(String(20), nullable=False, default='private')  # 'private' or 'public'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="owned_repos")
    entries = relationship("Post", back_populates="repo", cascade="all, delete-orphan")

class Post(Base):
    __tablename__ = 'posts'

    id = Column(Integer, primary_key=True, index=True)
    repo_id = Column(UUID(as_uuid=False), ForeignKey('repos.id', ondelete='SET NULL'), nullable=True, index=True)
    votes = Column(Integer, nullable=False, default=0)
    title = Column(Text, nullable=False)
    product = Column(Text, nullable=False)
    year = Column(Integer, nullable=False)
    category = Column(Text, nullable=False)
    cause = Column(Text, nullable=False)  # lowercase cause
    severity = Column(String(10), nullable=False)  # 'low', 'med', 'high'
    summary = Column(Text, nullable=False)
    body = Column(Text, nullable=True)  # Full entry body (for BugJournal format)
    status = Column(String(20), nullable=True)  # Entry status (e.g., "open", "fixed")
    source_path = Column(Text, nullable=True)  # For CLI idempotency
    content_hash = Column(Text, nullable=True)  # For CLI idempotency
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # search_tsv is added via migration, not defined here to avoid SQLAlchemy type issues
    # We use raw SQL for Full-Text Search operations

    # Relationships
    tags = relationship("Tag", secondary=post_tags, back_populates="posts")
    repo = relationship("Repo", back_populates="entries")
    votes_rel = relationship("Vote", back_populates="post", cascade="all, delete-orphan")
    saves_rel = relationship("Save", back_populates="post", cascade="all, delete-orphan")
    comments_rel = relationship("Comment", back_populates="post", cascade="all, delete-orphan")

class Tag(Base):
    __tablename__ = 'tags'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(Text, unique=True, nullable=False)

    posts = relationship("Post", secondary=post_tags, back_populates="tags")

class Vote(Base):
    __tablename__ = 'votes'

    user_id = Column(UUID(as_uuid=False), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    post_id = Column(Integer, ForeignKey('posts.id', ondelete='CASCADE'), primary_key=True)
    value = Column(SmallInteger, nullable=False)  # -1 or 1
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="votes")
    post = relationship("Post", back_populates="votes_rel")

class Save(Base):
    __tablename__ = 'saves'

    user_id = Column(UUID(as_uuid=False), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    post_id = Column(Integer, ForeignKey('posts.id', ondelete='CASCADE'), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="saves")
    post = relationship("Post", back_populates="saves_rel")

class Comment(Base):
    __tablename__ = 'comments'

    id = Column(BigInteger, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey('posts.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=False), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    post = relationship("Post", back_populates="comments_rel")
    user = relationship("User", back_populates="comments")

