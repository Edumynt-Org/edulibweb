'use client';

import { useLibrary } from "../../../lib/providers/LibraryProvider";
import { useEffect, useState } from "react";
import { BookDetails } from "../../../domain/models/BookDetails";
import { useParams, useRouter } from "next/navigation";
import { AudioPlayer } from "../../../components/audio/AudioPlayer";
import { AudioEdition } from "../../../domain/models/AudioEdition";

export default function ListenPage() {
  const library = useLibrary();
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [book, setBook] = useState<BookDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.slug) {
      library.getBookDetails(params.slug).then(b => {
        setBook(b);
        setLoading(false);
      }).catch(e => {
        console.error(e);
        setLoading(false);
      });
    }
  }, [library, params.slug]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-zinc-500 animate-pulse">Loading audiobook...</div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-red-500 font-medium">Audiobook not found</div>
      </div>
    );
  }

  const audioEditionFromBook = book.audioEditions && book.audioEditions.length > 0 ? book.audioEditions[0] : null;

  if (!audioEditionFromBook) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[50vh] gap-4">
        <div className="text-zinc-500 font-medium">No audio edition available for this book.</div>
        <button onClick={() => router.push(`/book/${book.slug}`)} className="text-blue-600 hover:underline">
          Go back to book details
        </button>
      </div>
    );
  }

  let audioChapters = audioEditionFromBook.audioChapters || [];
  if (audioChapters.length === 0 && audioEditionFromBook.parts && audioEditionFromBook.parts.length > 0) {
    audioChapters = audioEditionFromBook.parts.flatMap(p => p.audioChapters || []);
  }

  const playerEdition: AudioEdition = {
    id: audioEditionFromBook.id,
    bookId: book.id,
    title: audioEditionFromBook.title || book.title,
    slug: audioEditionFromBook.slug || '',
    language: audioEditionFromBook.language || book.originalLanguage || 'en',
    cover: audioEditionFromBook.cover || book.coverUrl,
    narratorName: audioEditionFromBook.narratorName,
    chapters: audioChapters.map(c => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      audioFileUrl: c.audioFile || '',
      durationSeconds: c.durationSeconds || 0,
      linkedTextChapter: c.linkedTextChapter
    }))
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 p-6 sm:p-8 max-w-4xl mx-auto w-full mb-24">
        <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
          <div className="w-48 shrink-0 mx-auto md:mx-0">
            <div className="aspect-[2/3] w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl overflow-hidden shadow-xl">
              {playerEdition.cover ? (
                <img src={playerEdition.cover} alt={playerEdition.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col p-4 items-center justify-center text-center">
                  <span className="font-bold text-lg mb-2">{playerEdition.title}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left w-full">
            <h1 className="text-3xl font-bold mb-2">{playerEdition.title}</h1>
            <h2 className="text-xl text-zinc-600 dark:text-zinc-400 mb-4">{book.author}</h2>
            {playerEdition.narratorName && (
              <p className="text-zinc-500 mb-6">Narrated by: {playerEdition.narratorName}</p>
            )}
            
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800">
              <h3 className="font-semibold mb-3">Chapters</h3>
              <ul className="space-y-2 max-h-64 overflow-y-auto pr-2 text-left">
                {playerEdition.chapters.map((chap, idx) => (
                  <li key={chap.id} className="text-sm flex gap-3 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
                    <span className="text-zinc-400 w-6 text-right">{idx + 1}</span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">{chap.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* AudioPlayer is fixed at bottom */}
      <AudioPlayer edition={playerEdition} initialChapterIndex={0} />
    </div>
  );
}
