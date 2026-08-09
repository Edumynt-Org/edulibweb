export interface Review {
  id: string;
  profileId: string;
  bookId: string;
  rating: number;
  title?: string;
  body: string;
  containsSpoilers: boolean;
  status: string;
  dateCreated: string;
  dateUpdated: string;
}

export type ReviewDraft = Omit<Review, 'id' | 'status' | 'dateCreated' | 'dateUpdated'>;
