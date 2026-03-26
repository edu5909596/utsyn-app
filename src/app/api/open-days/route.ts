import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
    try {
        const sql = await getDb();
        const rows = await sql`SELECT * FROM open_days ORDER BY day_of_week`;
        return NextResponse.json(rows, {
            headers: { 'Cache-Control': 'no-store, max-age=0' }
        });
    } catch (error) {
        console.error('Open days GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = (await request.json()) as any[];
        if (!Array.isArray(body)) {
            return NextResponse.json({ error: 'Body must be an array' }, { status: 400 });
        }

        const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
        for (const day of body) {
            if (typeof day.day_of_week !== 'number' || day.day_of_week < 0 || day.day_of_week > 6) {
                return NextResponse.json({ error: 'Invalid day_of_week' }, { status: 400 });
            }
            if (!timeRegex.test(day.open_time) || !timeRegex.test(day.close_time)) {
                return NextResponse.json({ error: 'Invalid time format (HH:MM)' }, { status: 400 });
            }
            if (typeof day.is_active !== 'boolean' && day.is_active !== 0 && day.is_active !== 1) {
                return NextResponse.json({ error: 'Invalid is_active status' }, { status: 400 });
            }
            if (day.time_slots !== undefined && typeof day.time_slots !== 'string') {
                return NextResponse.json({ error: 'Invalid time_slots format' }, { status: 400 });
            }
        }

        const sql = await getDb();
        if (body.length > 0) {
            await sql.begin(async (t: any) => {
                for (const day of body) {
                    const isActive = day.is_active === true || day.is_active === 1;
                    const timeSlots = day.time_slots !== undefined ? day.time_slots : '';
                    const result = await t`UPDATE open_days 
                                           SET open_time = ${day.open_time}, close_time = ${day.close_time}, is_active = ${isActive}, time_slots = ${timeSlots} 
                                           WHERE day_of_week = ${day.day_of_week}`;
                    if (result.count === 0) {
                        throw new Error(`Day ${day.day_of_week} not found in database`);
                    }
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Open days PUT error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
