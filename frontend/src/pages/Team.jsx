import { useEffect, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { api } from '../api/client';

const AVATAR_COLORS = [
  '#6366F1', '#EC4899', '#14B8A6', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#84CC16',
];

export default function Team() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    avatar_color: AVATAR_COLORS[0],
    role: 'member',
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    api
      .getMembers()
      .then(setMembers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.createMember(form);
      setShowModal(false);
      setForm({ name: '', email: '', avatar_color: AVATAR_COLORS[0], role: 'member' });
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="text-slate-500 mt-1">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Add Member
        </button>
      </div>

      {members.length === 0 ? (
        <div className="card p-16 text-center">
          <Users className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-slate-500 font-medium">No team members yet</p>
          <button className="btn-primary mt-6" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Member
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {members.map((m) => (
            <div key={m.id} className="card p-5 flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                style={{ backgroundColor: m.avatar_color }}
              >
                {m.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 truncate">{m.name}</p>
                {m.email && (
                  <p className="text-sm text-slate-500 truncate">{m.email}</p>
                )}
                <span className="inline-block mt-1 badge bg-slate-100 text-slate-600 capitalize">
                  {m.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <form
            onSubmit={handleCreate}
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
          >
            <h2 className="text-lg font-bold text-slate-900">Add Team Member</h2>
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="label">Role</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div>
              <label className="label">Avatar Color</label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, avatar_color: c })}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      form.avatar_color === c
                        ? 'ring-2 ring-offset-2 ring-slate-400 scale-110'
                        : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
