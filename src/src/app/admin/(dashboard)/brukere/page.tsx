'use client';

import React, { useEffect, useState, useCallback } from 'react';

interface User {
  id: number;
  username: string;
  display_name: string;
  role: string;
  created_at: string;
}

export default function BrukerePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // Add user form
  const [showForm, setShowForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'staff'>('staff');
  const [formError, setFormError] = useState('');

  // Delete user modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          display_name: newDisplayName,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowForm(false);
        setNewUsername('');
        setNewPassword('');
        setNewDisplayName('');
        setNewRole('staff');
        fetchUsers();
        showToast('Bruker opprettet!');
      } else {
        setFormError(data.error || 'Feil ved opprettelse');
      }
    } catch {
      setFormError('Noe gikk galt');
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        fetchUsers();
        showToast('Bruker slettet!');
      } else {
        showToast(data.error || 'Feil ved sletting');
      }
    } catch {
      showToast('Noe gikk galt');
    } finally {
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  const deleteUser = (id: number) => {
    const user = users.find(u => u.id === id);
    if (user) {
      setUserToDelete(user);
      setShowDeleteModal(true);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <>
      <div className="admin-header">
        <h1 className="admin-title">Brukere</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Avbryt' : '+ Legg til bruker'}
        </button>
      </div>

      {showForm && (
        <div className="admin-form-section" style={{ marginBottom: 'var(--space-xl)' }}>
          <h3>Ny bruker</h3>
          <form onSubmit={addUser}>
            {formError && <div className="login-error">{formError}</div>}
            <div className="admin-form-grid">
              <div className="form-group">
                <label className="form-label">Visningsnavn</label>
                <input
                  className="form-input"
                  value={newDisplayName}
                  onChange={e => setNewDisplayName(e.target.value)}
                  placeholder="F.eks. Ola Nordmann"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Brukernavn *</label>
                <input
                  className="form-input"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  required
                  minLength={3}
                  placeholder="Minst 3 tegn"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Passord *</label>
                <input
                  className="form-input"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Minst 6 tegn"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Rolle</label>
                <select className="form-select" value={newRole} onChange={e => setNewRole(e.target.value as 'admin' | 'staff')}>
                  <option value="staff">Ansatt</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Opprett bruker</button>
          </form>
        </div>
      )}

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Visningsnavn</th>
              <th>Brukernavn</th>
              <th>Rolle</th>
              <th>Opprettet</th>
              <th>Handling</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.display_name}</td>
                <td><code style={{ background: 'var(--color-bg-alt)', padding: '2px 6px', borderRadius: '4px' }}>{u.username}</code></td>
                <td>
                  <span className={`status-badge ${u.role === 'admin' ? 'status-confirmed' : 'status-completed'}`}>
                    {u.role === 'admin' ? 'Administrator' : 'Ansatt'}
                  </span>
                </td>
                <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  {new Date(u.created_at).toLocaleDateString('nb-NO')}
                </td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u.id)}>
                    Slett
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Slett bruker</h3>
            <p>Er du sikker på at du vil slette brukeren "{userToDelete?.display_name}"?</p>
            <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }}>Avbryt</button>
              <button className="btn btn-danger" onClick={confirmDeleteUser}>Slett</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
