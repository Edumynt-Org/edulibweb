import { PowerSyncBackendConnector, PowerSyncCredentials, PowerSyncDatabase } from '@powersync/web';

export class PowerSyncConnector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<PowerSyncCredentials> {
    const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8056';
    const response = await fetch(`${directusUrl}/powersync/token`);
    if (!response.ok) {
      throw new Error(`Failed to fetch PowerSync token: ${response.status}`);
    }
    const data = await response.json();
    return {
      endpoint: data.endpoint,
      token: data.token,
    };
  }

  async uploadData(database: PowerSyncDatabase): Promise<void> {
    // Read-only catalog — nothing to upload
  }
}
