'use client';

import Link from 'next/link';

export default function ProjectPage() {
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
            <Link href="/#journal" className="nav-link">Journal</Link>
            <Link href="/how-it-works" className="nav-link">How It Works</Link>
            <Link href="/project" className="nav-link active">Project</Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="docs-container">
        {/* Header */}
        <header className="docs-header">
          <h1>BugJournal – Project Overview</h1>
          <p>A CLI-first bug journaling system with a FastAPI backend.</p>
        </header>

        {/* Architecture Overview */}
        <section className="docs-section">
          <h2>Architecture</h2>
          <p>BugJournal follows a classic client-server model optimized for developer ergonomics.</p>
          <ul>
            <li><strong>CLI (Client)</strong>: The primary interface. Written in Python, it handles local file
              parsing, hashing, and API communication.</li>
            <li><strong>API (Server)</strong>: A stateless REST API that accepts sync requests and serves the web
              frontend.</li>
            <li><strong>Database</strong>: PostgreSQL for robust, relational storage of bug entries and tags.</li>
          </ul>
          <h3>Why CLI-First?</h3>
          <p>Context switching kills flow. By enabling developers to write bug reports in their terminal/editor (where
            they already are), we reduce the friction of documentation to near zero.</p>
        </section>

        {/* Backend Design */}
        <section className="docs-section">
          <h2>Backend Design</h2>
          <ul>
            <li><strong>FastAPI</strong>: Chosen for its speed, automatic Swagger documentation, and easy async
              support.</li>
            <li><strong>PostgreSQL</strong>: Using a relational model allows for complex queries on tags and time
              ranges, which is future-proof for analytics.</li>
            <li><strong>REST Endpoints</strong>: Simple, resource-oriented URLs (e.g.,
              <code>POST /entries/sync</code>) make it easy to build alternative clients.
            </li>
            <li><strong>Backward Compatibility</strong>: The API is versioned to ensure older CLI clients don&apos;t
              break as the schema evolves.</li>
          </ul>
        </section>

        {/* Key Engineering Decisions */}
        <section className="docs-section">
          <h2>Key Engineering Decisions</h2>
          <h3>Idempotent Bulk Inserts</h3>
          <p>Network reliability is never guaranteed. The sync protocol sends a batch of content hashes. The server
            responds with which ones it needs, avoiding redundant data transfer and ensuring that re-running
            <code>bugjournal push</code> is always safe.
          </p>

          <h3>Separation of Summary vs. Body</h3>
          <p>We parse the Frontmatter for metadata (summary, date, tags) but store the body as a raw Markdown blob.
            This gives the frontend flexibility to render it completely, while keeping metadata queryable.</p>

          <h3>Minimal Authentication</h3>
          <p>For this version, we use a simple UUID-based token system. It strikes a balance between security and the
            ease of &quot;set it and forget it&quot; configuration for personal tools.</p>
        </section>

        {/* What I Learned */}
        <section className="docs-section">
          <h2>What I Learned</h2>
          <p>Building BugJournal wasn&apos;t just about the code; it was about product engineering.</p>
          <ul>
            <li><strong>Real Debugging</strong>: Writing the tool helped me refine my own debugging process.</li>
            <li><strong>Schema Design</strong>: Designing for &quot;write-once, read-many&quot; required careful index
              planning.</li>
            <li><strong>API Contracts</strong>: Strictly defining the JSON schema between CLI and Backend saved
              hours of debugging integration issues.</li>
            <li><strong>CLI Tooling</strong>: learned the nuances of `argparse`, progress bars, and pretty-printing
              in terminal UIs.</li>
          </ul>
        </section>

        {/* Links */}
        <section className="docs-section">
          <h2>Resources</h2>
          <ul>
            <li><a href="https://github.com/saihajkohli/bugjournal" target="_blank" rel="noopener noreferrer">GitHub Repository</a></li>
            <li><a href="https://github.com/saihajkohli/bugjournal/blob/main/README.md" target="_blank" rel="noopener noreferrer">README</a>
            </li>
            {/* <li><a href="#">API Documentation (Swagger)</a></li> */}
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer>
        <div className="container">
          <div className="footer-links">
            <a href="https://github.com/saihajkohli/bugjournal">GitHub Repository</a>
          </div>
          <p>Saihaj Kohli &copy; 2026</p>
          <p className="tech-stack">Building tools for builders.</p>
        </div>
      </footer>
    </>
  );
}

