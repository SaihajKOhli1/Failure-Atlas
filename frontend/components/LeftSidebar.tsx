'use client';

type CauseOption = 'all' | 'pricing' | 'ux' | 'infra' | 'trust' | 'timing' | 'distribution' | 'strategy';

interface LeftSidebarProps {
  activeCause: CauseOption;
  onCauseChange: (cause: CauseOption) => void;
  loading?: boolean;
}

export default function LeftSidebar({ activeCause, onCauseChange, loading = false }: LeftSidebarProps) {
  return (
    <aside className="sidebar-left">
      <div className="panel">
        <div className="panel-header">Explore</div>
        <div className="panel-body">
          <ul className="nav-list">
            <li className="nav-item active">
              <span>🏠 Home Feed</span>
              <span className="nav-badge">hot</span>
            </li>
            <li className="nav-item">
              <span>🧯 Postmortems</span>
              <span className="nav-badge">new</span>
            </li>
            <li className="nav-item">
              <span>🧪 Experiments</span>
              <span className="nav-badge">lab</span>
            </li>
            <li className="nav-item">
              <span>📈 Patterns</span>
              <span className="nav-badge">insights</span>
            </li>
            <li className="nav-item">
              <span>🧠 Lessons</span>
              <span className="nav-badge">playbook</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '16px' }}>
        <div className="panel-header">Filter by Root Cause</div>
        <div className="panel-body">
          <div className="chip-group">
            <button
              className={`chip ${activeCause === 'all' ? 'active' : ''}`}
              onClick={() => onCauseChange('all')}
              disabled={loading}
            >
              All
            </button>
            <button
              className={`chip ${activeCause === 'pricing' ? 'active' : ''}`}
              onClick={() => onCauseChange('pricing')}
              disabled={loading}
            >
              Pricing
            </button>
            <button
              className={`chip ${activeCause === 'ux' ? 'active' : ''}`}
              onClick={() => onCauseChange('ux')}
              disabled={loading}
            >
              UX
            </button>
            <button
              className={`chip ${activeCause === 'timing' ? 'active' : ''}`}
              onClick={() => onCauseChange('timing')}
              disabled={loading}
            >
              Timing
            </button>
            <button
              className={`chip ${activeCause === 'infra' ? 'active' : ''}`}
              onClick={() => onCauseChange('infra')}
              disabled={loading}
            >
              Infra
            </button>
            <button
              className={`chip ${activeCause === 'trust' ? 'active' : ''}`}
              onClick={() => onCauseChange('trust')}
              disabled={loading}
            >
              Trust
            </button>
            <button
              className={`chip ${activeCause === 'distribution' ? 'active' : ''}`}
              onClick={() => onCauseChange('distribution')}
              disabled={loading}
            >
              Distribution
            </button>
            <button
              className={`chip ${activeCause === 'strategy' ? 'active' : ''}`}
              onClick={() => onCauseChange('strategy')}
              disabled={loading}
            >
              Strategy
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

