'use client';

import { useEffect, useState } from 'react';
import type { Post, Comment } from '@/lib/api';
import { fetchComments, addComment } from '@/lib/api';

interface PostDetailModalProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  onPostUpdate?: (updatedPost: Post) => void;
}

export default function PostDetailModal({ post, isOpen, onClose, onPostUpdate }: PostDetailModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && post) {
      loadComments();
    } else {
      setComments([]);
      setCommentText('');
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, post]);

  const loadComments = async () => {
    if (!post) return;
    
    setIsLoadingComments(true);
    setError(null);
    try {
      const fetchedComments = await fetchComments(post.id);
      setComments(fetchedComments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
      console.error('Error loading comments:', err);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !commentText.trim()) return;

    setIsSubmittingComment(true);
    setError(null);
    try {
      // POST comment
      await addComment(post.id, commentText.trim());
      setCommentText('');
      
      // Refetch comments and update comment count
      await loadComments();
      
      // Update comment count on post
      if (onPostUpdate) {
        onPostUpdate({
          ...post,
          comment_count: (post.comment_count || 0) + 1,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
      console.error('Error adding comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (!isOpen || !post) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{post.title}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <div className="post-meta" style={{ marginBottom: '12px' }}>
              <span className="badge badge-cause">🏷 {post.cause}</span>
              <span className={`badge badge-severity ${post.severity}`}>{post.severity.toUpperCase()}</span>
              <span>•</span>
              <span><strong>{post.product}</strong></span>
              <span>•</span>
              <span>{post.category}</span>
              <span>•</span>
              <span>{post.year}</span>
            </div>
            <div className="post-summary" style={{ marginBottom: '16px' }}>
              {post.summary}
            </div>
            {(post.tags || []).length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                {(post.tags || []).map((tag) => (
                  <span key={tag} className="hashtag" style={{ marginRight: '8px' }}>#{tag}</span>
                ))}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 700 }}>Comments ({comments.length})</h3>
            
            {error && (
              <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(234, 67, 53, 0.1)', border: '1px solid rgba(234, 67, 53, 0.3)', borderRadius: '8px', color: 'var(--danger)', fontSize: '13px' }}>
                {error}
              </div>
            )}

            {isLoadingComments ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>Loading comments…</div>
            ) : comments.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>No comments yet. Be the first to comment!</div>
            ) : (
              <div style={{ marginBottom: '24px' }}>
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      padding: '12px',
                      marginBottom: '12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>
                      {formatDate(comment.created_at)}
                    </div>
                    <div style={{ fontSize: '14px', lineHeight: '1.6' }}>{comment.content}</div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmitComment}>
              <div className="form-group">
                <label>Add a comment</label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write your comment here..."
                  rows={3}
                  maxLength={2000}
                  required
                />
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                  {commentText.length}/2000
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn" onClick={onClose} disabled={isSubmittingComment}>
                  Close
                </button>
                <button type="submit" className="btn primary" disabled={isSubmittingComment || !commentText.trim()}>
                  {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

