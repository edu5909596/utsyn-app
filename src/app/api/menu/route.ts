import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
    try {
        const sql = await getDb();
        const categories = await sql`SELECT * FROM menu_categories ORDER BY sort_order`;
        const items = await sql`SELECT * FROM menu_items`;
        
        const itemsByCategory = new Map<number, any[]>();
        for (const item of items) {
            const catId = Number(item.category_id);
            const list = itemsByCategory.get(catId) || [];
            list.push(item);
            itemsByCategory.set(catId, list);
        }

        const menuWithItems = categories.map(cat => ({
            ...cat,
            items: itemsByCategory.get(Number(cat.id)) || []
        }));

        return NextResponse.json(menuWithItems, {
            headers: { 'Cache-Control': 'no-store, max-age=0' }
        });
    } catch (error) {
        console.error('Menu GET error:', error);
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
        if (user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { category_id, name_no, name_en, desc_no, desc_en, price, is_active } = body;

        if (!category_id || !name_no || !name_en || price === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const sql = await getDb();
        const isActive = is_active === true || is_active === 1;
        const rows = await sql`INSERT INTO menu_items (category_id, name_no, name_en, desc_no, desc_en, price, is_active) 
                                   VALUES (${category_id}, ${name_no}, ${name_en}, ${desc_no}, ${desc_en}, ${price}, ${isActive})
                                   RETURNING id`;
        
        const newItem = rows[0];
        if (!newItem) {
            return NextResponse.json({ success: false, error: 'Insert failed' }, { status: 500 });
        }

        return NextResponse.json({ success: true, id: Number(newItem.id) });
    } catch (error) {
        console.error('Menu POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
