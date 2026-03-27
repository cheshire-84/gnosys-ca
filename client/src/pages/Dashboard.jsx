import React from 'react';
import { Key, Server, Cpu, Lock, Clock } from 'lucide-react';

export default function Dashboard({ history, stats, status, domain, setDomain, sanIp, setSanIp, issueCert }) {
  return (
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