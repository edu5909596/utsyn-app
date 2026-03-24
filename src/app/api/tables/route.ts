import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const sql = await getDb();
        const rows = await sql`SELECT id, name, capacity, is_active FROM tables_config ORDER BY CASE WHEN name ~ '^[0-9]+$' THEN CAST(name AS INTEGER) ELSE 999999 END ASC, name ASC`;
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Tables GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        let { id, capacity, is_active } = body;

        id = Number(id);
        capacity = Number(capacity);
        const isActiveVal = (is_active === true || is_active === 1) ? 1 : 0;

        if (isNaN(id) || !Number.isInteger(id) || id <= 0) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }
        if (isNaN(capacity) || !Number.isInteger(capacity) || capacity < 0) {
            return NextResponse.json({ error: 'Invalid capacity' }, { status: 400 });
        }

        const sql = await getDb();
        await sql`UPDATE tables_config SET capacity = ${capacity}, is_active = ${isActiveVal === 1} WHERE id = ${id}`;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Tables PUT error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
