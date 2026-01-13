'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Entry {
  id: number;
  title: string;
  status: 'fixed' | 'open' | null;
  tags: string[];
  date: string;
  body: string;
  summary?: string;
  severity?: string;
}

interface Repo {
  id: string;
  name: string;
  visibility: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

const backendUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

console.log("JOURNAL backendUrl =", backendUrl);

// Debug flag - set to false to disable debug UI
const DEBUG = false;

type Tab = 'entries' | 'commits' | 'insights' | 'settings';

export default function JournalPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get('tab') as Tab) || 'entries';
  
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; github_username?: string; github_name?: string; github_avatar_url?: string } | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [repoOwner, setRepoOwner] = useState<string>('');
  const [repoName, setRepoName] = useState<string>('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [isLoadingEntryDetail, setIsLoadingEntryDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [entryDetailError, setEntryDetailError] = useState<string | null>(null);
  const [showUserIdModal, setShowUserIdModal] = useState(false);
  const [userIdInput, setUserIdInput] = useState('');

  // Tab navigation
  const setActiveTab = useCallback((tab: Tab) => {
    router.push(`/journal?tab=${tab}`, { scroll: false });
  }, [router]);

  // Parse repo name to extract owner and name (format: "owner-repo")
  const parseRepoName = (name: string) => {
    const parts = name.split('-');
    if (parts.length >= 2) {
      // Take last two parts as owner-repo (handles cases like "org-owner-repo")
      // For single dash: "owner-repo" -> owner=owner, repo=repo
      // For multiple dashes: "org-owner-repo" -> owner=org-owner, repo=repo
      setRepoOwner(parts.slice(0, -1).join('-'));
      setRepoName(parts[parts.length - 1]);
    } else {
      // Single word or no dash: can't determine owner/repo
      setRepoOwner('');
      setRepoName(name);
    }
  };

  // Get stored user ID from localStorage (checks multiple keys in order)
  const getStoredUserId = (): string | null => {
    const keys = ['bugjournal_user_id', 'bj_user_id', 'user_id'];
    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (value) {
        // Validate UUID format (basic check: 8-4-4-4-12 hex chars)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(value.trim())) {
          return value.trim();
        }
      }
    }
    return null;
  };

  // Load repos for authenticated user
  const loadRepos = useCallback(async (currentUserId: string) => {
    setIsLoadingRepos(true);
    setError(null);
    try {
      const res = await fetch(`${backendUrl}/repos`, {
        headers: {
          'X-user-id': currentUserId
        }
      });
      if (res.ok) {
        const data = await res.json();
        const reposList = data.items || [];
        setRepos(reposList);
        
        // Restore last selected repo if available
        const lastRepoId = localStorage.getItem('bj_last_repo_id');
        if (lastRepoId && reposList.length > 0) {
          const lastRepo = reposList.find((r: Repo) => r.id === lastRepoId);
          if (lastRepo) {
            setSelectedRepo(lastRepo);
            parseRepoName(lastRepo.name);
          } else if (reposList.length > 0) {
            // If last repo not found, select first repo
            setSelectedRepo(reposList[0]);
            parseRepoName(reposList[0].name);
          }
        } else if (reposList.length > 0) {
          // No last repo, select first
          setSelectedRepo(reposList[0]);
          parseRepoName(reposList[0].name);
        }
      } else if (res.status === 401) {
        setError('Authentication required. Please sign in with GitHub.');
        setUserId(null);
        setUser(null);
      } else {
        setError('Failed to load repositories');
      }
    } catch (e) {
      console.error('Failed to load repos:', e);
      setError('Failed to load repositories. Check your connection.');
    } finally {
      setIsLoadingRepos(false);
    }
  }, []);

  // Get or create user ID
  const getOrCreateUserId = useCallback(async () => {
    setIsCheckingAuth(true);
    try {
      // Check localStorage for existing user ID (checks multiple keys)
      let currentUserId = getStoredUserId();
      
      if (!currentUserId) {
        // Create anonymous user via backend
        const anonRes = await fetch(`${backendUrl}/auth/anon`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (anonRes.ok) {
          const anonData = await anonRes.json();
          currentUserId = anonData.user_id;
          // Store in primary key
          localStorage.setItem('bugjournal_user_id', currentUserId);
        } else {
          throw new Error('Failed to create user');
        }
      }
      
      setUserId(currentUserId);
      return currentUserId;
    } catch (e) {
      console.error('Failed to get/create user ID:', e);
      setUserId(null);
      return null;
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  // Handle manual user ID entry
  const handleUserIdSubmit = useCallback(async () => {
    const trimmedUserId = userIdInput.trim();
    if (trimmedUserId) {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(trimmedUserId)) {
        setError('Invalid user ID format. Expected UUID.');
        return;
      }
      localStorage.setItem('bugjournal_user_id', trimmedUserId);
      setUserId(trimmedUserId);
      setShowUserIdModal(false);
      setUserIdInput('');
      setIsCheckingAuth(false);
      // Load repos with the new user ID
      await loadRepos(trimmedUserId);
    }
  }, [userIdInput, loadRepos]);

  // Get user ID on mount and load repos
  useEffect(() => {
    getOrCreateUserId().then((currentUserId) => {
      if (currentUserId) {
        loadRepos(currentUserId);
      }
    });
  }, [getOrCreateUserId, loadRepos]);

  // Sign out handler
  const handleSignOut = useCallback(async () => {
    try {
      localStorage.removeItem('bugjournal_user_id');
      localStorage.removeItem('bj_user_id');
      localStorage.removeItem('user_id');
      setUser(null);
      setUserId(null);
      setRepos([]);
      setSelectedRepo(null);
      setEntries([]);
      localStorage.removeItem('bj_last_repo_id');
    } catch (e) {
      console.error('Sign out failed:', e);
    }
  }, []);

  // Load entries for selected repo
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRepo?.id, userId]); // Only depend on repo ID and userId to avoid unnecessary fetches

  const loadEntries = async (repoId: string) => {
    setIsLoadingEntries(true);
    setEntriesError(null);
    try {
      const res = await fetch(`${backendUrl}/repos/${repoId}/entries`, {
        headers: userId ? {
          'X-user-id': userId
        } : {}
      });
      if (res.ok) {
        const data = await res.json();
        const entriesList = data.items || [];
        
        // Map backend PostOut to Entry format
        // Note: PostOut doesn't include body/status in list, only summary
        // Status will be fetched when opening entry detail
        const mapped: Entry[] = entriesList.map((e: any) => ({
          id: e.id,
          title: e.title || 'Untitled',
          status: null, // Will be fetched from detail endpoint
          tags: e.tags || [],
          date: e.created_at || '',
          body: '', // Will be fetched when opening entry
          summary: e.summary || '',
          severity: e.severity || ''
        }));
        setEntries(mapped);
        setEntriesError(null);
      } else if (res.status === 404) {
        setEntriesError('Repository not found');
        setEntries([]);
      } else {
        const errorData = await res.json().catch(() => ({ detail: 'Failed to load entries' }));
        setEntriesError(errorData.detail || 'Failed to load entries');
        setEntries([]);
      }
    } catch (e) {
      console.error('Failed to load entries:', e);
      setEntriesError('Failed to load entries. Check your connection.');
      setEntries([]);
    } finally {
      setIsLoadingEntries(false);
    }
  };

  // TODO: Commits endpoint not yet implemented in backend
  // Proposed endpoint: GET /repos/{repo_id}/commits
  // Should return: { items: Commit[], total: number }
  // Commit structure: { sha: string, message: string, author: { name, email, date }, committer: { name, email, date }, html_url: string }
  // This endpoint should fetch from GitHub API server-side (supports private repos with token)

  const handleConnectSubmit = async () => {
    const url = repoUrlInput.trim();
    if (!url) {
      setError('Please enter a GitHub repository URL');
      return;
    }

    setIsConnecting(true);
    setError(null);
    setInfoMessage(null);

    try {
      let owner: string, name: string;

      // Parse GitHub URL
      if (url.includes('github.com')) {
        const parts = new URL(url).pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
          owner = parts[0];
          name = parts[1];
        } else {
          throw new Error('Invalid GitHub URL format');
        }
      } else if (url.includes('/')) {
        // Assume format: owner/repo
        const parts = url.split('/').filter(Boolean);
        owner = parts[0];
        name = parts[1];
      } else {
        throw new Error('Invalid repository format. Use GitHub URL or owner/repo');
      }

      if (!userId) {
        throw new Error('User ID not available');
      }

      // Create repo in backend (format: owner-repo)
      const repoNameBackend = `${owner}-${name}`;
      const createRes = await fetch(`${backendUrl}/repos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-user-id': userId
        },
        body: JSON.stringify({
          github_url: url
        })
      });

      let repo: Repo;
      let isDuplicate = false;

      if (createRes.ok) {
        // Success: repo created
        repo = await createRes.json();
      } else if (createRes.status === 409 || createRes.status === 400) {
        // Check if it's a duplicate error (400 from backend, but also check 409 for compatibility)
        const errorData = await createRes.json().catch(() => ({ detail: '' }));
        const errorDetail = errorData.detail || errorData.message || '';
        
        // Check if error message indicates duplicate
        const isDuplicateError = errorDetail.toLowerCase().includes('already exists') || 
                                 errorDetail.toLowerCase().includes('duplicate') ||
                                 createRes.status === 409;
        
        if (isDuplicateError) {
          // Repo already exists - fetch it and select it
          isDuplicate = true;
          const listRes = await fetch(`${backendUrl}/repos`, {
            headers: {
              'X-user-id': userId
            }
          });
          
          if (!listRes.ok) {
            throw new Error('Failed to fetch existing repositories');
          }
          
          const reposData = await listRes.json();
          const reposList = reposData.items || [];
          
          // Find matching repo by normalized name (owner-repo)
          const found = reposList.find((r: Repo) => r.name === repoNameBackend);
          
          if (!found) {
            // Repo name doesn't match - try to find by parsing owner/repo from each repo name
            // This handles edge cases where repo might have different naming
            const foundByParts = reposList.find((r: Repo) => {
              const parts = r.name.split('-');
              if (parts.length >= 2) {
                const repoOwner = parts.slice(0, -1).join('-');
                const repoName = parts[parts.length - 1];
                return repoOwner === owner && repoName === name;
              }
              return false;
            });
            
            if (foundByParts) {
              repo = foundByParts;
            } else {
              throw new Error(`Repository ${owner}/${name} already exists but could not be found`);
            }
          } else {
            repo = found;
          }
        } else {
          // Other 400/409 error (not duplicate)
          throw new Error(errorDetail || 'Failed to create repository');
        }
      } else {
        // Other error status
        const errorData = await createRes.json().catch(() => ({ detail: 'Failed to create repository' }));
        throw new Error(errorData.detail || errorData.message || 'Failed to create repository');
      }

      // Select the repo (whether newly created or existing)
      setSelectedRepo(repo);
      setRepoOwner(owner);
      setRepoName(name);
      localStorage.setItem('bj_last_repo_id', repo.id);
      
      // Show user-friendly message if duplicate
      if (isDuplicate) {
        setInfoMessage(`Repository ${owner}/${name} already connected — opening it`);
        // Clear message after 3 seconds
        setTimeout(() => {
          setInfoMessage(null);
        }, 3000);
      }
      
      // Fetch entries immediately for the repo
      await loadEntries(repo.id);
      
      // Refresh repos list in background (doesn't block UI update)
      loadRepos(userId).catch(err => {
        console.error('Failed to refresh repos list:', err);
      });
      
      setShowConnectModal(false);
      setRepoUrlInput('');
      setError(null);
    } catch (e: any) {
      console.error('Failed to connect repo:', e);
      setError(e.message || 'Failed to connect repository');
      setInfoMessage(null);
    } finally {
      setIsConnecting(false);
    }
  };

  const openEntryModal = async (entry: Entry) => {
    setShowEntryModal(true);
    setIsLoadingEntryDetail(true);
    setEntryDetailError(null);
    
    try {
      // Always fetch full entry details from backend
      const res = await fetch(`${backendUrl}/posts/${entry.id}`, {
        headers: userId ? {
          'X-user-id': userId
        } : {}
      });
      if (res.ok) {
        const detail = await res.json();
        setSelectedEntry({
          id: detail.id,
          title: detail.title,
          status: (detail.status || 'open') as 'fixed' | 'open' | null,
          tags: detail.tags || [],
          date: detail.created_at ? new Date(detail.created_at).toLocaleDateString() : entry.date,
          body: detail.body || detail.summary || ''
        });
        setEntryDetailError(null);
      } else if (res.status === 404) {
        setEntryDetailError('Entry not found');
        setSelectedEntry(entry);
      } else {
        const errorData = await res.json().catch(() => ({ detail: 'Failed to load entry' }));
        setEntryDetailError(errorData.detail || 'Failed to load entry');
        setSelectedEntry(entry);
      }
    } catch (e) {
      console.error('Failed to fetch entry details:', e);
      setEntryDetailError('Failed to load entry. Check your connection.');
      setSelectedEntry(entry);
    } finally {
      setIsLoadingEntryDetail(false);
    }
  };

  const parseMarkdown = (text: string) => {
    return text
      .split('\n')
      .map(line => {
        const l = line.trim();
        if (l.startsWith('## ')) return `<h2>${l.substring(3)}</h2>`;
        if (l.startsWith('# ')) return `<h1>${l.substring(2)}</h1>`;
        if (l === '') return '';
        if (l.startsWith('`') && l.endsWith('`')) return `<p><code>${l.substring(1, l.length - 1)}</code></p>`;
        return `<p>${l}</p>`;
      })
      .join('');
  };

  // Format date as "Jan 12, 2026"
  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  // Get summary text with fallback logic
  const getEntrySummary = (entry: Entry): string => {
    if (entry.summary && entry.summary.trim()) {
      return entry.summary.trim();
    }
    if (entry.body && entry.body.trim()) {
      const bodyText = entry.body.trim().replace(/\n/g, ' ');
      return bodyText.length > 120 ? bodyText.substring(0, 120) + '...' : bodyText;
    }
    return 'No summary';
  };

  // Get severity badge color
  const getSeverityColor = (severity: string): { bg: string; color: string } => {
    const sev = severity?.toLowerCase() || '';
    if (sev === 'critical' || sev === 'high') {
      return { bg: 'rgba(248, 81, 73, 0.2)', color: '#f85149' };
    }
    if (sev === 'medium' || sev === 'med') {
      return { bg: 'rgba(251, 188, 5, 0.2)', color: '#fbbc05' };
    }
    if (sev === 'low') {
      return { bg: 'rgba(33, 186, 69, 0.2)', color: '#21ba45' };
    }
    return { bg: 'rgba(125, 125, 125, 0.2)', color: '#7d7d7d' };
  };

  // Handle modal scroll lock
  useEffect(() => {
    if (showEntryModal || showConnectModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showEntryModal, showConnectModal]);

  // Copy user ID to clipboard
  const copyUserId = useCallback(async () => {
    if (userId) {
      try {
        await navigator.clipboard.writeText(userId);
        setInfoMessage('User ID copied to clipboard');
        setTimeout(() => setInfoMessage(null), 2000);
      } catch (e) {
        console.error('Failed to copy user ID:', e);
      }
    }
  }, [userId]);

  return (
    <>
      {/* Navigation */}
      <nav className="navbar">
        <div className="container nav-content">
          <Link href="/" className="nav-logo">
            <span>⚡</span> BugJournal
          </Link>
          <div className="nav-links">
            <Link href="/" className="nav-link">Home</Link>
            <Link href="/journal" className="nav-link active">Journal</Link>
            <Link href="/how-it-works" className="nav-link">How It Works</Link>
            <Link href="/project" className="nav-link">Project</Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        {/* Debug Info (only if DEBUG is true) */}
        {DEBUG && process.env.NODE_ENV === 'development' && (
          <div style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderBottom: '1px solid var(--border-color)',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            fontFamily: 'monospace',
            marginBottom: '1rem'
          }}>
            <span>user_id: {userId || 'null'}</span>
            {selectedRepo && <span style={{ marginLeft: '1rem' }}>repo_id: {selectedRepo.id}</span>}
          </div>
        )}

        {/* Loading/Creating User State */}
        {isLoadingRepos && !userId && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Creating your account...</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              This may take a moment.
            </p>
          </div>
        )}

        {/* Loading Repos State (user exists, loading repos) */}
        {isLoadingRepos && userId && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Loading repositories...</p>
          </div>
        )}

        {/* Disconnected State (no repos) - Show connect button in repo header area */}
        {userId && !isLoadingRepos && repos.length === 0 && !selectedRepo && (
          <div className="repo-header" style={{ marginBottom: '0' }}>
            <div className="repo-header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div className="repo-info" style={{ flex: 1 }}>
                <div className="repo-title" style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" fill="currentColor">
                    <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"></path>
                  </svg>
                  <span style={{ color: 'var(--text-secondary)' }}>No repository connected</span>
                </div>
                <p className="repo-description" style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Connect a GitHub repository to view your bug journals.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setShowConnectModal(true)}
                style={{ fontSize: '1rem', padding: '0.75rem 1.5rem', alignSelf: 'flex-start' }}
              >
                Connect GitHub Repo
              </button>
            </div>
            <div className="repo-tabs" style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
              <div 
                className={`repo-tab ${activeTab === 'entries' ? 'active' : ''}`}
                onClick={() => setActiveTab('entries')}
                style={{ cursor: 'pointer' }}
              >
                Entries
              </div>
              <div 
                className={`repo-tab ${activeTab === 'commits' ? 'active' : ''}`}
                onClick={() => setActiveTab('commits')}
                style={{ cursor: 'pointer' }}
              >
                Commits
              </div>
              <div 
                className={`repo-tab ${activeTab === 'insights' ? 'active' : ''}`}
                onClick={() => setActiveTab('insights')}
                style={{ cursor: 'pointer' }}
              >
                Insights
              </div>
              <div 
                className={`repo-tab ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
                style={{ cursor: 'pointer' }}
              >
                Settings
              </div>
            </div>
          </div>
        )}

        {/* Disconnected Tab Content */}
        {userId && !isLoadingRepos && repos.length === 0 && !selectedRepo && (
          <div style={{ marginTop: '1.5rem' }}>
            {activeTab === 'entries' && (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                <p>Connect a repository to view entries.</p>
              </div>
            )}
            {activeTab === 'commits' && (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                <p>Connect a repository to view commits.</p>
              </div>
            )}
            {activeTab === 'insights' && (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                <p>Connect a repository to view insights.</p>
              </div>
            )}
            {activeTab === 'settings' && (
              <div style={{ maxWidth: '600px' }}>
                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Settings</h2>
                
                {/* User ID Section */}
                <div style={{
                  padding: '1.5rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  marginBottom: '1.5rem'
                }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Account</h3>
                  {user && user.github_username ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        {user.github_avatar_url && (
                          <img
                            src={user.github_avatar_url}
                            alt={user.github_username}
                            style={{ width: '48px', height: '48px', borderRadius: '50%' }}
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            {user.github_name || user.github_username}
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            @{user.github_username}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        padding: '0.75rem',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                        marginBottom: '1rem',
                        wordBreak: 'break-all',
                        color: 'var(--text-primary)'
                      }}>
                        User ID: {userId}
                      </div>
                      <button
                        className="btn btn-secondary"
                        onClick={handleSignOut}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                        Not signed in. Sign in with GitHub to sync your journals across devices.
                      </p>
                      <a
                        href={`${backendUrl}/auth/github/start`}
                        className="btn btn-primary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                      >
                        Sign in with GitHub
                      </a>
                    </>
                  )}
                </div>

                {/* Repo Management Section */}
                <div style={{
                  padding: '1.5rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px'
                }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Repositories</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    No repositories connected.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowConnectModal(true)}
                    style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}
                  >
                    Connect Repo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Connected State */}
        {selectedRepo && (
          <>
            {/* Repo Header/Banner (GitHub-style) */}
            <div className="repo-header" style={{ marginBottom: '0' }}>
              <div className="repo-header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div className="repo-info" style={{ flex: 1 }}>
                  <div className="repo-title" style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" fill="currentColor">
                      <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"></path>
                    </svg>
                    {/* Repo Selector (if multiple repos) - inside header */}
                    {repos.length > 1 ? (
                      <select
                        value={selectedRepo.id}
                        onChange={(e) => {
                          const repo = repos.find(r => r.id === e.target.value);
                          if (repo) {
                            setSelectedRepo(repo);
                            parseRepoName(repo.name);
                            localStorage.setItem('bj_last_repo_id', repo.id);
                          }
                        }}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          color: 'var(--text-primary)',
                          fontSize: '1.25rem',
                          fontWeight: '600',
                          minWidth: '200px',
                          cursor: 'pointer'
                        }}
                      >
                        {repos.map(repo => {
                          // Parse repo name for display
                          const parts = repo.name.split('-');
                          const displayName = parts.length >= 2 
                            ? `${parts.slice(0, -1).join('-')}/${parts[parts.length - 1]}`
                            : repo.name;
                          return (
                            <option key={repo.id} value={repo.id}>{displayName}</option>
                          );
                        })}
                      </select>
                    ) : (
                      repoOwner && repoName ? (
                        <span>{repoOwner}/{repoName}</span>
                      ) : (
                        <span>{selectedRepo.name}</span>
                      )
                    )}
                    <span className="repo-badge">{selectedRepo.visibility}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {repoOwner && repoName && (
                      <a
                        href={`https://github.com/${repoOwner}/${repoName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                      >
                        Open on GitHub
                      </a>
                    )}
                    {/* Connect Another Repo button - only show if multiple repos or allow adding more */}
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowConnectModal(true)}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                    >
                      Connect Another Repo
                    </button>
                  </div>
                </div>
              </div>
              <div className="repo-tabs" style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                <div 
                  className={`repo-tab ${activeTab === 'entries' ? 'active' : ''}`}
                  onClick={() => setActiveTab('entries')}
                  style={{ cursor: 'pointer' }}
                >
                  Entries
                </div>
                <div 
                  className={`repo-tab ${activeTab === 'commits' ? 'active' : ''}`}
                  onClick={() => setActiveTab('commits')}
                  style={{ cursor: 'pointer' }}
                >
                  Commits
                </div>
                <div 
                  className={`repo-tab ${activeTab === 'insights' ? 'active' : ''}`}
                  onClick={() => setActiveTab('insights')}
                  style={{ cursor: 'pointer' }}
                >
                  Insights
                </div>
                <div 
                  className={`repo-tab ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => setActiveTab('settings')}
                  style={{ cursor: 'pointer' }}
                >
                  Settings
                </div>
              </div>
            </div>

            {/* Info Message (non-blocking) */}
            {infoMessage && (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(33, 186, 69, 0.1)',
                border: '1px solid rgba(33, 186, 69, 0.3)',
                borderRadius: '6px',
                color: '#21ba45',
                marginTop: '1.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <span>{infoMessage}</span>
                <button
                  onClick={() => setInfoMessage(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#21ba45',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    padding: '0',
                    lineHeight: '1'
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {/* Tab Content */}
            {activeTab === 'entries' && (
              <div style={{ marginTop: '1.5rem' }}>
                {isLoadingEntries ? (
                  <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                    Loading entries...
                  </div>
                ) : entriesError ? (
                  <div style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(248, 81, 73, 0.1)',
                    border: '1px solid rgba(248, 81, 73, 0.3)',
                    borderRadius: '6px',
                    color: '#f85149',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}>
                    <span>{entriesError}</span>
                    <button
                      className="btn btn-secondary"
                      onClick={() => selectedRepo && loadEntries(selectedRepo.id)}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                    >
                      Retry
                    </button>
                  </div>
                ) : entries.length === 0 ? (
                  <div style={{
                    padding: '3rem 2rem',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px'
                  }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                      No entries yet
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                      Run <code style={{ 
                        backgroundColor: 'var(--bg-primary)', 
                        padding: '0.2rem 0.4rem', 
                        borderRadius: '4px',
                        fontSize: '0.9em',
                        fontFamily: 'monospace'
                      }}>bugjournal push</code> from your repo to publish entries.
                    </p>
                    <div style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '1rem',
                      textAlign: 'left',
                      display: 'inline-block',
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      lineHeight: '1.6'
                    }}>
                      <div>bugjournal init</div>
                      <div>bugjournal connect &lt;github_url&gt;</div>
                      <div>bugjournal sample</div>
                      <div>bugjournal push</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {entries.map((entry) => {
                      const severityColors = getSeverityColor(entry.severity || '');
                      const summaryText = getEntrySummary(entry);
                      return (
                        <div
                          key={entry.id}
                          style={{
                            padding: '1rem',
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            transition: 'border-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--text-secondary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                          }}
                        >
                          {/* Title row */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.5rem' }}>
                            <h3 
                              style={{ 
                                fontSize: '1.1rem', 
                                margin: 0, 
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                fontWeight: '600'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEntryModal(entry);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#58a6ff';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--text-primary)';
                              }}
                            >
                              {entry.title}
                            </h3>
                            {entry.severity && (
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                textTransform: 'capitalize',
                                backgroundColor: severityColors.bg,
                                color: severityColors.color,
                                whiteSpace: 'nowrap'
                              }}>
                                {entry.severity}
                              </span>
                            )}
                          </div>

                          {/* Summary */}
                          <div style={{ 
                            marginBottom: '0.75rem', 
                            color: 'var(--text-secondary)', 
                            fontSize: '0.9rem',
                            lineHeight: '1.5',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {summaryText}
                          </div>

                          {/* Meta row: tags and date */}
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {entry.tags.length > 0 && entry.tags.map(tag => (
                              <span 
                                key={tag} 
                                style={{
                                  padding: '0.2rem 0.5rem',
                                  backgroundColor: 'var(--bg-primary)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  color: 'var(--text-secondary)'
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                            {entry.date && (
                              <>
                                {entry.tags.length > 0 && <span>•</span>}
                                <span>{formatDate(entry.date)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'commits' && (
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                  <p>Commits will appear here once the backend exposes <code style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    padding: '0.2rem 0.4rem', 
                    borderRadius: '4px',
                    fontSize: '0.9em',
                    fontFamily: 'monospace'
                  }}>GET /repos/&#123;repo_id&#125;/commits</code>.</p>
                </div>
              </div>
            )}

            {activeTab === 'insights' && (
              <div style={{ marginTop: '1.5rem' }}>
                {entries.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div style={{
                      padding: '1.5rem',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px'
                    }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total Entries</div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{entries.length}</div>
                    </div>
                    {(() => {
                      const statusCounts = entries.reduce((acc, e) => {
                        const status = e.status || 'open';
                        acc[status] = (acc[status] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      
                      return Object.entries(statusCounts).map(([status, count]) => (
                        <div key={status} style={{
                          padding: '1.5rem',
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px'
                        }}>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'capitalize' }}>{status}</div>
                          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{count}</div>
                        </div>
                      ));
                    })()}
                    {entries.length > 0 && (() => {
                      const dates = entries.map(e => e.date).filter(Boolean).map(d => new Date(d).getTime());
                      const mostRecent = dates.length > 0 ? new Date(Math.max(...dates)) : null;
                      return mostRecent ? (
                        <div style={{
                          padding: '1.5rem',
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px'
                        }}>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Most Recent</div>
                          <div style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                            {mostRecent.toLocaleDateString()}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                    <p>No entries to analyze yet.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div style={{ marginTop: '1.5rem', maxWidth: '600px' }}>
                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Settings</h2>
                
                {/* User ID Section */}
                <div style={{
                  padding: '1.5rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  marginBottom: '1.5rem'
                }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Account</h3>
                  {user && user.github_username ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        {user.github_avatar_url && (
                          <img
                            src={user.github_avatar_url}
                            alt={user.github_username}
                            style={{ width: '48px', height: '48px', borderRadius: '50%' }}
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            {user.github_name || user.github_username}
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            @{user.github_username}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        padding: '0.75rem',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                        marginBottom: '1rem',
                        wordBreak: 'break-all',
                        color: 'var(--text-primary)'
                      }}>
                        User ID: {userId}
                      </div>
                      <button
                        className="btn btn-secondary"
                        onClick={handleSignOut}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      {userId && (
                        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          <span>Connected as</span>
                          <code style={{
                            backgroundColor: 'var(--bg-primary)',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            color: 'var(--text-primary)'
                          }}>
                            {userId.substring(0, 8)}
                          </code>
                          <button
                            onClick={copyUserId}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            Copy
                          </button>
                        </div>
                      )}
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                        Not signed in. Sign in with GitHub to sync your journals across devices.
                      </p>
                      <a
                        href={`${backendUrl}/auth/github/start`}
                        className="btn btn-primary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                      >
                        Sign in with GitHub
                      </a>
                    </>
                  )}
                </div>

                {/* Repo Management Section */}
                <div style={{
                  padding: '1.5rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px'
                }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Repositories</h3>
                  {repos.length > 0 ? (
                    <div style={{ marginBottom: '1rem' }}>
                      {repos.map(repo => {
                        const parts = repo.name.split('-');
                        const displayName = parts.length >= 2 
                          ? `${parts.slice(0, -1).join('-')}/${parts[parts.length - 1]}`
                          : repo.name;
                        return (
                          <div
                            key={repo.id}
                            style={{
                              padding: '0.75rem',
                              backgroundColor: 'var(--bg-primary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              marginBottom: '0.5rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <span style={{ color: 'var(--text-primary)' }}>{displayName}</span>
                            <button
                              className="btn btn-secondary"
                              onClick={() => {
                                setSelectedRepo(repo);
                                parseRepoName(repo.name);
                                localStorage.setItem('bj_last_repo_id', repo.id);
                              }}
                              style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                            >
                              Select
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      No repositories connected.
                    </p>
                  )}
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowConnectModal(true)}
                    style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}
                  >
                    Connect Repo
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Connect Modal */}
        {showConnectModal && (
          <div className="modal-overlay active" onClick={() => setShowConnectModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                className="close-modal"
                onClick={() => setShowConnectModal(false)}
              >
                ×
              </button>
              <h2 style={{ marginBottom: '1rem' }}>Connect GitHub Repository</h2>
              <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Enter the GitHub repository URL or owner/repo format.
              </p>
              {error && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: 'rgba(248, 81, 73, 0.1)',
                  border: '1px solid rgba(248, 81, 73, 0.3)',
                  borderRadius: '6px',
                  color: '#f85149',
                  marginBottom: '1rem'
                }}>
                  {error}
                </div>
              )}
              <input
                type="text"
                value={repoUrlInput}
                onChange={(e) => setRepoUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConnectSubmit();
                  }
                }}
                placeholder="https://github.com/owner/repo or owner/repo"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowConnectModal(false);
                    setRepoUrlInput('');
                    setError(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleConnectSubmit}
                  disabled={isConnecting || !repoUrlInput.trim()}
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User ID Input Modal (Dev Only) */}
        {showUserIdModal && (
          <div className="modal-overlay active" onClick={() => {}}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <h2 style={{ marginBottom: '1rem' }}>Enter User ID (Dev Mode)</h2>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Paste the user_id from ~/.bugjournal/config.json to use the same account as the CLI.
              </p>
              <input
                type="text"
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUserIdSubmit();
                  }
                }}
                placeholder="Enter user_id (UUID)"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowUserIdModal(false);
                    setUserIdInput('');
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleUserIdSubmit}
                  disabled={!userIdInput.trim()}
                >
                  Use This ID
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Entry Modal */}
        {showEntryModal && (
          <div className="modal-overlay active" onClick={() => setShowEntryModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                className="close-modal"
                onClick={() => setShowEntryModal(false)}
              >
                ×
              </button>
              {isLoadingEntryDetail ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  Loading entry details...
                </div>
              ) : selectedEntry ? (
                <>
                  {entryDetailError && (
                    <div style={{
                      padding: '0.75rem',
                      backgroundColor: 'rgba(248, 81, 73, 0.1)',
                      border: '1px solid rgba(248, 81, 73, 0.3)',
                      borderRadius: '6px',
                      color: '#f85149',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      flexWrap: 'wrap'
                    }}>
                      <span>Failed to load entry</span>
                      <button
                        className="btn btn-secondary"
                        onClick={() => selectedEntry && openEntryModal(selectedEntry)}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  <div style={{ marginBottom: '1rem' }}>
                    <h2 style={{ marginBottom: '0.5rem' }}>{selectedEntry.title}</h2>
                    <div className="entry-meta" style={{ marginBottom: '1rem' }}>
                      <span>#{selectedEntry.id}</span>
                      {selectedEntry.date && (
                        <>
                          <span>•</span>
                          <span>{selectedEntry.date}</span>
                        </>
                      )}
                      {selectedEntry.status && (
                        <>
                          <span>•</span>
                          <span style={{ textTransform: 'capitalize' }}>{selectedEntry.status}</span>
                        </>
                      )}
                      {selectedEntry.tags.map(tag => (
                        <span key={tag} className="tag">#{tag}</span>
                      ))}
                    </div>
                  </div>
                  {selectedEntry.body && selectedEntry.body.trim() ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(selectedEntry.body) }}
                      style={{
                        lineHeight: '1.6',
                        color: 'var(--text-primary)'
                      }}
                    />
                  ) : (
                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No details available</p>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  Entry not found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer>
          <div className="container">
            <div className="footer-links">
              <Link href="/">Home</Link>
              <Link href="https://github.com/saihajkohli/bugjournal">GitHub Repository</Link>
            </div>
            <p>&copy; 2026 BugJournal. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </>
  );
}
