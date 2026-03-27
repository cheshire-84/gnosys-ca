import React, { useState } from 'react';
import { UserPlus, Terminal } from 'lucide-react';

export default function AdminPanel({ users, apiKeys, currentUser, apiCall, fetchData, addLog }) {
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState(null);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const u = e.target.uname.value;
    const p = e.target.pass.value;
    const res = await apiCall('/auth/users', { method: 'POST', body: JSON.stringify({ username: u, password: p }) });
    if (res.ok) { e.target.reset(); addLog(`Operator provisioned: ${u}`); await fetchData(); }
  };

  const handleCreateToken = async (e) => {
    e.preventDefault();
    const n = e.target.agentName.value;
    const res = await apiCall('/auth/api-keys', { method: 'POST', body: JSON.stringify({ name: n }) });
    if (res.ok) { 
      const data = await res.json();
      setNewlyGeneratedKey(data.key);
      e.target.reset(); 
      addLog(`Service Token generated: ${n}`);
      await fetchData();
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-2 duration-500 space-y-12 pb-20">
       <section className="bg-[#141414] border border-[#262626] p-10 max-w-4xl">
          <div className="flex justify-between items-start mb-10 border-b border-[#1a1a1a] pb-6">
            <div>
              <h2 className="text-xl font-light text-white uppercase tracking-[0.4em]">Access Governance</h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Manage Authorized Authority Operators</p>
            </div>
            <UserPlus className="text-white/20" size={32}/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
               <h4 className="text-[9px] font-bold text-gray-600 uppercase tracking-widest border-l border-white pl-3">Active_Administrators</h4>
               <div className="space-y-4">
                  {users.map(u => (
                    <div key={u._id} className="flex justify-between items-center bg-black border border-[#1a1a1a] p-4 group">
                       <span className="text-white font-mono text-[10px] uppercase tracking-tighter">{u.username}</span>
                       <button 
                          onClick={async () => {
                            if (u.username === currentUser) return;
                            await apiCall(`/auth/users/${u._id}`, { method: 'DELETE' });
                            await fetchData();
                          }}
                          className={`text-[9px] font-bold uppercase tracking-widest ${u.username === currentUser ? 'text-gray-800' : 'text-red-900 hover:text-red-500'}`}
                       >
                          {u.username === currentUser ? 'CURRENT_AUTH' : '[ REVOKE ]'}
                       </button>
                    </div>
                  ))}
               </div>
            </div>
            <div className="space-y-6">
               <h4 className="text-[9px] font-bold text-gray-600 uppercase tracking-widest border-l border-white pl-3">Provision_New_Operator</h4>
               <form onSubmit={handleCreateUser} className="space-y-4">
                  <input 
                    name="uname" 
                    autoComplete="off"
                    className="w-full bg-black border border-[#1a1a1a] p-3 text-[11px] text-white focus:border-white transition-colors outline-none font-mono" 
                    placeholder="IDENTIFIER" 
                    required 
                  />
                  <input 
                    name="pass" 
                    type="password" 
                    autoComplete="new-password"
                    className="w-full bg-black border border-[#1a1a1a] p-3 text-[11px] text-white focus:border-white transition-colors outline-none font-mono" 
                    placeholder="PASSPHRASE" 
                    required 
                  />
                  <button type="submit" className="w-full bg-white text-black py-4 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-gray-300">Grant_Access</button>
               </form>
            </div>
          </div>
       </section>

       <section className="bg-[#141414] border border-[#262626] p-10 max-w-4xl">
          <div className="flex justify-between items-start mb-10 border-b border-[#1a1a1a] pb-6">
            <div>
              <h2 className="text-xl font-light text-white uppercase tracking-[0.4em]">Machine Automation</h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Manage Service Tokens for Certbot Agents</p>
            </div>
            <Terminal className="text-white/20" size={32}/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
               <h4 className="text-[9px] font-bold text-gray-600 uppercase tracking-widest border-l border-white pl-3">Active_Service_Tokens</h4>
               <div className="space-y-4">
                  {apiKeys.map(k => (
                    <div key={k._id} className="flex justify-between items-center bg-black border border-[#1a1a1a] p-4 group">
                       <div className="flex flex-col">
                         <span className="text-white font-mono text-[10px] uppercase tracking-tighter">{k.name}</span>
                         <span className="text-gray-600 font-mono text-[8px] uppercase mt-1">
                           Last Used: {k.lastUsed ? new Date(k.lastUsed).toLocaleDateString() : 'Never'}
                         </span>
                       </div>
                       <button 
                          onClick={async () => {
                            await apiCall(`/auth/api-keys/${k._id}`, { method: 'DELETE' });
                            await fetchData();
                          }}
                          className="text-[9px] font-bold uppercase tracking-widest text-red-900 hover:text-red-500"
                       >
                          [ REVOKE ]
                       </button>
                    </div>
                  ))}
                  {apiKeys.length === 0 && (
                    <div className="text-[9px] text-gray-700 uppercase tracking-widest p-4 text-center border border-[#1a1a1a]">No Active Tokens</div>
                  )}
               </div>
            </div>
            <div className="space-y-6">
               <h4 className="text-[9px] font-bold text-gray-600 uppercase tracking-widest border-l border-white pl-3">Provision_New_Token</h4>
               <form onSubmit={handleCreateToken} className="space-y-4">
                  <input name="agentName" className="w-full bg-black border border-[#1a1a1a] p-3 text-[11px] text-white focus:border-white transition-colors outline-none font-mono" placeholder="AGENT_NAME (e.g., Uptime-Monitor)" required />
                  <button type="submit" className="w-full bg-white text-black py-4 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-gray-300">Generate_Token</button>
               </form>
               {newlyGeneratedKey && (
                 <div className="mt-6 bg-green-900/20 border border-green-900 p-4 animate-in">
                    <p className="text-[9px] text-green-500 font-bold uppercase tracking-widest mb-2">Token Generated - Copy Now</p>
                    <code className="text-[10px] text-white break-all">{newlyGeneratedKey}</code>
                    <p className="text-[8px] text-gray-400 mt-2 uppercase">This token will not be shown again.</p>
                    <button onClick={() => setNewlyGeneratedKey(null)} className="mt-4 text-[9px] text-gray-500 hover:text-white uppercase tracking-widest">[ Dismiss ]</button>
                 </div>
               )}
            </div>
          </div>
       </section>
    </div>
  );
}