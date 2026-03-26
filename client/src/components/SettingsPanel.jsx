import { useState, useEffect } from 'react';

export default function SettingsPanel({ apiCall }) {
  const [users, setUsers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = async () => {
    const res = await apiCall('/auth/users');
    if (res.ok) setUsers(await res.json());
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    const res = await apiCall('/auth/users', { method: 'POST', body: JSON.stringify({ username: newUsername, password: newPassword }) });
    if (res.ok) { setNewUsername(''); setNewPassword(''); fetchUsers(); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Revoke this administrator's access?")) return;
    const res = await apiCall(`/auth/users/${id}`, { method: 'DELETE' });
    if (res.ok) fetchUsers();
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-12">
      <section className="bg-stoic-gray border border-stoic-border p-8">
        <h2 className="text-xl font-light text-white uppercase tracking-[0.3em] mb-8 border-l-4 border-white pl-6">Access Control</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-6">Active Administrators</h3>
            <ul className="space-y-4">
              {users.map(u => (
                <li key={u._id} className="flex justify-between items-center bg-black border border-stoic-border p-4">
                  <span className="text-white font-mono text-xs">{u.username}</span>
                  <button onClick={() => handleDelete(u._id)} className="text-[10px] text-red-900 hover:text-red-500 font-bold tracking-widest uppercase">Revoke</button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-6">Provision New Admin</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <input className="w-full bg-black border border-stoic-border p-4 text-sm text-white focus:border-white outline-none font-mono placeholder:text-gray-800" placeholder="NEW IDENTIFIER" value={newUsername} onChange={e => setNewUsername(e.target.value)} required />
              <input type="password" className="w-full bg-black border border-stoic-border p-4 text-sm text-white focus:border-white outline-none font-mono placeholder:text-gray-800" placeholder="NEW PASSPHRASE" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              <button type="submit" className="w-full bg-white text-black py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-gray-300 transition-all">Provision Access</button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}