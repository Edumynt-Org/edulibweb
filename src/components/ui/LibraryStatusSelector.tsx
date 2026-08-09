'use client';
import { useState, useEffect } from 'react';
import { useLibrary } from '../../lib/providers/LibraryProvider';
import { useRouter } from 'next/navigation';

import { getAccessToken } from '../../actions/auth';

export function LibraryStatusSelector({ bookId }: { bookId: string }) {
  const library = useLibrary();
  const router = useRouter();
  const [status, setStatus] = useState<string>(''); 
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const statuses = [
    { value: 'want_to_read', label: 'Want to Read' },
    { value: 'reading', label: 'Reading' },
    { value: 'completed', label: 'Completed' },
    { value: 'paused', label: 'Paused' },
    { value: 'dropped', label: 'Dropped' }
  ];

  useEffect(() => {
    getAccessToken().then(token => {
      const isAuth = !!token;
      setIsAuthenticated(isAuth);
      if (isAuth) {
        const savedStatus = localStorage.getItem(`pending_status_${bookId}`);
        if (savedStatus) {
          localStorage.removeItem(`pending_status_${bookId}`);
          executeStatusUpdate(savedStatus);
        }
      }
    });
  }, [bookId]);

  const handleStatusSelect = async (newStatus: string) => {
    if (!isAuthenticated) {
      setPendingStatus(newStatus);
      setShowAuthModal(true);
      // Reset select back to previous visually
      setStatus(status); 
      return;
    }
    
    await executeStatusUpdate(newStatus);
  };

  const executeStatusUpdate = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await library.updateBookStatus(bookId, newStatus);
      setStatus(newStatus);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative inline-block w-full sm:w-auto mt-4 sm:mt-0">
      <select 
        value={status} 
        onChange={(e) => handleStatusSelect(e.target.value)}
        disabled={isUpdating}
        className="px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm font-medium w-full transition-colors focus:ring-2 focus:ring-blue-500 outline-none"
      >
        <option value="" disabled>Add to Library...</option>
        {statuses.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-zinc-200 dark:border-zinc-800 text-center">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Sign in to save your library</h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">Create an account or sign in to sync your reading status across all devices.</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined' && pendingStatus) {
                    localStorage.setItem(`pending_status_${bookId}`, pendingStatus);
                    router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
                  } else {
                    router.push('/login');
                  }
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Sign In / Register
              </button>
              <button 
                onClick={() => {
                  setShowAuthModal(false);
                  setPendingStatus(null);
                }} 
                className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg font-medium transition-colors dark:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
