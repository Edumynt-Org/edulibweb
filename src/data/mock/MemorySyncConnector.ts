import { ISyncConnector } from '../../domain/repositories/ISyncConnector';
import { SyncStatus } from '../../domain/models/SyncStatus';

export class MemorySyncConnector implements ISyncConnector {
  private connected = false;
  private lastSync?: Date;

  async connect(): Promise<void> {
    if (this.connected) return;
    this.connected = true;
    this.lastSync = new Date();
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async getSyncStatus(): Promise<SyncStatus> {
    return {
      isConnected: this.connected,
      lastSyncedAt: this.lastSync,
      pendingChangesCount: 0,
    };
  }
}
