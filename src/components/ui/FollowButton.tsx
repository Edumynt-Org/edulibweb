'use client';

import { useState, useEffect } from 'react';
import { IProfileRepository } from '../../domain/repositories/IProfileRepository';

interface FollowButtonProps {
  targetProfileId: string;
  repository: IProfileRepository;
}

export function FollowButton({ targetProfileId, repository }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      const status = await repository.checkIsFollowing(targetProfileId);
      setIsFollowing(status);
      setIsLoading(false);
    };
    checkStatus();
  }, [targetProfileId, repository]);

  const toggleFollow = async () => {
    const previousState = isFollowing;
    // Optimistic UI update
    setIsFollowing(!previousState);

    try {
      if (previousState) {
        await repository.unfollowUser(targetProfileId);
      } else {
        await repository.followUser(targetProfileId);
      }
    } catch (e) {
      // Revert if failed
      setIsFollowing(previousState);
      console.error('Follow action failed', e);
    }
  };

  if (isLoading) return <button disabled className="px-4 py-2 rounded bg-gray-200">Loading...</button>;

  return (
    <button 
      onClick={toggleFollow} 
      className={`px-4 py-2 rounded font-medium transition-colors ${
        isFollowing 
          ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' 
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {isFollowing ? 'Unfollow' : 'Follow'}
    </button>
  );
}
