import { ISyncConnector } from '../../domain/repositories/ISyncConnector';
import { SyncStatus } from '../../domain/models/SyncStatus';
import { AbstractPowerSyncDatabase, PowerSyncBackendConnector } from '@powersync/web';

export class AnonymousConnector implements PowerSyncBackendConnector {
  constructor(
    private endpoint: string = 'https://powersync.edumynt.org',
    private token: string = 'anonymous-guest-token'
  ) {}

  async fetchCredentials() {
    return {
      endpoint: this.endpoint,
      token: this.token
    };
  }

  async uploadData(database: any) {
    const batch = await database.getCrudBatch();
    if (!batch) return;
    // For now, discard local changes to prevent blocking the upload queue
    await batch.complete();
  }
}

export class PowerSyncSyncConnector implements ISyncConnector {
  private db: AbstractPowerSyncDatabase;
  private connector: PowerSyncBackendConnector;
  private isConnecting: boolean = false;

  constructor(db: AbstractPowerSyncDatabase, connector?: PowerSyncBackendConnector) {
    this.db = db;
    this.connector = connector || new AnonymousConnector();
  }

  async connect(): Promise<void> {
    if (this.db.connected || this.isConnecting) return;
    
    this.isConnecting = true;
    try {
      await this.db.connect(this.connector);
    } catch (e: any) {
      console.error('PowerSync connect failed:', e);
      throw new Error(`Failed to connect to sync service: ${e.message}`);
    } finally {
      this.isConnecting = false;
    }
  }

  async disconnect(): Promise<void> {
    await this.db.disconnect();
  }

  async getSyncStatus(): Promise<SyncStatus> {
    const status = this.db.currentStatus;
    return {
      isConnected: status?.connected || false,
      lastSyncedAt: status?.lastSyncedAt ? new Date(status.lastSyncedAt) : undefined,
      pendingChangesCount: status?.dataFlowStatus?.uploading ? 1 : 0,
    };
  }
}
