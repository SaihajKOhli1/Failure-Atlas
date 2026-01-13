# BugJournal GitHub-like Black + Gold Theme Redesign

## Overview

Redesigned the BugJournal frontend to have a GitHub-like appearance with a black + gold theme. All functionality remains unchanged - only visual styling and component structure were updated.

## Color Palette

- **Background**: `#0b0c0f` (black)
- **Surface**: `#111318` (charcoal)
- **Surface 2**: `#0f1115` (darker charcoal)
- **Border**: `#2a2f3a` (gray)
- **Text**: `#e6e6e6` (light gray)
- **Muted**: `#a3a8b3` (medium gray)
- **Gold**: `#d4af37` (primary accent)
- **Gold Hover**: `#e3c45c` (lighter gold)
- **Danger**: `#ff5a5f` (subtle red for errors)

## Typography

- **Base font size**: 14-15px
- **Headings**: 18-22px, semibold (600)
- **Line height**: 1.5-1.7 for readability
- **System font stack**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`

## Reusable Components Created

All components are in `components/ui/`:

1. **Button** (`Button.tsx`)
   - Primary: Gold background, black text
   - Secondary: Surface background, gold text on hover

2. **Card** (`Card.tsx`)
   - Surface background with border and subtle shadow
   - Configurable padding (sm, md, lg)

3. **Badge** (`Badge.tsx`)
   - Status-based: `open` (muted border), `fixed` (gold border + gold text)

4. **Tag** (`Tag.tsx`)
   - Surface2 background, border, muted text
   - Hover: gold border

5. **Input** (`Input.tsx`)
   - Surface2 background, border
   - Focus: gold ring and border
   - Optional label

6. **Textarea** (`Textarea.tsx`)
   - Same styling as Input
   - Resize disabled

7. **Toast** (`Toast.tsx`)
   - Notification component with auto-dismiss

## Layout Component

**Layout** (`components/Layout.tsx`)
- Wraps all pages with consistent styling
- Max-width: 1100px, centered
- Padding: 24px (px-6 py-6)
- Includes Nav component

## Navigation

**Nav** (`components/Nav.tsx`)
- Top navbar, sticky
- Left: "BugJournal" wordmark
- Right: Repos, Settings links
- Active link highlighted in gold
- Hover states on all links

## Page Styling

### `/repos` - Repository List
- Header row: "Repositories" title + "New repository" button
- Repo list: GitHub-like rows with:
  - Name + visibility badge
  - "Updated X days ago" timestamp
  - Hover effects (gold border)
- Empty state card
- Create repo modal with form

### `/repos/[repoId]` - Entry List
- Repo header card with name and copy repo_id button
- Search input (UI-only filtering)
- Entries styled like GitHub Issues:
  - Title link (hover: gold)
  - Status badge
  - Tags
  - Created date (relative)
- Hover effects on entry cards

### `/posts/[postId]` - Entry Detail
- Title + status badge + metadata line
- Markdown body rendering in readable container:
  - Headings with proper spacing
  - Code blocks: surface2 background, border
  - Inline code: surface2 background, gold text
  - Links: gold color, underline on hover
  - Lists with proper indentation
- Comments section styled as thread cards:
  - Comment form with textarea
  - Individual comment cards with surface2 background

### `/settings` - Settings Page
- User ID card with copy button
- CLI setup instructions with code blocks
- API configuration card
- Toast notifications for copy actions

## Spacing & Consistency

- **Page padding**: 24px (px-6 py-6)
- **Card padding**: 16px (md), configurable to 12px (sm) or 24px (lg)
- **Gaps**: 12-16px between elements
- **Border radius**: 6px (cards, inputs), 4px (small elements)
- **Max-width**: 1100px for main content

## Markdown Rendering

Enhanced markdown support for entry bodies:
- Headings (h1-h3) with proper spacing
- Code blocks with surface2 background
- Inline code with gold text
- Links with gold color
- Lists with proper indentation
- Paragraphs with relaxed line-height

## Running the Frontend

1. **Start the backend** (if not running):
   ```bash
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```

2. **Start the frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access**: http://localhost:3000

## Key Changes Summary

- ✅ Updated global CSS with black + gold theme
- ✅ Created reusable UI components (Button, Card, Badge, Tag, Input, Textarea, Toast)
- ✅ Updated Nav component with new styling
- ✅ Created Layout component for consistent page structure
- ✅ Refactored all pages to use new components and styling
- ✅ Enhanced markdown rendering with proper styling
- ✅ Consistent spacing and GitHub-like layout throughout

## No Functional Changes

- All API calls remain unchanged
- All functionality preserved
- No heavy UI libraries added (using Tailwind CSS that was already present)
- Components are lightweight and reusable

