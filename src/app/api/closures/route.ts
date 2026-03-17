import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = getDb();
        const closures = db.prepare('SELECT * FROM special_closures ORDER BY date ASC').all();
        return NextResponse.json(closures);
    } catch (error) {
        console.error('Closures GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { date, reason_no, reason_en } = body;

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
        }

        const db = getDb();
        db.prepare('INSERT OR REPLACE INTO special_closures (date, reason_no, reason_en) VALUES (?, ?, ?)').run(
            date, reason_no || '', reason_en || ''
        );

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        console.error('Closures POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
