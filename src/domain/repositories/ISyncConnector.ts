import { SyncStatus } from '../models/SyncStatus';

export interface ISyncConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getSyncStatus(): Promise<SyncStatus>;
  migrateGuestData(profileId: string): Promise<void>;
}
