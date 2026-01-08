import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters from the request
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const url = `${BACKEND_URL}/posts${queryString ? `?${queryString}` : ''}`;

    // Forward the request to the backend
    const response = await fetch(url, {
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
    console.error('Error proxying GET /posts:', error);
    
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
      { error: 'Failed to fetch posts', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();

    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward relevant headers
        ...(request.headers.get('accept') && { Accept: request.headers.get('accept')! }),
      },
      body: JSON.stringify(body),
    });

    // Get the response data
    const data = await response.json();

    // Return the backend response with the same status code
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error proxying POST /posts:', error);
    
    // Handle JSON parsing errors from request body
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request body', detail: error.message },
        { status: 400 }
      );
    }
    
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
      { error: 'Failed to create post', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

