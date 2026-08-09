'use client';
import { useState, useEffect } from 'react';
import { useLibrary } from '../../lib/providers/LibraryProvider';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '../../actions/auth';
import { UserShelf } from '../../domain/models/UserShelf';

export function CustomShelvesList() {
  const library = useLibrary();
  const router = useRouter();
  
  const [shelves, setShelves] = useState<UserShelf[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<boolean>(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);

  useEffect(() => {
    getAccessToken().then(token => {
      const isAuth = !!token;
      setIsAuthenticated(isAuth);
      if (isAuth) {
        loadShelves();
        const pending = localStorage.getItem('pending_create_shelf');
        if (pending) {
          localStorage.removeItem('pending_create_shelf');
          setShowCreateModal(true);
        }
      }
    });
  }, []);

  const loadShelves = async () => {
    try {
      const data = await library.getUserShelves();
      setShelves(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      setPendingAction(true);
      setShowAuthModal(true);
      return;
    }
    setShowCreateModal(true);
  };

  const handleCreateShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await library.createCustomShelf(name, isPrivate, description);
      setShowCreateModal(false);
      setName('');
      setDescription('');
      setIsPrivate(true);
      loadShelves();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="mt-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Custom Shelves</h2>
        <button 
          onClick={handleCreateClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Create Shelf
        </button>
      </div>

      {shelves.length === 0 && isAuthenticated ? (
        <div className="py-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
          <p className="text-zinc-500 font-medium">You don't have any custom shelves yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {shelves.map(shelf => (
            <div key={shelf.id} className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 cursor-pointer hover:border-blue-500 transition-colors" onClick={() => router.push(`/library/shelves/${shelf.slug}`)}>
              <h3 className="font-semibold text-lg dark:text-white flex items-center justify-between">
                {shelf.name}
                {shelf.isPrivate && (
                  <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </h3>
              <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{shelf.description || 'No description'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Create Shelf Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Create New Shelf</h3>
            <form onSubmit={handleCreateShelf} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description (optional)</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800 outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="isPrivate" 
                  checked={isPrivate} 
                  onChange={e => setIsPrivate(e.target.checked)} 
                  className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isPrivate" className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">
                  Private (Only you can see this shelf)
                </label>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal Interception */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-zinc-200 dark:border-zinc-800 text-center">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Sign in to curate shelves</h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">Create an account or sign in to build custom bookshelves.</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined' && pendingAction) {
                    localStorage.setItem('pending_create_shelf', 'true');
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
                  setPendingAction(false);
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
