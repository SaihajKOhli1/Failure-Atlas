'use client';

import type { Post } from '@/lib/api';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <article className="post">
      <div className="vote-section">
        <button className="vote-btn" title="Upvote">▲</button>
        <div className="vote-score">{post.votes.toLocaleString()}</div>
        <button className="vote-btn down" title="Downvote">▼</button>
      </div>
      <div className="post-content">
        <h2>{post.title}</h2>
        <div className="post-meta">
          <span className="badge badge-cause">🏷 {post.cause}</span>
          <span className={`badge badge-severity ${post.severity}`}>{post.severity.toUpperCase()}</span>
          <span>•</span>
          <span><strong>{post.product}</strong></span>
          <span>•</span>
          <span>{post.category}</span>
          <span>•</span>
          <span>{post.year}</span>
          {(post.tags || []).slice(0, 3).map((tag) => (
            <span key={tag} className="hashtag">#{tag}</span>
          ))}
        </div>
        <div className="post-summary">{post.summary}</div>
        <div className="post-footer">
          <div className="post-actions">
            <span className="action-link">💬 Discuss</span>
            <span className="action-link">🧠 Lesson</span>
            <span className="action-link">🔗 Source</span>
            <span className="action-link">📌 Save</span>
          </div>
        </div>
      </div>
    </article>
  );
}

