import { ITokenStorage } from '../../domain/repositories/ITokenStorage';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../../actions/auth';

export class ClientTokenStorage implements ITokenStorage {
  async getAccessToken(): Promise<string | null> {
    return getAccessToken();
  }

  async getRefreshToken(): Promise<string | null> {
    return getRefreshToken();
  }

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    return setTokens(accessToken, refreshToken);
  }

  async clearTokens(): Promise<void> {
    return clearTokens();
  }
}
