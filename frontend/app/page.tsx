'use client';

import { useEffect, useState } from 'react';
import { getPosts, getTopCauses, createPost, type Post, type CauseAnalytics, type PostIn } from '@/lib/api';

type SortOption = 'hot' | 'new' | 'top';
type CauseOption = 'all' | 'pricing' | 'ux' | 'infra' | 'trust' | 'timing' | 'distribution' | 'strategy';
type SeverityOption = 'all' | 'low' | 'med' | 'high';

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [analytics, setAnalytics] = useState<CauseAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [sort, setSort] = useState<SortOption>('hot');
  const [cause, setCause] = useState<CauseOption>('all');
  const [severity, setSeverity] = useState<SeverityOption>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState<PostIn>({
    title: '',
    product: '',
    year: new Date().getFullYear(),
    category: '',
    cause: '',
    severity: 'med',
    summary: '',
  });

  // Debounce search query with 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch posts when any filter changes
  useEffect(() => {
    const fetchPostsData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getPosts({
          q: debouncedQuery || undefined,
          sort,
          cause: cause !== 'all' ? cause : undefined,
          severity: severity !== 'all' ? severity : undefined,
        });
        setPosts(response.items);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch posts';
        console.error('[Failure Atlas] Error fetching posts:', err);
        setError(errorMessage);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPostsData();
  }, [debouncedQuery, sort, cause, severity]);

  // Refetch function for analytics
  const fetchAnalyticsData = async () => {
    try {
      const response = await getTopCauses();
      setAnalytics(response.items);
    } catch (err) {
      console.error('[Failure Atlas] Error fetching analytics:', err);
    }
  };

  // Fetch analytics on mount
  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  // Handle modal form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validate required fields
    if (!formData.title.trim() || !formData.product.trim() || !formData.category.trim() || 
        !formData.cause.trim() || !formData.summary.trim() || !formData.year) {
      setSubmitError('All fields are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await createPost({
        ...formData,
        cause: formData.cause.toLowerCase(),
      });

      // Success: close modal, clear form
      setIsModalOpen(false);
      setFormData({
        title: '',
        product: '',
        year: new Date().getFullYear(),
        category: '',
        cause: '',
        severity: 'med',
        summary: '',
      });
      setSubmitError(null);
      
      // Refetch posts and analytics
      try {
        const [postsResponse] = await Promise.all([
          getPosts({
            q: debouncedQuery || undefined,
            sort,
            cause: cause !== 'all' ? cause : undefined,
            severity: severity !== 'all' ? severity : undefined,
          }),
          fetchAnalyticsData(),
        ]);
        setPosts(postsResponse.items);
      } catch (err) {
        console.error('[Failure Atlas] Error refetching data after post creation:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch posts';
        setError(errorMessage);
      }
    } catch (err) {
      console.error('[Failure Atlas] Error creating post:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({
      title: '',
      product: '',
      year: new Date().getFullYear(),
      category: '',
      cause: '',
      severity: 'med',
      summary: '',
    });
    setSubmitError(null);
  };

  const formatCauseLabel = (cause: string) => {
    const mappings: Record<string, string> = {
      distribution: 'Distribution',
      trust: 'Trust & Privacy',
      infra: 'Infrastructure',
      pricing: 'Pricing',
      ux: 'UX',
      timing: 'Timing',
      strategy: 'Strategy',
    };
    return mappings[cause] || cause.charAt(0).toUpperCase() + cause.slice(1);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'med':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              Failure Atlas
            </h1>
            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              ➕ New Failure
            </button>
          </div>

          {/* Filters */}
          <div className="mb-6 space-y-4">
            {/* Search Input */}
            <div>
              <input
                type="text"
                placeholder="Search failures, causes, products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-400"
              />
            </div>

            {/* Sort, Cause, Severity Filters */}
            <div className="flex flex-wrap gap-4">
              <div>
                <label htmlFor="sort" className="sr-only">Sort by</label>
                <select
                  id="sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                  disabled={loading}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value="hot">🔥 Hot</option>
                  <option value="new">🆕 New</option>
                  <option value="top">🏆 Top</option>
                </select>
              </div>

              <div>
                <label htmlFor="cause" className="sr-only">Filter by cause</label>
                <select
                  id="cause"
                  value={cause}
                  onChange={(e) => setCause(e.target.value as CauseOption)}
                  disabled={loading}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value="all">All Causes</option>
                  <option value="pricing">Pricing</option>
                  <option value="ux">UX</option>
                  <option value="infra">Infrastructure</option>
                  <option value="trust">Trust</option>
                  <option value="timing">Timing</option>
                  <option value="distribution">Distribution</option>
                  <option value="strategy">Strategy</option>
                </select>
              </div>

              <div>
                <label htmlFor="severity" className="sr-only">Filter by severity</label>
                <select
                  id="severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as SeverityOption)}
                  disabled={loading}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value="all">All Severities</option>
                  <option value="low">Low</option>
                  <option value="med">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>

          {/* Top Causes KPI Chips */}
          {analytics.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {analytics.map((item) => (
                <div
                  key={item.cause}
                  className="rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  {formatCauseLabel(item.cause)}: {item.percent}%
                </div>
              ))}
            </div>
          )}
        </header>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 dark:bg-red-900 dark:border-red-700 dark:text-red-200">
            <p className="font-medium">Error: {error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Loading failures…
          </div>
        )}

        {/* Posts List */}
        {!loading && !error && (
          <div className="space-y-6">
            {posts.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No failures match your filters.
              </div>
            ) : (
              posts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                      <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {post.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">{post.product}</span>
                        <span>•</span>
                        <span>{post.category}</span>
                        <span>•</span>
                        <span>{post.year}</span>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {post.votes}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        votes
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="rounded px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {formatCauseLabel(post.cause)}
                    </span>
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${getSeverityColor(post.severity)}`}
                    >
                      {post.severity.toUpperCase()}
                    </span>
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {post.summary}
                  </p>
                </article>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                New Failure Post
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="title" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Title *
                  </label>
                  <input
                    id="title"
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    placeholder="e.g., Google Glass: privacy + unclear value"
                  />
                </div>
                <div>
                  <label htmlFor="product" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Product / Company *
                  </label>
                  <input
                    id="product"
                    type="text"
                    required
                    value={formData.product}
                    onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    placeholder="e.g., Google Glass"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="year" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Year *
                  </label>
                  <input
                    id="year"
                    type="number"
                    required
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    placeholder="e.g., 2013"
                  />
                </div>
                <div>
                  <label htmlFor="category" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category *
                  </label>
                  <input
                    id="category"
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    placeholder="e.g., consumer hardware"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cause" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Root Cause *
                  </label>
                  <input
                    id="cause"
                    type="text"
                    required
                    value={formData.cause}
                    onChange={(e) => setFormData({ ...formData, cause: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    placeholder="e.g., trust, pricing, timing"
                  />
                </div>
                <div>
                  <label htmlFor="severity" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Severity *
                  </label>
                  <select
                    id="severity"
                    required
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  >
                    <option value="low">Low</option>
                    <option value="med">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="summary" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Summary *
                </label>
                <textarea
                  id="summary"
                  required
                  rows={4}
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="What happened + impact + what you'd do differently…"
                />
              </div>

              {submitError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 dark:bg-red-900 dark:border-red-700 dark:text-red-200">
                  {submitError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
