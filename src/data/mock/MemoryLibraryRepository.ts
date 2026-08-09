// @ts-nocheck
import { ILibraryRepository } from '../../domain/repositories/ILibraryRepository';
import { Book } from '../../domain/models/Book';
import { BookDetails } from '../../domain/models/BookDetails';
import { BookList } from '../../domain/models/BookList';
import { Chapter } from '../../domain/models/Chapter';
import { ReadingPreferences, DefaultReadingPreferences } from '../../domain/models/ReadingPreferences';
import { Annotation } from '../../domain/models/Annotation';
import { DictionaryEntry } from '../../domain/models/DictionaryEntry';
import { AudioProgress } from '../../domain/models/AudioProgress';

const SAMPLE_BOOKS: Book[] = [
  {
    id: 'a1111111-1111-4b01-90e6-111111111111',
    title: 'The Open Architecture of Knowledge',
    slug: 'open-architecture-knowledge',
    author: 'Elena Rostova',
    description: 'A deep exploration of barrier-free digital libraries.',
    coverUrl: '/covers/open-arch.jpg',
  },
  {
    id: 'b2222222-2222-4b01-90e6-222222222222',
    title: 'Zero Latency Reading Systems',
    slug: 'zero-latency-reading-systems',
    author: 'Dr. Marcus Vance',
    description: 'Optimizing edge storage and local SQLite persistence for books.',
    coverUrl: '/covers/zero-latency.jpg',
  },
];

export class MemoryLibraryRepository implements ILibraryRepository {
  private books: Book[] = [...SAMPLE_BOOKS];
  private readingPrefs: ReadingPreferences = { ...DefaultReadingPreferences };
  private annotations: Annotation[] = [];
  private dictionaryCache: Record<string, DictionaryEntry> = {};
  private audioProgress: AudioProgress[] = [];

  async getCatalogBooks(): Promise<Book[]> {
    return [...this.books];
  }

  async getBookById(id: string): Promise<Book | null> {
    const found = this.books.find((b) => b.id === id);
    return found ? { ...found } : null;
  }

  async getBookDetails(slug: string): Promise<BookDetails | null> {
    const found = this.books.find((b) => b.slug === slug);
    if (!found) return null;
    return {
      ...found,
      chapters: [],
    };
  }

  async searchCatalog(query: string): Promise<Book[]> {
    if (!query || !query.trim()) return [];
    const lower = query.toLowerCase();
    return this.books.filter(
      (b) => b.title.toLowerCase().includes(lower) || b.description.toLowerCase().includes(lower) || b.author.toLowerCase().includes(lower)
    );
  }

  watchCuratedLists(onData: (lists: BookList[]) => void): () => void {
    onData([
      {
        id: 'list-1',
        title: 'Trending Classics',
        slug: 'trending-classics',
        listType: 'manual',
        coverUrl: '',
        books: [this.books[0]]
      },
      {
        id: 'list-2',
        title: 'New Arrivals',
        slug: 'new-arrivals',
        listType: 'dynamic',
        coverUrl: '',
        books: [this.books[1]]
      }
    ]);
    return () => {};
  }
  
  async getChapter(slug: string): Promise<Chapter | null> {
    return {
      id: 'c3333333-3333-4b01-90e6-333333333333',
      title: 'Mock Chapter',
      slug,
      chapterType: 'chapter',
      countsTowardCompletion: true,
      content: '# Mock Chapter\n\nThis is a mock chapter for testing the dual-mode e-reader engine.',
    };
  }
  
  async getChapterProgress(chapterId: string): Promise<{progressPercent: number, scrollPosition: number} | null> {
    // Mock progress implementation for memory repo
    return null; 
  }

  async getLinkedAudioProgress(textChapterId: string): Promise<{progressPercent: number, positionSeconds: number, durationSeconds: number} | null> {
    return null;
  }

  async updateChapterProgress(chapterId: string, progressPercent: number, scrollPosition: number): Promise<void> {
    console.log(`Mock: Updated progress for chapter ${chapterId} to ${progressPercent}% (scroll: ${scrollPosition}px)`);
  }

  async getReadingPreferences(): Promise<ReadingPreferences> {
    return { ...this.readingPrefs };
  }

  async updateReadingPreferences(prefs: Partial<ReadingPreferences>): Promise<void> {
    this.readingPrefs = { ...this.readingPrefs, ...prefs };
    console.log('Mock: Updated reading preferences', this.readingPrefs);
  }

  async getAnnotations(chapterId: string): Promise<Annotation[]> {
    return this.annotations.filter(a => a.chapterId === chapterId);
  }

  async addAnnotation(annotation: Omit<Annotation, 'id' | 'createdAt' | 'profileId'>): Promise<Annotation> {
    const newAnnotation: Annotation = {
      ...annotation,
      id: Math.random().toString(36).substring(7),
      profileId: 'guest',
      createdAt: new Date().toISOString(),
    };
    this.annotations.push(newAnnotation);
    return newAnnotation;
  }

  async updateAnnotation(annotation: Annotation): Promise<void> {
    const idx = this.annotations.findIndex(a => a.id === annotation.id);
    if (idx >= 0) {
      this.annotations[idx] = { ...annotation };
    }
  }

  async deleteAnnotation(annotationId: string): Promise<void> {
    this.annotations = this.annotations.filter(a => a.id !== annotationId);
  }

  async getDefinition(word: string): Promise<DictionaryEntry | null> {
    const cleanWord = word.trim().toLowerCase().replace(/[^a-z]/g, '');
    if (!cleanWord) return null;

    if (this.dictionaryCache[cleanWord]) {
      return this.dictionaryCache[cleanWord];
    }

    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`);
      if (!response.ok) return null;
      const data = await response.json();
      if (data && data.length > 0) {
        const entry: DictionaryEntry = {
          word: data[0].word,
          phonetic: data[0].phonetic || (data[0].phonetics && data[0].phonetics.length > 0 ? data[0].phonetics[0].text : undefined),
          meanings: data[0].meanings.map((m: any) => ({
            partOfSpeech: m.partOfSpeech,
            definitions: m.definitions.map((d: any) => ({
              definition: d.definition,
              example: d.example,
            })),
          })),
        };
        this.dictionaryCache[cleanWord] = entry;
        return entry;
      }
      return null;
    } catch (e) {
      console.error('Failed to fetch definition:', e);
      return null;
    }
  }

  async getAudioProgress(bookId: string, audioChapterId: string): Promise<AudioProgress | null> {
    return this.audioProgress.find(p => p.bookId === bookId && p.audioChapterId === audioChapterId) || null;
  }

  async saveAudioProgress(progress: AudioProgress): Promise<void> {
    const existingIndex = this.audioProgress.findIndex(p => p.bookId === progress.bookId && p.audioChapterId === progress.audioChapterId);
    if (existingIndex >= 0) {
      this.audioProgress[existingIndex] = progress;
    } else {
      this.audioProgress.push(progress);
    }
  }
}
