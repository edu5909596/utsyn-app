import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { name_no, name_en, desc_no, desc_en, price, is_active } = body;

        const sql = await getDb();
        const isActive = is_active === true || is_active === 1;
        await sql`UPDATE menu_items 
                  SET name_no = ${name_no}, name_en = ${name_en}, desc_no = ${desc_no}, desc_en = ${desc_en}, price = ${price}, is_active = ${isActive} 
                  WHERE id = ${id}`;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Menu item PUT error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const sql = await getDb();
        await sql`DELETE FROM menu_items WHERE id = ${id}`;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Menu item DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
