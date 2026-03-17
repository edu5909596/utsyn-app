import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { generateTimeSlots } from '@/lib/utils';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
        }

        const db = getDb();

        // Check for special closure
        const closure = db.prepare('SELECT * FROM special_closures WHERE date = ?').get(date);
        if (closure) {
            return NextResponse.json({ closed: true, reason: 'Special closure', slots: [] });
        }

        // Get day of week (JS: 0=Sun, 1=Mon, ..., 6=Sat)
        const dayOfWeek = new Date(date + 'T00:00:00').getDay();

        // Get open day info
        const openDay = db.prepare('SELECT * FROM open_days WHERE day_of_week = ?').get(dayOfWeek) as {
            open_time: string;
            close_time: string;
            is_active: number;
        } | undefined;

        if (!openDay || !openDay.is_active) {
            return NextResponse.json({ closed: true, reason: 'Not open this day', slots: [] });
        }

        // Get settings for cutoff and interval
        const settingsRows = db.prepare('SELECT key, value FROM settings WHERE key IN (?, ?, ?)').all(
            'booking_cutoff_minutes', 'time_slot_interval', 'max_capacity'
        ) as { key: string; value: string }[];

        const settings: Record<string, string> = {};
        for (const row of settingsRows) {
            settings[row.key] = row.value;
        }

        const cutoff = parseInt(settings.booking_cutoff_minutes || '45');
        const interval = parseInt(settings.time_slot_interval || '15');
        const maxCapacity = parseInt(settings.max_capacity || '60');

        // Generate time slots
        const slots = generateTimeSlots(openDay.open_time, openDay.close_time, interval, cutoff);

        // Get existing reservations for this date
        const reservations = db.prepare(
            'SELECT time_slot, SUM(guests_count) as total_guests FROM reservations WHERE date = ? AND status != ? GROUP BY time_slot'
        ).all(date, 'cancelled') as { time_slot: string; total_guests: number }[];

        const reservationMap: Record<string, number> = {};
        for (const r of reservations) {
            reservationMap[r.time_slot] = r.total_guests;
        }

        // Build availability
        const availability = slots.map(slot => ({
            time: slot,
            booked: reservationMap[slot] || 0,
            available: maxCapacity - (reservationMap[slot] || 0),
            full: (reservationMap[slot] || 0) >= maxCapacity,
        }));

        return NextResponse.json({
            closed: false,
            openTime: openDay.open_time,
            closeTime: openDay.close_time,
            maxCapacity,
            slots: availability,
        });
    } catch (error) {
        console.error('Availability error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
