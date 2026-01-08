'use client';

import type { CauseAnalytics } from '@/lib/api';

interface AnalyticsSidebarProps {
  analytics: CauseAnalytics[];
  onNewPostClick: () => void;
}

function formatCauseLabel(cause: string): string {
  const mappings: Record<string, string> = {
    distribution: 'Distribution mismatch',
    trust: 'Trust & privacy',
    infra: 'Infra / reliability',
    pricing: 'Pricing / value',
    ux: 'UX / usability',
    timing: 'Timing / market',
    strategy: 'Strategy / positioning',
  };
  return mappings[cause] || cause.charAt(0).toUpperCase() + cause.slice(1);
}

export default function AnalyticsSidebar({ analytics, onNewPostClick }: AnalyticsSidebarProps) {
  return (
    <aside className="sidebar-right">
      <div className="panel">
        <div className="panel-header">Top Root Causes</div>
        <div className="panel-body">
          {analytics.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted)', fontSize: '12px' }}>
              No analytics data available
            </div>
          ) : (
            analytics.map((item) => (
              <div key={item.cause} className="kpi-item">
                <div className="kpi-header">
                  <div className="kpi-label">{formatCauseLabel(item.cause)}</div>
                  <div className="kpi-value">{item.percent}%</div>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${item.percent}%` }}></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="panel" style={{ marginTop: '16px' }}>
        <div className="panel-header">Submit a Failure</div>
        <div className="panel-body">
          <div className="cta-box">
            <p>Drop a quick postmortem. You can refine later — the goal is collecting patterns.</p>
            <button className="btn primary" onClick={onNewPostClick} style={{ width: '100%' }}>
              ➕ Create Post
            </button>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '16px' }}>
        <div className="panel-header">Daily Challenge</div>
        <div className="panel-body">
          <div className="challenge-box">
            <strong>Write a postmortem for:</strong>
            <div>&quot;A feature rollout that broke trust&quot;</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
              Think: bad defaults, confusing consent, unclear messaging.
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

