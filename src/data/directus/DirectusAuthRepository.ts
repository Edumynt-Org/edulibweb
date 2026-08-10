import { IAuthRepository } from '../../domain/repositories/IAuthRepository';
import { AppUser } from '../../domain/models/User';
import { ITokenStorage } from '../../domain/repositories/ITokenStorage';
import { ISyncConnector } from '../../domain/repositories/ISyncConnector';

export class DirectusAuthRepository implements IAuthRepository {
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(private baseUrl: string, private tokenStorage?: ITokenStorage, private syncConnector?: ISyncConnector) {}

  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.tokenStorage) {
      return fetch(url, options);
    }

    let accessToken = await this.tokenStorage.getAccessToken();

    const getHeaders = (token: string | null) => ({
      ...options.headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });

    let response = await fetch(url, { ...options, headers: getHeaders(accessToken) });

    if (response.status === 401) {
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        this.refreshPromise = this.refreshSession().finally(() => {
          this.isRefreshing = false;
          this.refreshPromise = null;
        });
      }
      
      try {
        await this.refreshPromise;
        accessToken = await this.tokenStorage.getAccessToken();
        response = await fetch(url, { ...options, headers: getHeaders(accessToken) });
      } catch (error) {
        // Refresh failed, return the original 401 response or throw
        return response;
      }
    }

    return response;
  }

  async getCurrentUser(): Promise<AppUser> {
    const response = await this.fetchWithAuth(`${this.baseUrl}/users/me`);
    if (!response.ok) throw new Error('Not authenticated');
    const result = await response.json();
    return {
      id: result.data.id,
      email: result.data.email,
      username: result.data.username || result.data.first_name || result.data.email,
      displayName: result.data.first_name,
      role: result.data.role,
      isAnonymous: false,
    };
  }
  
  async login(email: string, password: string): Promise<AppUser> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMessage = result.errors?.[0]?.message || 'Login failed';
      throw new Error(errorMessage);
    }

    if (this.tokenStorage) {
      await this.tokenStorage.setTokens(result.data.access_token, result.data.refresh_token);
    }

    const userResponse = await this.fetchWithAuth(`${this.baseUrl}/users/me`);
    const userResult = await userResponse.json();

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user profile');
    }

    if (this.syncConnector) {
      await this.syncConnector.migrateGuestData(userResult.data.id);
    }

    return {
      id: userResult.data.id,
      email: userResult.data.email,
      username: userResult.data.username || userResult.data.first_name || userResult.data.email,
      displayName: userResult.data.first_name,
      role: userResult.data.role,
      isAnonymous: false,
    };
  }

  async logout(): Promise<void> {
    let refreshToken: string | null = null;
    if (this.tokenStorage) {
      refreshToken = await this.tokenStorage.getRefreshToken();
    }

    if (refreshToken) {
      await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
    }

    if (this.tokenStorage) {
      await this.tokenStorage.clearTokens();
    }
  }

  async refreshSession(): Promise<void> {
    if (!this.tokenStorage) return;

    const refreshToken = await this.tokenStorage.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token available');

    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken, mode: 'json' }),
    });

    if (!response.ok) {
      await this.tokenStorage.clearTokens();
      throw new Error('Session expired');
    }

    const result = await response.json();
    await this.tokenStorage.setTokens(result.data.access_token, result.data.refresh_token);
  }

  async migrateGuestState(newProfileId: string): Promise<void> {
    if (this.syncConnector) {
      try {
        await this.syncConnector.migrateGuestData(newProfileId);
      } catch (e) {
        throw new Error(`Failed to migrate guest data: ${e}`);
      }
    }
  }

  async register(email: string, password: string, firstName: string, lastName: string): Promise<AppUser> {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const response = await fetch(`${this.baseUrl}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        verification_url: `${origin}/verify-email`,
      }),
    });

    const text = await response.text();
    const result = text ? JSON.parse(text) : {};

    if (!response.ok) {
      const errorMessage = result.errors?.[0]?.message || 'Registration failed';
      throw new Error(errorMessage);
    }

    // Directus /users/register returns 204 No Content for security
    return {
      id: 'pending',
      email: email,
      username: firstName || email,
      displayName: firstName,
      role: 'pending',
      isAnonymous: false,
    };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const response = await fetch(`${this.baseUrl}/auth/password/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email, 
        reset_url: `${origin}/reset-password`
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      const result = text ? JSON.parse(text) : {};
      throw new Error(result.errors?.[0]?.message || 'Failed to request password reset');
    }
  }
}
