import { Book } from './Book';

export interface BookList {
  id: string;
  title: string;
  slug: string;
  listType?: string;
  coverUrl?: string;
  books: Book[];
}
