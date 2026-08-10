import { IAuthRepository } from '../../domain/repositories/IAuthRepository';
import { AppUser } from '../../domain/models/User';

const ANONYMOUS_GUEST: AppUser = {
  id: 'guest',
  role: 'anonymous',
  isAnonymous: true,
  displayName: 'Guest Reader',
};

export class MemoryAuthRepository implements IAuthRepository {
  private currentUser: AppUser = { ...ANONYMOUS_GUEST };

  async getCurrentUser(): Promise<AppUser> {
    // Always returns guest state without exceptions if not logged in (AC: #2)
    return { ...this.currentUser };
  }

  async register(email: string, password: string, displayName: string, username: string): Promise<AppUser> {
    console.log(`Mock: Registering user with email ${email}`);
    return this.currentUser;
  }

  async login(email: string, _password: string): Promise<AppUser> {
    this.currentUser = {
      id: 'f6a84c12-97b1-4c12-97b1-21ff7803e082',
      role: 'reader',
      isAnonymous: false,
      email,
      displayName: (email.split('@')[0] || '').trim() || 'Reader',
    };
    return { ...this.currentUser };
  }

  async logout(): Promise<void> {
    this.currentUser = { ...ANONYMOUS_GUEST };
  }

  async refreshSession(): Promise<void> {
    // No-op for memory repo
  }

  async requestPasswordReset(email: string): Promise<void> {
    // No-op for memory repo
  }

  async resetPassword(token: string, password: string): Promise<void> {
    // No-op for memory repo
  }

  async migrateGuestState(_newProfileId: string): Promise<void> {
    // Simulated guest state migration
  }
}
