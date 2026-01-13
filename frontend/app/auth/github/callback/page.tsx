'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

export default function GitHubCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  useEffect(() => {
    if (code) {
      // Redirect to backend callback endpoint
      // Backend will handle the OAuth exchange and set the cookie
      window.location.href = `${backendUrl}/auth/github/callback?code=${code}`;
    } else {
      // No code parameter, redirect to home
      router.push('/');
    }
  }, [code, router]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <p style={{ color: 'var(--text-secondary)' }}>Completing sign-in...</p>
    </div>
  );
}

