'use client';

import { useEffect } from 'react';
import Link from 'next/link';

const GITHUB_REPO_URL = "https://github.com/SaihajKOhli1/Bug-Journal";

const demoEntries = [
  {
    id: 1,
    title: "Production DB Connection Timeout",
    status: "fixed",
    tags: ["postgres", "aws", "critical"],
    date: "2 hours ago",
    body: `
## Symptom
Application started throwing 500 errors. Logs showed \`OperationalError: remaining connection slots are reserved for non-replication superuser connections\`.

## Root Cause
A new microservice was not closing connections properly, exhausting the RDS connection pool.

## Fix
Implemented connection pooling with PgBouncer and fixed the connection leak in the service.

## Lesson
Always monitor active connections when deploying new services that talk to the DB.
    `
  },
  {
    id: 2,
    title: "React Hydration Error on Navbar",
    status: "open",
    tags: ["frontend", "nextjs", "react"],
    date: "Yesterday",
    body: `
## Symptom
Console warning: \`Text content does not match server-rendered HTML\`. Navbar flashes on load.

## Root Cause
Using \`window.localStorage\` to set a theme class during initial render, which differs from server render (undefined).

## Fix
Moved theme initialization to a \`useEffect\` hook to run only on client.

## Lesson
Never access browser APIs during standard React render phase in Next.js.
    `
  },
  {
    id: 3,
    title: "CORS Issue on Staging API",
    status: "fixed",
    tags: ["api", "cors", "config"],
    date: "3 days ago",
    body: `
## Symptom
Frontend requests blocked by CORS policy.

## Root Cause
Nginx config on staging was missing the \`Access-Control-Allow-Origin\` header for the new frontend domain.

## Fix
Updated Nginx conf to allow the Vercel preview URL pattern.

## Lesson
Staging environments need to mimic production security constraints.
    `
  }
];

