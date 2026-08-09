import { AppUser } from '../models/User';

export interface IAuthRepository {
  getCurrentUser(): Promise<AppUser>;
  login(email: string, password: string): Promise<AppUser>;
  logout(): Promise<void>;
  refreshSession(): Promise<void>;
  migrateGuestState(newProfileId: string): Promise<void>;
  register(email: string, password: string, displayName: string, username: string): Promise<AppUser>;
}
