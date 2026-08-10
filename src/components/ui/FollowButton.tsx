'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IProfileRepository } from '../../domain/repositories/IProfileRepository';
import { getAccessToken } from '../../actions/auth';

function profileIdFromToken(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json) as Record<string, unknown>;
    return typeof claims.profile === 'string'
      ? claims.profile
      : typeof claims.profile_id === 'string'
        ? claims.profile_id
        : typeof claims.id === 'string'
          ? claims.id
          : typeof claims.sub === 'string'
            ? claims.sub
            : null;
  } catch {
    return null;
  }
}

interface FollowButtonProps {
  targetUsername: string;
  repository: IProfileRepository;
}

export function FollowButton({ targetUsername, repository }: FollowButtonProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [isSelf, setIsSelf] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const accessToken = await getAccessToken();
      setToken(accessToken);
      
      const currentProfileId = accessToken ? profileIdFromToken(accessToken) : null;
      if (currentProfileId) {
        repository.setCurrentUserId(currentProfileId);
      }
      
      const resolvedTargetId = await repository.getProfileIdByUsername(targetUsername);
      setTargetId(resolvedTargetId);

      if (resolvedTargetId && currentProfileId === resolvedTargetId) {
        setIsSelf(true);
        setIsLoading(false);
        return;
      }
      
      if (resolvedTargetId) {
        const status = await repository.checkIsFollowing(resolvedTargetId);
        setIsFollowing(status);
      }
      setIsLoading(false);
    };
    checkStatus();
  }, [targetUsername, repository]);

  const toggleFollow = async () => {
    if (!token || !profileIdFromToken(token)) {
      setShowAuthModal(true);
      return;
    }

    const previousState = isFollowing;
    // Optimistic UI update
    setIsFollowing(!previousState);

    try {
      const profileId = profileIdFromToken(token);
      if (profileId) {
        repository.setCurrentUserId(profileId);
      }
      
      if (!targetId) return;

      if (previousState) {
        await repository.unfollowUser(targetId);
      } else {
        await repository.followUser(targetId);
      }
    } catch (e) {
      // Revert if failed
      setIsFollowing(previousState);
      console.error('Follow action failed', e);
    }
  };

  if (isLoading) return <button disabled className="px-4 py-2 rounded bg-gray-200">Loading...</button>;
  if (isSelf || !targetId) return null;

  return (
    <>
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

      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-zinc-900">
            <h3 className="mb-4 text-xl font-bold dark:text-white">Sign in to follow</h3>
            <p className="mb-6 text-zinc-600 dark:text-zinc-400">Create an account or sign in to build your reading network.</p>
            <button 
              type="button" 
              onClick={() => { router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`); }} 
              className="mb-3 w-full rounded-lg bg-blue-600 py-2 font-medium text-white"
            >
              Sign In / Register
            </button>
            <button 
              type="button" 
              onClick={() => setShowAuthModal(false)} 
              className="w-full rounded-lg bg-zinc-100 py-2 font-medium dark:bg-zinc-800 dark:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
