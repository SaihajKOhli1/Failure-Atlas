/**
 * API utility functions for fetching data from Next.js API routes
 * These routes proxy requests to the FastAPI backend
 */

const API_BASE = '/api';

export interface Post {
  id: number;
  votes: number;
  title: string;
  product: string;
  year: number;
  category: string;
  cause: string;
  severity: string;
  tags: string[];
  summary: string;
  created_at?: string;
}

export interface PostsResponse {
  items: Post[];
  total: number;
}

export interface CauseAnalytics {
  cause: string;
  count: number;
  percent: number;
}

export interface TopCausesResponse {
  items: CauseAnalytics[];
  total: number;
}

export interface PostIn {
  title: string;
  product: string;
  year: number;
  category: string;
  cause: string;
  severity: string;
  summary: string;
  tags?: string[];
}

/**
 * Get posts with optional filters
 */
export async function getPosts(params?: {
  q?: string;
  cause?: string;
  severity?: string;
  sort?: 'hot' | 'new' | 'top';
}): Promise<PostsResponse> {
  const searchParams = new URLSearchParams();
  
  if (params?.q) searchParams.append('q', params.q);
  if (params?.cause && params.cause !== 'all') searchParams.append('cause', params.cause);
  if (params?.severity && params.severity !== 'all') searchParams.append('severity', params.severity);
  if (params?.sort) searchParams.append('sort', params.sort);

  const queryString = searchParams.toString();
  const url = `${API_BASE}/posts${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create a new post
 */
export async function createPost(post: PostIn): Promise<Post> {
  const response = await fetch(`${API_BASE}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(post),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.detail || error.error || `Failed to create post: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get top causes analytics
 */
export async function getTopCauses(): Promise<TopCausesResponse> {
  const response = await fetch(`${API_BASE}/analytics/top-causes`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch analytics: ${response.statusText}`);
  }

  return response.json();
}

