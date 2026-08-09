'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DirectusAuthRepository } from '../../data/directus/DirectusAuthRepository';
import { ClientTokenStorage } from '../../data/auth/ClientTokenStorage';

export default function ProfileRedirectPage() {
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchUserAndRedirect = async () => {
      try {
        const tokenStorage = new ClientTokenStorage();
        const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8056';
        const authRepo = new DirectusAuthRepository(directusUrl, tokenStorage);
        
        const user = await authRepo.getCurrentUser();
        if (user && user.username) {
          router.replace(`/profile/${user.username}`);
        } else {
          router.replace('/login');
        }
      } catch (e) {
        console.error(e);
        router.replace('/login');
      }
    };
    fetchUserAndRedirect();
  }, [router]);

  if (error) {
    return <div className="p-8 text-center">Failed to load profile. Please try logging in again.</div>;
  }

  return <div className="p-8 text-center animate-pulse">Loading profile...</div>;
}
