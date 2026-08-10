import { PowerSyncBackendConnector, PowerSyncCredentials, PowerSyncDatabase } from '@powersync/web';

export class PowerSyncConnector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<PowerSyncCredentials> {
    const response = await fetch(`/api/powersync-token`);
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
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    try {
      const response = await fetch('/api/powersync-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction.crud)
      });
      
      if (!response.ok) {
        console.error('Failed to upload data:', response.status);
        // If 401, the token is expired. Throwing will allow PowerSync to retry once the token is refreshed by the app.
        // If 5xx, it's a server issue, throw to retry.
        if (response.status === 401 || response.status >= 500) {
          throw new Error(`Upload failed with status ${response.status}`);
        }
      }

      await transaction.complete();
    } catch (error) {
      console.error('Data upload error:', error);
      throw error; // Retries later
    }
  }
}
