import { Book } from '../models/Book';
import { BookDetails } from '../models/BookDetails';
import { BookList } from '../models/BookList';
import { Chapter } from '../models/Chapter';
import { ReadingPreferences } from '../models/ReadingPreferences';
import { Annotation } from '../models/Annotation';
import { DictionaryEntry } from '../models/DictionaryEntry';
import { AudioProgress } from '../models/AudioProgress';
import { UserShelf } from '../models/UserShelf';
import { UserShelfItem } from '../models/UserShelfItem';
import { Review, ReviewDraft } from '../models/Review';

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
  updateBookStatus(bookId: string, status: string): Promise<void>;

  createCustomShelf(name: string, isPrivate: boolean, description?: string): Promise<UserShelf>;
  addBookToShelf(shelfId: string, bookId: string): Promise<void>;
  removeBookFromShelf(shelfId: string, bookId: string): Promise<void>;
  reorderShelf(shelfId: string, bookIds: string[]): Promise<void>;
  getPublicShelves(profileId: string): Promise<UserShelf[]>;
  getUserShelves(): Promise<UserShelf[]>;
  getShelfItems(shelfId: string): Promise<UserShelfItem[]>;

  createReview(review: ReviewDraft): Promise<Review>;
  getReviewsForBook(bookId: string): Promise<Review[]>;
  getReviewsByUser(profileId: string): Promise<Review[]>;

  calculateAndSyncDailyStreak(): Promise<void>;
  getDailyStreakCount(profileId: string): Promise<number>;

  getReadingStats(profileId: string): Promise<{
    totalBooksFinished: number;
    totalPagesRead: number;
    totalHoursListened: number;
    pagesByMonth: { month: string; pages: number }[];
    hoursByMonth: { month: string; hours: number }[];
  }>;
  getUserAchievements(profileId: string): Promise<{
    id: string;
    achievement_id: string;
    awarded_at: string;
    name: string;
    description: string;
    badge_icon: string;
  }[]>;
}
