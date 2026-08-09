import { Book } from './Book';

export interface Chapter {
  id: string;
  title: string;
  slug: string;
  chapterType?: string;
  countsTowardCompletion?: boolean;
  content?: string;
  summary?: string;
  sortOrder: number;
}

export interface Part {
  id: string;
  title: string;
  description?: string;
  sortOrder: number;
  chapters: Chapter[];
}

export interface Edition {
  id: string;
  format?: string;
  isbn?: string;
  pages?: number;
  title?: string;
  slug?: string;
  language?: string;
  cover?: string;
  parts: Part[];
  chapters: Chapter[]; // For direct chapters without parts
}

export interface AudioChapter {
  id: string;
  title: string;
  slug: string;
  audioFile?: string;
  durationSeconds?: number;
  linkedTextChapter?: string;
  rightsStatus?: string;
  sortOrder: number;
}

export interface AudioPart {
  id: string;
  title: string;
  description?: string;
  sortOrder: number;
  audioChapters: AudioChapter[];
}

export interface AudioEdition {
  id: string;
  title?: string;
  slug?: string;
  language?: string;
  cover?: string;
  narratorName?: string;
  isComplete?: boolean;
  linkedTextEdition?: string;
  rightsStatus?: string;
  parts: AudioPart[];
  audioChapters: AudioChapter[];
}

export interface BookDetails extends Book {
  originalTitle?: string;
  originalLanguage?: string;
  firstPublishedYear?: number;
  editions: Edition[];
  audioEditions: AudioEdition[];
}