export default function HomePage() {
  useEffect(() => {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        const target = document.querySelector(targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }, []);

  return (
    <>
      {/* Navigation */}
      <nav className="navbar">
        <div className="container nav-content">
          <Link href="/" className="nav-logo">
            <span>⚡</span> BugJournal
          </Link>
          <div className="nav-links">
            <Link href="/" className="nav-link active">Home</Link>
            <Link href="/journal" className="nav-link">Journal</Link>
            <Link href="/how-it-works" className="nav-link">How It Works</Link>
            <Link href="/project" className="nav-link">Project</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <h1>A GitHub-style bug journal<br />for developers.</h1>
          <p>Debug smarter. Write entries locally in Markdown, push with a simple CLI, and build your personal knowledge base.</p>
          <div className="hero-actions">
            <a href={GITHUB_REPO_URL} className="btn btn-primary" target="_blank" rel="noreferrer noopener">View on GitHub</a>
            <a href={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000'}/auth/github/start`} className="btn btn-secondary">Sign in with GitHub</a>
            <Link href="/journal" className="btn btn-secondary">Try it</Link>
          </div>
        </div>
      </section>

      {/* Condensed Workflow */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>The Workflow</h2>
            <p>Simple enough for Monday mornings.</p>
          </div>
          <div className="condensed-workflow">
            <div className="workflow-mini-step">
              <code>bugjournal init</code>
              <p>Setup your journal</p>
            </div>
            <div className="workflow-mini-step">
              <code>bugjournal new</code>
              <p>Write an entry</p>
            </div>
            <div className="workflow-mini-step">
              <code>bugjournal push</code>
              <p>Sync to server</p>
            </div>
            <div className="workflow-mini-step">
              <code>bugjournal web</code>
              <p>Browse history</p>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link href="/how-it-works" className="btn btn-secondary" style={{ fontSize: '0.9rem' }}>Read the full guide →</Link>
          </div>
        </div>
      </section>

      {/* Journal Preview - DEMO */}
      <section id="journal" className="section">
        <div className="container">
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', textAlign: 'left', borderBottom: 'none', marginBottom: '1rem' }}>
            <div>
              <h2>Browse Your Knowledge</h2>
              <p>A clean, searchable history of every bug you&apos;ve squashed.</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Link href="/journal" className="btn btn-primary">Open Journal</Link>
            </div>
          </div>

          <div className="journal-preview" style={{ position: 'relative' }}>
            {/* Demo Badge */}
            <div style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              zIndex: 10,
              background: 'rgba(248, 81, 73, 0.9)',
              color: '#fff',
              padding: '0.25rem 0.75rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Demo
            </div>

            {/* Demo Repo Header */}
            <div className="repo-header">
              <div className="repo-header-top">
                <div className="repo-info">
                  <div className="repo-title" style={{ fontSize: '1.25rem' }}>
                    <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" fill="currentColor">
                      <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"></path>
                    </svg>
                    <span>saihajkohli / my-bug-journal</span>
                    <span className="repo-badge">Public</span>
                  </div>
                  <p className="repo-description">A demo of the bugjournal static site.</p>
                  <div className="repo-stats">
                    <span className="repo-stat">
                      <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" fill="currentColor">
                        <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"></path>
                      </svg> <span>12</span>
                    </span>
                    <span className="repo-stat">
                      <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" fill="currentColor">
                        <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"></path>
                      </svg> <span>4</span>
                    </span>
                  </div>
                </div>
                <div className="repo-actions">
                  <Link href="/journal" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>Try with your repo →</Link>
                </div>
              </div>
              <div className="repo-tabs">
                <div className="repo-tab active">Entries</div>
                <div className="repo-tab">Insights</div>
                <div className="repo-tab">Settings</div>
              </div>
            </div>

            {/* Demo Entries List */}
            <ul className="journal-list">
              {demoEntries.map((entry) => (
                <li key={entry.id} className="journal-item" style={{ cursor: 'default', opacity: 0.8 }}>
                  <div className="status-icon">
                    {entry.status === 'fixed' ? (
                      <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" fill="currentColor" className="status-fixed">
                        <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>
                      </svg>
                    ) : (
                      <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" fill="currentColor" className="status-open">
                        <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path>
                        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path>
                      </svg>
                    )}
                  </div>
                  <div className="entry-main">
                    <span className="entry-title">{entry.title}</span>
                    <div className="entry-meta">
                      <span>#{entry.id} opened {entry.date}</span>
                      {entry.tags.map(tag => (
                        <span key={tag} className="tag">#{tag}</span>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Demo CTA Overlay */}
            <div style={{
              padding: '1.5rem',
              textAlign: 'center',
              borderTop: '1px solid var(--border-color)',
              background: 'rgba(212, 175, 55, 0.05)'
            }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                This is a demo preview. Connect your GitHub repository to view your real bug journals.
              </p>
              <Link href="/journal" className="btn btn-primary">Open Journal</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="section">
        <div className="container problem-content">
          <div className="section-header">
            <h2>Stop Solving the Same Bug Twice</h2>
          </div>
          <p className="problem-text">
            Debugging knowledge is often scattered across browser tabs, forgotten sticky notes, or lost in mental
            overhead.
            Excellent developers document their solutions, but the tools are often too heavy or too disconnected
            from the code.
          </p>
        </div>
      </section>

      {/* What BugJournal Does */}
      <section id="how-it-works" className="section">
        <div className="container">
          <div className="section-header">
            <h2>The Workflow</h2>
            <p>Designed for the developer terminal flow.</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <h3>Markdown First</h3>
              <p>Write bug reports in your favorite editor using simple Markdown. No complex forms or web UIs to
                slow you down.</p>
            </div>
            <div className="feature-card">
              <h3>CLI Powered</h3>
              <p>Push your entries with a single command. It fits right into your git workflow and terminal
                habits.</p>
            </div>
            <div className="feature-card">
              <h3>GitHub-style UI</h3>
              <p>Browse your history with an interface you already know and love. Clean, readable, and familiar.
              </p>
            </div>
            <div className="feature-card">
              <h3>Idempotent Sync</h3>
              <p>Push as often as you like. We handle the diffs so you never end up with duplicate entries for the
                same issue.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>Built For Builders</h2>
          </div>
          <div className="audience-list">
            <span className="audience-tag">Individual Developers</span>
            <span className="audience-tag">Computer Science Students</span>
            <span className="audience-tag">Small Engineering Teams</span>
            <span className="audience-tag">Bootcamp Grads</span>
            <span className="audience-tag">Open Source Maintainers</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="container">
          <div className="footer-links">
            <Link href="https://github.com/saihajkohli/bugjournal" target="_blank" rel="noopener noreferrer">GitHub Repository</Link>
          </div>
          <p>&copy; 2026 BugJournal. All rights reserved.</p>
          <p className="tech-stack">Built with FastAPI, PostgreSQL, and Love.</p>
        </div>
      </footer>
    </>
  );
}
