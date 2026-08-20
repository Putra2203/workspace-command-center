import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, getExpectedToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    const expectedUser = process.env.ADMIN_USERNAME || 'admin';
    const expectedPassword = process.env.ADMIN_PASSWORD || 'admin';

    if (username === expectedUser && password === expectedPassword) {
      const token = getExpectedToken();
      const res = NextResponse.json({ success: true, message: 'Logged in successfully' });

      res.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days session
      });

      return res;
    }

    return NextResponse.json(
      { error: 'Username atau password salah' },
      { status: 401 }
    );
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'Gagal memproses login' },
      { status: 500 }
    );
  }
}
