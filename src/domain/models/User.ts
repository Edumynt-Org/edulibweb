export interface AppUser {
  id: string;
  role: string;
  isAnonymous: boolean;
  email?: string;
  username?: string;
  displayName?: string;
  currentStreak?: number;
  lastStreakDate?: string;
}
