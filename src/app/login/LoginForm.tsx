'use client';

import { useState } from 'react';
import { DirectusAuthRepository } from '../../data/directus/DirectusAuthRepository';
import { ClientTokenStorage } from '../../data/auth/ClientTokenStorage';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSyncConnector } from '../../lib/providers/LibraryProvider';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const syncConnector = useSyncConnector();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Setup the auth repository with token storage
      const tokenStorage = new ClientTokenStorage();
      const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8056';
      const authRepo = new DirectusAuthRepository(directusUrl, tokenStorage, syncConnector);
      
      await authRepo.login(email, password);
      const redirect = searchParams.get('redirect');
      if (redirect) {
        router.push(redirect);
      } else {
        router.push('/');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-sm mx-auto">
      <div className="text-center mb-2">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome Back</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Sign in to your account to continue.</p>
      </div>
      
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
        <input 
          id="email"
          type="email" 
          value={email} 
          onChange={e => setEmail(e.target.value)}
          required 
          className="border p-2.5 rounded-lg border-gray-300 dark:border-gray-700 dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
          <a href="/forgot-password" className="text-xs text-blue-600 hover:text-blue-500 font-medium hover:underline">Forgot Password?</a>
        </div>
        <input 
          id="password"
          type="password" 
          value={password} 
          onChange={e => setPassword(e.target.value)}
          required 
          className="border p-2.5 rounded-lg border-gray-300 dark:border-gray-700 dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          placeholder="••••••••"
        />
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium p-3 rounded-lg mt-2 transition-colors shadow-sm disabled:opacity-50"
      >
        {loading ? 'Logging in...' : 'Sign In'}
      </button>

      <div className="text-center pt-2">
        <span className="text-gray-500 text-sm">Don't have an account? </span>
        <a href="/register" className="text-sm text-blue-600 hover:text-blue-500 font-medium hover:underline">
          Create one
        </a>
      </div>

      <div className="text-center pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
        <a href="/" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          Skip for now
        </a>
      </div>
    </form>
  );
}
