'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Chapter } from '../../domain/models/Chapter';
import { useLibrary } from '../../lib/providers/LibraryProvider';
import { ReadingPreferences, DefaultReadingPreferences } from '../../domain/models/ReadingPreferences';
import { Annotation } from '../../domain/models/Annotation';
import { DictionaryEntry } from '../../domain/models/DictionaryEntry';

interface ReaderEngineProps {
  chapter: Chapter;
  initialProgress?: number;
}

type ReaderMode = 'scroll' | 'paginated';

export function ReaderEngine({ chapter, initialProgress = 0 }: ReaderEngineProps) {
  const [mode, setMode] = useState<ReaderMode>('scroll');
  const [progress, setProgress] = useState(initialProgress);
  const [syncPromptPercent, setSyncPromptPercent] = useState<number | null>(null);
  const [syncHandled, setSyncHandled] = useState<boolean>(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const activeElementRef = useRef<Element | null>(null);
  
  const library = useLibrary();
  
  const [prefs, setPrefs] = useState<ReadingPreferences>(DefaultReadingPreferences);
  const [showSettings, setShowSettings] = useState(false);
  
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectionRange, setSelectionRange] = useState<Range | null>(null);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [selectedText, setSelectedText] = useState('');
  
  const [dictionaryEntry, setDictionaryEntry] = useState<DictionaryEntry | null>(null);
  const [isDictionaryLoading, setIsDictionaryLoading] = useState(false);
  const [dictionaryError, setDictionaryError] = useState<string | null>(null);
  
  useEffect(() => {
    library.getReadingPreferences().then(setPrefs);
    library.getAnnotations(chapter.id).then(setAnnotations);
  }, [library, chapter.id]);

  const updatePref = (key: keyof ReadingPreferences, value: any) => {
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    library.updateReadingPreferences({ [key]: value });
  };

  // Save progress debounced
  const saveProgress = useCallback((percent: number, scrollY: number) => {
    library.updateChapterProgress(chapter.id, percent, scrollY);
  }, [library, chapter.id]);

  const progressRef = useRef(progress);
  const modeRef = useRef(mode);
  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  
  useEffect(() => {
    // Check for linked audio progress
    if (!syncHandled) {
      library.getLinkedAudioProgress(chapter.id).then(audioProgress => {
        if (audioProgress && audioProgress.progressPercent > 0) {
          setSyncPromptPercent(audioProgress.progressPercent);
        }
      });
    }
  }, [chapter.id, library, syncHandled]);

  const [scrollPos, setScrollPos] = useState(0);

  useEffect(() => {
    const handler = setTimeout(() => {
      saveProgress(progress, modeRef.current === 'paginated' ? (containerRef.current?.scrollLeft || 0) : (containerRef.current?.scrollTop || 0));
    }, 1000);
    return () => {
      clearTimeout(handler);
      saveProgress(progressRef.current, modeRef.current === 'paginated' ? (containerRef.current?.scrollLeft || 0) : (containerRef.current?.scrollTop || 0));
    };
  }, [progress, scrollPos, saveProgress]);

  // Setup intersection observer to track active paragraph
  useEffect(() => {
    if (!containerRef.current) return;
    
    observerRef.current = new IntersectionObserver((entries) => {
      // Find the most visible element
      const visible = entries.find(e => e.isIntersecting);
      if (visible) {
        activeElementRef.current = visible.target;
        
        // Calculate rough progress based on DOM position
        const elements = Array.from(containerRef.current?.querySelectorAll('p, h1, h2, h3, h4, h5, h6') || []);
        const index = elements.indexOf(visible.target);
        if (index >= 0 && elements.length > 0) {
          const maxIdx = Math.max(1, elements.length - 1);
          const percent = Math.round((index / maxIdx) * 100);
          setProgress(percent);
        }
      }
    }, {
      root: containerRef.current,
      threshold: 0.5,
    });

    const elements = containerRef.current.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
    elements.forEach(el => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, [chapter.content, mode]);

  // Handle mode toggle and preserve position
  const toggleMode = () => {
    const activeEl = activeElementRef.current;
    
    setMode(prev => prev === 'scroll' ? 'paginated' : 'scroll');
    
    // Restore position after render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (activeEl && containerRef.current) {
          activeEl.scrollIntoView({ behavior: 'instant', inline: 'start', block: 'start' });
        }
      });
    });
  };

  // Text selection handling for annotations
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) {
      if (selectionRange) {
        setSelectionRange(null);
        setSelectionRect(null);
      }
      return;
    }

    // Check if selection is within the prose container
    const prose = containerRef.current.querySelector('.prose');
    if (!prose || !prose.contains(sel.anchorNode)) return;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    setSelectionRange(range);
    setSelectionRect(rect);
    setSelectedText(sel.toString());
  };

  const getOffsetRelativeTo = (range: Range, container: Element) => {
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(container);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    const start = preCaretRange.toString().length;
    return {
      start,
      end: start + range.toString().length
    };
  };

  const createAnnotation = async (color: string, note?: string) => {
    if (!selectionRange || !containerRef.current) return;
    const prose = containerRef.current.querySelector('.prose');
    if (!prose) return;

    const { start, end } = getOffsetRelativeTo(selectionRange, prose);
    
    const annotation = await library.addAnnotation({
      chapterId: chapter.id,
      annotationType: note ? 'note' : 'highlight',
      color,
      selectedText,
      noteText: note,
      startPosition: start.toString(),
      endPosition: end.toString(),
    });

    setAnnotations(prev => [...prev, annotation]);
    setSelectionRange(null);
    setSelectionRect(null);
    window.getSelection()?.removeAllRanges();
  };

  const lookupDictionary = async () => {
    if (!selectedText) return;
    const word = selectedText.trim();
    if (word.split(/\s+/).length > 1) {
      alert("Please select a single word to define.");
      return;
    }
    
    setIsDictionaryLoading(true);
    setDictionaryError(null);
    setDictionaryEntry(null);
    
    try {
      const entry = await library.getDefinition(word);
      if (entry) {
        setDictionaryEntry(entry);
      } else {
        setDictionaryError(`Dictionary unavailable offline for this word, or word not found.`);
      }
    } catch (e) {
      setDictionaryError(`Dictionary unavailable offline for this word, or word not found.`);
    } finally {
      setIsDictionaryLoading(false);
    }
  };

  const COLORS = [
    { id: 'yellow', hex: '#fde047' },
    { id: 'blue', hex: '#93c5fd' },
    { id: 'green', hex: '#86efac' },
    { id: 'pink', hex: '#f9a8d4' },
    { id: 'orange', hex: '#fdba74' },
  ];

  const themeClasses = {
    light: 'bg-[#FDFBF7] text-gray-900',
    dark: 'bg-gray-900 text-gray-100',
    sepia: 'bg-[#F4ECD8] text-[#5B4636]',
    amoled: 'bg-black text-gray-300',
  };

  const fontClasses = {
    serif: 'font-serif',
    sans: 'font-sans',
    mono: 'font-mono',
    dyslexic: 'font-opendyslexic',
  };

  const marginClasses = {
    compact: 'p-4',
    normal: 'p-8',
    relaxed: 'p-12 md:p-24',
  };

  const acceptSync = () => {
    if (syncPromptPercent !== null && containerRef.current) {
      const scrollHeight = containerRef.current.scrollHeight - containerRef.current.clientHeight;
      if (mode === 'scroll') {
        const newScrollPos = scrollHeight * (syncPromptPercent / 100);
        containerRef.current.scrollTop = newScrollPos;
      } else {
        const scrollWidth = containerRef.current.scrollWidth - containerRef.current.clientWidth;
        const newScrollPos = scrollWidth * (syncPromptPercent / 100);
        containerRef.current.scrollLeft = newScrollPos;
      }
      setProgress(syncPromptPercent);
    }
    setSyncPromptPercent(null);
    setSyncHandled(true);
  };

  const dismissSync = () => {
    setSyncPromptPercent(null);
    setSyncHandled(true);
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${themeClasses[prefs.theme as keyof typeof themeClasses] || themeClasses.light}`}>
      {/* Reader Header / Controls */}
      <div className="flex justify-between items-center p-4 border-b dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm z-10">
        <h1 className="text-xl font-serif font-bold truncate max-w-md">{chapter.title}</h1>
        <div className="flex gap-4 items-center">
          <span className="text-sm opacity-70">{progress}%</span>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 text-sm font-medium bg-black/10 dark:bg-white/10 rounded-md hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
          >
            Aa
          </button>
          <button 
            onClick={toggleMode}
            className="px-4 py-2 text-sm font-medium bg-black/10 dark:bg-white/10 rounded-md hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
          >
            {mode === 'scroll' ? 'Paginated' : 'Scroll'}
          </button>
        </div>
      </div>
      
      {syncPromptPercent !== null && (
        <div className="bg-blue-50 dark:bg-blue-900/30 p-2 text-sm flex items-center justify-between px-4 border-b border-blue-100 dark:border-blue-900 z-10">
          <span>Resume reading from your listening progress (~{syncPromptPercent}%)?</span>
          <div className="flex gap-2">
            <button onClick={acceptSync} className="text-blue-600 font-bold dark:text-blue-400">Yes</button>
            <button onClick={dismissSync} className="text-gray-500">No</button>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 right-4 w-72 bg-white dark:bg-gray-800 shadow-xl rounded-lg p-4 z-20 border border-gray-200 dark:border-gray-700">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Theme</label>
              <select value={prefs.theme} onChange={(e) => updatePref('theme', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="sepia">Sepia</option>
                <option value="amoled">AMOLED</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Font Family</label>
              <select value={prefs.fontFamily} onChange={(e) => updatePref('fontFamily', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                <option value="serif">Serif</option>
                <option value="sans">Sans-Serif</option>
                <option value="mono">Monospace</option>
                <option value="dyslexic">OpenDyslexic</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Font Size ({prefs.fontSizePx}px)</label>
              <input type="range" min="12" max="32" value={prefs.fontSizePx} onChange={(e) => updatePref('fontSizePx', parseInt(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Line Spacing</label>
              <select value={prefs.lineSpacing} onChange={(e) => updatePref('lineSpacing', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
                <option value="relaxed">Relaxed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Margins</label>
              <select value={prefs.margins} onChange={(e) => updatePref('margins', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
                <option value="relaxed">Relaxed</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Selection Popover */}
      {selectionRect && (
        <div 
          className="fixed z-30 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 p-2 flex gap-2 items-center transform -translate-x-1/2 -translate-y-full"
          style={{ 
            top: selectionRect.top - 10,
            left: selectionRect.left + selectionRect.width / 2 
          }}
        >
          {COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => createAnnotation(c.hex)}
              className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 transition-transform hover:scale-110"
              style={{ backgroundColor: c.hex }}
              title={`Highlight ${c.id}`}
            />
          ))}
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
          <button
            onClick={() => {
              const note = prompt('Enter a note for this highlight:');
              if (note) createAnnotation(COLORS[0].hex, note);
            }}
            className="text-sm px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Note
          </button>
          {selectedText && selectedText.trim().split(/\s+/).length === 1 && (
            <>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
              <button
                onClick={lookupDictionary}
                className="text-sm px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Define
              </button>
            </>
          )}
        </div>
      )}

      {/* Dictionary Popover */}
      {(dictionaryEntry || isDictionaryLoading || dictionaryError) && selectionRect && (
        <div 
          className="fixed z-40 bg-white dark:bg-gray-800 shadow-2xl rounded-lg border border-gray-200 dark:border-gray-700 p-4 max-w-sm w-full max-h-64 overflow-y-auto transform -translate-x-1/2 mt-2"
          style={{ 
            top: selectionRect.bottom,
            left: selectionRect.left + selectionRect.width / 2 
          }}
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-lg capitalize">{dictionaryEntry?.word || selectedText}</h3>
            <button 
              onClick={() => { setDictionaryEntry(null); setDictionaryError(null); setIsDictionaryLoading(false); }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          
          {isDictionaryLoading && <p className="text-sm text-gray-500">Looking up...</p>}
          
          {dictionaryError && <p className="text-sm text-red-500">{dictionaryError}</p>}
          
          {dictionaryEntry && (
            <div className="space-y-3">
              {dictionaryEntry.phonetic && (
                <p className="text-sm text-gray-500 font-mono">{dictionaryEntry.phonetic}</p>
              )}
              {dictionaryEntry.meanings.map((meaning, i) => (
                <div key={i} className="text-sm">
                  <span className="italic text-gray-600 dark:text-gray-400">{meaning.partOfSpeech}</span>
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    {meaning.definitions.slice(0, 2).map((def, j) => (
                      <li key={j}>
                        {def.definition}
                        {def.example && <p className="text-gray-500 mt-0.5">"{def.example}"</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reader Content Area */}
      <div 
        ref={containerRef}
        onScroll={() => {
          if (containerRef.current) {
            setScrollPos(mode === 'paginated' ? containerRef.current.scrollLeft : containerRef.current.scrollTop);
          }
        }}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
        className={`flex-1 overflow-y-auto overflow-x-hidden transition-all duration-300 ${marginClasses[prefs.margins as keyof typeof marginClasses] || marginClasses.normal} ${
          mode === 'paginated' 
            ? 'columns-1 sm:columns-2 lg:columns-3 gap-8 column-rule-solid column-rule-gray-200' 
            : 'max-w-4xl mx-auto w-full'
        }`}
        style={{
          // Use CSS multicolumn for paginated reading
          columnWidth: mode === 'paginated' ? '100vw' : 'auto',
          columnGap: mode === 'paginated' ? '2rem' : 'auto',
          height: mode === 'paginated' ? 'calc(100vh - 73px)' : 'auto',
          // Force horizontal scrolling when paginated
          overflowX: mode === 'paginated' ? 'auto' : 'hidden',
          overflowY: mode === 'paginated' ? 'hidden' : 'auto',
          scrollSnapType: mode === 'paginated' ? 'x mandatory' : 'none',
        }}
      >
        <div className={`prose prose-lg dark:prose-invert max-w-none ${fontClasses[prefs.fontFamily as keyof typeof fontClasses] || fontClasses.serif}`}
          style={{
            // Prevent breaks inside paragraphs when in paginated mode
            breakInside: mode === 'paginated' ? 'avoid' : 'auto',
            fontSize: `${prefs.fontSizePx}px`,
            lineHeight: prefs.lineSpacing === 'compact' ? '1.4' : prefs.lineSpacing === 'relaxed' ? '2.0' : '1.6',
          }}
        >
          <div className="relative">
            <ReactMarkdown
              components={{
                p: ({node, ...props}) => <p className="mb-6 break-inside-avoid relative z-10" {...props} />,
                h1: ({node, ...props}) => <h1 className="break-after-avoid mt-8 mb-4 relative z-10" {...props} />,
                h2: ({node, ...props}) => <h2 className="break-after-avoid mt-8 mb-4 relative z-10" {...props} />,
                h3: ({node, ...props}) => <h3 className="break-after-avoid mt-6 mb-3 relative z-10" {...props} />,
              }}
            >
              {chapter.content}
            </ReactMarkdown>
            
            {/* Render Annotations Overlay */}
            {/* Note: In a complete implementation, this would use a TextRange to DOMRect mapper to draw highlights. */}
            <div className="absolute inset-0 pointer-events-none z-0">
              {annotations.map(a => (
                <div key={a.id} className="absolute mix-blend-multiply dark:mix-blend-screen opacity-50" 
                     style={{ backgroundColor: a.color || '#fde047' }} 
                     title={a.noteText} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
