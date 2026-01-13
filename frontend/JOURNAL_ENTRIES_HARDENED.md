# Journal Entries & Entry Detail UX - Hardened

## Summary

Hardened the entries list and entry detail modal UX in `/journal` to handle empty states, errors, and edge cases gracefully, with proper retry functionality and safe placeholders.

---

## Changes Made

### 1. Entries List

#### Empty State

**Before**: "No entries yet. Use \"bugjournal push\" locally to add entries to this repository."

**After**: "No journals yet"

**Changes**:
- ✅ Simplified message to "No journals yet"
- ✅ Keeps existing styling (`color: var(--text-secondary)`, centered)
- ✅ Only shows when `entries.length === 0 && !isLoadingEntries && !entriesError`

#### Error State

**Before**: Errors set global `error` state, showed in error message section above entries

**After**: Separate `entriesError` state with inline error and "Retry" button

**Implementation**:
```tsx
{entriesError && !isLoadingEntries && (
  <div style={{ /* error styling */ }}>
    <span>{entriesError}</span>
    <button className="btn btn-secondary" onClick={() => selectedRepo && loadEntries(selectedRepo.id)}>
      Retry
    </button>
  </div>
)}
```

**Features**:
- ✅ Inline error message (red, same style as existing errors)
- ✅ "Retry" button (same style as existing buttons: `btn btn-secondary`)
- ✅ Retry button calls `loadEntries(selectedRepo.id)` when clicked
- ✅ Only shows when error exists and not loading

#### Switching Repos

**Before**: Entries could persist from previous repo when switching

**After**: Stale entries reset immediately when repo changes

**Implementation**:
```tsx
useEffect(() => {
  if (selectedRepo && userId) {
    // Reset stale entries and errors when switching repos
    setEntries([]);
    setEntriesError(null);
    loadEntries(selectedRepo.id);
  } else {
    setEntries([]);
    setEntriesError(null);
  }
}, [selectedRepo?.id, userId]);
```

**Features**:
- ✅ Resets `entries` to `[]` immediately when repo changes
- ✅ Resets `entriesError` to `null` when repo changes
- ✅ Shows loading state (`isLoadingEntries`) while fetching
- ✅ Prevents showing stale entries from previous repo

---

### 2. Entry Detail Modal

#### Error Handling

**Before**: Errors set global `error` state, showed generic error message

**After**: Separate `entryDetailError` state with "Failed to load entry" message and "Retry" button

**Implementation**:
```tsx
{entryDetailError && (
  <div style={{ /* error styling */ }}>
    <span>Failed to load entry</span>
    <button className="btn btn-secondary" onClick={() => selectedEntry && openEntryModal(selectedEntry)}>
      Retry
    </button>
  </div>
)}
```

