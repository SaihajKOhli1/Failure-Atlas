'use client';

import { useEffect, useState } from 'react';
import { ensureAnonUser, getPosts, getTopCauses, createPost, fetchSaved, type Post, type CauseAnalytics, type PostIn } from '@/lib/api';
import Topbar from '@/components/Topbar';
import LeftSidebar from '@/components/LeftSidebar';
import Feed from '@/components/Feed';
import AnalyticsSidebar from '@/components/AnalyticsSidebar';
import NewPostModal from '@/components/NewPostModal';
import PostDetailModal from '@/components/PostDetailModal';
import Toast from '@/components/Toast';

type SortOption = 'hot' | 'new' | 'top';
type CauseOption = 'all' | 'pricing' | 'ux' | 'infra' | 'trust' | 'timing' | 'distribution' | 'strategy';
type SeverityOption = 'all' | 'low' | 'med' | 'high';

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [analytics, setAnalytics] = useState<CauseAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Filter state
  const [sort, setSort] = useState<SortOption>('hot');
  const [cause, setCause] = useState<CauseOption>('all');
  const [severity, setSeverity] = useState<SeverityOption>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [view, setView] = useState<'feed' | 'saved'>('feed');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Debounce search query with 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch posts when any filter changes or view changes
  useEffect(() => {
    const fetchPostsData = async () => {
      setLoading(true);
      setError(null);
      try {
        let response;
        if (view === 'saved') {
          response = await fetchSaved();
        } else {
          response = await getPosts({
            q: debouncedQuery || undefined,
            sort,
            cause: cause !== 'all' ? cause : undefined,
            severity: severity !== 'all' ? severity : undefined,
          });
        }
        setPosts(response.items);
        setTotal(response.total);
        // Refetch analytics when posts are successfully fetched (only for feed view)
        if (view === 'feed') {
          try {
            const analyticsResponse = await getTopCauses();
            setAnalytics(analyticsResponse.items);
          } catch (analyticsErr) {
            console.error('[Failure Atlas] Error fetching analytics after posts update:', analyticsErr);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch posts';
        console.error('[Failure Atlas] Error fetching posts:', errorMessage, err);
        setError(errorMessage);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPostsData();
  }, [debouncedQuery, sort, cause, severity, view]);

  // Refetch function for analytics
  const fetchAnalyticsData = async () => {
    try {
      const response = await getTopCauses();
      setAnalytics(response.items);
    } catch (err) {
      console.error('[Failure Atlas] Error fetching analytics:', err instanceof Error ? err.message : 'Unknown error', err);
    }
  };

  // Ensure anonymous user on mount
  useEffect(() => {
    const initUser = async () => {
      try {
        await ensureAnonUser();
      } catch (err) {
        console.error('[Failure Atlas] Error initializing user:', err);
      }
    };
    initUser();
  }, []);

  // Fetch analytics on mount
  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // Focus search input (handled by Topbar)
      }
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Handle modal form submission
  const handlePostSubmit = async (postData: PostIn) => {
    try {
      // Submit the post to backend
      await createPost({
        ...postData,
        cause: postData.cause.toLowerCase(),
      });

      // On success: close modal, show toast, and refetch data
      setIsModalOpen(false);
      setToastMessage('Posted ✓');
      
      // Refetch posts and analytics
      try {
        const [postsResponse, analyticsResponse] = await Promise.all([
          getPosts({
            q: debouncedQuery || undefined,
            sort,
            cause: cause !== 'all' ? cause : undefined,
            severity: severity !== 'all' ? severity : undefined,
          }),
          getTopCauses(),
        ]);
        setPosts(postsResponse.items);
        setTotal(postsResponse.total);
        setAnalytics(analyticsResponse.items);
      } catch (refetchErr) {
        console.error('[Failure Atlas] Error refetching data after post creation:', refetchErr instanceof Error ? refetchErr.message : 'Unknown error', refetchErr);
        const errorMessage = refetchErr instanceof Error ? refetchErr.message : 'Failed to fetch updated posts';
        setError(errorMessage);
      }
    } catch (err) {
      // Re-throw error so modal can display it
      const errorMessage = err instanceof Error ? err.message : 'Failed to create post';
      console.error('[Failure Atlas] Error creating post:', errorMessage, err);
      throw new Error(errorMessage);
    }
  };

  return (
    <>
      <Topbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewPostClick={() => setIsModalOpen(true)}
        onSavedClick={() => setView('saved')}
        loading={loading}
      />
      <div className="container">
        <div className="layout">
          <LeftSidebar
            activeCause={cause}
            onCauseChange={setCause}
            activeView={view}
            onViewChange={setView}
            loading={loading}
          />
          <Feed
            posts={posts}
            total={total}
            sort={sort}
            severity={severity}
            onSortChange={setSort}
            onSeverityChange={setSeverity}
            loading={loading}
            showFilters={view === 'feed'}
            onPostUpdate={(updatedPost) => {
              setPosts(posts.map(p => p.id === updatedPost.id ? updatedPost : p));
              if (selectedPost?.id === updatedPost.id) {
                setSelectedPost(updatedPost);
              }
            }}
            onPostClick={(post) => {
              setSelectedPost(post);
              setIsDetailModalOpen(true);
            }}
          />
          <AnalyticsSidebar
            analytics={analytics}
            onNewPostClick={() => setIsModalOpen(true)}
          />
        </div>
      </div>

      <NewPostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handlePostSubmit}
      />

      <PostDetailModal
        post={selectedPost}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedPost(null);
        }}
        onPostUpdate={(updatedPost) => {
          setPosts(posts.map(p => p.id === updatedPost.id ? updatedPost : p));
          setSelectedPost(updatedPost);
        }}
      />

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </>
  );
}
