---
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
