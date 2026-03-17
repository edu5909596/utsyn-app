export function generateConfirmationCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

export function formatDate(dateStr: string, locale: string = 'no'): string {
    const date = new Date(dateStr + 'T00:00:00');
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    };
    const loc = locale === 'no' ? 'nb-NO' : 'en-US';
    return date.toLocaleDateString(loc, options);
}

export function formatTime(time: string): string {
    return time.replace(':', '.');
}

export function getDayName(dayOfWeek: number, locale: string = 'no'): string {
    const no = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
    const en = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return locale === 'no' ? no[dayOfWeek] : en[dayOfWeek];
}

export function generateTimeSlots(openTime: string, closeTime: string, intervalMinutes: number = 15, cutoffMinutes: number = 45): string[] {
    const slots: string[] = [];
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);

    const openTotal = openH * 60 + openM;
    const closeTotal = closeH * 60 + closeM - cutoffMinutes;

    for (let t = openTotal; t <= closeTotal; t += intervalMinutes) {
        const h = Math.floor(t / 60).toString().padStart(2, '0');
        const m = (t % 60).toString().padStart(2, '0');
        slots.push(`${h}:${m}`);
    }
    return slots;
}

export function sanitizeInput(input: string): string {
    return input
        .replace(/[<>]/g, '')
        .trim()
        .slice(0, 500);
}

export function validatePhone(phone: string): boolean {
    const cleaned = phone.replace(/[\s\-\+\(\)]/g, '');
    return /^\d{8,15}$/.test(cleaned);
}

export function validateEmail(email: string): boolean {
    if (!email) return true; // email is optional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
