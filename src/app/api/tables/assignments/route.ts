import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
import getDb from '@/lib/db';

type SqlClient = postgres.Sql;

export async function GET(request: NextRequest) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');

        if (!date) return NextResponse.json({ error: 'Date is required' }, { status: 400 });

        const sql = await getDb();
        const rows = await sql`
            SELECT ta.id, ta.reservation_id, ta.table_id, r.guest_name, r.time_slot, r.guests_count, r.status 
            FROM table_assignments ta
            JOIN reservations r ON ta.reservation_id = r.id
            WHERE r.date = ${date} AND r.status != 'cancelled'
        `;

        return NextResponse.json(rows);
    } catch (error) {
        console.error('Table assignments GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { reservation_id, table_id } = body;

        if (!reservation_id || !table_id) {
            return NextResponse.json({ error: 'reservation_id and table_id are required' }, { status: 400 });
        }

        const sql = await getDb();

        // Get the reservation's time_slot and date
        const reservations = await sql`SELECT date, time_slot FROM reservations WHERE id = ${reservation_id}`;
        const reservation = reservations[0] as { date: string; time_slot: string } | undefined;
        if (!reservation) {
            return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
        }

        // Check if this table is already assigned to another reservation at the same date+time
        const conflicts = await sql`
            SELECT ta.id, r.guest_name, r.time_slot 
            FROM table_assignments ta
            JOIN reservations r ON ta.reservation_id = r.id
            WHERE ta.table_id = ${table_id} 
              AND r.date = ${reservation.date} 
              AND r.time_slot = ${reservation.time_slot} 
              AND r.id != ${reservation_id}
              AND r.status != 'cancelled'
        `;
        const conflict = conflicts[0];

        if (conflict) {
            return NextResponse.json({ 
                error: `Bord er allerede tildelt ${conflict.guest_name} kl ${conflict.time_slot}` 
            }, { status: 409 });
        }

        try {
            await sql`INSERT INTO table_assignments (reservation_id, table_id) VALUES (${reservation_id}, ${table_id})`;
            await checkAndUpdateReservationStatus(sql, reservation_id);
            return NextResponse.json({ success: true });
        } catch (e: any) {
            // Postgres unique violation code is 23505
            if (e.code === '23505') {
                return NextResponse.json({ error: 'Already assigned' }, { status: 400 });
            }
            throw e;
        }
    } catch (error) {
        console.error('Table assignments POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const reservation_id = searchParams.get('reservation_id');
        const table_id = searchParams.get('table_id');
        
        const sql = await getDb();
        
        if (reservation_id && table_id) {
            await sql`DELETE FROM table_assignments WHERE reservation_id = ${reservation_id} AND table_id = ${table_id}`;
            await checkAndUpdateReservationStatus(sql, reservation_id);
        } else if (reservation_id) {
            await sql`DELETE FROM table_assignments WHERE reservation_id = ${reservation_id}`;
            await checkAndUpdateReservationStatus(sql, reservation_id);
        } else {
             return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Table assignments DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

async function checkAndUpdateReservationStatus(sql: SqlClient, reservation_id: number | string) {
    try {
        const reservations = await sql`SELECT guests_count, status FROM reservations WHERE id = ${reservation_id}`;
        const res = reservations[0];
        if (!res || res.status === 'cancelled' || res.status === 'completed' || res.status === 'no_show') return;
        
        const capacities = await sql`
            SELECT COALESCE(SUM(t.capacity), 0) as total_capacity
            FROM table_assignments ta
            JOIN tables_config t ON ta.table_id = t.id
            WHERE ta.reservation_id = ${reservation_id}
        `;
        
        const capacity = Number(capacities[0]?.total_capacity || 0);
        
        // Only downgrade to needs_seat if a table was unassigned and capacity is no longer enough.
        if (res.status === 'confirmed' && capacity < Number(res.guests_count)) {
             await sql`UPDATE reservations SET status = 'needs_seat' WHERE id = ${reservation_id}`;
        }
    } catch (err) {
        console.error('Failed to update reservation status:', err);
    }
}
