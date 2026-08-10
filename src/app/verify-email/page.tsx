'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (hasAttempted.current) return;
    
    if (!token) {
      setStatus('error');
      setErrorMessage('Verification token is missing from the URL.');
      return;
    }

    hasAttempted.current = true;

    const verifyEmail = async () => {
      try {
        const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8056';
        
        const response = await fetch(`${directusUrl}/users/register/verify-email?token=${token}`, {
          method: 'GET',
        });

        if (response.ok) {
          setStatus('success');
        } else {
          const data = await response.json().catch(() => ({}));
          const errorMsg = data?.errors?.[0]?.message || 'Verification failed. The link may have expired.';
          setStatus('error');
          setErrorMessage(errorMsg);
        }
      } catch (err) {
        setStatus('error');
        setErrorMessage('A network error occurred while trying to verify your email.');
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-black p-4">
      <div className="w-full max-w-lg p-8 sm:p-10 space-y-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 text-center">
        
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <h2 className="text-xl font-medium text-gray-900 dark:text-white">Verifying your email...</h2>
            <p className="text-sm text-gray-500">Please wait while we confirm your registration.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mb-2">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Email Verified!</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Your account has been successfully verified. You can now sign in and start exploring Edumynt Library.
            </p>
            <Link 
              href="/login" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium p-3 rounded-lg transition-colors shadow-sm"
            >
              Go to Sign In
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-2">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Verification Failed</h2>
            <p className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 p-4 rounded-lg w-full text-sm">
              {errorMessage}
            </p>
            <Link 
              href="/register" 
              className="text-blue-600 hover:text-blue-500 font-medium hover:underline"
            >
              Sign up again
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-black p-4 flex items-center justify-center">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
