# Auth and AWS Audit Report

## Executive Summary

**AWS Status**: ✅ **AWS is NOT used**

**Auth Method**: Anonymous UUID-based authentication via `X-User-Id` header

---

## 1. Current Auth Method

### How `/auth/anon` Works

**Endpoint**: `POST /auth/anon`  
**Location**: `backend/app/main.py:46-50`

**Implementation**:
```python
@app.post("/auth/anon", response_model=AuthResponse)
def create_anon_user(db: Session = Depends(get_db)):
    """Create an anonymous user"""
    user_id = create_anonymous_user(db)
    return AuthResponse(user_id=user_id)
```

**Function**: `backend/app/crud.py:324-329`
```python
def create_anonymous_user(db: Session) -> str:
    """Create an anonymous user and return the user_id"""
    result = db.execute(text("INSERT INTO users DEFAULT VALUES RETURNING id"))
    user_id = str(result.fetchone()[0])
    db.commit()
    return user_id
```

**How it works**:
1. Calls `INSERT INTO users DEFAULT VALUES RETURNING id`
2. PostgreSQL generates a UUID using `gen_random_uuid()` (via `pgcrypto` extension)
3. Returns the UUID as a string to the client
4. Client stores this UUID in `localStorage` as `bj_user_id`

---

### User Identity Storage

**Database Table**: `users`  
**Location**: `backend/app/models.py:16-27`

**Schema**:
```python
class User(Base):
    __tablename__ = 'users'

    id = Column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    owned_repos = relationship("Repo", back_populates="owner", cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="user", cascade="all, delete-orphan")
    saves = relationship("Save", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
```

**Database**: PostgreSQL (local or hosted, configured via `DATABASE_URL` env var)

**User Identity**:
- ✅ **Stored in database**: Users table (`users`) with UUID primary key
- ✅ **Persistent**: User records persist across sessions
- ✅ **No local-only identity**: All users are stored in PostgreSQL

**Client Storage**:
- Frontend stores `user_id` in `localStorage` as `bj_user_id`
- This is just a cache/client-side reference, not the source of truth
- If `localStorage` is cleared, user can call `/auth/anon` again (creates new user)

**Note**: The `ensure_user` function (`backend/app/crud.py:331-337`) creates users on-demand if they don't exist when needed (e.g., when voting/commenting with a user_id that doesn't exist yet).

---

### Request Authentication

**Method**: Custom HTTP header `X-User-Id`

**Implementation**: `backend/app/main.py:42-44`
```python
def get_user_id(x_user_id: Optional[str] = Header(None)) -> Optional[str]:
    """Extract user ID from X-User-Id header"""
    return x_user_id
```

**Usage**:
- Optional for most endpoints (e.g., `GET /posts`, `GET /posts/{post_id}/comments`)
- **Required** for user-specific actions:
  - `POST /posts/{post_id}/vote` → Requires `X-User-Id`
  - `POST /posts/{post_id}/save` → Requires `X-User-Id`
  - `DELETE /posts/{post_id}/save` → Requires `X-User-Id`
  - `GET /me/saved` → Requires `X-User-Id`
  - `POST /posts/{post_id}/comments` → Requires `X-User-Id`
  - `POST /repos` → Requires `X-User-Id`
  - `GET /repos` → Requires `X-User-Id`

**No Authentication Used**:
- ❌ No cookies/sessions
- ❌ No JWT tokens
- ❌ No OAuth/OAuth2
- ❌ No password-based auth
- ❌ No API keys
- ❌ No AWS IAM or Cognito

**Security Model**:
- Trust-based: Client provides `user_id` in header
- No verification that the client "owns" that `user_id`
- No signing or encryption of user identity
- Suitable for anonymous/demo apps, not production auth

---

## 2. AWS Usage Audit

### Infrastructure Files

**Terraform** (`*.tf`, `*.tfvars`): ❌ **None found**
- Searched entire repo: No `.tf` or `.tfvars` files

**CDK** (`*cdk*.ts`, `*cdk*.js`): ❌ **None found**
- Searched entire repo: No CDK TypeScript/JavaScript files

**CloudFormation** (`*cloudformation*.json`, `*cloudformation*.yaml`): ❌ **None found**
- Searched entire repo: No CloudFormation templates

