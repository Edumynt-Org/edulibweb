import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const PRIVATE_KEY_PATH = path.join(process.cwd(), '..', 'edumyntlibrarycms', 'powersync_dev.pem');

export async function GET() {
  try {
    const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

    const token = jwt.sign(
      {
        sub: 'anonymous',
        iss: 'edumynt-library',
        aud: ['powersync'],
      },
      privateKey,
      {
        algorithm: 'RS256',
        expiresIn: '5m',
        keyid: 'dev-key-1',
      }
    );

    return NextResponse.json({
      token,
      endpoint: process.env.NEXT_PUBLIC_POWERSYNC_URL || 'http://localhost:8080',
    });
  } catch (error: any) {
    console.error('Failed to generate PowerSync token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token', details: error.message },
      { status: 500 }
    );
  }
}
