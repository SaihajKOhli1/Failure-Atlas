'use client';

import Link from 'next/link';

export default function HowItWorksPage() {
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
            <Link href="/how-it-works" className="nav-link active">How It Works</Link>
            <Link href="/project" className="nav-link">Project</Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="docs-container">
        {/* Header */}
        <header className="docs-header">
          <h1>How BugJournal Works</h1>
          <p>Treating bugs as versioned knowledge units.</p>
          <p style={{ fontSize: '1rem', marginTop: '1rem', opacity: 0.8, color: 'var(--accent-gold)' }}>
            (Short version is on the homepage; this page goes deeper.)
          </p>
        </header>

        {/* Workflow Overview */}
        <section className="docs-section">
          <h2>The Workflow</h2>
          <div className="workflow-steps">
            <div className="workflow-step">
              <h3>Initialize a Journal</h3>
              <p>Create a <code>.bugjournal</code> configuration in your project root or home directory. This
                tells the CLI where to look for entries and where to push them.</p>
            </div>
            <div className="workflow-step">
              <h3>Write Locally</h3>
              <p>Create new bug entries as Markdown files. Use your favorite text editor (VS Code, Vim, Zed) to
                document the issue while it&apos;s fresh in your mind.</p>
            </div>
            <div className="workflow-step">
              <h3>Push via CLI</h3>
              <p>Run <code>bugjournal push</code>. The CLI parses your markdown files, hashes content to prevent
                duplicates, and sends them to your BugJournal server.</p>
            </div>
            <div className="workflow-step">
              <h3>Browse & Search</h3>
              <p>View your collective debugging history in a clean, GitHub-issue-style web interface. Search by
                tags, language, or error messages.</p>
            </div>
          </div>
        </section>

        {/* CLI Installation */}
        <section className="docs-section">
          <h2>1. Installation</h2>
          <p>BugJournal is a Python package. Install it via pip:</p>
          <pre><code><span className="token-comment"># Install via pip</span>{'\n'}pip install bugjournal{'\n\n'}<span className="token-comment"># Or install in editable mode if developing</span>{'\n'}git clone https://github.com/saihajkohli/bugjournal{'\n'}cd bugjournal{'\n'}pip install -e .</code></pre>
          <p>Once installed, you can generate a default configuration file:</p>
          <pre><code>bugjournal init</code></pre>
          <p>This creates a <code>.bugjournal/config.json</code> file where you define your server URL and journal
            directory.</p>
        </section>

        {/* Writing an Entry */}
        <section className="docs-section">
          <h2>2. Writing an Entry</h2>
          <p>Bug entries are just Markdown files with Frontmatter. You can name them anything you like (e.g.,
            <code>2023-10-24-cors-error.md</code>).
          </p>
          <p>Here is the canonical structure:</p>
          <pre><code>---{'\n'}<span className="token-keyword">title</span>: &quot;CORS Error on Staging API&quot;{'\n'}<span className="token-keyword">date</span>: 2023-10-24{'\n'}<span className="token-keyword">tags</span>: [frontend, axios, cors]{'\n'}<span className="token-keyword">status</span>: solved{'\n'}---{'\n\n'}<span className="token-variable"># Symptom</span>{'\n'}API requests fail with `Access-Control-Allow-Origin` missing.{'\n\n'}<span className="token-variable"># Root Cause</span>{'\n'}The staging load balancer was stripping the CORS headers added by FastAPI.{'\n\n'}<span className="token-variable"># Fix</span>{'\n'}Updated Nginx config on the LB to pass through `OPTIONS` requests correctly.{'\n\n'}<span className="token-variable"># Lesson</span>{'\n'}Always check intermediate proxies when headers go missing.</code></pre>
          <p>The &quot;Symptom&quot;, &quot;Root Cause&quot;, and &quot;Fix&quot; headers are recommended, but you can structure the body however
            you prefer.</p>
        </section>

        {/* Pushing Entries */}
        <section className="docs-section">
          <h2>3. Pushing Entries</h2>
          <p>Syncing your local journal with the server is one command:</p>
          <pre><code>bugjournal push</code></pre>
          <h3>Idempotency & Hashing</h3>
          <p>BugJournal uses a content-addressable approach to prevent duplicates. When you push:</p>
          <ul>
            <li>The CLI calculates a SHA-256 hash of the <strong>frontmatter + content</strong>.</li>
            <li>It checks if an entry with this hash already exists on the server.</li>
            <li>If it exists, it skips the upload. If not, it creates a new record.</li>
          </ul>
          <p>This means you can run <code>push</code> as many times as you want without creating duplicate entries or
            &quot;update conflicts&quot;.</p>
        </section>

        {/* How BugJournal Differs from GitHub */}
        <section className="docs-section">
          <h2>How BugJournal Differs from GitHub</h2>
          <p>While BugJournal borrows GitHub&apos;s UI patterns, it serves a different purpose:</p>
          <ul style={{ lineHeight: '1.8' }}>
            <li><strong>GitHub tracks code changes</strong>; BugJournal tracks debugging knowledge.</li>
            <li><strong>CLI-first workflow</strong>: write locally, push, browse. No web forms required.</li>
            <li><strong>Structured metadata</strong> (severity, tags, root cause) for search and reuse across projects.</li>
            <li><strong>Treats bugs as first-class artifacts</strong>, not just issues attached to codebases.</li>
            <li><strong>Works across multiple repos</strong>, building a unified knowledge base from all your projects.</li>
          </ul>
        </section>

        {/* Backend Layout */}
        <section className="docs-section">
          <h2>Backend Architecture</h2>
          <p>The backend is designed to be simple and robust, capable of running on a Raspberry Pi or a cloud
            instance.</p>
          <ul>
            <li><strong>FastAPI</strong>: High-performance async Python framework.</li>
            <li><strong>PostgreSQL</strong>: Reliable relational storage for search and metadata.</li>
            <li><strong>Bulk Endpoint</strong>: The server accepts batches of entries to minimize network
              round-trips during a full sync.</li>
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer>
        <div className="container">
          <div className="footer-links">
            <Link href="/">Home</Link>
            <a href="https://github.com/saihajkohli/bugjournal">GitHub Repository</a>
          </div>
          <p>&copy; 2026 BugJournal.</p>
        </div>
      </footer>
    </>
  );
}

