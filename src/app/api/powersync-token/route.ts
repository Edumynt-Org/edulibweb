import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8056';
    
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    let response = await fetch(`${directusUrl}/powersync/token`, {
      headers,
    });

    if (response.status === 401) {
      // Token might be expired. Fall back to anonymous token to not break offline sync.
      response = await fetch(`${directusUrl}/powersync/token`);
    }

    if (!response.ok) {
      return NextResponse.json({ error: `Directus responded with ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy Error fetching PowerSync token:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
