/**
 * Configuration for API endpoints
 * 
 * NEXT_PUBLIC_API_BASE_URL is used by Next.js API routes to proxy to the FastAPI backend.
 * Falls back to http://localhost:8000 if not set.
 */
export const BACKEND_URL = 
  process.env.NEXT_PUBLIC_API_BASE_URL || 
  process.env.BACKEND_URL || 
  'http://localhost:8000';

