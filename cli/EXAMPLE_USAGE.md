# BugJournal CLI - Example Usage

## Quick Start

### 1. Install the CLI

```bash
cd cli
pip install -e .
```

Or with requirements.txt:

```bash
pip install -r cli/requirements.txt
```

### 2. Initialize a repository

```bash
bugjournal init
```

This creates:
- `.bugjournal/` directory
- `.bugjournal/entries/` directory
- `.bugjournal/config.json` configuration file

### 3. Get your user_id and repo_id from the API

#### Create an anonymous user:

```bash
curl -X POST http://127.0.0.1:8000/auth/anon
```

Response:
```json
{"user_id": "550e8400-e29b-41d4-a716-446655440000"}
```

#### Create a repository:

```bash
USER_ID="550e8400-e29b-41d4-a716-446655440000"

curl -X POST http://127.0.0.1:8000/repos \
  -H "Content-Type: application/json" \
  -H "X-User-Id: $USER_ID" \
  -d '{
    "name": "my-bug-journal",
    "visibility": "private"
  }'
```

Response:
```json
{
  "id": "repo-uuid-here",
  "owner_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "my-bug-journal",
  "visibility": "private",
  ...
}
```

### 4. Update config.json

Edit `.bugjournal/config.json`:

```json
{
  "api_base": "http://127.0.0.1:8000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "repo_id": "repo-uuid-here"
}
```

### 5. Create a new entry

```bash
bugjournal new
```

Interactive prompts:
```
Title: API Outage on Jan 1
Product: Payment Service
Year: 2024
Category: incident
Cause: infra
Severity (low/med/high): high
Summary: Payment API was down for 2 hours due to database connection pool exhaustion
Tags (comma-separated): infra, payment, database
```

Creates: `.bugjournal/entries/2024-01-01-api-outage-on-jan-1.md`

### 6. Push entries to API

```bash
bugjournal push
```

Output:
```
Found 1 entry file(s)

✓ Push successful!

Push Results
┏━━━━━━━━━━┳━━━━━━━┓
┃ Metric   ┃ Count ┃
┣━━━━━━━━━━╋━━━━━━━┫
┃ Created  ┃   1   ┃
┃ Updated  ┃   0   ┃
┃ Skipped  ┃   0   ┃
┗━━━━━━━━━━┻━━━━━━━┛
```

### 7. Push again (idempotent)

```bash
bugjournal push
```

Output:
```
Found 1 entry file(s)

✓ Push successful!

Push Results
┏━━━━━━━━━━┳━━━━━━━┓
┃ Metric   ┃ Count ┃
┣━━━━━━━━━━╋━━━━━━━┫
┃ Created  ┃   0   ┃
┃ Updated  ┃   1   ┃
┃ Skipped  ┃   0   ┃
┗━━━━━━━━━━┻━━━━━━━┛
```

## Dry Run

Test what would be pushed without actually pushing:

```bash
bugjournal push --dry-run
```

Output:
```
Found 1 entry file(s)

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━┓
┃ Source Path                 ┃ Title                ┃ Content Hash      ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━╋━━━━━━━━━━━━━━━━━━━━━━╋━━━━━━━━━━━━━━━━━━┫
┃ entries/2024-01-01-api-...  ┃ API Outage on Jan 1 ┃ sha256:abc123... ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━┛

Dry run: Would push 1 entry(ies)
API: http://127.0.0.1:8000/repos/repo-uuid-here/entries/bulk
```

## Entry File Format

Entries are markdown files with YAML frontmatter:

```markdown
---
title: "API Outage on Jan 1"
product: "Payment Service"
year: 2024
category: "incident"
cause: "infra"
severity: "high"
summary: "Payment API was down for 2 hours due to database connection pool exhaustion"
tags: ["infra", "payment", "database"]
---

# API Outage on Jan 1

**Product:** Payment Service | **Year:** 2024 | **Category:** incident | **Cause:** infra | **Severity:** high

## Summary

Payment API was down for 2 hours due to database connection pool exhaustion

## Details

<!-- Add more details here -->

## Resolution

<!-- Add resolution notes here -->

## Tags

`infra`, `payment`, `database`
```

## Multiple Entries

Create multiple entries and push them all at once:

```bash
# Create several entries
bugjournal new
bugjournal new
bugjournal new

# Push all entries
bugjournal push
```

## Error Handling Examples

### Missing config

```bash
$ bugjournal push
✗ Config file not found: /path/to/.bugjournal/config.json
Run 'bugjournal init' first to initialize.
```

### Missing user_id or repo_id

```bash
$ bugjournal push
✗ Missing required config fields: user_id, repo_id
Update .bugjournal/config.json with the required fields.
```

### Invalid YAML frontmatter

```bash
$ bugjournal push
Errors parsing entries:
  ✗ entries/bad-entry.md: Invalid YAML frontmatter: ...

✗ No valid entries to push
```

### API connection error

```bash
$ bugjournal push
✗ Connection error
Could not connect to http://127.0.0.1:8000
Check that the backend is running and api_base is correct.
```

