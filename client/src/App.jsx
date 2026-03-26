import { useState, useEffect } from 'react';
import AuthPanel from './components/AuthPanel';
import SettingsPanel from './components/SettingsPanel';
import DocumentationPanel from './components/DocumentationPanel';

const API_BASE = "/api";

function App() {
  const [token, setToken] = useState(localStorage.getItem('gnosys_pki_token') || '');
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('gnosys_pki_user') || '');
  const [setupRequired, setSetupRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [domain, setDomain] = useState('');
  const [sanIp, setSanIp] = useState('');
  const [status, setStatus] = useState('SYSTEM_READY');
  const [history, setHistory] = useState([]);
  const [view, setView] = useState('dashboard');
  const [stats, setStats] = useState({ cpu: 0, mem: 0, disk: 0, uptime: 0 });

  // API Helper with Auth
  const apiCall = async (endpoint, options = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
      if (!endpoint.includes('/auth/status') && !endpoint.includes('/auth/login')) {
        handleLogout();
      }
    }
    return res;
  };

  // 1. Initial Status Check
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await apiCall('/auth/status');
        const data = await res.json();
        setSetupRequired(data.setupRequired);
      } catch (err) {
        console.error("API Unreachable", err);
      } finally {
        setIsLoading(false);
      }
    };
    checkStatus();
  }, []);

  // 2. Data Fetching (Only when logged in)
  useEffect(() => {
    if (!token || setupRequired) return;

    const fetchHistory = async () => {
      const res = await apiCall('/history');
      if (res.ok) setHistory(await res.json());
    };

    const fetchStats = async () => {
      const res = await apiCall('/stats');
      if (res.ok) setStats(await res.json());
    };

    fetchHistory();
    fetchStats();
    
    const interval = setInterval(() => {
      fetchStats();
      fetchHistory();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [token, setupRequired]);

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
      setView('dashboard');
    } else {
      alert(data.error || "Login Failed");
    }
  };

  const handleSetup = async (username, password) => {
    const res = await apiCall('/auth/setup', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (res.ok) {
      alert("Master Authority Established. Please log in.");
      setSetupRequired(false);
    } else {
      const data = await res.json();
      alert(data.error || "Setup Failed");
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
      const histRes = await apiCall('/history');
      if (histRes.ok) setHistory(await histRes.json());
    } else {
      const errData = await res.json();
      setStatus(`ERROR: ${errData.error || 'SIGNATURE_FAILED'}`);
    }
  };

  const revokeCert = async (slug) => {
    if (!window.confirm(`Permanently delete ${slug}?`)) return;
    const res = await apiCall(`/revoke/${slug}`, { method: 'DELETE' });
    if (res.ok) {
      setStatus(`DELETED: ${slug.toUpperCase()}`);
      const histRes = await apiCall('/history');
      if (histRes.ok) setHistory(await histRes.json());
    } else {
      setStatus('ERROR: DELETION_FAILED');
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-white font-mono tracking-widest text-xs">INITIALIZING...</div>;
  if (setupRequired) return <AuthPanel type="setup" onSubmit={handleSetup} />;
  if (!token) return <AuthPanel type="login" onSubmit={handleLogin} />;

  return (
    <div className="min-h-screen flex flex-col p-8 md:p-16 max-w-6xl mx-auto selection:bg-white selection:text-black">
      {/* Navigation */}
      <nav className="flex justify-between items-end mb-12 border-b border-stoic-border pb-4">
        <div className="flex gap-8 text-[10px] tracking-[0.3em] uppercase font-bold">
          <button onClick={() => setView('dashboard')} className={view === 'dashboard' ? "text-white border-b border-white" : "text-gray-600 hover:text-white transition"}>01. TERMINAL</button>
          <button onClick={() => setView('docs')} className={view === 'docs' ? "text-white border-b border-white" : "text-gray-600 hover:text-white transition"}>02. DOCUMENTATION</button>
          <button onClick={() => setView('settings')} className={view === 'settings' ? "text-white border-b border-white" : "text-gray-600 hover:text-white transition"}>03. SETTINGS</button>
        </div>
        <div className="flex gap-4 text-[10px] uppercase font-bold tracking-widest items-center">
          <span className="text-gray-500">USER: {currentUser}</span>
          <button onClick={handleLogout} className="text-red-900 hover:text-red-500">LOGOUT</button>
        </div>
      </nav>

      {/* Views */}
      {view === 'dashboard' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
          <header className="flex justify-between items-end mb-12">
            <div>
              <h1 className="text-3xl font-light tracking-[0.4em] uppercase text-white">
                Gnosys Labs <span className="text-gray-700">PKI</span>
              </h1>
              <p className="text-[10px] tracking-widest uppercase text-gray-500 mt-2">Pegasus-CA // Local Authority Hub</p>
            </div>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { label: 'CPU_LOAD', value: `${stats.cpu}%` },
              { label: 'MEM_USAGE', value: `${stats.mem}%` },
              { label: 'DISK_FILL', value: `${stats.disk}%` },
              { label: 'UPTIME', value: `${stats.uptime}h` }
            ].map((item) => (
              <div key={item.label} className="bg-stoic-gray border border-stoic-border p-4">
                <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">{item.label}</p>
                <p className="text-xl font-light text-white font-mono">{item.value}</p>
                <div className="w-full bg-black h-[2px] mt-2">
                  <div className="bg-white h-full transition-all duration-1000" style={{ width: item.label === 'UPTIME' ? '100%' : item.value }}></div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-12">
              <section className="bg-stoic-gray border border-stoic-border p-8 rounded-sm">
                <h2 className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-6">Request Signature</h2>
                <div className="flex flex-col gap-4">
                  <input className="bg-black border border-stoic-border p-4 text-sm text-white focus:border-white outline-none font-mono w-full placeholder:text-gray-800" placeholder="DOMAIN_NAME (e.g. proxmox.glabs.com) *" value={domain} onChange={(e) => setDomain(e.target.value)} />
                  <div className="flex gap-4">
                    <input className="flex-1 bg-black border border-stoic-border p-4 text-sm text-white focus:border-white outline-none font-mono placeholder:text-gray-800" placeholder="IP_ADDRESS (Optional)" value={sanIp} onChange={(e) => setSanIp(e.target.value)} />
                    <button onClick={issueCert} className="px-10 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-gray-300 transition-colors">Execute</button>
                  </div>
                </div>
              </section>

              <section className="bg-stoic-gray border border-stoic-border p-8 rounded-sm">
                <h2 className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-6">Issued Certs</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead>
                      <tr className="border-b border-stoic-border text-gray-600 uppercase tracking-tighter">
                        <th className="pb-4 font-normal">Common Name</th>
                        <th className="pb-4 font-normal">Issued (GMT)</th>
                        <th className="pb-4 font-normal">Expires (GMT)</th>
                        <th className="pb-4 font-normal">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map(cert => (
                        <tr key={cert.slug} className="border-b border-stoic-border/30 hover:bg-white/[0.02] transition">
                          <td className="py-4 text-gray-300">{cert.commonName}</td>
                          <td className="py-4 text-gray-500 text-[10px] whitespace-nowrap">{cert.issued}</td>
                          <td className="py-4 text-green-900 text-[10px] whitespace-nowrap">{cert.expires}</td>
                          <td className="py-4 flex gap-6">
                            <a href={`${API_BASE}/download/${cert.slug}/crt?token=${token}`} className="text-gray-500 hover:text-white underline">CRT</a>
                            <a href={`${API_BASE}/download/${cert.slug}/key?token=${token}`} className="text-gray-500 hover:text-white underline">KEY</a>
                            <button onClick={() => revokeCert(cert.slug)} className="text-red-900 hover:text-red-500 transition ml-4">DELETE</button>
                          </td>
                        </tr>
                      ))}
                      {history.length === 0 && (
                        <tr><td colSpan="4" className="py-8 text-center text-gray-700 uppercase tracking-widest">No Issued Assets</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <div className="bg-stoic-gray border border-stoic-border p-8">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-4">Master Authority</h3>
                <a href={`${API_BASE}/download-root`} className="block w-full border border-white text-white py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-center hover:bg-white hover:text-black transition-all">Download Root CA</a>
              </div>
              <div className="bg-black border border-stoic-border p-4 font-mono text-[10px] h-40 overflow-hidden relative">
                <div className="text-gray-700 border-b border-stoic-border mb-2 pb-1">SYSTEM_LOG</div>
                <div className="text-white tracking-tighter break-all">&gt; {status}</div>
                <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-black to-transparent"></div>
              </div>
            </aside>
          </div>
        </div>
      )}

      {view === 'docs' && <DocumentationPanel />}
      {view === 'settings' && <SettingsPanel apiCall={apiCall} />}
    </div>
  );
}

export default App;