import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

function isValidIsoDate(dateStr: string | null): boolean {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/**
 * GET /api/menu/daily?date=YYYY-MM-DD
 * Returns the menu for a specific date.
 * If there are day-specific items assigned, returns only those (grouped by category).
 * Otherwise returns default active menu items.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');

        const sql = await getDb();
        const categories = await sql`SELECT * FROM menu_categories ORDER BY sort_order`;

        let items: any[] = [];
        let isDaySpecific = false;

        if (isValidIsoDate(date)) {
            // Check if there are day-specific entries
            const dayCheck = await sql`SELECT COUNT(*) FROM menu_day_items WHERE date = ${date}`;
            if (Number(dayCheck[0].count) > 0) {
                isDaySpecific = true;
                items = await sql`
                    SELECT mi.* FROM menu_items mi
                    INNER JOIN menu_day_items mdi ON mi.id = mdi.menu_item_id
                    WHERE mdi.date = ${date} AND mi.is_active = true
                `;
            }
        }

        if (!isDaySpecific) {
            items = await sql`SELECT * FROM menu_items WHERE is_active = true`;
        }

        const itemsByCategory = new Map<number, any[]>();
        for (const item of items) {
            const catId = Number(item.category_id);
            const list = itemsByCategory.get(catId) || [];
            list.push(item);
            itemsByCategory.set(catId, list);
        }

        const menuWithItems = categories.map((cat: any) => ({
            ...cat,
            items: itemsByCategory.get(Number(cat.id)) || []
        }));

        return NextResponse.json({ categories: menuWithItems, isDaySpecific }, {
            headers: { 'Cache-Control': 'no-store, max-age=0' }
        });
    } catch (error) {
        console.error('Menu daily GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/menu/daily
 * Assign menu items to a specific date.
 * Body: { date: string, item_ids: number[] }
 * Replaces all assignments for that date.
 */
export async function POST(request: NextRequest) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { date, item_ids } = body;

        if (!isValidIsoDate(date)) {
            return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
        }
        if (!Array.isArray(item_ids)) {
            return NextResponse.json({ error: 'item_ids must be an array' }, { status: 400 });
        }

        const sql = await getDb();
        await sql.begin(async (t: any) => {
            // Remove existing assignments for this date
            await t`DELETE FROM menu_day_items WHERE date = ${date}`;
            
            // Insert new assignments
            for (const itemId of item_ids) {
                const id = Number(itemId);
                if (!isNaN(id) && id > 0) {
                    await t`INSERT INTO menu_day_items (date, menu_item_id) VALUES (${date}, ${id}) ON CONFLICT DO NOTHING`;
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Menu daily POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/menu/daily?date=YYYY-MM-DD
 * Remove all day-specific menu assignments for a date (revert to default menu).
 */
export async function DELETE(request: NextRequest) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');

        if (!isValidIsoDate(date)) {
            return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
        }

        const sql = await getDb();
        await sql`DELETE FROM menu_day_items WHERE date = ${date}`;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Menu daily DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
