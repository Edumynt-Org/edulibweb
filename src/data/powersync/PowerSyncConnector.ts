import { PowerSyncBackendConnector, PowerSyncCredentials, PowerSyncDatabase } from '@powersync/web';

export class PowerSyncConnector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<PowerSyncCredentials> {
    const response = await fetch('/api/powersync-token');
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
