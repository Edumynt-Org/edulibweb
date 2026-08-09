'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getAccessToken, clearTokens } from '../../actions/auth';
import { ClientTokenStorage } from '../../data/auth/ClientTokenStorage';
import { DirectusAuthRepository } from '../../data/directus/DirectusAuthRepository';

export function Navbar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    getAccessToken().then(token => {
      setIsAuthenticated(!!token);
    });
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handleLogout = async () => {
    const tokenStorage = new ClientTokenStorage();
    const authRepo = new DirectusAuthRepository('http://localhost:8056', tokenStorage);
    try {
      await authRepo.logout();
    } catch(e) {
      // ignore
    }
    await clearTokens();
    setIsAuthenticated(false);
    router.refresh();
  };

  return (
    <nav className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 shadow-sm border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Edumynt
        </Link>
        <form onSubmit={handleSearch} className="relative hidden md:block">
          <input 
            type="text" 
            placeholder="Search catalog..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-64 lg:w-80 px-4 py-2 rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </form>
      </div>
      <div className="flex items-center gap-4">
        {isAuthenticated ? (
          <button onClick={handleLogout} className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors">
            Logout
          </button>
        ) : (
          <>
            <Link href="/login" className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors">
              Log In
            </Link>
            <Link href="/register" className="text-sm font-medium px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
