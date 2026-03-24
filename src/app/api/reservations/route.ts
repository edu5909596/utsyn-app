import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { generateConfirmationCode, sanitizeInput, validatePhone, validateEmail } from '@/lib/utils';

// Rate limiting map (simple in-memory)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // max requests per window
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
        return true;
    }
    if (entry.count >= RATE_LIMIT) {
        return false;
    }
    entry.count++;
    return true;
}

export async function GET(request: NextRequest) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const status = searchParams.get('status');
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        const sql = await getDb();
        const result = await sql`
            SELECT * FROM reservations 
            WHERE 1=1
            ${date ? sql`AND date = ${date}` : sql``}
            ${status && status !== 'all' ? sql`AND status = ${status}` : sql``}
            ${from ? sql`AND date >= ${from}` : sql``}
            ${to ? sql`AND date <= ${to}` : sql``}
            ORDER BY date DESC, time_slot ASC
        `;
        return NextResponse.json(result);
    } catch (error) {
        console.error('Reservations GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        if (!checkRateLimit(ip)) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const body = await request.json();
        const { guest_name, phone, email, guests_count, date, time_slot, comment } = body;

        // Validation
        if (!guest_name || guest_name.trim().length < 2) {
            return NextResponse.json({ error: 'Name is required (min 2 characters)' }, { status: 400 });
        }
        if (!phone || !validatePhone(phone)) {
            return NextResponse.json({ error: 'Valid phone number is required' }, { status: 400 });
        }
        if (email && !validateEmail(email)) {
            return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
        }
        if (!guests_count || guests_count < 1 || guests_count > 60) {
            return NextResponse.json({ error: 'Guests count must be between 1 and 60' }, { status: 400 });
        }
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
        }
        if (!time_slot || !/^\d{2}:\d{2}$/.test(time_slot)) {
            return NextResponse.json({ error: 'Invalid time slot' }, { status: 400 });
        }

        const sql = await getDb();

        // Check if date is open
        const dayOfWeek = new Date(date + 'T00:00:00').getDay();
        const openDays = await sql`SELECT * FROM open_days WHERE day_of_week = ${dayOfWeek} AND is_active = 1`;
        const openDay = openDays[0];
        if (!openDay) {
            return NextResponse.json({ error: 'Restaurant is closed this day' }, { status: 400 });
        }

        // Check for special closure
        const closures = await sql`SELECT * FROM special_closures WHERE date = ${date}`;
        const closure = closures[0];
        if (closure) {
            return NextResponse.json({ error: 'Restaurant is closed this day (special closure)' }, { status: 400 });
        }

        // Check capacity
        const maxCapacityRows = await sql`SELECT value FROM settings WHERE key = 'max_capacity'`;
        const maxCapacityRow = maxCapacityRows[0] as { value: string } | undefined;
        const maxCapacity = parseInt(maxCapacityRow?.value || '60');

        const existingTotalRows = await sql`
            SELECT COALESCE(SUM(guests_count), 0) as total 
            FROM reservations 
            WHERE date = ${date} AND time_slot = ${time_slot} AND status != 'cancelled'
        `;
        const existingTotal = existingTotalRows[0] as { total: number | string };

        if (Number(existingTotal.total) + guests_count > maxCapacity) {
            return NextResponse.json({ error: 'Not enough capacity for this time slot' }, { status: 400 });
        }

        // Generate unique confirmation code
        let confirmationCode: string = '';
        let attempts = 0;
        do {
            confirmationCode = generateConfirmationCode();
            const existingCodes = await sql`SELECT id FROM reservations WHERE confirmation_code = ${confirmationCode}`;
            if (existingCodes.length === 0) break;
            attempts++;
        } while (attempts < 10);

        // Insert reservation with 'needs_seat' status
        const [newRes] = await sql`
            INSERT INTO reservations (guest_name, phone, email, guests_count, date, time_slot, comment, status, confirmation_code)
            VALUES (${sanitizeInput(guest_name)}, ${sanitizeInput(phone)}, ${sanitizeInput(email || '')}, ${guests_count}, ${date}, ${time_slot}, ${sanitizeInput(comment || '')}, 'needs_seat', ${confirmationCode})
            RETURNING id
        `;

        // SMS notification for received booking (if configured)
        try {
            const templates = await sql`SELECT value FROM settings WHERE key = 'sms_template_received'`;
            const templateRow = templates[0] as { value: string } | undefined;
            if (templateRow?.value) {
                let message = templateRow.value;
                message = message.replace(/{kode}/g, confirmationCode || '');
                message = message.replace(/{dato}/g, date);
                message = message.replace(/{tid}/g, time_slot);
                message = message.replace(/{antall}/g, guests_count.toString());
                
                const { sendSms } = await import('@/lib/sms');
                await sendSms(phone, message);
            }
        } catch (err) {
            console.error('Failed to send received SMS', err);
        }

        return NextResponse.json({
            success: true,
            id: Number(newRes.id),
            confirmation_code: confirmationCode,
        }, { status: 201 });
    } catch (error) {
        console.error('Reservations POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
