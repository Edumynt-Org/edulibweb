'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLibrary } from '../../../../../lib/providers/LibraryProvider';
import { Chapter } from '../../../../../domain/models/Chapter';
import { ReaderEngine } from '../../../../../components/reader/ReaderEngine';

export default function ReaderPage() {
  const params = useParams();
  const bookSlug = params.bookSlug as string;
  const editionSlug = params.editionSlug as string;
  const chapterSlug = params.chapterSlug as string;
  const library = useLibrary();
  
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadContent() {
      try {
        if (!chapterSlug) return;

        const chapterResult = await library.getChapter(chapterSlug);
        if (chapterResult) {
          setChapter(chapterResult);
        } else {
          setError('Chapter not found.');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, [library, chapterSlug]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FDFBF7] dark:bg-gray-900">
        <p className="text-gray-500 animate-pulse font-serif">Loading chapter...</p>
      </div>
    );
  }

  if (error || !chapter) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#FDFBF7] dark:bg-gray-900">
        <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
        <p className="text-gray-600 dark:text-gray-400">{error || 'Chapter not found'}</p>
      </div>
    );
  }

  return <ReaderEngine chapter={chapter} />;
}
