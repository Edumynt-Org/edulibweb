'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLibrary } from '../../lib/providers/LibraryProvider';
import { Book } from '../../domain/models/Book';

export default function CatalogPage() {
  const library = useLibrary();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    library.getCatalogBooks().then(b => {
      setBooks(b);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load catalog:', err);
      setLoading(false);
    });
  }, [library]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-zinc-500 animate-pulse text-lg">Loading catalog...</div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-8">All Books</h1>
      {books.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
          <p className="text-zinc-500 text-lg">No books found in the catalog.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {books.map(book => (
            <Link href={`/book/${book.slug}`} key={book.id} className="group">
              <div className="aspect-[2/3] bg-zinc-200 dark:bg-zinc-800 rounded-lg overflow-hidden mb-3 shadow-sm group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-3 text-center text-zinc-500 text-sm font-medium">
                    {book.title}
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">{book.title}</h3>
              <p className="text-xs text-zinc-500 truncate mt-1">{book.author}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
