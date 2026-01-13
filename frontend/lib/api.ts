/**
 * API utility functions for calling FastAPI backend directly
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

/**
 * Get user ID from localStorage or create one via API
 * Returns null if running during SSR
 */
async function ensureUserId(): Promise<string | null> {
  // Skip during SSR
  if (typeof window === 'undefined') {
    return null;
  }
  
  let userId = localStorage.getItem('fa_user_id');
  if (!userId) {
    // Create anonymous user via API
    try {
      const response = await fetch(`${API_BASE_URL}/auth/anon`, {
        method: 'POST',
        cache: 'no-store',
      });
      
      if (response.ok) {
        const data: AuthResponse = await response.json();
        userId = data.user_id;
        localStorage.setItem('fa_user_id', userId);
      }
    } catch (error) {
      console.error('Failed to create anonymous user:', error);
      return null;
    }
  }
  return userId;
}

/**
 * Get user ID from localStorage (synchronous, may return null)
 * Returns null if running during SSR or if not set
 */
function getUserId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('fa_user_id');
}

// Helper function to parse error response and throw a nice error
async function handleErrorResponse(response: Response): Promise<never> {
  let errorMessage = response.statusText;
  
  try {
    const error = await response.json();
    if (typeof error === 'object' && error !== null) {
      // Extract detail field first (common in FastAPI), then message, then stringify
      if (error.detail) {
        errorMessage = String(error.detail);
      } else if (error.message) {
        errorMessage = String(error.message);
      } else {
        errorMessage = JSON.stringify(error);
      }
    } else {
      errorMessage = String(error);
    }
  } catch {
    // If JSON parsing fails, use statusText
    errorMessage = response.statusText;
  }
  
  throw new Error(errorMessage);
}

/**
 * Ensure anonymous user exists (creates if needed)
 * Client-side only
 */
export async function ensureAnonUser(): Promise<string> {
  const userId = await ensureUserId();
  if (!userId) {
    throw new Error('Failed to get or create user ID');
  }
  return userId;
}

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
  user_vote?: number; // -1, 0, or 1
  saved?: boolean;
  comment_count?: number;
}

export interface PostDetail {
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
  body?: string | null;
  status?: string | null;
  created_at?: string;
  user_vote?: number;
  saved?: boolean;
  comment_count?: number;
}

export interface Repo {
  id: string;
  owner_id: string;
  name: string;
  visibility: string;
  created_at: string;
  updated_at: string;
}

export interface ReposResponse {
  items: Repo[];
  total: number;
}

export interface RepoIn {
  name: string;
  visibility?: string;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: string;
  content: string;
  created_at: string;
}

export interface AuthResponse {
  user_id: string;
}

export interface VoteResponse {
  post_id: number;
  votes: number;
  user_vote: number;
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
  const url = `${API_BASE_URL}/posts${queryString ? `?${queryString}` : ''}`;
  const userId = getUserId();

  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      ...(userId && { 'X-User-Id': userId }),
    },
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  return response.json();
}

/**
 * Create a new post
 */
export async function createPost(post: PostIn): Promise<Post> {
  const userId = getUserId();
  const url = `${API_BASE_URL}/posts`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId && { 'X-User-Id': userId }),
    },
    body: JSON.stringify(post),
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  return response.json();
}

/**
 * Get top causes analytics
 */
export async function getTopCauses(): Promise<TopCausesResponse> {
  const userId = getUserId();
  const url = `${API_BASE_URL}/analytics/top-causes`;
  
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      ...(userId && { 'X-User-Id': userId }),
    },
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  return response.json();
}

/**
 * Vote on a post
 * Sends POST /posts/${postId}/vote with body { value: number }
 * Calls FastAPI backend directly (bypasses Next.js proxy)
 */
export async function votePost(postId: number, value: -1 | 0 | 1): Promise<VoteResponse> {
  const userId = getUserId();
  const url = `${API_BASE_URL}/posts/${postId}/vote`;
  const body = JSON.stringify({ value });
  
  // Log final URL + payload before fetch
  console.log('VOTE API CALL', { url, postId, value, userId, body });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId && { 'X-User-Id': userId }),
    },
    body,
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  return response.json();
}

/**
 * Get comments for a post
 */
export async function fetchComments(postId: number): Promise<Comment[]> {
  const userId = getUserId();
  const url = `${API_BASE_URL}/posts/${postId}/comments`;
  
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      ...(userId && { 'X-User-Id': userId }),
    },
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Add a comment to a post
 * Calls FastAPI backend directly (bypasses Next.js proxy)
 */
export async function addComment(postId: number, content: string): Promise<Comment> {
  // Get or generate user ID using the same logic as votes
  const userId = localStorage.getItem('fa_user_id') || (() => {
    const id = crypto.randomUUID();
    localStorage.setItem('fa_user_id', id);
    return id;
  })();
  
  const url = `${API_BASE_URL}/posts/${postId}/comments`;
  const body = JSON.stringify({ content });
  
  // Log submission details
  console.log('Submitting comment to:', url);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    },
    body,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    console.error('Comment failed:', response.status, error);
    await handleErrorResponse(response);
  }

  return response.json();
}

/**
 * Save a post
 */
export async function savePost(postId: number): Promise<void> {
  const userId = getUserId();
  const url = `${API_BASE_URL}/posts/${postId}/save`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId && { 'X-User-Id': userId }),
    },
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }
}

/**
 * Unsave a post
 */
export async function unsavePost(postId: number): Promise<void> {
  const userId = getUserId();
  const url = `${API_BASE_URL}/posts/${postId}/save`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(userId && { 'X-User-Id': userId }),
    },
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }
}

/**
 * Fetch saved posts
 */
export async function fetchSaved(): Promise<PostsResponse> {
  const userId = getUserId();
  const url = `${API_BASE_URL}/me/saved`;
  
  if (!userId) {
    throw new Error('User ID required to fetch saved posts');
  }
  
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      'X-User-Id': userId,
    },
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  return response.json();
}


// Export repo and detail functions
export * from './api-repos';
