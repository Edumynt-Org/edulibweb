export interface IProfileRepository {
  followUser(targetProfileId: string): Promise<void>;
  unfollowUser(targetProfileId: string): Promise<void>;
  checkIsFollowing(targetProfileId: string): Promise<boolean>;
}
