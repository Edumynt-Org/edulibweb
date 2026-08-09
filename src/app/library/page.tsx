'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getAccessToken } from '../../actions/auth';
import { CustomShelvesList } from '../../components/ui/CustomShelvesList';

export default function LibraryPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    getAccessToken().then(token => {
      setIsAuthenticated(!!token);
    });
  }, []);

  // In future epics this will show tracked books, reading progress, etc.
  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-8">My Library</h1>
      
      {isAuthenticated === false && (
        <div className="py-16 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl mb-8">
          <svg className="mx-auto h-16 w-16 text-zinc-300 dark:text-zinc-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <p className="text-zinc-500 text-lg font-medium">Your personal library</p>
          <p className="text-zinc-400 mt-2 max-w-sm mx-auto">
            Sign in to track your reading progress, save bookmarks, and build your personal collection.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/login" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              Log In
            </Link>
            <Link href="/register" className="px-5 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-sm font-medium">
              Sign Up
            </Link>
          </div>
        </div>
      )}

      <CustomShelvesList />
    </div>
  );
}
