'use client';

import React, { useEffect, useState } from 'react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

interface Reservation {
    id: number;
    guest_name: string;
    phone: string;
    guests_count: number;
    date: string;
    time_slot: string;
    status: string;
}

export default function Dashboard() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/reservations?status=confirmed')
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setReservations(data);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayReservations = reservations.filter(r => r.date === todayStr);
    const upcomingReservations = reservations.filter(r => r.date > todayStr);

    const todayGuests = todayReservations.reduce((sum, r) => sum + r.guests_count, 0);
    const upcomingGuests = upcomingReservations.reduce((sum, r) => sum + r.guests_count, 0);

    return (
        <>
            <div className="admin-header">
                <h1 className="admin-title">Oversikt</h1>
                <Link href="/bestill" className="btn btn-primary" target="_blank">Vis nettside</Link>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-label">Reservasjoner i dag ({formatDate(todayStr)})</div>
                    <div className="stat-value">{todayReservations.length}</div>
                    <div style={{ marginTop: 'var(--space-sm)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        Totalt {todayGuests} gjester i dag
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Kommende reservasjoner</div>
                    <div className="stat-value">{upcomingReservations.length}</div>
                    <div style={{ marginTop: 'var(--space-sm)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        Totalt {upcomingGuests} gjester
                    </div>
                </div>
            </div>

            <div className="admin-form-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                    <h2 style={{ fontSize: 'var(--font-size-xl)' }}>Dagens reservasjoner</h2>
                    <Link href="/admin/reservasjoner" className="btn btn-ghost btn-sm">Se alle &rarr;</Link>
                </div>

                {todayReservations.length === 0 ? (
                    <p className="empty-state">Ingen reservasjoner for i dag.</p>
                ) : (
                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Tidspunkt</th>
                                    <th>Navn</th>
                                    <th>Antall</th>
                                    <th>Telefon</th>
                                </tr>
                            </thead>
                            <tbody>
                                {todayReservations.sort((a, b) => a.time_slot.localeCompare(b.time_slot)).map(r => (
                                    <tr key={r.id}>
                                        <td><strong>{r.time_slot}</strong></td>
                                        <td>{r.guest_name}</td>
                                        <td>{r.guests_count} personer</td>
                                        <td>{r.phone}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
