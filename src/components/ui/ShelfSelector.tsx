'use client';
import { useState, useEffect } from 'react';
import { useLibrary } from '../../lib/providers/LibraryProvider';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '../../actions/auth';
import { UserShelf } from '../../domain/models/UserShelf';

export function ShelfSelector({ bookId }: { bookId: string }) {
  const library = useLibrary();
  const router = useRouter();
  
  const [shelves, setShelves] = useState<UserShelf[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingShelfId, setPendingShelfId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    getAccessToken().then(token => {
      const isAuth = !!token;
      setIsAuthenticated(isAuth);
      if (isAuth) {
        library.getUserShelves().then(setShelves).catch(console.error);
        const savedShelf = localStorage.getItem(`pending_shelf_${bookId}`);
        if (savedShelf) {
          localStorage.removeItem(`pending_shelf_${bookId}`);
          executeShelfUpdate(savedShelf);
        }
      }
    });
  }, [bookId, library]);

  const handleShelfSelect = async (shelfId: string) => {
    if (!shelfId) return;
    
    if (!isAuthenticated) {
      setPendingShelfId(shelfId);
      setShowAuthModal(true);
      return;
    }
    
    await executeShelfUpdate(shelfId);
  };

  const executeShelfUpdate = async (shelfId: string) => {
    setIsUpdating(true);
    try {
      await library.addBookToShelf(shelfId, bookId);
      alert('Book added to shelf successfully.');
    } catch (e) {
      console.error(e);
      alert('Failed to add book to shelf.');
    } finally {
      setIsUpdating(false);
      // Reset select back to default
      const select = document.getElementById(`shelf-select-${bookId}`) as HTMLSelectElement;
      if (select) select.value = '';
    }
  };

  if (!isAuthenticated && shelves.length === 0) {
    // Just show a dummy add to shelf that triggers auth
    return (
      <div className="relative inline-block w-full sm:w-auto mt-4 sm:mt-0">
        <button onClick={() => setShowAuthModal(true)} className="px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm font-medium w-full hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
          Add to Custom Shelf
        </button>

        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-zinc-200 dark:border-zinc-800 text-center">
              <h3 className="text-xl font-bold mb-4 dark:text-white">Sign in to save to shelves</h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">Create an account or sign in to build your custom collection.</p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
                  }}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Sign In / Register
                </button>
                <button 
                  onClick={() => setShowAuthModal(false)} 
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

  if (shelves.length === 0) return null;

  return (
    <div className="relative inline-block w-full sm:w-auto mt-4 sm:mt-0">
      <select 
        id={`shelf-select-${bookId}`}
        defaultValue="" 
        onChange={(e) => handleShelfSelect(e.target.value)}
        disabled={isUpdating}
        className="px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm font-medium w-full transition-colors focus:ring-2 focus:ring-blue-500 outline-none"
      >
        <option value="" disabled>Add to Custom Shelf...</option>
        {shelves.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-zinc-200 dark:border-zinc-800 text-center">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Sign in to save to shelves</h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">Create an account or sign in to build your custom collection.</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined' && pendingShelfId) {
                    localStorage.setItem(`pending_shelf_${bookId}`, pendingShelfId);
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
                  setPendingShelfId(null);
                  const select = document.getElementById(`shelf-select-${bookId}`) as HTMLSelectElement;
                  if (select) select.value = '';
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
