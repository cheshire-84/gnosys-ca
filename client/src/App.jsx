import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, Search, ChevronRight, X, LayoutDashboard,
  RefreshCw, Ban, Trash2, Settings2, Shield, Key, 
  FileText, TrendingUp, Download, Lock, Server, Cpu, Plus,
  ExternalLink, Globe, Wind, Terminal, CheckCircle2, AlertCircle, Clock, LogOut, UserPlus
} from 'lucide-react';

/**
 * PEGASUS CA // v4.0_ENTERPRISE
 * Project: Master Authority PKI Console
 * Stack: MERN + OpenSSL Engine
 * Dependencies: npm install lucide-react
 */

const API_BASE = "/api";

export default function App() {
  // --- AUTH & SESSION STATE ---
  const [token, setToken] = useState(localStorage.getItem('gnosys_pki_token') || '');
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('gnosys_pki_user') || '');
  const [setupRequired, setSetupRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // --- APP NAVIGATION ---
  const [activeItem, setActiveItem] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- PKI DATA STATE ---
  const [domain, setDomain] = useState('');
  const [sanIp, setSanIp] = useState('');
  const [status, setStatus] = useState('SYSTEM_READY');
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ cpu: 0, mem: 0, disk: 0, uptime: 0 });
  const [users, setUsers] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState(null);

  const logEndRef = useRef(null);

  // --- API HELPER ---
  const apiCall = async (endpoint, options = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
      if (res.status === 401 || res.status === 403) {
        if (!endpoint.includes('/auth/status') && !endpoint.includes('/auth/login')) {
          handleLogout();
        }
      }
      return res;
    } catch (err) {
      addLog(`ERR: Link to ${endpoint} timed out.`);
      return { ok: false, json: () => ({ error: 'Connection Failed' }) };
    }
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
      try {
        const res = await apiCall('/auth/status');
        const data = await res.json();
        setSetupRequired(data.setupRequired);
      } catch (err) {
        console.error("Authority API Unreachable", err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- CONTINUOUS SYNC ---
  const fetchData = async () => {
    if (!token || setupRequired) return;

    const hRes = await apiCall('/history');
    if (hRes.ok) setHistory(await hRes.json());
    
    const sRes = await apiCall('/stats');
    if (sRes.ok) setStats(await sRes.json());

    if (activeItem === 'Admin Panel') {
      const uRes = await apiCall('/auth/users');
      if (uRes.ok) setUsers(await uRes.json());

      const kRes = await apiCall('/auth/api-keys');
      if (kRes.ok) setApiKeys(await kRes.json());
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [token, setupRequired, activeItem]);

  // --- LOGIC HANDLERS ---
  const handleLogin = async (username, password) => {
    const res = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok) {
      setToken(data.token);
      setCurrentUser(data.username);
      localStorage.setItem('gnosys_pki_token', data.token);
      localStorage.setItem('gnosys_pki_user', data.username);
      addLog(`Session authenticated: Operator ${data.username}`);
    } else {
      setStatus(`AUTH_FAILED: ${data.error}`);
    }
  };

  const handleSetup = async (username, password) => {
    const res = await apiCall('/auth/setup', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (res.ok) {
      setSetupRequired(false);
      addLog("Master Authority Established. Local node secured.");
    }
  };

  const handleLogout = () => {
    setToken('');
    setCurrentUser('');
    localStorage.removeItem('gnosys_pki_token');
    localStorage.removeItem('gnosys_pki_user');
  };

  const issueCert = async () => {
    if (!domain) return;
    setStatus('SIGNING_REQUEST...');
    const res = await apiCall('/issue', {
      method: 'POST',
      body: JSON.stringify({ commonName: domain, sanIp: sanIp || undefined })
    });
    if (res.ok) {
      setStatus(`SUCCESS: ${domain.toUpperCase()} SIGNED`);
      setDomain('');
      setSanIp('');
      addLog(`Registry update: Issued certificate for ${domain}`);
      await fetchData();
    } else {
      const errData = await res.json();
      setStatus(`ERROR: ${errData.error || 'SIGNATURE_FAILED'}`);
    }
  };

  const revokeCert = async (slug) => {
    const res = await apiCall(`/revoke/${slug}`, { method: 'DELETE' });
    if (res.ok) {
      setStatus(`REVOKED: ${slug.toUpperCase()}`);
      addLog(`Asset Purged: Revoked ${slug}`);
      await fetchData();
    }
  };

  const addLog = (msg) => {
    setStatus(msg);
  };

  // --- UI COMPONENTS ---
  if (isLoading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white font-mono text-[10px] tracking-[0.5em]">INITIALIZING_VAULT...</div>;
  
  if (setupRequired) return <AuthUI type="setup" onSubmit={handleSetup} />;
  if (!token) return <AuthUI type="login" onSubmit={handleLogin} />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-400 font-sans selection:bg-white selection:text-black flex flex-col overflow-hidden relative">
      
      {/* SCANLINE OVERLAY */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-[0.015] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 bg-[length:100%_2px,3px_100%]"></div>

      {/* TOP HEADER */}
      <header className="flex items-center justify-between h-14 px-6 bg-[#0a0a0a] border-b border-[#262626] shrink-0 z-40">
        <div className="flex items-center space-x-6">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden text-white">
            <Menu size={20} />
          </button>
          <span className="text-[10px] tracking-[0.4em] font-bold uppercase text-white">
            Pegasus CA // <span className="text-gray-600 font-normal italic">v4.0_ENTERPRISE</span>
          </span>
        </div>

        <div className="hidden md:flex flex-1 max-w-xl mx-12">
          <div className="relative w-full group">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] text-gray-700 font-bold">$</span>
            <input 
              type="text" 
              placeholder="QUERY_REGISTRY..."
              className="w-full bg-black/40 border border-[#1a1a1a] rounded-sm py-2 pl-8 pr-4 text-[11px] font-mono text-white focus:border-white/20 outline-none transition-all placeholder:text-gray-800"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col items-end">
                <span className="text-[9px] font-bold text-white uppercase tracking-widest">{currentUser}</span>
                <span className="text-[8px] text-gray-600 font-mono">AUTHORIZED_OPERATOR</span>
            </div>
            <button onClick={handleLogout} className="h-8 w-8 rounded-sm bg-[#141414] border border-[#262626] flex items-center justify-center hover:border-red-900 transition-colors">
                <LogOut size={14} className="text-gray-500 hover:text-red-500" />
            </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className={`
          fixed md:relative z-50 h-full w-64 bg-[#0a0a0a] border-r border-[#262626] flex flex-col transition-transform duration-300
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-4 border-b border-[#1a1a1a] flex justify-between items-center text-[9px] font-bold tracking-[0.2em] text-gray-600 uppercase">
            Vault_Navigation
            {isSidebarOpen && <button onClick={() => setIsSidebarOpen(false)}><X size={16}/></button>}
          </div>
          <nav className="flex-1 py-4">
            {[
              { icon: LayoutDashboard, label: 'Dashboard' },
              { icon: Key, label: 'Issued Certificates' },
              { icon: FileText, label: 'Documentation' },
              { icon: Settings2, label: 'Admin Panel' },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => { setActiveItem(item.label); setIsSidebarOpen(false); }}
                className={`w-full flex items-center space-x-4 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] transition-all
                  ${activeItem === item.label 
                    ? 'text-white border-l-2 border-white bg-white/5' 
                    : 'text-gray-600 hover:text-white border-l-2 border-transparent hover:bg-white/2'
                  }`}
              >
                <item.icon size={14} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-6 border-t border-[#1a1a1a]">
             <div className="flex items-center gap-2 text-[8px] font-bold text-gray-700 uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-green-900 shadow-[0_0_5px_rgba(5,150,105,0.4)] animate-pulse"></div>
                ROOT_KEY_HARDWARE_SECURE
             </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden">
          
          {/* PERSISTENT ACTION BAR */}
          <div className="px-8 py-4 border-b border-[#1a1a1a] flex flex-wrap gap-8 items-center shrink-0">
              <div className="flex gap-6">
                <button onClick={() => setActiveItem('Dashboard')} className="text-[9px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2">
                    <Plus size={12}/> [ Issue_Asset ]
                </button>
                <a href={`${API_BASE}/download-root`} className="text-[9px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2">
                    <Download size={12}/> [ Export_Root_CA ]
                </a>
              </div>
              <div className="text-[9px] font-mono text-gray-800 ml-auto hidden lg:block uppercase">
                VAULT_NODE: PEGASUS-01 // TZ: {currentTime.toLocaleTimeString([], { hour12: false })}
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-7xl mx-auto space-y-12">
              
              <header className="animate-in fade-in slide-in-from-top-2">
                <h1 className="text-3xl font-light text-white uppercase tracking-[0.4em]">{activeItem}</h1>
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-600 mt-2 italic font-bold">
                  Pegasus_Authority_Registry // Master_Node_Audit
                </p>
              </header>

              {activeItem === 'Dashboard' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <TelemetryCard label="Registry_Size" value={history.length} sub="Issued Assets" icon={<Key size={12}/>}/>
                    <TelemetryCard label="Authority_Uptime" value={`${stats.uptime}h`} sub="Stable State" icon={<Server size={12}/>}/>
                    <TelemetryCard label="Vault_Load" value={`${stats.cpu}%`} sub="CPU Utilization" icon={<Cpu size={12}/>}/>
                    <TelemetryCard label="Security_Status" value="SECURE" sub="Root HSM Active" icon={<Lock size={12}/>}/>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-8 space-y-12">
                        <section className="bg-[#141414] border border-[#262626] p-10">
                            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] mb-8 border-b border-[#1a1a1a] pb-4 italic">Request_Authority_Signature</h3>
                            <div className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-[9px] font-bold text-gray-700 uppercase tracking-widest">Common_Name</label>
                                  <input 
                                    className="w-full bg-black border border-[#222] p-3 text-sm text-white focus:border-white outline-none font-mono placeholder:text-gray-800" 
                                    placeholder="e.g. app.gnosys.labs" 
                                    value={domain} 
                                    onChange={(e) => setDomain(e.target.value)} 
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-bold text-gray-700 uppercase tracking-widest">Subject_Alt_IP (Optional)</label>
                                  <input 
                                    className="w-full bg-black border border-[#222] p-3 text-sm text-white focus:border-white outline-none font-mono placeholder:text-gray-800" 
                                    placeholder="e.g. 10.1.1.100" 
                                    value={sanIp} 
                                    onChange={(e) => setSanIp(e.target.value)} 
                                  />
                                </div>
                              </div>
                              <button onClick={issueCert} className="w-full bg-white text-black py-4 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-gray-300 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                                Execute_Issuance
                              </button>
                            </div>
                        </section>

                        <div className="bg-[#141414] border border-[#262626] overflow-hidden">
                            <div className="px-6 py-4 border-b border-[#1a1a1a]">
                                <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Recent_Registry_Entries</h3>
                            </div>
                            <table className="w-full text-left text-[11px] font-mono">
                                <thead className="bg-[#0a0a0a] text-gray-700 uppercase text-[9px]">
                                    <tr>
                                        <th className="px-6 py-4 font-normal">Status</th>
                                        <th className="px-6 py-4 font-normal">Common Name</th>
                                        <th className="px-6 py-4 font-normal">Issued (GMT)</th>
                                        <th className="px-6 py-4 font-normal text-right">Identifier</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1a1a1a]">
                                    {history.slice(0, 5).map((s, i) => (
                                        <tr key={i} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-900 shadow-[0_0_5px_rgba(5,150,105,0.4)]"></div>
                                            </td>
                                            <td className="px-6 py-4 text-white uppercase">{s.commonName}</td>
                                            <td className="px-6 py-4 text-gray-500">{s.issued}</td>
                                            <td className="px-6 py-4 text-gray-800 text-right group-hover:text-white transition-colors uppercase">0x{s.slug.slice(-6)}</td>
                                        </tr>
                                    ))}
                                    {history.length === 0 && (
                                      <tr><td colSpan="4" className="p-12 text-center text-gray-800 uppercase tracking-widest text-[9px]">Registry_Empty</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                         <div className="bg-black border border-[#262626] p-6 font-mono text-[9px] space-y-2 h-[450px] flex flex-col">
                            <h4 className="text-gray-700 uppercase tracking-widest border-b border-[#1a1a1a] pb-2 mb-4 italic flex justify-between">
                              System_Log <Clock size={10}/>
                            </h4>
                            <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1">
                              <div className="text-gray-500">&gt; Hardware HSM establish link... OK</div>
                              <div className="text-gray-500">&gt; CRL Distribution point online.</div>
                              <div className="text-white">&gt; Status: {status}</div>
                              <div className="animate-pulse text-green-900 mt-4">&gt; Pegasus_Authority_Active</div>
                            </div>
                         </div>

                         <div className="bg-[#141414] border border-[#262626] p-6">
                            <h4 className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-4">Node_Resource_Sync</h4>
                            <div className="space-y-4">
                              <StatBar label="MEM_UTILIZATION" value={`${stats.mem}%`} />
                              <StatBar label="STORAGE_CAPACITY" value={`${stats.disk}%`} />
                            </div>
                         </div>
                    </div>
                  </div>
                </div>
              )}

              {activeItem === 'Issued Certificates' && (
                <div className="animate-in fade-in slide-in-from-right-2 duration-500 bg-[#141414] border border-[#262626] overflow-hidden">
                    <table className="w-full text-left text-[11px] font-mono">
                        <thead className="bg-[#0a0a0a] text-gray-600 uppercase text-[9px] border-b border-[#262626]">
                            <tr>
                                <th className="px-6 py-5">Status</th>
                                <th className="px-6 py-5">Common Name</th>
                                <th className="px-6 py-5">Expires</th>
                                <th className="px-6 py-5 text-right">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a1a1a]">
                            {history.map((s, i) => (
                              <tr key={i} className="hover:bg-white/5 transition-colors group">
                                  <td className="px-6 py-5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-green-900 shadow-[0_0_5px_rgba(5,150,105,0.4)]"></div>
                                  </td>
                                  <td className="px-6 py-5 text-white uppercase">{s.commonName}</td>
                                  <td className="px-6 py-5 text-gray-500">{s.expires}</td>
                                  <td className="px-6 py-5 text-right space-x-6">
                                      <a href={`${API_BASE}/download/${s.slug}/crt?token=${token}`} className="text-gray-400 hover:text-white underline uppercase text-[9px]">CRT</a>
                                      <a href={`${API_BASE}/download/${s.slug}/key?token=${token}`} className="text-gray-400 hover:text-white underline uppercase text-[9px]">KEY</a>
                                      <button onClick={() => revokeCert(s.slug)} className="text-red-900 hover:text-red-500 font-bold uppercase text-[9px] tracking-widest">[ PURGE ]</button>
                                  </td>
                              </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              )}

              {activeItem === 'Documentation' && <DocumentationPanelInternal />}

              {activeItem === 'Admin Panel' && (
                <div className="animate-in fade-in slide-in-from-right-2 duration-500 space-y-12 pb-20">
                   
                   {/* SECTION 1: USERS */}
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
                           <form onSubmit={async (e) => {
                              e.preventDefault();
                              const u = e.target.uname.value;
                              const p = e.target.pass.value;
                              const res = await apiCall('/auth/users', { method: 'POST', body: JSON.stringify({ username: u, password: p }) });
                              if (res.ok) { e.target.reset(); addLog(`Operator provisioned: ${u}`); await fetchData(); }
                           }} className="space-y-4">
                              <input name="uname" className="w-full bg-black border border-[#1a1a1a] p-3 text-[11px] text-white focus:border-white transition-colors outline-none font-mono" placeholder="IDENTIFIER" required />
                              <input name="pass" type="password" className="w-full bg-black border border-[#1a1a1a] p-3 text-[11px] text-white focus:border-white transition-colors outline-none font-mono" placeholder="PASSPHRASE" required />
                              <button type="submit" className="w-full bg-white text-black py-4 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-gray-300">Grant_Access</button>
                           </form>
                        </div>
                      </div>
                   </section>

                   {/* SECTION 2: API KEYS */}
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
                           <form onSubmit={async (e) => {
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
                           }} className="space-y-4">
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
              )}

            </div>
          </div>
        </main>
      </div>

      <footer className="h-12 border-t border-[#262626] bg-[#0a0a0a] flex items-center justify-between px-8 text-[8px] uppercase tracking-[0.4em] font-bold text-gray-800 z-40 shrink-0">
          <div className="flex gap-10">
            <span>Pegasus Authority // Hardware Vault Secure</span>
            <span className="text-gray-900">||</span>
            <span>Link_Status: Nominal</span>
          </div>
          <div className="flex items-center gap-4">
            <Cpu size={10} className="animate-pulse text-gray-700" />
            <span>Entropy_Pool: Stable_State</span>
          </div>
      </footer>

      {/* STYLES */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0a0a0a; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #262626; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #444; }
        .animate-in { animation: fadeIn 0.8s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
}

function TelemetryCard({ label, value, sub, icon }) {
  return (
    <div className="bg-[#141414] border border-[#262626] p-6 hover:border-white transition-all duration-500 group relative overflow-hidden">
      <div className="flex justify-between items-start mb-4 relative z-10">
        <span className="text-[8px] font-bold tracking-[0.3em] text-gray-600 uppercase group-hover:text-white transition-colors">{label}</span>
        <div className="text-gray-700 group-hover:text-white transition-colors">{icon}</div>
      </div>
      <div className="flex items-baseline gap-2 mb-2 relative z-10">
        <span className="text-3xl font-light text-white uppercase tabular-nums">{value}</span>
      </div>
      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest italic relative z-10">{sub}</div>
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
        {icon && React.cloneElement(icon, { size: 64 })}
      </div>
    </div>
  );
}

function StatBar({ label, value }) {
  return (
    <div>
      <div className="flex justify-between text-[8px] font-bold text-gray-700 uppercase tracking-tighter mb-1">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-[2px] bg-black w-full">
        <div className="h-full bg-white transition-all duration-1000 shadow-[0_0_8px_rgba(255,255,255,0.2)]" style={{ width: value }}></div>
      </div>
    </div>
  );
}

function AuthUI({ type, onSubmit }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-6 selection:bg-white selection:text-black">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-[0.015] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 bg-[length:100%_2px,3px_100%]"></div>
      <div className="bg-[#141414] border border-[#262626] p-12 max-w-md w-full animate-in">
        <Shield size={40} className="text-white/20 mx-auto mb-6" />
        <h1 className="text-2xl font-light tracking-[0.4em] uppercase text-white mb-2 text-center">PEGASUS <span className="text-gray-700">CA</span></h1>
        <p className="text-[9px] tracking-widest uppercase text-gray-500 mb-10 text-center font-bold italic border-b border-[#1a1a1a] pb-4">
          {type === 'setup' ? 'Master Authority Initialization' : 'Secure Terminal Access'}
        </p>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(u, p); }} className="space-y-4">
          <input className="w-full bg-black border border-[#222] p-4 text-sm text-white focus:border-white outline-none font-mono placeholder:text-gray-800" placeholder="OPERATOR_ID" value={u} onChange={e => setU(e.target.value)} required />
          <input type="password" className="w-full bg-black border border-[#222] p-4 text-sm text-white focus:border-white outline-none font-mono placeholder:text-gray-800" placeholder="PASSPHRASE" value={p} onChange={e => setP(e.target.value)} required />
          <button type="submit" className="w-full bg-white text-black py-4 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-gray-300 mt-6 shadow-xl">
            {type === 'setup' ? 'Establish Root Authority' : 'Authenticate_Operator'}
          </button>
        </form>
      </div>
    </div>
  );
}

function DocumentationPanelInternal() {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-12 pb-20">
      
      <section>
        <h2 className="text-xl font-light text-white uppercase tracking-[0.3em] mb-8 border-l-4 border-white pl-6">01. Server Initialization (Ubuntu/Debian)</h2>
        <div className="bg-[#141414] border border-[#262626] p-6">
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Core Dependencies & Timezone</h4>
          <pre className="bg-black p-4 font-mono text-[11px] text-gray-500 border border-[#262626] leading-relaxed overflow-x-auto">
{`# 1. Set Timezone to EST (New York)
sudo timedatectl set-timezone America/New_York

# 2. Install Required Packages
sudo apt update
sudo apt install -y jq curl nginx`}
          </pre>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-light text-white uppercase tracking-[0.3em] mb-8 border-l-4 border-white pl-6">02. Trust Establishment</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#141414] border border-[#262626] p-6">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Client OS: Windows</h4>
            <div className="text-xs space-y-3 text-gray-400 font-mono">
              <p className="text-white border-b border-[#1a1a1a] pb-1 inline-block">Workflow:</p>
              <ul className="list-none space-y-1">
                <li>&gt; Navigate to https://ca.gnosys.labs</li>
                <li>&gt; Click "Download Root CA"</li>
                <li>&gt; Store: Local Machine</li>
                <li>&gt; Target: Trusted Root Certification Authorities</li>
              </ul>
            </div>
          </div>
          <div className="bg-[#141414] border border-[#262626] p-6">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Server OS: Ubuntu LXC/VM</h4>
            <pre className="bg-black p-4 font-mono text-[11px] text-gray-500 border border-[#262626] leading-relaxed overflow-x-auto">
{`# 1. Fetch Root CA from API
curl -k -o Gnosys_Root_CA.crt https://ca.gnosys.labs/api/download-root

# 2. Update system trust store
sudo cp Gnosys_Root_CA.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates`}
            </pre>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-light text-white uppercase tracking-[0.3em] mb-8 border-l-4 border-white pl-6">03. Automated Provisioning Agent</h2>
        <div className="bg-[#141414] border border-[#262626] p-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">gnosys-certbot.sh</h4>
            <span className="text-[9px] text-green-900 font-mono uppercase tracking-widest border border-green-900 px-2 py-1">CRON-Ready</span>
          </div>
          <p className="text-xs text-gray-500 font-mono mb-4">Usage: <code className="text-white">./gnosys-certbot.sh &lt;domain.name&gt; [optional_ip]</code></p>
          <pre className="bg-black p-4 font-mono text-[10px] text-gray-400 border border-[#262626] leading-relaxed overflow-x-auto">
{`#!/bin/bash

# ==========================================
# Gnosys Labs - Auto Cert Provisioning Agent
# [ V4 SECURE TOKEN EDITION ]
# ==========================================

CA_URL="https://ca.gnosys.labs"
DEST_DIR="/etc/ssl/gnosys"

# Use a Service Token generated from the Admin Panel
TOKEN="<PASTE_YOUR_GENERATED_SERVICE_TOKEN_HERE>"

if ! command -v jq &> /dev/null; then
    echo "Error: 'jq' is not installed."
    exit 1
fi

if [ -z "$1" ]; then
    echo "Usage: $0 <domain.name> [optional_ip]"
    exit 1
fi

DOMAIN=$1
IP=$2
CERT_FILE="$DEST_DIR/$DOMAIN.crt"

# EXPIRATION CHECK (30 Days = 2592000 seconds)
if [ -f "$CERT_FILE" ]; then
    if openssl x509 -checkend 2592000 -noout -in "$CERT_FILE"; then
        echo "Certificate for $DOMAIN is valid for at least 30 more days. No renewal needed."
        exit 0
    fi
fi

if [ -z "$TOKEN" ] || [[ "$TOKEN" == "<PASTE"* ]]; then
    echo "Error: You must insert a valid Service Token into the script."
    exit 1
fi

echo "-> Requesting signature for $DOMAIN..."
if [ -z "$IP" ]; then
    PAYLOAD="{\\"commonName\\":\\"$DOMAIN\\"}"
else
    PAYLOAD="{\\"commonName\\":\\"$DOMAIN\\", \\"sanIp\\":\\"$IP\\"}"
fi

ISSUE_RES=$(curl -s -k -X POST "$CA_URL/api/issue" \\
    -H "Content-Type: application/json" \\
    -H "Authorization: Bearer $TOKEN" \\
    -d "$PAYLOAD")

SLUG=$(echo "$ISSUE_RES" | jq -r .slug)

if [ "$SLUG" == "null" ] || [ -z "$SLUG" ]; then
    echo "Error: Certificate issuance failed. Is the token expired or invalid?"
    echo "API Response: $ISSUE_RES"
    exit 1
fi

echo "-> Downloading assets..."
sudo mkdir -p "$DEST_DIR"

curl -s -k -X GET "$CA_URL/api/download/$SLUG/crt?token=$TOKEN" -o "/tmp/$DOMAIN.crt"
curl -s -k -X GET "$CA_URL/api/download/$SLUG/key?token=$TOKEN" -o "/tmp/$DOMAIN.key"

sudo mv "/tmp/$DOMAIN.crt" "$DEST_DIR/"
sudo mv "/tmp/$DOMAIN.key" "$DEST_DIR/"
sudo chmod 600 "$DEST_DIR/$DOMAIN.key"

echo "-> Success: Assets deployed to $DEST_DIR"

if systemctl is-active --quiet nginx; then
    echo "-> Restarting NGINX to apply new certificates..."
    sudo systemctl restart nginx
fi`}
          </pre>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-light text-white uppercase tracking-[0.3em] mb-8 border-l-4 border-white pl-6">04. Nginx SSL Template</h2>
        <div className="bg-[#141414] border border-[#262626] p-1">
          <div className="bg-black/50 p-2 border-b border-[#262626] flex justify-between">
            <span className="text-[9px] text-gray-600 font-mono uppercase tracking-widest">/etc/nginx/sites-available/app-config</span>
            <span className="text-[9px] text-green-900 font-mono uppercase tracking-widest">Production Ready</span>
          </div>
          <pre className="p-8 font-mono text-[11px] text-gray-400 overflow-x-auto leading-relaxed">
{`# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name app.gnosys.labs;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name app.gnosys.labs;

    # SSL Configuration (Issued via Pegasus-CA)
    ssl_certificate     /etc/ssl/gnosys/app.gnosys.labs.crt;
    ssl_certificate_key /etc/ssl/gnosys/app.gnosys.labs.key;

    # Stoic SSL hardening
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # Example: Internal API Proxy
    # location /api {
    #     proxy_pass http://127.0.0.1:5000;
    #     proxy_http_version 1.1;
    #     proxy_set_header Upgrade $http_upgrade;
    #     proxy_set_header Connection 'upgrade';
    #     proxy_set_header Host $host;
    # }
}`}
          </pre>
        </div>
      </section>
    </div>
  );
}