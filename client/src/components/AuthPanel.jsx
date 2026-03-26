import { useState } from 'react';

export default function AuthPanel({ type, onSubmit }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-stoic-black selection:bg-white selection:text-black">
      <div className="bg-stoic-gray border border-stoic-border p-12 max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-2xl font-light tracking-[0.3em] uppercase text-white mb-2 text-center">
          Gnosys <span className="text-gray-600">PKI</span>
        </h1>
        <p className="text-[10px] tracking-widest uppercase text-gray-500 mb-8 text-center">
          {type === 'setup' ? 'Master Authority Initialization' : 'Secure Terminal Access'}
        </p>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(username, password); }} className="space-y-4">
          <input className="w-full bg-black border border-stoic-border p-4 text-sm text-white focus:border-white outline-none font-mono placeholder:text-gray-800" placeholder="IDENTIFIER" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <input type="password" className="w-full bg-black border border-stoic-border p-4 text-sm text-white focus:border-white outline-none font-mono placeholder:text-gray-800" placeholder="PASSPHRASE" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" className="w-full block border border-white text-black bg-white py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-center hover:bg-gray-300 transition-all mt-6">
            {type === 'setup' ? 'Establish Root Admin' : 'Authenticate'}
          </button>
        </form>
      </div>
    </div>
  );
}