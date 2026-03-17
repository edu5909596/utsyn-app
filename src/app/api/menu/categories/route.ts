import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name_no, name_en, sort_order } = body;

        if (!name_no || !name_en) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const db = getDb();
        const info = db.prepare('INSERT INTO menu_categories (name_no, name_en, sort_order) VALUES (?, ?, ?)').run(
            name_no, name_en, sort_order || 0
        );

        return NextResponse.json({ success: true, id: info.lastInsertRowid });
    } catch (error) {
        console.error('Menu category POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
