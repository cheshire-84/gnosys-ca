import React, { useState } from 'react';
import { Shield } from 'lucide-react';

export default function AuthUI({ type, onSubmit }) {
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
                    <input 
                        name="username"
                        autoComplete="username"
                        className="w-full bg-black border border-[#222] p-4 text-sm text-white focus:border-white outline-none font-mono placeholder:text-gray-800" 
                        placeholder="OPERATOR_ID" 
                        value={u} 
                        onChange={e => setU(e.target.value)} 
                        required 
                    />
                    <input 
                        type="password" 
                        name="password"
                        autoComplete="current-password"
                        className="w-full bg-black border border-[#222] p-4 text-sm text-white focus:border-white outline-none font-mono placeholder:text-gray-800" 
                        placeholder="PASSPHRASE" 
                        value={p} 
                        onChange={e => setP(e.target.value)} 
                        required 
                    />
                    <button type="submit" className="w-full bg-white text-black py-4 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-gray-300 mt-6 shadow-xl">
                        {type === 'setup' ? 'Establish Root Authority' : 'Authenticate_Operator'}
                    </button>
                </form>
            </div>
        </div>
    );
}