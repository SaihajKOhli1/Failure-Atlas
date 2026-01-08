'use client';

import type { Post } from '@/lib/api';
import PostCard from './PostCard';

type SortOption = 'hot' | 'new' | 'top';
type SeverityOption = 'all' | 'low' | 'med' | 'high';

interface FeedProps {
  posts: Post[];
  total: number;
  sort: SortOption;
  severity: SeverityOption;
  onSortChange: (sort: SortOption) => void;
  onSeverityChange: (severity: SeverityOption) => void;
  loading?: boolean;
  showFilters?: boolean;
  onPostUpdate?: (updatedPost: Post) => void;
  onPostClick?: (post: Post) => void;
}

export default function Feed({
  posts,
  total,
  sort,
  severity,
  onSortChange,
  onSeverityChange,
  loading = false,
  showFilters = true,
  onPostUpdate,
  onPostClick,
}: FeedProps) {
  return (
    <main>
      <div className="panel">
        <div className="feed-toolbar">
          {showFilters && (
            <div className="feed-controls">
              <select
                id="sortSelect"
                value={sort}
                onChange={(e) => onSortChange(e.target.value as SortOption)}
                disabled={loading}
              >
                <option value="hot">🔥 Hot</option>
                <option value="new">🆕 New</option>
                <option value="top">🏆 Top</option>
              </select>
              <select
                id="severitySelect"
                value={severity}
                onChange={(e) => onSeverityChange(e.target.value as SeverityOption)}
                disabled={loading}
              >
                <option value="all">All severities</option>
                <option value="low">Low</option>
                <option value="med">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          )}
          <div className="feed-stats">
            Showing {total} post{total !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="feed">
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>
          ) : posts.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>No posts found.</div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onUpdate={onPostUpdate}
                onPostClick={onPostClick}
              />
            ))
          )}
        </div>
      </div>
    </main>
  );
}

