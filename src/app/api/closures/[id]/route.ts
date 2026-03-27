import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id: rawId } = await params;
        const id = Number(rawId);
        if (isNaN(id) || !Number.isInteger(id) || id <= 0) {
            return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
        }

        const sql = await getDb();
        await sql`DELETE FROM special_closures WHERE id = ${id}`;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Closure DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
