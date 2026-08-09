'use client';

import { useLibrary } from "../../lib/providers/LibraryProvider";
import { useEffect, useState, Suspense } from "react";
import { Book } from "../../domain/models/Book";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function SearchContent() {
  const library = useLibrary();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim()) {
      setLoading(true);
      library.searchCatalog(query).then(books => {
        setResults(books);
        setLoading(false);
      }).catch(e => {
        console.error(e);
        setLoading(false);
      });
    } else {
      setResults([]);
    }
  }, [library, query]);

  return (
    <div className="max-w-7xl mx-auto p-6 sm:p-8">
      <div className="mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {query ? `Search Results for "${query}"` : "Search"}
        </h1>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="text-zinc-500 animate-pulse text-lg">Searching catalog...</div>
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
          {results.map(book => (
            <Link 
              href={`/book/${book.slug}`} 
              key={book.id}
              className="group cursor-pointer flex flex-col"
            >
              <div className="aspect-[2/3] w-full bg-zinc-200 dark:bg-zinc-800 rounded-lg overflow-hidden mb-3 shadow-sm group-hover:shadow-lg transition-all duration-300 relative">
                {book.coverUrl ? (
                  <img 
                    src={book.coverUrl} 
                    alt={book.title} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-4 text-center text-zinc-500 bg-zinc-100 dark:bg-zinc-900">
                    <span className="line-clamp-3 px-2 font-medium">{book.title}</span>
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {book.title}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate mt-1">
                {book.author}
              </p>
            </Link>
          ))}
        </div>
      ) : query ? (
        <div className="py-12 text-center">
          <p className="text-zinc-500 text-lg">No books found matching your search criteria.</p>
          <p className="text-zinc-400 mt-2">Try checking for typos or using more general keywords.</p>
        </div>
      ) : (
        <div className="py-12 text-center text-zinc-500 text-lg">
          Enter a search query in the navigation bar to find books.
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
