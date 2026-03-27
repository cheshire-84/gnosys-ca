import React, { useState, useEffect } from 'react';
import { Menu, X, LayoutDashboard, Key, FileText, Settings2, Download, Cpu, Plus, LogOut } from 'lucide-react';

// Import our new refactored pages and components
import AuthUI from './components/AuthUI';
import Dashboard from './pages/Dashboard';
import Certificates from './pages/Certificates';
import AdminPanel from './pages/AdminPanel';
import Documentation from './pages/Documentation';

const API_BASE = "/api";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('gnosys_pki_token') || '');
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('gnosys_pki_user') || '');
  const [setupRequired, setSetupRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [activeItem, setActiveItem] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [domain, setDomain] = useState('');
  const [sanIp, setSanIp] = useState('');
  const [status, setStatus] = useState('SYSTEM_READY');
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ cpu: 0, mem: 0, disk: 0, uptime: 0 });
  const [users, setUsers] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);

  const apiCall = async (endpoint, options = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
      if ((res.status === 401 || res.status === 403) && !endpoint.includes('/auth/status') && !endpoint.includes('/auth/login')) {
        handleLogout();
      }
      return res;
    } catch (err) {
      addLog(`ERR: Link to ${endpoint} timed out.`);
      return { ok: false, json: () => ({ error: 'Connection Failed' }) };
    }
  };

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

  const handleLogin = async (username, password) => {
    const res = await apiCall('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    const data = await res.json();
    if (res.ok) {
      setToken(data.token); setCurrentUser(data.username);
      localStorage.setItem('gnosys_pki_token', data.token); localStorage.setItem('gnosys_pki_user', data.username);
      addLog(`Session authenticated: Operator ${data.username}`);
    } else setStatus(`AUTH_FAILED: ${data.error}`);
  };

  const handleSetup = async (username, password) => {
    const res = await apiCall('/auth/setup', { method: 'POST', body: JSON.stringify({ username, password }) });
    if (res.ok) { setSetupRequired(false); addLog("Master Authority Established. Local node secured."); }
  };

  const handleLogout = () => {
    setToken(''); setCurrentUser('');
    localStorage.removeItem('gnosys_pki_token'); localStorage.removeItem('gnosys_pki_user');
  };

  const issueCert = async () => {
    if (!domain) return;
    setStatus('SIGNING_REQUEST...');
    const res = await apiCall('/issue', { method: 'POST', body: JSON.stringify({ commonName: domain, sanIp: sanIp || undefined }) });
    if (res.ok) {
      setStatus(`SUCCESS: ${domain.toUpperCase()} SIGNED`);
      setDomain(''); setSanIp('');
      addLog(`Registry update: Issued certificate for ${domain}`);
      await fetchData();
    } else {
      const errData = await res.json(); setStatus(`ERROR: ${errData.error || 'SIGNATURE_FAILED'}`);
    }
  };

  const revokeCert = async (slug) => {
    const res = await apiCall(`/revoke/${slug}`, { method: 'DELETE' });
    if (res.ok) { setStatus(`REVOKED: ${slug.toUpperCase()}`); addLog(`Asset Purged: Revoked ${slug}`); await fetchData(); }
  };

  const addLog = (msg) => setStatus(msg);

  if (isLoading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white font-mono text-[10px] tracking-[0.5em]">INITIALIZING_VAULT...</div>;
  if (setupRequired) return <AuthUI type="setup" onSubmit={handleSetup} />;
  if (!token) return <AuthUI type="login" onSubmit={handleLogin} />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-400 font-sans selection:bg-white selection:text-black flex flex-col overflow-hidden relative">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-[0.015] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 bg-[length:100%_2px,3px_100%]"></div>

      <header className="flex items-center justify-between h-14 px-6 bg-[#0a0a0a] border-b border-[#262626] shrink-0 z-40">
        <div className="flex items-center space-x-6">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden text-white"><Menu size={20} /></button>
          <span className="text-[10px] tracking-[0.4em] font-bold uppercase text-white">Pegasus CA // <span className="text-gray-600 font-normal italic">v4.0_ENTERPRISE</span></span>
        </div>
        <div className="hidden md:flex flex-1 max-w-xl mx-12">
          <div className="relative w-full group">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] text-gray-700 font-bold">$</span>
            <input type="text" placeholder="QUERY_REGISTRY..." className="w-full bg-black/40 border border-[#1a1a1a] rounded-sm py-2 pl-8 pr-4 text-[11px] font-mono text-white focus:border-white/20 outline-none transition-all placeholder:text-gray-800" />
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
        <aside className={`fixed md:relative z-50 h-full w-64 bg-[#0a0a0a] border-r border-[#262626] flex flex-col transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="p-4 border-b border-[#1a1a1a] flex justify-between items-center text-[9px] font-bold tracking-[0.2em] text-gray-600 uppercase">
            Vault_Navigation {isSidebarOpen && <button onClick={() => setIsSidebarOpen(false)}><X size={16}/></button>}
          </div>
          <nav className="flex-1 py-4">
            {[ { icon: LayoutDashboard, label: 'Dashboard' }, { icon: Key, label: 'Issued Certificates' }, { icon: FileText, label: 'Documentation' }, { icon: Settings2, label: 'Admin Panel' }].map((item) => (
              <button key={item.label} onClick={() => { setActiveItem(item.label); setIsSidebarOpen(false); }} className={`w-full flex items-center space-x-4 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${activeItem === item.label ? 'text-white border-l-2 border-white bg-white/5' : 'text-gray-600 hover:text-white border-l-2 border-transparent hover:bg-white/2'}`}>
                <item.icon size={14} /><span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-6 border-t border-[#1a1a1a]">
             <div className="flex items-center gap-2 text-[8px] font-bold text-gray-700 uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-green-900 shadow-[0_0_5px_rgba(5,150,105,0.4)] animate-pulse"></div>ROOT_KEY_HARDWARE_SECURE
             </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden">
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
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-600 mt-2 italic font-bold">Pegasus_Authority_Registry // Master_Node_Audit</p>
              </header>

              {activeItem === 'Dashboard' && <Dashboard history={history} stats={stats} status={status} domain={domain} setDomain={setDomain} sanIp={sanIp} setSanIp={setSanIp} issueCert={issueCert} />}
              {activeItem === 'Issued Certificates' && <Certificates history={history} token={token} revokeCert={revokeCert} API_BASE={API_BASE} />}
              {activeItem === 'Documentation' && <Documentation />}
              {activeItem === 'Admin Panel' && <AdminPanel users={users} apiKeys={apiKeys} currentUser={currentUser} apiCall={apiCall} fetchData={fetchData} addLog={addLog} />}

            </div>
          </div>
        </main>
      </div>

      <footer className="h-12 border-t border-[#262626] bg-[#0a0a0a] flex items-center justify-between px-8 text-[8px] uppercase tracking-[0.4em] font-bold text-gray-800 z-40 shrink-0">
          <div className="flex gap-10"><span>Pegasus Authority // Hardware Vault Secure</span><span className="text-gray-900">||</span><span>Link_Status: Nominal</span></div>
          <div className="flex items-center gap-4"><Cpu size={10} className="animate-pulse text-gray-700" /><span>Entropy_Pool: Stable_State</span></div>
      </footer>
    </div>
  );
}