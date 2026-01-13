# BugJournal Frontend - Complete Feature Specification

## Overview
GitHub-like bug journal platform with black + gold theme. Users can create repositories, manage bug entries, comment, vote, and interact with entries.

---

## Pages & Routes

### 1. **`/` (Root/Home)**
**Purpose**: Entry point - redirects to `/repos`

**Features**:
- Auto-redirect to `/repos`
- Ensure anonymous user is created
- Loading state during redirect

**API Calls**:
- `POST /auth/anon` - Create anonymous user

---

### 2. **`/repos` (Repository List)**
**Purpose**: Main dashboard showing all user repositories

**Layout**:
- Top navbar (BugJournal logo, Repos, Settings links)
- Main content area (max-width 1100px, centered)

**Features**:
- **Header Section**:
  - "Repositories" title (h1, 20px semibold)
  - "New repository" button (gold primary button, right-aligned)

- **Repository List**:
  - Empty state card (if no repos):
    - "No repositories yet." message
    - "Create your first repository" button
  - Repository cards (if repos exist):
    - Repository name (bold, left-aligned)
    - Visibility badge (Private/Public, right-aligned)
    - "Updated X days ago" relative timestamp
    - Hover effect: gold border highlight
    - Click: navigate to `/repos/[repoId]`

- **Create Repository Modal**:
  - Triggered by "New repository" button
  - Modal overlay (dark background, centered)
  - Card with form:
    - "Repository name" input (required)
    - "Visibility" dropdown (Private/Public)
    - Cancel button (secondary)
    - Create button (primary gold)
  - Form validation
  - Success: close modal, show toast, refresh list
  - Error: display inline error message

**API Calls**:
- `GET /repos` - List all repositories (requires X-User-Id)
- `POST /repos` - Create new repository

**States**:
- Loading: "Loading repositories..." message
- Error: Error card with message
- Empty: Empty state card
- Success: List of repository cards

---

### 3. **`/repos/[repoId]` (Repository Entries List)**
**Purpose**: Show all entries in a specific repository

**Layout**:
- Back link: "← Back to repositories"
- Repository header card
- Search input
- Entries list

**Features**:
- **Repository Header Card**:
  - Repository ID (first 8 chars + "...")
  - Visibility badge (private/public)
  - "Copy repo ID" button (secondary, right-aligned)
  - On copy: show toast notification

- **Search Input**:
  - Placeholder: "Search entries..."
  - Real-time client-side filtering
  - Filters by: title, summary

- **Entries List**:
  - Empty state (if no entries):
    - "No entries yet in this repository."
  - Entry cards (if entries exist):
    - Entry title (clickable link to `/posts/[postId]`)
    - Status badge (open/fixed)
    - Summary text (2-line clamp)
    - Created date (relative: "today", "yesterday", "X days ago")
    - Tags (first 3 visible, "+X more" indicator)
    - Hover effect: gold border
    - Click: navigate to `/posts/[postId]`

**API Calls**:
- `GET /repos/{repoId}/entries` - List entries in repository

**States**:
- Loading: "Loading entries..." message
- Error: Error card with message
- Empty: Empty state message
- Filtered: Show filtered results count
- Success: List of entry cards

---

### 4. **`/posts/[postId]` (Entry Detail)**
**Purpose**: View full entry details with body and comments

**Layout**:
- Back link: "← Back to repositories"
- Entry article card (main content)
- Comments section card

**Features**:
- **Entry Header Section**:
  - Entry title (h1, 22px semibold)
  - Status badge (open/fixed, right-aligned)
  - Metadata line:
    - Created date (relative format)
    - Tags (all tags as pills)
    - Border separator below

- **Entry Summary** (if exists):
  - Summary text (larger font, 16px)
  - Spacing below

