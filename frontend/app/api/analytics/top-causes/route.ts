import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/analytics/top-causes`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward relevant headers
        ...(request.headers.get('accept') && { Accept: request.headers.get('accept')! }),
      },
    });

    // Get the response data
    const data = await response.json();

    // Return the backend response with the same status code
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error proxying GET /analytics/top-causes:', error);
    
    // Check if backend is down (network errors)
    if (error instanceof TypeError && (
      error.message.includes('fetch failed') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND')
    )) {
      return NextResponse.json(
        { error: 'Backend unavailable' },
        { status: 502 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch analytics', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

