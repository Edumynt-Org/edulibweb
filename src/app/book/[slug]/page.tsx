'use client';

import { useLibrary } from "../../../lib/providers/LibraryProvider";
import { useEffect, useState } from "react";
import { BookDetails } from "../../../domain/models/BookDetails";
import { useParams, useRouter } from "next/navigation";
import { LibraryStatusSelector } from "../../../components/ui/LibraryStatusSelector";
import { ShelfSelector } from "../../../components/ui/ShelfSelector";
import { ReviewsSection } from "../../../components/ui/ReviewsSection";

// SVG Icons
const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
);
const StarIcon = ({ filled = false }: { filled?: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={filled ? "text-yellow-400" : "text-zinc-300"}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
);

export default function BookDetailsPage() {
  const library = useLibrary();
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  
  const [book, setBook] = useState<BookDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Tabs state
  const [activeTab, setActiveTab] = useState<'Content' | 'Details' | 'Reviews'>('Content');
  const [activeDetailsSubTab, setActiveDetailsSubTab] = useState<'Book' | 'Edition'>('Book');

  // Editions state
  const [selectedTextEditionIndex, setSelectedTextEditionIndex] = useState(0);
  const [selectedAudioEditionIndex, setSelectedAudioEditionIndex] = useState(0);

  // Modals state
  const [showTextEditionModal, setShowTextEditionModal] = useState(false);
  const [showAudioEditionModal, setShowAudioEditionModal] = useState(false);

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
        <div className="text-zinc-500 animate-pulse text-lg">Loading book details...</div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-red-500 font-medium text-lg">Book not found</div>
      </div>
    );
  }

  const hasTextEditions = book.editions && book.editions.length > 0;
  const hasMultipleTextEditions = book.editions && book.editions.length > 1;
  const currentTextEdition = hasTextEditions ? book.editions[selectedTextEditionIndex] : null;

  const hasAudioEditions = book.audioEditions && book.audioEditions.length > 0;
  const hasMultipleAudioEditions = book.audioEditions && book.audioEditions.length > 1;
  const currentAudioEdition = hasAudioEditions ? book.audioEditions[selectedAudioEditionIndex] : null;

  const handleRead = () => {
    if (!currentTextEdition) {
      alert('No readable content found for this book.');
      return;
    }
    let chapterSlug = '';
    if (currentTextEdition.chapters && currentTextEdition.chapters.length > 0) {
      chapterSlug = currentTextEdition.chapters[0].slug;
    } else if (currentTextEdition.parts && currentTextEdition.parts.length > 0) {
      for (const part of currentTextEdition.parts) {
        if (part.chapters && part.chapters.length > 0) {
          chapterSlug = part.chapters[0].slug;
          break;
        }
      }
    }
    if (chapterSlug) {
      router.push(`/read/${book.slug}/${currentTextEdition.slug}/${chapterSlug}`);
    } else {
      alert('No chapters found for this edition.');
    }
  };

  const handleListen = () => {
    if (!currentAudioEdition) {
       router.push(`/listen/${book.slug}`);
       return;
    }
    router.push(`/listen/${book.slug}`);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 mt-4 sm:mt-8 animate-in fade-in duration-500">
      {/* Modals */}
      {showTextEditionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Select Text Edition</h3>
            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
              {book.editions.map((ed, idx) => (
                <button
                  key={ed.id || idx}
                  onClick={() => {
                    setSelectedTextEditionIndex(idx);
                    setShowTextEditionModal(false);
                  }}
                  className={`p-3 rounded-lg text-left transition-colors ${selectedTextEditionIndex === idx ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'} border border-transparent`}
                >
                  <div className="font-medium dark:text-white">{ed.title || ed.format || `Edition ${idx + 1}`}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowTextEditionModal(false)} className="mt-6 w-full py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg font-medium transition-colors dark:text-white">Cancel</button>
          </div>
        </div>
      )}

      {showAudioEditionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Select Audio Edition</h3>
            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
              {book.audioEditions?.map((ed, idx) => (
                <button
                  key={ed.id || idx}
                  onClick={() => {
                    setSelectedAudioEditionIndex(idx);
                    setShowAudioEditionModal(false);
                  }}
                  className={`p-3 rounded-lg text-left transition-colors ${selectedAudioEditionIndex === idx ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'} border border-transparent`}
                >
                  <div className="font-medium dark:text-white">{ed.title || `Audio Edition ${idx + 1}`}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowAudioEditionModal(false)} className="mt-6 w-full py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg font-medium transition-colors dark:text-white">Cancel</button>
          </div>
        </div>
      )}

      {/* Top Section */}
      <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-center md:items-start mb-12">
        <div className="w-48 sm:w-56 md:w-64 lg:w-72 shrink-0 group">
          <div className="aspect-[2/3] w-full bg-zinc-200 dark:bg-zinc-800 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/10 dark:ring-white/10 transition-transform duration-500 group-hover:scale-[1.02] group-hover:shadow-3xl">
            {book.coverUrl ? (
              <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            ) : (
              <div className="w-full h-full flex flex-col p-6 items-center justify-center text-center bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900">
                <span className="font-bold text-2xl mb-2 text-zinc-800 dark:text-zinc-200 drop-shadow-sm">{book.title}</span>
                <span className="text-zinc-500 font-medium">{book.author}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left pt-2 md:pt-4 w-full">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4 leading-tight">
            {book.title}
          </h1>
          <h2 className="text-xl sm:text-2xl text-zinc-600 dark:text-zinc-400 mb-8 font-medium">
            {book.author}
          </h2>
          
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-8 w-full justify-center md:justify-start items-center sm:items-start">
            <LibraryStatusSelector bookId={book.id} />
            <ShelfSelector bookId={book.id} />
            {hasTextEditions && (
              <div className="flex w-full sm:w-auto rounded-full shadow-xl shadow-blue-500/20 transition-transform hover:-translate-y-0.5 active:translate-y-0 relative group">
                <button 
                  onClick={handleRead}
                  className={`flex-1 sm:flex-none px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold ${hasMultipleTextEditions ? 'rounded-l-full pr-6 border-r border-blue-500/30' : 'rounded-full'} transition-colors flex items-center justify-center`}
                >
                  Read
                </button>
                {hasMultipleTextEditions && (
                  <button 
                    onClick={() => setShowTextEditionModal(true)}
                    className="px-4 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-r-full transition-colors flex items-center justify-center focus:outline-none"
                    aria-label="Select text edition"
                  >
                    <ChevronDownIcon />
                  </button>
                )}
              </div>
            )}
            
            {hasAudioEditions && (
              <div className="flex w-full sm:w-auto rounded-full shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 group ring-1 ring-zinc-200 dark:ring-zinc-800">
                <button 
                  onClick={handleListen}
                  className={`flex-1 sm:flex-none px-8 py-3.5 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold ${hasMultipleAudioEditions ? 'rounded-l-full pr-6 border-r border-zinc-700 dark:border-zinc-300' : 'rounded-full'} transition-colors flex items-center justify-center`}
                >
                  Listen
                </button>
                {hasMultipleAudioEditions && (
                  <button 
                    onClick={() => setShowAudioEditionModal(true)}
                    className="px-4 py-3.5 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-r-full transition-colors flex items-center justify-center focus:outline-none"
                    aria-label="Select audio edition"
                  >
                    <ChevronDownIcon />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 mb-8 overflow-x-auto no-scrollbar">
        <div className="flex gap-8 min-w-max">
          {(['Content', 'Details', 'Reviews'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-lg font-medium transition-colors relative ${activeTab === tab ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs Content */}
      <div className="min-h-[400px]">
        {/* Content Tab */}
        {activeTab === 'Content' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {!currentTextEdition ? (
              <div className="text-center text-zinc-500 py-12 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                No readable content available for this book.
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">Table of Contents</h3>
                  <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                    {currentTextEdition.title || currentTextEdition.format || `Edition ${selectedTextEditionIndex + 1}`}
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 md:p-8 shadow-sm border border-zinc-200 dark:border-zinc-800">
                  {/* Direct chapters */}
                  {currentTextEdition.chapters && currentTextEdition.chapters.length > 0 && (
                    <ul className="space-y-4">
                      {currentTextEdition.chapters.map((chapter) => (
                        <li key={chapter.id} className="group flex flex-col p-4 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer" onClick={handleRead}>
                          <span className="font-semibold text-lg text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{chapter.title}</span>
                          {chapter.summary && <span className="text-zinc-500 dark:text-zinc-400 mt-1">{chapter.summary}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  
                  {/* Parts and chapters */}
                  {currentTextEdition.parts && currentTextEdition.parts.length > 0 && (
                    <div className="space-y-10">
                      {currentTextEdition.parts.map((part) => (
                        <div key={part.id}>
                          <h4 className="font-bold text-xl mb-4 text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-3">{part.title}</h4>
                          <ul className="space-y-2">
                            {part.chapters && part.chapters.map((chapter) => (
                              <li key={chapter.id} className="group flex flex-col p-3 md:p-4 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer" onClick={handleRead}>
                                <span className="font-medium text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{chapter.title}</span>
                                {chapter.summary && <span className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{chapter.summary}</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  {(!currentTextEdition.chapters?.length && !currentTextEdition.parts?.length) && (
                     <div className="text-center text-zinc-500 py-8">
                       Table of contents is empty for this edition.
                     </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'Details' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex gap-4 mb-6">
              <button 
                onClick={() => setActiveDetailsSubTab('Book')}
                className={`px-4 py-2 rounded-full font-medium transition-colors ${activeDetailsSubTab === 'Book' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'}`}
              >
                Book Details
              </button>
              <button 
                onClick={() => setActiveDetailsSubTab('Edition')}
                className={`px-4 py-2 rounded-full font-medium transition-colors ${activeDetailsSubTab === 'Edition' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'}`}
              >
                Edition Details
              </button>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 md:p-8 shadow-sm border border-zinc-200 dark:border-zinc-800">
              {activeDetailsSubTab === 'Book' && (
                <div className="flex flex-col gap-8">
                  <div>
                    <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-3">About this Book</h4>
                    <div className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {book.description || "No description available for this book."}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                    <div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Title</div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{book.title}</div>
                  </div>
                  <div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Author</div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{book.author}</div>
                  </div>
                  {book.firstPublishedYear && (
                    <div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">First Published</div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{book.firstPublishedYear}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

              {activeDetailsSubTab === 'Edition' && (
                <div>
                  {!currentTextEdition ? (
                    <div className="text-zinc-500">No specific edition details available.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                      <div>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Edition Title</div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{currentTextEdition.title || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Format</div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{currentTextEdition.format || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Language</div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{currentTextEdition.language || 'English'}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'Reviews' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ReviewsSection bookId={book.id} />
            {/*
              {/* Summary and Write Review */}
              <div className="md:col-span-1 bg-white dark:bg-zinc-900 rounded-2xl p-6 md:p-8 shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center h-fit">
                <h3 className="text-xl font-bold mb-2 dark:text-white">Community Rating</h3>
                <div className="text-5xl font-extrabold text-zinc-900 dark:text-zinc-100 my-4">4.8</div>
                <div className="flex gap-1 mb-2">
                  <StarIcon filled />
                  <StarIcon filled />
                  <StarIcon filled />
                  <StarIcon filled />
                  <StarIcon />
                </div>
                <div className="text-zinc-500 text-sm mb-8">Based on 128 reviews</div>
                
                <hr className="w-full border-zinc-200 dark:border-zinc-800 mb-8" />
                
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Share your thoughts</h4>
                <button className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-xl transition-colors">
                  Write a Review
                </button>
              </div>

              {/* Reviews List */}
              <div className="md:col-span-2 space-y-4">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold">
                          {['A', 'J', 'S'][i]}
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">{['Alice', 'John', 'Sarah'][i]}</div>
                          <div className="text-xs text-zinc-500">2 days ago</div>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        <StarIcon filled />
                        <StarIcon filled />
                        <StarIcon filled />
                        <StarIcon filled />
                        <StarIcon filled={i === 2 ? false : true} />
                      </div>
                    </div>
                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {i === 0 && "An absolute masterpiece. The pacing was perfect and I couldn't put it down."}
                      {i === 1 && "Great read, highly recommended for anyone interested in this genre. The characters are well developed."}
                      {i === 2 && "Good book overall, though the middle dragged a little bit. Still worth the time."}
                    </p>
                  </div>
                ))}
              </div>
            */}
          </div>
        )}
      </div>
    </div>
  );
}
