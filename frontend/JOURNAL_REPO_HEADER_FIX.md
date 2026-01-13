# Journal Page - Repo Header Dynamic Fix

## Issue

The repo header section was showing minimal hardcoded or fallback data. Updated to be **100% dynamic** and driven by backend data from `GET /repos`.

---

## What Was Hardcoded / Missing

### Before:
- Simple header showing only parsed `{owner}/{repo}` from `selectedRepo.name`
- No GitHub link
- No proper empty state when no repos
- No visibility badge styling

### After:
- **All data from backend**: `selectedRepo` object from `GET /repos` response
- **Owner/Name parsing**: Parsed from `selectedRepo.name` (format: `{owner}-{repo}`)
- **Visibility badge**: From `selectedRepo.visibility` (public/private)
- **GitHub link**: Constructed from parsed owner/repo: `https://github.com/{owner}/{repo}`
- **Empty state**: Shows "No repo connected" in header when no repos exist
- **Dev console log**: Warns if fallback display is used (name only, couldn't parse owner/repo)

---

## Implementation Details

### Header Data Source

All header data comes from `selectedRepo` (type `Repo` from backend):

```typescript
interface Repo {
  id: string           // UUID
  owner_id: string     // UUID of user who owns repo
  name: string         // Format: "{owner}-{repo}" (e.g., "facebook-react")
  visibility: string   // "private" | "public"
  created_at: string
  updated_at: string
}
```

### Parsing Logic

The `parseRepoName` function extracts owner/repo from `selectedRepo.name`:
- Format: `{owner}-{repo}` → `owner=owner, repo=repo`
- Format: `{org}-{owner}-{repo}` → `owner=org-owner, repo=repo`
- Fallback: If no dash found, uses name as-is

### GitHub Link Construction

If `repoOwner` and `repoName` are successfully parsed:
- GitHub URL: `https://github.com/${repoOwner}/${repoName}`
- "Open on GitHub" button shown

If parsing fails:
- No GitHub link shown
- Dev console warning logged (once, not spam)

---

## Header Display States

### a) No Repos

**Header shows**:
- Repo icon (folder SVG)
- Text: "No repo connected" (in secondary color, reduced opacity)
- No visibility badge
- No GitHub link
- No stars/forks (not available in backend)

**Below header**:
- Centered message: "Your Journal"
- Description text
- "Connect GitHub" button

---

### b) One Repo

**Header shows**:
- Repo icon (folder SVG)
- Owner/Name: `{owner}/{repo}` (parsed from `selectedRepo.name`)
- Visibility badge: `{selectedRepo.visibility}` (public/private)
- "Open on GitHub" button (if owner/repo parsed successfully)
- "Connect Another Repo" button (right side)

**Example**:
```
📁 facebook/react [Public]        [Connect Another Repo]
   [Open on GitHub]
```

---

### c) Multiple Repos

**Header shows**:
- Same as "One Repo" above
- Plus: Repo selector dropdown above the header
- Selecting a repo from dropdown:
  - Updates `selectedRepo` immediately
  - Calls `parseRepoName(selectedRepo.name)`
  - Updates header with new repo's owner/name/visibility
  - Updates GitHub link if owner/repo can be parsed
  - Stores `bj_last_repo_id` in localStorage

**Example**:
```
Select Repository: [facebook-react ▼]

📁 facebook/react [Public]        [Connect Another Repo]
   [Open on GitHub]
```

---

## Code Changes

### 1. Enhanced Repo Header

```tsx
<div className="repo-header">
  <div style={{ flex: 1 }}>
    <div className="repo-title">
      <svg>...</svg> {/* Folder icon */}
      {repoOwner && repoName ? (
        <>
          <span>{repoOwner}/{repoName}</span>
          <span className="repo-badge">{selectedRepo.visibility}</span>
        </>
      ) : (
        <>
          <span>{selectedRepo.name}</span>
          <span className="repo-badge">{selectedRepo.visibility}</span>
          {/* Dev console warning if fallback */}
        </>
      )}
    </div>
    {repoOwner && repoName && (
      <a href={`https://github.com/${repoOwner}/${repoName}`}>
        Open on GitHub
      </a>
    )}
  </div>
  <button>Connect Another Repo</button>
</div>
```

### 2. Empty State Header

```tsx
{userId && !isLoadingRepos && repos.length === 0 && !selectedRepo && (
  <>
    <div className="repo-header" style={{ opacity: 0.6 }}>
      <div className="repo-title">
        <svg>...</svg>
        <span>No repo connected</span>
      </div>
    </div>
    {/* Empty state content */}
  </>
)}
```

### 3. Repo Selector Updates Header

```tsx
<select
  onChange={(e) => {
    const repo = repos.find(r => r.id === e.target.value);
    if (repo) {
      setSelectedRepo(repo);          // Updates selectedRepo
      parseRepoName(repo.name);       // Updates repoOwner/repoName
      localStorage.setItem('bj_last_repo_id', repo.id);
    }
  }}
>
```

### 4. Connect Flow Updates Header

After `POST /repos` success:
1. Calls `loadRepos(userId)` → Refreshes repos list
2. Selects new repo → Sets `selectedRepo`
3. Calls `parseRepoName(selectedRepo.name)` → Updates `repoOwner`/`repoName`
4. Header automatically re-renders with new repo data

---

## What's NOT Shown (Not in Backend)

The backend `RepoOut` schema does NOT include:
- ❌ **Description** - Not available from backend
- ❌ **Stars count** - Not available from backend
- ❌ **Forks count** - Not available from backend
- ❌ **GitHub metadata** - Not stored in backend

These would require:
- Additional backend endpoint to fetch GitHub metadata
- Or storing GitHub metadata when creating repo
- Or frontend fetching directly from GitHub API (but user said not to do this without token flow)

**Current implementation**: Only shows what backend provides (name, visibility, parsed owner/repo).

---

## Dev Console Warning

If parsing fails (no dash in repo name), a one-time console warning is logged:

```javascript
console.log('[Journal] Using fallback repo display: name only (could not parse owner/repo from:', selectedRepo.name, ')');
```

This only appears in development mode (`NODE_ENV === 'development'`) and helps identify repos that don't follow the `{owner}-{repo}` naming convention.

---

## Testing Checklist

- [ ] **No repos**: Header shows "No repo connected", no badge, no GitHub link
- [ ] **One repo**: Header shows owner/repo, visibility badge, GitHub link
- [ ] **Multiple repos**: Dropdown appears, selecting repo updates header immediately
- [ ] **Connect repo**: New repo appears in header after connection
- [ ] **Parse failure**: If repo name has no dash, shows name only, logs dev warning
- [ ] **GitHub link**: Only shown if owner/repo successfully parsed
- [ ] **Empty state**: Header opacity reduced, shows "No repo connected"

---

## Summary

✅ **100% Dynamic**: All header data from `GET /repos` backend response  
✅ **No Hardcoded Values**: Owner, name, visibility, GitHub link all derived from backend  
✅ **Empty State**: Proper "No repo connected" state in header  
✅ **Multiple Repos**: Dropdown updates header immediately on selection  
✅ **Connect Flow**: New repo appears in header after connection  
✅ **Dev Warning**: Console log if fallback display used

The repo header is now fully dynamic and driven by backend data.

