export interface UserShelf {
  id: string;
  profileId: string;
  name: string;
  slug: string;
  description?: string;
  isPrivate: boolean;
  sortOrder: number;
  dateCreated: string;
  dateUpdated?: string;
}
