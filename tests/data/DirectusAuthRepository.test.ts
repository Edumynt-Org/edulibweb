import { DirectusAuthRepository } from '../../src/data/directus/DirectusAuthRepository';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('DirectusAuthRepository', () => {
  let repository: DirectusAuthRepository;
  let mockTokenStorage: any;

  beforeEach(() => {
    mockTokenStorage = {
      getAccessToken: vi.fn().mockResolvedValue('access-token'),
      getRefreshToken: vi.fn().mockResolvedValue('refresh-token'),
      setTokens: vi.fn().mockResolvedValue(undefined),
      clearTokens: vi.fn().mockResolvedValue(undefined),
    };
    repository = new DirectusAuthRepository('http://localhost:8056', mockTokenStorage);
    global.fetch = vi.fn();
  });

  describe('register', () => {
    it('calls Directus users endpoint with correct payload', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'new-user-id',
            email: 'test@example.com',
            role: '0e0d3c31-4754-4856-bbe8-71ff7803e082'
          }
        })
      });

      const user = await repository.register('test@example.com', 'password123', 'Test User', 'testuser');
      
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8056/users', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          first_name: 'Test User',
          username: 'testuser',
          role: '0e0d3c31-4754-4856-bbe8-71ff7803e082'
        })
      }));
      
      expect(user.id).toBe('new-user-id');
    });

    it('throws an error if the request fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          errors: [{ message: 'Email already exists' }]
        })
      });

      await expect(repository.register('test@example.com', 'password123', 'Test User', 'testuser'))
        .rejects
        .toThrow('Email already exists');
    });
  });

  describe('login', () => {
    it('calls Directus auth endpoint and returns user', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            expires: 900000
          }
        })
      });
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'user-id',
            email: 'test@example.com',
            first_name: 'Test User',
            role: '0e0d3c31-4754-4856-bbe8-71ff7803e082'
          }
        })
      });

      const user = await repository.login('test@example.com', 'password123');
      
      expect(global.fetch).toHaveBeenNthCalledWith(1, 'http://localhost:8056/auth/login', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        })
      }));

      expect(user.id).toBe('user-id');
    });
  });

  describe('logout', () => {
    it('calls Directus logout endpoint', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });
      await repository.logout();
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8056/auth/logout', expect.any(Object));
    });
  });
});
