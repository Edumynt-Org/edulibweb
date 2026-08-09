'use client';
import { useState, useEffect } from 'react';
import { useLibrary } from '../../../../lib/providers/LibraryProvider';
import { useParams, useRouter } from 'next/navigation';
import { UserShelf } from '../../../../domain/models/UserShelf';
import { UserShelfItem } from '../../../../domain/models/UserShelfItem';
import Link from 'next/link';

export default function ShelfPage() {
  const params = useParams();
  const slug = params.slug as string;
  const library = useLibrary();
  const router = useRouter();
  
  const [shelf, setShelf] = useState<UserShelf | null>(null);
  const [items, setItems] = useState<UserShelfItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShelfData();
  }, [slug]);

  const loadShelfData = async () => {
    try {
      const shelves = await library.getUserShelves();
      const currentShelf = shelves.find(s => s.slug === slug);
      if (currentShelf) {
        setShelf(currentShelf);
        const shelfItems = await library.getShelfItems(currentShelf.id);
        setItems(shelfItems);
      } else {
        router.push('/library');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (bookId: string) => {
    if (!shelf) return;
    try {
      await library.removeBookFromShelf(shelf.id, bookId);
      loadShelfData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (!shelf || index === 0) return;
    const newItems = [...items];
    const temp = newItems[index - 1];
    newItems[index - 1] = newItems[index];
    newItems[index] = temp;
    setItems(newItems);
    await library.reorderShelf(shelf.id, newItems.map(i => i.bookId));
  };

  const handleMoveDown = async (index: number) => {
    if (!shelf || index === items.length - 1) return;
    const newItems = [...items];
    const temp = newItems[index + 1];
    newItems[index + 1] = newItems[index];
    newItems[index] = temp;
    setItems(newItems);
    await library.reorderShelf(shelf.id, newItems.map(i => i.bookId));
  };

  if (loading) {
    return <div className="p-8 max-w-7xl mx-auto flex justify-center"><div className="animate-pulse">Loading shelf...</div></div>;
  }

  if (!shelf) return null;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <Link href="/library" className="text-sm text-blue-500 hover:underline mb-4 inline-block">&larr; Back to Library</Link>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          {shelf.name}
          {shelf.isPrivate && (
            <span className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center gap-1 font-medium">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Private
            </span>
          )}
        </h1>
        {shelf.description && <p className="text-zinc-500 mt-2 text-lg">{shelf.description}</p>}
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
          <p className="text-zinc-500 font-medium">This shelf is empty.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900">
              <img src={item.book?.coverUrl || '/placeholder-cover.jpg'} alt={item.book?.title} className="w-16 h-24 object-cover rounded shadow-sm" />
              <div className="flex-1">
                <Link href={`/book/${item.book?.slug}`} className="font-bold text-lg hover:text-blue-500 transition-colors">
                  {item.book?.title}
                </Link>
                <p className="text-zinc-500 text-sm">{item.book?.author}</p>
              </div>
              <div className="flex gap-2">
                <div className="flex flex-col gap-1 mr-4">
                  <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <button onClick={() => handleMoveDown(index)} disabled={index === items.length - 1} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
                <button onClick={() => handleRemove(item.bookId)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1 rounded text-sm font-medium transition-colors">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
