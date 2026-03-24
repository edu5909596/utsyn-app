import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET() {
    try {
        const sql = await getDb();
        const result = await sql`SELECT COUNT(*) as count FROM users`;
        const count = result[0] as { count: string | number };
        return NextResponse.json({ needsSetup: Number(count.count) === 0 });
    } catch (error) {
        console.error('Setup GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const sql = await getDb();
        const checkResult = await sql`SELECT COUNT(*) as count FROM users`;
        const count = checkResult[0] as { count: string | number };

        if (Number(count.count) > 0) {
            return NextResponse.json({ error: 'Setup already completed' }, { status: 400 });
        }

        const body = await request.json();
        const { username, password, display_name } = body;

        if (!username || username.length < 3) {
            return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
        }
        if (!password || password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        const passwordHash = await hashPassword(password);
        await sql`INSERT INTO users (username, password_hash, display_name, role) 
                  VALUES (${username}, ${passwordHash}, ${display_name || 'Administrator'}, 'admin')`;

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        console.error('Setup POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
