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
        // Throwing will let PowerSync retry later if it's a network issue,
        // but if it's a 403 (permissions), we might want to discard. For now, complete it to clear the queue if 4xx.
        if (response.status >= 500) {
          throw new Error('Server error during upload');
        }
      }

      await transaction.complete();
    } catch (error) {
      console.error('Data upload error:', error);
      throw error; // Retries later
    }
  }
}
