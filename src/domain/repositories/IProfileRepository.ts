export interface IProfileRepository {
  setCurrentUserId(userId: string): void;
  getProfileIdByUsername(username: string): Promise<string | null>;
  followUser(targetProfileId: string): Promise<void>;
  unfollowUser(targetProfileId: string): Promise<void>;
  checkIsFollowing(targetProfileId: string): Promise<boolean>;
}
