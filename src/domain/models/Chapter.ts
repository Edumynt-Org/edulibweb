export interface Chapter {
  id: string;
  title: string;
  slug: string;
  chapterType: string;
  countsTowardCompletion: boolean;
  content: string;
  summary?: string;
}
