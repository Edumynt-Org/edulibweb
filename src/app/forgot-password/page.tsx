'use client';

import React from 'react';
import Link from 'next/link';
import { DirectusAuthRepository } from '../../data/directus/DirectusAuthRepository';
import { useSyncConnector } from '../../lib/providers/LibraryProvider';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const syncConnector = useSyncConnector();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const tokenStorage = {
        getAccessToken: async () => null,
        getRefreshToken: async () => null,
        setTokens: async () => {},
        clearTokens: async () => {}
      };
      
      const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8056';
      const authRepo = new DirectusAuthRepository(directusUrl, tokenStorage, syncConnector);
      await authRepo.requestPasswordReset(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-zinc-900 rounded shadow-md">
        <h1 className="text-2xl font-bold text-center">Forgot Password</h1>
        
        {error && <div className="text-red-500 bg-red-100 p-2 rounded">{error}</div>}
        
        {success ? (
          <div className="space-y-4">
            <div className="text-green-600 bg-green-100 p-4 rounded text-center">
              If an account exists for {email}, a password reset link has been sent.
            </div>
            <Link href="/login" className="block text-center text-blue-600 hover:underline">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter your email address and we will send you a link to reset your password.
            </p>
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-2 border rounded bg-white dark:bg-zinc-800 border-gray-300 dark:border-gray-700"
                placeholder="Enter your email"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-800">
              <Link href="/login" className="text-sm text-blue-600 hover:underline">
                Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
