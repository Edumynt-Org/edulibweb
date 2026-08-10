'use client';

import React from 'react';
import Link from 'next/link';
import { DirectusAuthRepository } from '../../data/directus/DirectusAuthRepository';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

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
      const authRepo = new DirectusAuthRepository(directusUrl, tokenStorage);
      await authRepo.requestPasswordReset(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-black p-4">
      <div className="w-full max-w-lg p-8 sm:p-10 space-y-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Forgot Password</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter your email and we'll send a reset link.
          </p>
        </div>
        
        {error && (
          <div className="text-red-600 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        {success ? (
          <div className="space-y-6 text-center">
            <div className="text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Check your email</h3>
              <p className="text-sm">If an account exists for {email}, a password reset link has been sent.</p>
            </div>
            <Link href="/login" className="block text-center text-blue-600 hover:text-blue-500 font-medium hover:underline">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-sm mx-auto">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border p-2.5 rounded-lg border-gray-300 dark:border-gray-700 dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium p-3 rounded-lg mt-2 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="text-center pt-2 border-t border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 text-sm">Remember your password? </span>
              <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500 font-medium hover:underline">
                Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
