import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { hashPassword, getAuthUser } from '@/lib/auth';

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const sql = await getDb();
        const rows = await sql`SELECT id, username, display_name, role, created_at FROM users ORDER BY created_at DESC`;
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Users GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { username, password, display_name, role } = body;

        if (!username || username.length < 3) {
            return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
        }
        if (!password || password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }
        if (!['admin', 'staff'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        const sql = await getDb();
        const existingResult = await sql`SELECT id FROM users WHERE username = ${username}`;
        if (existingResult.length > 0) {
            return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
        }

        const passwordHash = await hashPassword(password);
        await sql`INSERT INTO users (username, password_hash, display_name, role) 
                  VALUES (${username}, ${passwordHash}, ${display_name || username}, ${role})`;

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        console.error('Users POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
