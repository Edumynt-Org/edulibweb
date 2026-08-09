'use server';

import { cookies } from 'next/headers';

export async function setTokens(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();
  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
}

export async function clearTokens() {
  const cookieStore = await cookies();
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
}

export async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get('access_token')?.value || null;
}

export async function getRefreshToken() {
  const cookieStore = await cookies();
  return cookieStore.get('refresh_token')?.value || null;
}
