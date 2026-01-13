/**
 * Repository and post detail API functions
 */

import type { Repo, RepoIn, ReposResponse, Post, PostsResponse, PostDetail } from './api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

async function ensureUserId(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }
  
  let userId = localStorage.getItem('fa_user_id');
  if (!userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/anon`, {
        method: 'POST',
        cache: 'no-store',
      });
      
      if (response.ok) {
        const data = await response.json();
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

async function handleErrorResponse(response: Response): Promise<never> {
  let errorMessage = response.statusText;
  
  try {
    const error = await response.json();
    if (typeof error === 'object' && error !== null) {
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
    errorMessage = response.statusText;
  }
  
  throw new Error(errorMessage);
}

/**
 * Get repositories for the current user
 */
export async function getRepos(): Promise<ReposResponse> {
  const userId = await ensureUserId();
  if (!userId) {
    throw new Error('User ID required');
  }
  
  const url = `${API_BASE_URL}/repos`;
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

/**
 * Create a new repository
 */
export async function createRepo(repo: RepoIn): Promise<Repo> {
  const userId = await ensureUserId();
  if (!userId) {
    throw new Error('User ID required');
  }
  
  const url = `${API_BASE_URL}/repos`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    },
    body: JSON.stringify(repo),
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  return response.json();
}

/**
 * Get entries for a repository
 */
export async function getRepoEntries(repoId: string, skip?: number, limit?: number): Promise<PostsResponse> {
  const userId = await ensureUserId();
  const searchParams = new URLSearchParams();
  if (skip !== undefined) searchParams.append('skip', skip.toString());
  if (limit !== undefined) searchParams.append('limit', limit.toString());
  
  const queryString = searchParams.toString();
  const url = `${API_BASE_URL}/repos/${repoId}/entries${queryString ? `?${queryString}` : ''}`;
  
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
 * Get a single post with full details including body
 */
export async function getPostDetail(postId: number): Promise<PostDetail> {
  const userId = await ensureUserId();
  const url = `${API_BASE_URL}/posts/${postId}`;
  
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

