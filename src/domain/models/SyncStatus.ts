export interface SyncStatus {
  isConnected: boolean;
  lastSyncedAt?: Date;
  pendingChangesCount: number;
}
