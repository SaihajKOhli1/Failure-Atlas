"""Authentication utilities for GitHub OAuth and session management"""

import os
import secrets
import httpx
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, Response
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from sqlalchemy import text

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# GitHub OAuth configuration
# Note: GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are required for OAuth to work
# They are checked at runtime in exchange_github_code() and github_oauth_start()
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI", "http://localhost:3000/auth/github/callback")

# Dev mode: allow X-User-Id header as fallback
# Set DEV_MODE=true to enable X-User-Id header fallback (dev/testing only)
# Set DEV_MODE=false in production (default)
DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"

COOKIE_NAME = "session_token"


def create_access_token(user_id: str) -> str:
    """Create a JWT access token for a user"""
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode = {"sub": user_id, "exp": expire}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[str]:
    """Verify a JWT token and return the user_id"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return user_id
    except JWTError:
        return None


def set_session_cookie(response: Response, user_id: str):
    """Set an HTTP-only session cookie"""
    token = create_access_token(user_id)
    # Determine if we should use secure cookies
    # In production or when ENVIRONMENT=production, use secure cookies (HTTPS only)
    # Railway and other platforms set ENVIRONMENT or detect HTTPS automatically
    is_production = os.getenv("ENVIRONMENT") == "production" or os.getenv("RAILWAY_ENVIRONMENT") == "production"
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=is_production,  # HTTPS only in production
        samesite="lax",  # Works with cross-site OAuth redirects
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,  # 30 days in seconds
        domain=None,  # Let browser use default (works with subdomains and Railway)
    )


def clear_session_cookie(response: Response):
    """Clear the session cookie"""
    is_production = os.getenv("ENVIRONMENT") == "production" or os.getenv("RAILWAY_ENVIRONMENT") == "production"
    response.delete_cookie(
        key=COOKIE_NAME,
        httponly=True,
        secure=is_production,
        samesite="lax",
        domain=None,
    )


async def exchange_github_code(code: str) -> dict:
    """Exchange GitHub OAuth code for access token and user info"""
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET"
        )
    
    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange GitHub code")
        
        token_data = token_response.json()
        if "error" in token_data:
            raise HTTPException(status_code=400, detail=token_data.get("error_description", "GitHub OAuth error"))
        
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="No access token received from GitHub")
        
        # Get user info from GitHub
        user_response = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"token {access_token}"},
        )
        
        if user_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch GitHub user info")
        
        github_user = user_response.json()
        return {
            "github_id": str(github_user["id"]),
            "github_username": github_user["login"],
            "github_name": github_user.get("name"),
            "github_avatar_url": github_user.get("avatar_url"),
        }


def get_or_create_github_user(db: Session, github_id: str, github_username: str, github_name: Optional[str] = None, github_avatar_url: Optional[str] = None) -> str:
    """Get or create a user by GitHub ID. Returns user_id (UUID string)"""
    # Check if user exists by github_id
    result = db.execute(
        text("SELECT id FROM users WHERE github_id = :github_id"),
        {"github_id": github_id}
    ).fetchone()
    
    if result:
        user_id = str(result[0])
        # Update user info if provided
        if github_username or github_name or github_avatar_url:
            update_fields = []
            params = {"user_id": user_id}
            if github_username:
                update_fields.append("github_username = :github_username")
                params["github_username"] = github_username
            if github_name:
                update_fields.append("github_name = :github_name")
                params["github_name"] = github_name
            if github_avatar_url:
                update_fields.append("github_avatar_url = :github_avatar_url")
                params["github_avatar_url"] = github_avatar_url
            if update_fields:
                db.execute(
                    text(f"UPDATE users SET {', '.join(update_fields)} WHERE id = :user_id"),
                    params
                )
                db.commit()
        return user_id
    
    # Create new user
    result = db.execute(
        text("""
            INSERT INTO users (github_id, github_username, github_name, github_avatar_url)
            VALUES (:github_id, :github_username, :github_name, :github_avatar_url)
            RETURNING id
        """),
        {
            "github_id": github_id,
            "github_username": github_username,
            "github_name": github_name,
            "github_avatar_url": github_avatar_url,
        }
    )
    user_id = str(result.fetchone()[0])
    db.commit()
    return user_id

