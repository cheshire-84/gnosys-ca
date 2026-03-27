import React from 'react';

export default function Certificates({ history, token, revokeCert, API_BASE }) {
  return (
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
  );
}