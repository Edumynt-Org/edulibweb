import { Book } from '../models/Book';
import { BookDetails } from '../models/BookDetails';
import { BookList } from '../models/BookList';
import { Chapter } from '../models/Chapter';
import { ReadingPreferences } from '../models/ReadingPreferences';
import { Annotation } from '../models/Annotation';
import { DictionaryEntry } from '../models/DictionaryEntry';
import { AudioProgress } from '../models/AudioProgress';

export interface ILibraryRepository {
  getCatalogBooks(): Promise<Book[]>;
  getBookById(id: string): Promise<Book | null>;
  getBookDetails(slug: string): Promise<BookDetails | null>;
  searchCatalog(query: string): Promise<Book[]>;
  watchCuratedLists(onData: (lists: BookList[]) => void): () => void;
  getChapter(slug: string): Promise<Chapter | null>;
  getChapterProgress(chapterId: string): Promise<{progressPercent: number, scrollPosition: number} | null>;
  getLinkedAudioProgress(textChapterId: string): Promise<{progressPercent: number, positionSeconds: number, durationSeconds: number} | null>;
  updateChapterProgress(chapterId: string, progressPercent: number, scrollPosition: number): Promise<void>;
  getReadingPreferences(): Promise<ReadingPreferences>;
  updateReadingPreferences(prefs: Partial<ReadingPreferences>): Promise<void>;
  
  getAnnotations(chapterId: string): Promise<Annotation[]>;
  addAnnotation(annotation: Omit<Annotation, 'id' | 'createdAt' | 'profileId'>): Promise<Annotation>;
  updateAnnotation(annotation: Annotation): Promise<void>;
  deleteAnnotation(annotationId: string): Promise<void>;

  getDefinition(word: string): Promise<DictionaryEntry | null>;

  getAudioProgress(bookId: string, audioChapterId: string): Promise<AudioProgress | null>;
  saveAudioProgress(progress: AudioProgress): Promise<void>;
}
