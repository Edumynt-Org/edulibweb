import { Book } from './Book';

export interface UserShelfItem {
  id: string;
  shelfId: string;
  bookId: string;
  sortOrder: number;
  dateAdded: string;
  book?: Book; // optional joined book details
}
