'use client';

import Link from "next/link";
import { useLibrary } from "../lib/providers/LibraryProvider";
import { useEffect, useState } from "react";
import { BookList } from "../domain/models/BookList";

export default function Home() {
  const library = useLibrary();
  const [lists, setLists] = useState<BookList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = library.watchCuratedLists((newLists) => {
      setLists(newLists);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [library]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-zinc-500 animate-pulse text-lg">Loading books...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12 p-6 sm:p-8 max-w-7xl mx-auto py-8 sm:py-12">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Discover
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl">
          Explore our open-source collection of timeless classics and new arrivals.
        </p>
      </div>

      <div className="flex flex-col gap-14">
        {lists.map(list => (
          <section key={list.id} className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{list.title}</h2>
              {/* Optional "See all" link can go here */}
            </div>
            
            {/* Horizontal scroll container */}
            <div className="flex overflow-x-auto gap-6 pb-6 pt-2 snap-x snap-mandatory hide-scrollbar -mx-6 px-6 sm:mx-0 sm:px-0">
              {list.books.map(book => (
                <Link 
                  href={`/book/${book.slug}`} 
                  key={book.id}
                  className="snap-start flex-none w-36 sm:w-44 lg:w-52 group cursor-pointer"
                >
                  <div className="aspect-[2/3] w-full bg-zinc-200 dark:bg-zinc-800 rounded-lg overflow-hidden mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300 relative group-hover:-translate-y-1">
                    {book.coverUrl ? (
                      <img 
                        src={book.coverUrl} 
                        alt={book.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-4 text-center text-zinc-500 bg-zinc-100 dark:bg-zinc-900 font-medium text-sm">
                        <span className="line-clamp-4">{book.title}</span>
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
              
              {list.books.length === 0 && (
                <div className="text-zinc-500 py-8 text-sm">No books in this list yet.</div>
              )}
            </div>
          </section>
        ))}
        
        {lists.length === 0 && (
          <div className="py-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
            <p className="text-zinc-500 text-lg">No book lists available.</p>
            <p className="text-zinc-400 mt-2">The collection might be syncing or empty.</p>
          </div>
        )}
      </div>
    </div>
  );
}
