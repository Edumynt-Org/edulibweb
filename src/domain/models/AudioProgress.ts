export interface AudioProgress {
  profileId: string | null;
  bookId: string;
  audioChapterId: string;
  positionSeconds: number;
  durationSeconds: number;
  status: 'started' | 'completed';
  completedAt?: Date;
  lastListenedAt: Date;
}
