import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { sendSms } from '@/lib/sms';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const sql = await getDb();
        
        const rows = await sql`SELECT phone, date, time_slot, guests_count, status, confirmation_code FROM reservations WHERE id = ${id}`;
        const res = rows[0] as any;
        if (!res) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        if (res.status === 'confirmed') {
            return NextResponse.json({ error: 'Reservation already confirmed' }, { status: 409 });
        }
        if (res.status !== 'needs_seat') {
            return NextResponse.json({ error: `Cannot confirm reservation in status: ${res.status}` }, { status: 400 });
        }

        // Atomic update status to confirmed
        const updateResult = await sql`UPDATE reservations SET status = 'confirmed' WHERE id = ${id} AND status = 'needs_seat'`;
        
        if (updateResult.count === 0) {
            return NextResponse.json({ error: 'Failed to confirm reservation (possibly already updated)' }, { status: 409 });
        }
        
        // Send SMS
        const templates = await sql`SELECT value FROM settings WHERE key = 'sms_template_confirmed'`;
        const templateRow = templates[0] as any;
        if (templateRow?.value) {
            let message = templateRow.value;
            message = message.replace(/{kode}/g, res.confirmation_code || '');
            message = message.replace(/{dato}/g, res.date);
            message = message.replace(/{tid}/g, res.time_slot);
            message = message.replace(/{antall}/g, res.guests_count.toString());
            
            await sendSms(res.phone, message);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Confirm error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
