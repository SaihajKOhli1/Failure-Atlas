'use client';

import { useState } from 'react';
import type { PostIn } from '@/lib/api';

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (post: PostIn) => Promise<void>;
}

export default function NewPostModal({ isOpen, onClose, onSubmit }: NewPostModalProps) {
  const [formData, setFormData] = useState<PostIn>({
    title: '',
    product: '',
    year: new Date().getFullYear(),
    category: '',
    cause: '',
    severity: 'med',
    summary: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim() || !formData.product.trim() || !formData.category.trim() ||
        !formData.cause.trim() || !formData.summary.trim() || !formData.year) {
      setError('All fields are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({
        title: '',
        product: '',
        year: new Date().getFullYear(),
        category: '',
        cause: '',
        severity: 'med',
        summary: '',
      });
      setError(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      product: '',
      year: new Date().getFullYear(),
      category: '',
      cause: '',
      severity: 'med',
      summary: '',
    });
    setError(null);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Failure Post</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Google Glass: privacy + unclear value"
                  required
                />
              </div>
              <div className="form-group">
                <label>Product / Company</label>
                <input
                  type="text"
                  value={formData.product}
                  onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                  placeholder="e.g., Google Glass"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Year</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                  placeholder="e.g., 2013"
                  required
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., consumer hardware, fintech"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Root Cause</label>
                <input
                  type="text"
                  value={formData.cause}
                  onChange={(e) => setFormData({ ...formData, cause: e.target.value })}
                  placeholder="e.g., trust/privacy, pricing, timing, infra"
                  required
                />
              </div>
              <div className="form-group">
                <label>Severity</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  required
                >
                  <option value="low">Low</option>
                  <option value="med">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Summary</label>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="What happened + impact + what you'd do differently…"
                required
              />
            </div>
            {error && (
              <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(234, 67, 53, 0.1)', border: '1px solid rgba(234, 67, 53, 0.3)', borderRadius: '8px', color: 'var(--danger)', fontSize: '13px' }}>
                {error}
              </div>
            )}
            <div className="modal-footer">
              <button type="button" className="btn" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="btn primary" disabled={isSubmitting}>
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

