import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryAuthRepository } from '../../src/data/mock/MemoryAuthRepository';
import { MemoryLibraryRepository } from '../../src/data/mock/MemoryLibraryRepository';
import { MemorySyncConnector } from '../../src/data/mock/MemorySyncConnector';

describe('Backend-Agnostic Abstraction Layer - edulibweb', () => {
  describe('MemoryAuthRepository - Guest State & Auth Flow (AC: #2)', () => {
    let authRepo: MemoryAuthRepository;

    beforeEach(() => {
      authRepo = new MemoryAuthRepository();
    });

    it('must cleanly return an anonymous guest profile when booted without session without throwing an exception', async () => {
      const user = await authRepo.getCurrentUser();
      expect(user).toBeDefined();
      expect(user.isAnonymous).toBe(true);
      expect(user.role).toBe('anonymous');
      expect(user.id).toBe('guest');
    });

    it('must transition to authenticated state upon login', async () => {
      const authUser = await authRepo.login('reader@edumynt.org', 'password123');
      expect(authUser.isAnonymous).toBe(false);
      expect(authUser.role).toBe('reader');
      expect(authUser.email).toBe('reader@edumynt.org');
      
      const currentUser = await authRepo.getCurrentUser();
      expect(currentUser.id).toBe(authUser.id);
    });

    it('must transition back to anonymous guest upon logout', async () => {
      await authRepo.login('reader@edumynt.org', 'password123');
      await authRepo.logout();
      const user = await authRepo.getCurrentUser();
      expect(user.isAnonymous).toBe(true);
    });

    it('must support migrateGuestState cleanly', async () => {
      await expect(authRepo.migrateGuestState('profile-uuid-123')).resolves.toBeUndefined();
    });
  });

  describe('MemoryLibraryRepository - Catalog Access (AC: #1)', () => {
    it('must allow querying catalog books without authentication exceptions', async () => {
      const libRepo = new MemoryLibraryRepository();
      const books = await libRepo.getCatalogBooks();
      expect(Array.isArray(books)).toBe(true);
      expect(books.length).toBeGreaterThan(0);
    });

    it('must find book by id and search catalog', async () => {
      const libRepo = new MemoryLibraryRepository();
      const searchResults = await libRepo.searchCatalog('library');
      expect(Array.isArray(searchResults)).toBe(true);
    });
  });

  describe('MemorySyncConnector - Sync Status (AC: #1)', () => {
    it('must provide sync connection and status', async () => {
      const syncConnector = new MemorySyncConnector();
      await syncConnector.connect();
      const status = await syncConnector.getSyncStatus();
      expect(status.isConnected).toBe(true);
      await syncConnector.disconnect();
      const offlineStatus = await syncConnector.getSyncStatus();
      expect(offlineStatus.isConnected).toBe(false);
    });
  });
});
