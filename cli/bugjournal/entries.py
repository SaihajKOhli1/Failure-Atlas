"""Entry file scanning and parsing."""

import hashlib
import re
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime


def find_entry_files(repo_root: Path) -> List[Path]:
    """Find all entry markdown files in .bugjournal/entries/.
    
    Args:
        repo_root: Root directory of the repository
        
    Returns:
        List of Path objects for entry files
    """
    entries_dir = repo_root / ".bugjournal" / "entries"
    if not entries_dir.exists():
        return []
    
    return sorted(entries_dir.glob("*.md"))


def compute_hash(file_path: Path) -> str:
    """Compute SHA256 hash of file contents.
    
    Args:
        file_path: Path to the file
        
    Returns:
        Hex digest of SHA256 hash
    """
    with open(file_path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def parse_entry_file(file_path: Path, repo_root: Path) -> Dict[str, Any]:
    """Parse an entry markdown file.
    
    Args:
        file_path: Path to the entry file
        repo_root: Root directory of the repository
        
    Returns:
        Dictionary with entry data
    """
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Parse YAML-like front matter
    front_matter_match = re.match(
        r"^---\s*\n(.*?)\n---\s*\n(.*)$",
        content,
        re.DOTALL,
    )
    
    if not front_matter_match:
        # No front matter, use filename as title
        header_text = ""
        body = content.strip()
        title = file_path.stem
    else:
        header_text = front_matter_match.group(1)
        body = front_matter_match.group(2).strip()
    
    # Parse header fields
    header_fields: Dict[str, Any] = {}
    if header_text:
        for line in header_text.split("\n"):
            line = line.strip()
            if ":" in line:
                key, value = line.split(":", 1)
                key = key.strip()
                value = value.strip()
                
                # Parse value based on format
                if value.startswith("[") and value.endswith("]"):
                    # List format: [a, b, c]
                    items = [item.strip().strip('"').strip("'") for item in value[1:-1].split(",")]
                    header_fields[key] = [item for item in items if item]
                elif value.isdigit():
                    header_fields[key] = int(value)
                elif value.lower() in ("true", "false"):
                    header_fields[key] = value.lower() == "true"
                else:
                    header_fields[key] = value.strip('"').strip("'")
    
    # Extract required fields with defaults
    title = header_fields.get("title", file_path.stem)
    if not title:
        title = file_path.stem
    
    product = header_fields.get("product", "BugJournal")
    year = header_fields.get("year", datetime.now().year)
    category = header_fields.get("category", "unspecified")
    cause = header_fields.get("cause", "unspecified")
    severity = header_fields.get("severity", "med")
    tags = header_fields.get("tags", [])
    status = header_fields.get("status", "open")
    
    # Generate summary from body (first paragraph or first 200 chars)
    summary = ""
    if body:
        # Try to get first paragraph
        paragraphs = [p.strip() for p in body.split("\n\n") if p.strip()]
        if paragraphs:
            summary = paragraphs[0][:200]
        else:
            summary = body[:200]
    
    # Compute relative path
    try:
        source_path = str(file_path.relative_to(repo_root))
    except ValueError:
        source_path = str(file_path)
    
    # Compute content hash
    content_hash = compute_hash(file_path)
    
    return {
        "title": title,
        "product": product,
        "year": year,
        "category": category,
        "cause": cause,
        "severity": severity,
        "summary": summary,
        "tags": tags if isinstance(tags, list) else [],
        "body": body,
        "status": status,
        "source_path": source_path,
        "content_hash": content_hash,
    }


def scan_entries(repo_root: Path) -> List[Dict[str, Any]]:
    """Scan repository for entries and parse them.
    
    Args:
        repo_root: Root directory of the repository
        
    Returns:
        List of parsed entry dictionaries
    """
    entry_files = find_entry_files(repo_root)
    entries = []
    
    for file_path in entry_files:
        try:
            entry = parse_entry_file(file_path, repo_root)
            entries.append(entry)
        except Exception as e:
            print(f"Warning: Failed to parse {file_path}: {e}", file=__import__("sys").stderr)
    
    return entries


def create_sample_entries(repo_root: Path) -> List[Path]:
    """Create sample entry files.
    
    Args:
        repo_root: Root directory of the repository
        
    Returns:
        List of paths to the created sample files
    """
    entries_dir = repo_root / ".bugjournal" / "entries"
    entries_dir.mkdir(parents=True, exist_ok=True)
    
    samples = [
        {
            "filename": "sample-bug.md",
            "content": """---
title: Database connection timeout in production
product: BugJournal
year: 2026
category: bug
cause: configuration
severity: high
tags: [bug, production, database, urgent]
status: open
---

# Description

Database connections are timing out after 30 seconds in production environment, causing API requests to fail intermittently.

## Steps to Reproduce

1. Deploy application to production
2. Wait for normal traffic load
3. Observe timeout errors in logs after ~30 seconds of inactivity

## Expected Behavior

Database connections should remain alive or be properly pooled with automatic reconnection.

## Actual Behavior

Connections timeout and are not automatically reconnected, causing request failures.

## Additional Context

- Occurs only in production environment
- Development environment uses local database
- Connection pool size: 10
- Timeout setting: 30 seconds
"""
        },
        {
            "filename": "sample-feature.md",
            "content": """---
title: Add search functionality to journal entries
product: BugJournal
year: 2026
category: feature
cause: user-request
severity: low
tags: [feature, search, ui]
status: open
---

# Description

Users need to be able to search through their journal entries by title, tags, or content.

## Requirements

- Full-text search across entry titles and body content
- Filter by tags
- Search results should highlight matching terms
- Performance should be acceptable for repositories with 1000+ entries

## Implementation Notes

- Backend already has full-text search capabilities
- Frontend needs search input and results UI
- Consider adding search to the journal page header
"""
        },
        {
            "filename": "sample-fix.md",
            "content": """---
title: Fix CORS error when accessing API from frontend
product: BugJournal
year: 2026
category: bug
cause: configuration
severity: medium
tags: [bug, cors, frontend, fixed]
status: fixed
---

# Description

Frontend was unable to make requests to the backend API due to CORS (Cross-Origin Resource Sharing) errors.

## Root Cause

Backend CORS middleware was not configured to allow requests from the frontend origin (http://localhost:3000).

## Solution

Updated backend CORS configuration to:
- Allow origin: http://localhost:3000
- Enable credentials: true
- Allow all methods and headers

## Testing

- Verified frontend can make GET/POST requests
- Confirmed cookies are sent with requests
- Tested with multiple browsers
"""
        },
    ]
    
    created_files = []
    for sample in samples:
        file_path = entries_dir / sample["filename"]
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(sample["content"])
        created_files.append(file_path)
    
    return created_files

