export interface Annotation {
  id: string;
  profileId: string;
  chapterId: string;
  annotationType: 'highlight' | 'bookmark' | 'note';
  color?: string;
  selectedText?: string;
  noteText?: string;
  startPosition?: string;
  endPosition?: string;
  createdAt: string;
}
