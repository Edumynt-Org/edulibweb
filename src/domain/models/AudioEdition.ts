import { AudioChapter } from './AudioChapter';

export interface AudioEdition {
  id: string;
  bookId: string;
  title: string;
  slug: string;
  language: string;
  cover?: string;
  narratorName?: string;
  chapters: AudioChapter[];
}
