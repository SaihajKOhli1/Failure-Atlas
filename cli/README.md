# BugJournal CLI

Command-line interface for managing bug journals with the BugJournal backend.

## Installation

```bash
cd cli
pip install -e .
```

This installs the `bugjournal` command globally (or in your virtual environment).

## Usage

### 1. Initialize Configuration

First, set up your configuration and create a user:

**Interactive mode:**
```bash
bugjournal init
```

**Non-interactive mode (for scripts/CI):**
```bash
# Using flags
bugjournal init --backend-url http://localhost:8000

# Using environment variables
BUGJOURNAL_BACKEND_URL=http://localhost:8000 bugjournal init
```

**With custom user ID:**
```bash
BUGJOURNAL_BACKEND_URL=http://localhost:8000 BUGJOURNAL_USER_ID=<your-uuid> bugjournal init
```

This will:
- Use backend URL from flag, env var `BUGJOURNAL_BACKEND_URL`, or default `http://localhost:8000`
- Use user ID from env var `BUGJOURNAL_USER_ID`, or create an anonymous user if not set
- Save configuration to `~/.bugjournal/config.json`

### 2. Connect a Repository

Connect a GitHub repository to BugJournal:

```bash
bugjournal connect https://github.com/your-username/your-repo
```

This will:
- Create the repository in the backend
- Set it as the current repository
- Display the repository ID and name

### 3. Create a Sample Entry

Create a sample entry file to get started:

```bash
bugjournal sample
```

This creates 2-3 sample entry files in `.bugjournal/entries/` with realistic examples.

### 4. Push Entries

Scan and push all entries to the backend:

```bash
bugjournal push
```

This will:
- Scan `.bugjournal/entries/*.md` files
- Parse YAML front matter and markdown content
- Upload entries to the backend
- Display counts of created/updated/skipped entries

### 5. List Repositories

View all connected repositories:

```bash
bugjournal repos
```

### 6. List Entries

View all entries for the current repository:

```bash
bugjournal entries
```

## Entry File Format

Entries are stored in `.bugjournal/entries/*.md` files with the following format:

```markdown
---
title: Bug Title
product: MyProject
year: 2026
category: bug
cause: configuration
severity: high
tags: [bug, production, urgent]
status: open
---

# Description

Markdown content here...

## Steps to Reproduce

1. Step one
2. Step two
```

### Required Fields

- `title` (required) - Entry title

### Optional Fields

- `product` (default: "BugJournal")
- `year` (default: current year)
- `category` (default: "unspecified")
- `cause` (default: "unspecified")
- `severity` (default: "med")
- `tags` (default: [])
- `status` (default: "open")

The body content after the front matter is stored as the entry body.

## Testing Steps

1. **Install the CLI:**
   ```bash
   cd cli
   pip install -e .
   ```

2. **Initialize:**
   ```bash
   bugjournal init
   ```

3. **Connect a repository:**
   ```bash
   bugjournal connect https://github.com/your-username/your-repo
   ```

4. **Create a sample entry:**
   ```bash
   bugjournal sample
   ```

5. **Push entries:**
   ```bash
   bugjournal push
   ```

6. **Verify in frontend:**
   - Open `http://localhost:3000/journal` (or your frontend URL)
   - Confirm entries appear in the connected repository

## Configuration

Configuration is stored in `~/.bugjournal/config.json`:

```json
{
  "backend_url": "http://localhost:8000",
  "user_id": "your-user-id-here",
  "current_repo_id": "repo-id-here",
  "current_repo": {
    "id": "repo-id-here",
    "github_url": "https://github.com/owner/repo",
    "owner": "owner",
    "name": "repo",
    "display_name": "owner/repo",
    "backend_name": "owner/repo"
  }
}
```

### Environment Variables

You can override configuration using environment variables:

- `BUGJOURNAL_BACKEND_URL` - Backend base URL
- `BUGJOURNAL_USER_ID` - User ID for authentication (X-User-Id header)

Environment variables take precedence over config file values.

## Error Handling

The CLI provides clear error messages for common issues:

- Missing configuration: Run `bugjournal init`
- No repository connected: Run `bugjournal connect <github_url>`
- No entries found: Create entries in `.bugjournal/entries/` or run `bugjournal sample`
- API errors: Full error details are displayed with response JSON

## Requirements

- Python 3.11+
- Backend running and accessible
- Network access to backend URL
