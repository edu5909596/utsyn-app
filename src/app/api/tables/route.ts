import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const db = getDb();
        const tables = db.prepare('SELECT id, name, capacity, is_active FROM tables_config ORDER BY CAST(name AS INTEGER) ASC').all();
        return NextResponse.json(tables);
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
        const { id, capacity, is_active } = body;

        const db = getDb();
        db.prepare('UPDATE tables_config SET capacity = ?, is_active = ? WHERE id = ?').run(capacity, is_active === true || is_active === 1 ? 1 : 0, id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Tables PUT error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