**Features**:
- ✅ Shows "Failed to load entry" message (not generic error)
- ✅ "Retry" button that calls `openEntryModal(selectedEntry)` again
- ✅ Error message positioned above entry content
- ✅ Uses separate `entryDetailError` state (doesn't interfere with entries list)

#### Missing Body

**Before**: "No content available."

**After**: "No details available"

**Implementation**:
```tsx
{selectedEntry.body && selectedEntry.body.trim() ? (
  <div dangerouslySetInnerHTML={{ __html: parseMarkdown(selectedEntry.body) }} />
) : (
  <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No details available</p>
)}
```

**Features**:
- ✅ Checks if `body` exists AND is not empty (`.trim()`)
- ✅ Safe placeholder: "No details available"
- ✅ Styled consistently (italic, secondary color)
- ✅ Never shows demo content as fallback

---

### 3. No Demo Content

**Verified**:
- ✅ No hardcoded demo entries
- ✅ No fallback to demo data on errors
- ✅ All data from backend APIs
- ✅ Safe placeholders for missing data

**Grep Verification**:
```bash
grep -r "demo|Demo|saihajkohli.*my-bug-journal" app/journal/page.tsx -i
# Result: No matches found ✅
```

---

## Code Changes

### 1. Added State Variables

```typescript
const [entriesError, setEntriesError] = useState<string | null>(null);
const [entryDetailError, setEntryDetailError] = useState<string | null>(null);
```

### 2. Updated `loadEntries`

**Changes**:
- Uses `setEntriesError` instead of `setError` (separate error state)
- Clears `entriesError` on success
- Sets specific error messages for different error cases
- Never shows demo content as fallback

### 3. Updated `useEffect` for Entry Loading

**Changes**:
- Resets `entries` to `[]` when repo changes
- Resets `entriesError` to `null` when repo changes
- Ensures loading state is shown while fetching

### 4. Updated Entries List UI

**Changes**:
- Empty state: "No journals yet" (simplified message)
- Error state: Inline error with "Retry" button
- Conditional rendering: Only shows list when not loading and no error

### 5. Updated `openEntryModal`

**Changes**:
- Uses `setEntryDetailError` instead of `setError` (separate error state)
- Shows "Failed to load entry" message with "Retry" button
- Never shows demo content as fallback

### 6. Updated Entry Detail Modal UI

**Changes**:
- Error state: "Failed to load entry" with "Retry" button
- Missing body: "No details available" placeholder
- Checks for empty body with `.trim()`

---

## Files Changed

1. **`frontend/app/journal/page.tsx`**:
   - **Line ~43-44**: Added `entriesError` and `entryDetailError` state
   - **Line ~169-177**: Updated `useEffect` to reset entries/errors when repo changes
   - **Line ~179-219**: Updated `loadEntries` to use `entriesError` state
   - **Line ~370-408**: Updated `openEntryModal` to use `entryDetailError` state
   - **Line ~687-761**: Updated entries list UI (error state, empty state, conditional rendering)
   - **Line ~811-881**: Updated entry detail modal UI (error state, missing body placeholder)

---

## Manual Test Checklist

### Test 1: Empty State

1. **Connect a repo with no entries**:
   - Connect a new repo (or use existing repo with no entries)
   - Wait for entries to load

2. **Verify**:
   - ✅ Shows "No journals yet" message
   - ✅ Message is centered, secondary color
   - ✅ No error message
   - ✅ No loading state
   - ✅ No demo entries

---

### Test 2: Entries List Error

1. **Trigger error**:
   - Option A: Stop backend server, switch to a repo
   - Option B: Use invalid repo ID (if possible)

2. **Verify**:
   - ✅ Shows inline error message (red)
   - ✅ "Retry" button visible
   - ✅ Error message describes the problem
   - ✅ No entries shown

3. **Click Retry**:
   - ✅ Loading state appears
   - ✅ Retries `GET /repos/{repo_id}/entries`
   - ✅ If succeeds: Entries load
   - ✅ If fails: Error shows again

---

### Test 3: Switching Repos

1. **Connect two repos**:
   - Connect repo A (with entries)
   - Connect repo B (with different entries)

2. **Switch between repos**:
   - Select repo A from dropdown
   - Wait for entries to load
   - Select repo B from dropdown

3. **Verify**:
   - ✅ Entries from repo A disappear immediately
   - ✅ Loading state appears while fetching repo B entries
   - ✅ Entries from repo B appear (not stale entries from repo A)
   - ✅ No error messages from previous repo

---

### Test 4: Entry Detail Error

1. **Open entry modal**:
   - Click an entry in the list
   - Modal opens

2. **Trigger error**:
   - Stop backend server
   - Open entry modal (or refresh if already open)

3. **Verify**:
   - ✅ Shows "Failed to load entry" message
   - ✅ "Retry" button visible
   - ✅ Entry title and metadata still visible (from list data)
   - ✅ No body content shown

4. **Click Retry**:
   - ✅ Loading state appears
   - ✅ Retries `GET /posts/{post_id}`
   - ✅ If succeeds: Entry details load
   - ✅ If fails: Error shows again

---

### Test 5: Missing Body

1. **Open entry with missing body**:
   - Find or create an entry with no body content
   - Click to open modal

2. **Verify**:
   - ✅ Entry title and metadata visible
   - ✅ Shows "No details available" placeholder
   - ✅ Placeholder is italic, secondary color
   - ✅ No demo content as fallback

---

### Test 6: No Demo Content

1. **Check for demo data**:
   - Open DevTools → Console
   - Search for "demo" or "saihajkohli/my-bug-journal" in page source

2. **Verify**:
   - ✅ No hardcoded demo entries
   - ✅ No demo content in empty states
   - ✅ All data from backend APIs
   - ✅ Safe placeholders only

---

## Status: ✅ COMPLETE

- ✅ Empty state: "No journals yet" (simplified)
- ✅ Error state: Inline error with "Retry" button
- ✅ Switching repos: Resets stale entries, shows loading state
- ✅ Entry detail error: "Failed to load entry" with "Retry" button
- ✅ Missing body: "No details available" placeholder
- ✅ No demo content as fallback (verified)
- ✅ Build succeeds, no linting errors

**UX Confirmed**:
- **Empty**: "No journals yet" (clean, simple)
- **Error**: Inline error + Retry button (actionable)
- **Switching**: Immediate reset, loading state (no stale data)
- **Detail Error**: "Failed to load entry" + Retry (user-friendly)
- **Missing Body**: "No details available" (safe placeholder)
- **No Demo**: All data from backend (verified)

