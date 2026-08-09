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
  async migrateGuestData(profileId: string): Promise<void> {
    // 1. Migrate chapter_progress
    const anonChapters = await this.db.getAll(
      "SELECT * FROM chapter_progress WHERE profile IS NULL OR profile = 'anonymous' OR profile = ''"
    );
    for (const anon of anonChapters) {
      const existing = await this.db.getOptional(
        "SELECT * FROM chapter_progress WHERE profile = ? AND chapter = ?",
        [profileId, anon.chapter]
      );
      if (existing) {
        // Merge strategy: max progress_percent, then max last_read_at
        const anonProgress = anon.progress_percent || 0;
        const existProgress = existing.progress_percent || 0;
        const anonTime = anon.last_read_at ? new Date(anon.last_read_at).getTime() : 0;
        const existTime = existing.last_read_at ? new Date(existing.last_read_at).getTime() : 0;

        if (anonProgress > existProgress || (anonProgress === existProgress && anonTime > existTime)) {
          await this.db.execute(
            "UPDATE chapter_progress SET progress_percent = ?, last_position = ?, status = ?, completed_at = ?, last_read_at = ? WHERE id = ?",
            [anon.progress_percent, anon.last_position, anon.status, anon.completed_at, anon.last_read_at, existing.id]
          );
        }
        await this.db.execute("DELETE FROM chapter_progress WHERE id = ?", [anon.id]);
      } else {
        await this.db.execute("UPDATE chapter_progress SET profile = ? WHERE id = ?", [profileId, anon.id]);
      }
    }

    // 2. Migrate audio_progress
    const anonAudio = await this.db.getAll(
      "SELECT * FROM audio_progress WHERE profile IS NULL OR profile = 'anonymous' OR profile = ''"
    );
    for (const anon of anonAudio) {
      const existing = await this.db.getOptional(
        "SELECT * FROM audio_progress WHERE profile = ? AND audio_chapter = ?",
        [profileId, anon.audio_chapter]
      );
      if (existing) {
        const anonPos = anon.position_seconds || 0;
        const existPos = existing.position_seconds || 0;
        const anonTime = anon.last_listened_at ? new Date(anon.last_listened_at).getTime() : 0;
        const existTime = existing.last_listened_at ? new Date(existing.last_listened_at).getTime() : 0;

        if (anonPos > existPos || (anonPos === existPos && anonTime > existTime)) {
          await this.db.execute(
            "UPDATE audio_progress SET position_seconds = ?, duration_seconds = ?, status = ?, completed_at = ?, last_listened_at = ? WHERE id = ?",
            [anon.position_seconds, anon.duration_seconds, anon.status, anon.completed_at, anon.last_listened_at, existing.id]
          );
        }
        await this.db.execute("DELETE FROM audio_progress WHERE id = ?", [anon.id]);
      } else {
        await this.db.execute("UPDATE audio_progress SET profile = ? WHERE id = ?", [profileId, anon.id]);
      }
    }

    // 3. Migrate reading_preferences
    const anonPrefs = await this.db.getAll(
      "SELECT * FROM reading_preferences WHERE profile IS NULL OR profile = 'anonymous' OR profile = ''"
    );
    for (const anon of anonPrefs) {
      const existing = await this.db.getOptional(
        "SELECT * FROM reading_preferences WHERE profile = ?",
        [profileId]
      );
      if (existing) {
        // Just delete anonymous to avoid duplicates, keep existing profile preferences
        await this.db.execute("DELETE FROM reading_preferences WHERE id = ?", [anon.id]);
      } else {
        await this.db.execute("UPDATE reading_preferences SET profile = ? WHERE id = ?", [profileId, anon.id]);
      }
    }

    // 4. Migrate annotations (just assign profile, no conflict resolution needed)
    await this.db.execute(
      "UPDATE annotations SET profile = ? WHERE profile IS NULL OR profile = 'anonymous' OR profile = ''",
      [profileId]
    );
  }
}
