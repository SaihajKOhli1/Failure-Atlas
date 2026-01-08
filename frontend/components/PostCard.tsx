'use client';

import { useState } from 'react';
import type { Post } from '@/lib/api';
import { votePost, savePost, unsavePost } from '@/lib/api';

interface PostCardProps {
  post: Post;
  onUpdate?: (updatedPost: Post) => void;
  onPostClick?: (post: Post) => void;
}

export default function PostCard({ post, onUpdate, onPostClick }: PostCardProps) {
  const [optimisticVotes, setOptimisticVotes] = useState(post.votes);
  const [optimisticUserVote, setOptimisticUserVote] = useState(post.user_vote ?? 0);
  const [optimisticSaved, setOptimisticSaved] = useState(post.saved ?? false);
  const [isVoting, setIsVoting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleUpvote = async () => {
    // If user_vote===1 send value=0 else value=1
    const newValue = optimisticUserVote === 1 ? 0 : 1;
    
    // Optimistic update
    const voteDelta = newValue - optimisticUserVote;
    setOptimisticVotes(optimisticVotes + voteDelta);
    setOptimisticUserVote(newValue);
    setIsVoting(true);

    try {
      const result = await votePost(post.id, newValue);
      setOptimisticVotes(result.votes);
      setOptimisticUserVote(result.user_vote);
      
      if (onUpdate) {
        onUpdate({ ...post, votes: result.votes, user_vote: result.user_vote });
      }
    } catch (error) {
      // Revert optimistic update
      setOptimisticVotes(post.votes);
      setOptimisticUserVote(post.user_vote ?? 0);
      console.error('Failed to vote:', error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleDownvote = async () => {
    // If user_vote===-1 send value=0 else value=-1
    const newValue = optimisticUserVote === -1 ? 0 : -1;
    
    // Optimistic update
    const voteDelta = newValue - optimisticUserVote;
    setOptimisticVotes(optimisticVotes + voteDelta);
    setOptimisticUserVote(newValue);
    setIsVoting(true);

    try {
      const result = await votePost(post.id, newValue);
      setOptimisticVotes(result.votes);
      setOptimisticUserVote(result.user_vote);
      
      if (onUpdate) {
        onUpdate({ ...post, votes: result.votes, user_vote: result.user_vote });
      }
    } catch (error) {
      // Revert optimistic update
      setOptimisticVotes(post.votes);
      setOptimisticUserVote(post.user_vote ?? 0);
      console.error('Failed to vote:', error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleSave = async () => {
    const newSaved = !optimisticSaved;
    setOptimisticSaved(newSaved);
    setIsSaving(true);

    try {
      if (newSaved) {
        await savePost(post.id);
      } else {
        await unsavePost(post.id);
      }
      
      if (onUpdate) {
        onUpdate({ ...post, saved: newSaved });
      }
    } catch (error) {
      // Revert optimistic update
      setOptimisticSaved(post.saved ?? false);
      console.error('Failed to save/unsave:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <article className="post">
      <div className="vote-section">
        <button
          className={`vote-btn ${optimisticUserVote === 1 ? 'active' : ''}`}
          title="Upvote"
          onClick={handleUpvote}
          disabled={isVoting}
        >
          ▲
        </button>
        <div className="vote-score">{optimisticVotes.toLocaleString()}</div>
        <button
          className={`vote-btn down ${optimisticUserVote === -1 ? 'active' : ''}`}
          title="Downvote"
          onClick={handleDownvote}
          disabled={isVoting}
        >
          ▼
        </button>
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
            <span className="action-link" onClick={() => onPostClick?.(post)}>
              💬 Discuss {post.comment_count ? `(${post.comment_count})` : ''}
            </span>
            <span className="action-link">🧠 Lesson</span>
            <span className="action-link">🔗 Source</span>
            <span
              className={`action-link ${optimisticSaved ? 'active' : ''}`}
              onClick={handleSave}
              style={{ cursor: isSaving ? 'wait' : 'pointer' }}
            >
              📌 {optimisticSaved ? 'Saved' : 'Save'}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

