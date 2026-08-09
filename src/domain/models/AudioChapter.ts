export interface AudioChapter {
  id: string;
  title: string;
  slug: string;
  audioFileUrl: string;
  durationSeconds: number;
  linkedTextChapter?: string;
}
