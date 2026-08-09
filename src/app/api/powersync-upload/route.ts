import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const crud = await request.json();
    
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8056';
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Process each CRUD operation sequentially to Directus
    for (const op of crud) {
      let endpoint = `${directusUrl}/items/${op.table}`;
      let method = 'POST';
      let body: any = undefined;

      if (op.op === 'PUT') {
        method = 'POST'; // Create
        body = { id: op.id, ...op.opData };
      } else if (op.op === 'PATCH') {
        method = 'PATCH'; // Update
        endpoint = `${endpoint}/${op.id}`;
        body = op.opData;
      } else if (op.op === 'DELETE') {
        method = 'DELETE'; // Delete
        endpoint = `${endpoint}/${op.id}`;
      }

      const res = await fetch(endpoint, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        console.error(`Directus upload failed for ${op.op} ${op.table}:`, await res.text());
        return NextResponse.json({ error: `Upload failed for ${op.table}` }, { status: res.status });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Proxy Error uploading PowerSync data:', error);
    return NextResponse.json({ error: 'Failed to upload data' }, { status: 500 });
  }
}