- **Entry Body** (if exists):
  - Markdown rendering:
    - Headings (h1-h3) with proper spacing
    - Paragraphs with 1.7 line-height
    - **Bold text** (`**text**`)
    - *Italic text* (`*text*`)
    - `Inline code` (gold text, surface2 background)
    - Code blocks (```code```) with:
      - Surface2 background
      - Border
      - Monospace font
      - Scrollable if long
    - Links (gold color, underline on hover)
    - Lists (ul/ol) with proper indentation
  - Styled with `.markdown-body` class

- **Comments Section**:
  - Header: "Comments (X)" (h2, 18px semibold)
  - Comment form:
    - Textarea (4 rows, placeholder: "Add a comment...")
    - "Post Comment" button (primary gold)
    - Disabled when empty or submitting
  - Comments list:
    - Empty state: "No comments yet. Be the first to comment!"
    - Comment cards:
      - Date (relative format, muted text, small)
      - Comment content (whitespace preserved, wrapped)
      - Surface2 background for distinction
      - Spacing between comments

**API Calls**:
- `GET /posts/{postId}` - Get full entry details (with body)
- `GET /posts/{postId}/comments` - List comments
- `POST /posts/{postId}/comments` - Add comment (requires X-User-Id)

**States**:
- Loading: "Loading entry..." message
- Error: Error card with message
- Not found: "Entry not found" message
- Success: Full entry with comments

**Interactions**:
- Comment submission:
  - Disable button while submitting
  - Add comment to list immediately (optimistic)
  - Update comment count
  - Clear textarea on success
  - Show error on failure

---

### 5. **`/settings` (Settings)**
**Purpose**: User settings and CLI configuration help

**Layout**:
- Settings title (h1)
- Multiple setting cards

**Features**:
- **User ID Card**:
  - Title: "Your User ID"
  - Read-only input field (monospace font, full width)
  - "Copy" button (secondary, right-aligned)
  - Description text below:
    - "This ID is used to identify you across all BugJournal services. It's stored in your browser's localStorage."
  - On copy: show toast "Copied to clipboard"

- **CLI Setup Card**:
  - Title: "CLI Setup"
  - Introduction paragraph
  - 4-step guide:
    1. **Install the CLI**:
       - Command: `cd cli && pip install -e .`
       - Code block styling (surface2 background, monospace)
    2. **Initialize a repository**:
       - Command: `bugjournal init`
    3. **Update config.json**:
       - Instruction text
       - JSON code block with:
         - `api_base`: current API URL
         - `user_id`: user's actual ID (filled in)
         - `repo_id`: placeholder
    4. **Create and push entries**:
       - Commands: `bugjournal new` and `bugjournal push`
       - Multi-line code block

- **API Configuration Card**:
  - Title: "API Configuration"
  - "API Base URL" label
  - Read-only input (monospace, shows `NEXT_PUBLIC_API_BASE_URL` or default)
  - Description: how to configure via env var

**API Calls**:
- `POST /auth/anon` - Ensure user exists (on mount)

**States**:
- Loading: "Loading..." for user ID
- Success: All cards populated

---

## Navigation Component

### **Top Navbar** (`components/Nav.tsx`)
**Position**: Sticky top, full width

**Layout**:
- Left: "BugJournal" wordmark (18px semibold, hover: gold)
- Right: Navigation links
  - "Repos" link
  - "Settings" link

**Features**:
- Active link highlighting (gold text, surface2 background)
- Hover states (gold text for inactive)
- Sticky positioning (z-index: 50)
- Border bottom (subtle)
- Backdrop blur effect

**Active States**:
- `/repos` active on: `/`, `/repos`, `/repos/[anything]`
- `/settings` active on: `/settings`

---

## Reusable UI Components

### 1. **Button** (`components/ui/Button.tsx`)
**Variants**:
- Primary: Gold background (`#d4af37`), black text, hover: lighter gold
- Secondary: Surface background, border, text color, hover: gold border + gold text

**Props**:
- `variant`: 'primary' | 'secondary' (default: 'primary')
- `disabled`: boolean
- All standard button HTML attributes

**Styling**:
- Padding: 16px horizontal, 8px vertical
- Border radius: 6px
- Font: 14px, medium weight
- Transitions: 150ms

---

