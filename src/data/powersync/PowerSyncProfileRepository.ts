import { IProfileRepository } from '../../domain/repositories/IProfileRepository';
import { AbstractPowerSyncDatabase } from '@powersync/web';
import { v4 as uuidv4 } from 'uuid';

export class PowerSyncProfileRepository implements IProfileRepository {
  private db: AbstractPowerSyncDatabase;
  private currentUserId: string = 'guest'; // This will be updated later

  constructor(db: AbstractPowerSyncDatabase) {
    this.db = db;
  }

  setCurrentUserId(userId: string) {
    this.currentUserId = userId;
  }

  async followUser(targetProfileId: string): Promise<void> {
    try {
      if (this.currentUserId === 'guest') return;

      const newId = uuidv4();
      const now = new Date().toISOString();

      await this.db.execute(`
        INSERT OR IGNORE INTO follows (id, follower, following, date_created)
        VALUES (?, ?, ?, ?)
      `, [newId, this.currentUserId, targetProfileId, now]);
    } catch (e: any) {
      console.error('Failed to follow user:', e);
      throw new Error(`Failed to follow user: ${e.message}`);
    }
  }

  async unfollowUser(targetProfileId: string): Promise<void> {
    try {
      if (this.currentUserId === 'guest') return;

      await this.db.execute(`
        DELETE FROM follows
        WHERE follower = ? AND following = ?
      `, [this.currentUserId, targetProfileId]);
    } catch (e: any) {
      console.error('Failed to unfollow user:', e);
      throw new Error(`Failed to unfollow user: ${e.message}`);
    }
  }

  async checkIsFollowing(targetProfileId: string): Promise<boolean> {
    try {
      if (this.currentUserId === 'guest') return false;

      const result = await this.db.getOptional(`
        SELECT id FROM follows
        WHERE follower = ? AND following = ?
      `, [this.currentUserId, targetProfileId]);

      return result !== null;
    } catch (e: any) {
      console.error('Failed to check follow status:', e);
      return false;
    }
  }
}
