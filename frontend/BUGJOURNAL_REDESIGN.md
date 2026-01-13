# BugJournal Frontend Redesign Summary

## Overview

Redesigned the Next.js frontend into a GitHub-style BugJournal UI with dark theme and red accents.

## Key Files Changed/Added

### API Client
- **`lib/api.ts`** - Updated `ensureAnonUser()` to use `ensureUserId()` helper, added interfaces for `PostDetail`, `Repo`, `ReposResponse`, `RepoIn`
- **`lib/api-repos.ts`** (NEW) - Repository and post detail API functions:
  - `getRepos()` - List repositories
  - `createRepo()` - Create repository
  - `getRepoEntries()` - List entries in repository
  - `getPostDetail()` - Get full post details with body

### Components
- **`components/Nav.tsx`** (NEW) - Top navigation bar with BugJournal branding and red accent for active items

### Pages
- **`app/page.tsx`** - Simplified to redirect to `/repos`
- **`app/repos/page.tsx`** (NEW) - Repository list page with create repo modal
- **`app/repos/[repoId]/page.tsx`** (NEW) - Entry list page for a repository
- **`app/posts/[postId]/page.tsx`** (NEW) - Entry detail page with markdown body rendering and comments
- **`app/settings/page.tsx`** (NEW) - Settings page with user_id display and CLI instructions

### Styling
- **`app/globals.css`** - Updated color scheme to dark theme with red accents (#f85149)
- **`app/layout.tsx`** - Updated metadata for BugJournal branding

## Routes

1. **`/`** - Redirects to `/repos`
2. **`/repos`** - List repositories, create new repo
3. **`/repos/[repoId]`** - List entries in a repository
4. **`/posts/[postId]`** - View entry details with full body and comments
5. **`/settings`** - View user_id and CLI setup instructions

## API Integration

All pages integrate with backend API at `http://127.0.0.1:8000`:
- User ID stored in `localStorage` as `fa_user_id`
- `X-User-Id` header attached to authenticated requests
- Anonymous user created automatically on first load

## Running the Frontend

1. **Install dependencies** (if needed):
   ```bash
   cd frontend
   npm install
   ```

2. **Start dev server**:
   ```bash
   npm run dev
   ```

3. **Access the app**:
   - Frontend: http://localhost:3000
   - Backend must be running at http://127.0.0.1:8000

4. **Verify routes**:
   - `/` - Should redirect to `/repos`
   - `/repos` - Should show repository list (empty if none created)
   - `/repos/{repoId}` - Should show entries for that repo
   - `/posts/{postId}` - Should show full entry with body and comments
   - `/settings` - Should show user_id and CLI instructions

## Testing with Backend

1. **Ensure backend is running**:
   ```bash
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```

2. **Test flow**:
   - Visit http://localhost:3000
   - Should automatically create user_id and redirect to `/repos`
   - Click "New Repository" to create a repo
   - View repo entries by clicking on a repo card
   - Click an entry to view full details with body
   - Add comments on entry detail page
   - Visit `/settings` to see user_id and CLI setup

## Design Features

- **Dark theme**: Black background (#000) with gray panels (#0d1117)
- **Red accents**: Primary color #f85149 for buttons and active nav items
- **GitHub-style**: Clean, minimal layout with proper spacing
- **Responsive**: Works on desktop and mobile
- **Status badges**: Visual indicators for entry status (open/fixed)
- **Tag pills**: Color-coded tag display
- **Markdown rendering**: Simple markdown support for entry bodies

