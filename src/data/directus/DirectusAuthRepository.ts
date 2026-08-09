import { IAuthRepository } from '../../domain/repositories/IAuthRepository';
import { AppUser } from '../../domain/models/User';
import { ITokenStorage } from '../../domain/repositories/ITokenStorage';

export class DirectusAuthRepository implements IAuthRepository {
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(private baseUrl: string, private tokenStorage?: ITokenStorage) {}

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

    return {
      id: userResult.data.id,
      email: userResult.data.email,
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
    throw new Error('Method not implemented.');
  }

  async register(email: string, password: string, displayName: string, username: string): Promise<AppUser> {
    const response = await fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        first_name: displayName,
        username, 
        role: '0e0d3c31-4754-4856-bbe8-71ff7803e082',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMessage = result.errors?.[0]?.message || 'Registration failed';
      throw new Error(errorMessage);
    }

    return {
      id: result.data.id,
      email: result.data.email,
      displayName: result.data.first_name,
      role: '0e0d3c31-4754-4856-bbe8-71ff7803e082',
      isAnonymous: false,
    };
  }
}