---

### SDK Usage

**Python (boto3)**: ❌ **Not found**
- Searched `backend/requirements.txt`: No `boto3` dependency
- Searched entire backend: No `boto3` imports or usage

**JavaScript/TypeScript (aws-sdk, @aws-sdk)**: ❌ **Not found**
- Searched `frontend/package.json`: No AWS SDK dependencies
- Searched entire frontend: No AWS SDK imports

**CLI Tools (awscli)**: ❌ **Not found**
- No AWS CLI references in codebase

---

### Environment Variables

**AWS-Specific Env Vars**: ❌ **None found**
- Searched for: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`, `RDS_HOST`, `AWS_REGION`, `LAMBDA_*`, `EC2_*`
- **Result**: No matches found

**Database Configuration**:
- `DATABASE_URL` (`backend/app/db.py:8`): PostgreSQL connection string
- Default: `postgresql://postgres:postgres@localhost:5432/failure_atlas`
- No AWS RDS configuration found

---

### Deployment Documentation

**Files Checked**:
- `backend/README.md`: ❌ No AWS deployment instructions
- `frontend/README.md`: ❌ No AWS deployment instructions
- `backend/app/main.py`: ❌ No AWS references
- `backend/app/db.py`: ❌ No AWS RDS references

**Deployment Method**:
- Backend: `uvicorn app.main:app --reload` (local development)
- Frontend: Next.js dev server (`npm run dev`)
- No deployment scripts, no AWS infrastructure code

---

### False Positives (Mentions in Documentation Only)

**Files that mention "AWS" but don't use AWS**:
1. `frontend/index.html`: Contains example/demo text mentioning "AWS" (not actual AWS usage)
2. `frontend/PHASE4_BACKEND_INTEGRATION.md`: Documentation (not code)
3. Various markdown files: Historical documentation only

**Verification**: All matches are in documentation/comments, not actual AWS SDK usage or infrastructure code.

---

## Summary

### Auth/Session Model

**Current System**: Anonymous UUID-based authentication

1. **User Creation**:
   - Client calls `POST /auth/anon`
   - Backend creates UUID record in PostgreSQL `users` table
   - Returns UUID string to client

2. **User Storage**:
   - **Database**: Users table in PostgreSQL (persistent, source of truth)
   - **Client**: `localStorage` key `bj_user_id` (client-side cache only)

3. **Request Authentication**:
   - Custom header: `X-User-Id: <uuid>`
   - Optional for read endpoints
   - Required for user-specific actions (vote, save, comment, repos)

4. **Security**:
   - Trust-based: No verification that client owns the `user_id`
   - No sessions, cookies, JWT, or OAuth
   - Suitable for anonymous/demo apps

5. **User Identity**:
   - UUID primary key (PostgreSQL UUID type)
   - Auto-generated via `gen_random_uuid()` (pgcrypto extension)
   - Created timestamp stored (`created_at`)

---

### AWS Status

**Answer**: ✅ **AWS is NOT used**

**Evidence**:
1. ✅ No Terraform/CDK/CloudFormation infrastructure files
2. ✅ No boto3/aws-sdk dependencies in `requirements.txt` or `package.json`
3. ✅ No AWS environment variables (`AWS_ACCESS_KEY_ID`, `S3_BUCKET`, `RDS_HOST`, etc.)
4. ✅ No AWS SDK imports or usage in code
5. ✅ Database: PostgreSQL via `DATABASE_URL` (not RDS)
6. ✅ No deployment docs mentioning AWS services

**Infrastructure**:
- Backend: FastAPI + PostgreSQL (local or hosted PostgreSQL)
- Frontend: Next.js (local dev server)
- No cloud infrastructure code found

**Conclusion**: The repository is **AWS-free**. All infrastructure is local or uses generic PostgreSQL (not AWS RDS). No AWS services are integrated.

---

## Files Referenced

- `backend/app/main.py` - Auth endpoint and header extraction
- `backend/app/crud.py` - User creation function
- `backend/app/models.py` - User model definition
- `backend/app/db.py` - Database configuration
- `backend/requirements.txt` - Python dependencies (no AWS)
- `frontend/package.json` - Node dependencies (no AWS)
- `backend/README.md` - Deployment docs (no AWS)

