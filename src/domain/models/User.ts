export interface AppUser {
  id: string;
  role: string;
  isAnonymous: boolean;
  email?: string;
  displayName?: string;
}