### 2. **Card** (`components/ui/Card.tsx`)
**Props**:
- `padding`: 'sm' (12px) | 'md' (16px) | 'lg' (24px)
- `className`: additional classes

**Styling**:
- Background: surface (`#111318`)
- Border: default border color (`#2a2f3a`)
- Border radius: 6px
- Shadow: subtle

---

### 3. **Badge** (`components/ui/Badge.tsx`)
**Status Variants**:
- `open`: Muted border + muted text
- `fixed`: Gold border + gold text

**Props**:
- `status`: 'open' | 'fixed'
- `children`: badge text

**Styling**:
- Padding: 4px horizontal, 4px vertical
- Border radius: full (pill shape)
- Font: 12px, medium weight
- Border: 1px solid

---

### 4. **Tag** (`components/ui/Tag.tsx`)
**Props**:
- `children`: tag text

**Styling**:
- Background: surface2 (`#0f1115`)
- Border: default border
- Text: muted color
- Hover: gold border
- Padding: 4px horizontal, 4px vertical
- Border radius: 4px
- Font: 12px

---

### 5. **Input** (`components/ui/Input.tsx`)
**Props**:
- `label`: optional string
- All standard input HTML attributes

**Styling**:
- Background: surface2
- Border: default border
- Focus: gold ring (2px) + gold border
- Padding: 12px horizontal, 8px vertical
- Border radius: 6px
- Font: 14px
- Placeholder: muted color

---

### 6. **Textarea** (`components/ui/Textarea.tsx`)
**Props**:
- `label`: optional string
- All standard textarea HTML attributes

**Styling**:
- Same as Input
- Resize: disabled
- Default rows: configurable

---

### 7. **Toast** (`components/ui/Toast.tsx`)
**Props**:
- `message`: string | null
- `onClose`: callback
- `duration`: number (default: 3000ms)

**Behavior**:
- Auto-dismiss after duration
- Fixed position: bottom-right
- Slide-in animation
- Background: surface
- Border: default border
- Shadow: subtle

---

## Layout Component

### **Layout** (`components/Layout.tsx`)
**Purpose**: Wraps all pages with consistent structure

**Features**:
- Includes Nav component
- Main content area:
  - Max-width: 1100px
  - Centered: `mx-auto`
  - Padding: 24px (px-6 py-6)
  - Background: app background color

---

## Global Styling

### Color Palette (CSS Variables)
```css
--bg: #0b0c0f           /* Background */
--surface: #111318      /* Card backgrounds */
--surface2: #0f1115     /* Secondary surfaces */
--border: #2a2f3a       /* Borders */
--text: #e6e6e6         /* Primary text */
--muted: #a3a8b3        /* Secondary text */
--gold: #d4af37         /* Primary accent */
--gold-hover: #e3c45c   /* Gold hover state */
--danger: #ff5a5f       /* Error states */
```

### Typography
- Base font: 14px
- Line height: 1.7 (body), 1.5 (headings)
- Heading sizes:
  - h1: 22px semibold
  - h2: 20px semibold
  - h3: 18px semibold
  - h4: 16px semibold
- Font stack: System fonts (`-apple-system, BlinkMacSystemFont, "Segoe UI", ...`)

### Spacing
- Page padding: 24px (px-6 py-6)
- Card padding: 16px default (configurable)
- Gaps: 12-16px between elements
- Border radius: 6px (cards), 4px (small elements)

---

## User Flows

### 1. **First-time User Flow**
1. Visit `/` → Auto-redirect to `/repos`
2. Backend creates anonymous user, stores UUID in localStorage
3. See empty state on `/repos`
4. Click "New repository" → Create first repo
5. Click repo → See empty entries list
6. Use CLI to push entries (instructions in Settings)
7. View entries in `/repos/[repoId]`
8. Click entry → View full details in `/posts/[postId]`

### 2. **Creating Repository Flow**
1. Navigate to `/repos`
2. Click "New repository" button
3. Modal opens
4. Enter repository name
5. Select visibility (private/public)
6. Click "Create"
7. Modal closes, toast shows "Repository created"
8. Repository appears at top of list
9. Click repository → Go to entries page

### 3. **Viewing Entry Flow**
1. Navigate to `/repos/[repoId]`
2. See list of entries
3. Click entry title → Navigate to `/posts/[postId]`
4. See full entry with:
   - Title, status, metadata
   - Summary (if exists)
   - Full body (markdown rendered)
   - Comments section
5. Scroll to comments
6. Add comment if desired
7. Click back link → Return to entries list

### 4. **Commenting Flow**
1. Navigate to `/posts/[postId]`
2. Scroll to comments section
3. Type comment in textarea
4. Click "Post Comment"
5. Button shows "Posting..." (disabled)
6. Comment appears in list (optimistic update)
7. Comment count increments
8. Textarea clears
9. If error: show error message

### 5. **Settings Flow**
1. Navigate to `/settings`
2. View User ID card
3. Click "Copy" → Toast shows "Copied to clipboard"
4. Scroll to CLI Setup card
5. Follow instructions:
   - Copy commands as needed
   - Use user_id from card
   - Get repo_id from repository page

---

## API Integration

### Authentication
- All pages auto-create anonymous user on mount
- User ID stored in `localStorage` as `fa_user_id`
- `X-User-Id` header attached to authenticated requests

### Endpoints Used

**Authentication**:
- `POST /auth/anon` - Create/get anonymous user

**Repositories**:
- `GET /repos` - List repositories (requires X-User-Id)
- `POST /repos` - Create repository (requires X-User-Id)
- `GET /repos/{repoId}/entries` - List entries (X-User-Id optional)

**Entries/Posts**:
- `GET /posts/{postId}` - Get entry details (X-User-Id optional)
- `GET /posts/{postId}/comments` - List comments
- `POST /posts/{postId}/comments` - Add comment (requires X-User-Id)

---

## Error Handling

### Error States
- **API Errors**: Display in error card with message
- **Network Errors**: Show "Failed to connect" message
- **Not Found**: Show "Not found" message
- **Validation Errors**: Show inline in forms

### Loading States
- Show loading message in cards during fetch
- Disable buttons during submission
- Show spinner or "Loading..." text

### Empty States
- Friendly messages when no data
- Action buttons to create first item
- Consistent styling across pages

---

## Responsive Design

### Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Adaptations
- Navbar: Stack on mobile
- Cards: Full width on mobile
- Modals: Full screen on mobile
- Search: Full width on mobile

---

## Future Enhancements (Not Implemented)

### Potential Additional Pages:
1. **`/repos/[repoId]/settings`** - Repository settings
   - Edit repository name/visibility
   - Delete repository
   - Manage collaborators

2. **`/repos/[repoId]/new`** - Create entry in repo
   - Form to create new entry
   - Markdown editor
   - Tag selection
   - Status selection

3. **`/me`** - User profile
   - User statistics
   - Recent activity
   - Saved entries

4. **`/search`** - Global search
   - Search across all repositories
   - Advanced filters
   - Results grouped by repo

### Potential Features:
- Entry editing
- Entry deletion
- Bulk actions (delete multiple entries)
- Export entries (JSON, Markdown)
- Entry history/versions
- User authentication (beyond anonymous)
- Repository sharing/permissions
- Entry templates
- Keyboard shortcuts
- Dark/light theme toggle

---

## Summary

**Total Pages**: 5
1. `/` - Root (redirect)
2. `/repos` - Repository list
3. `/repos/[repoId]` - Entry list
4. `/posts/[postId]` - Entry detail
5. `/settings` - Settings

**Total UI Components**: 7 reusable components
- Button, Card, Badge, Tag, Input, Textarea, Toast

**Key Features**:
- ✅ Repository management
- ✅ Entry listing and viewing
- ✅ Markdown rendering
- ✅ Comments
- ✅ Search (client-side)
- ✅ CLI integration help
- ✅ Anonymous user management
- ✅ Consistent black + gold theme

