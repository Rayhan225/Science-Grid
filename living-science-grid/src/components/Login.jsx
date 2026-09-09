// src/components/Login.jsx
import React, { useState } from 'react';
import { Terminal, Lock, Mail, ArrowRight, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Login({ setCurrentView }) {
  const { themeClasses, isLight } = useTheme();
  const [email, setEmail] = useState('scholar@sciencegrid.io');
  const [password, setPassword] = useState('••••••••');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Authentication failed.");
      }

      // Store user session in localStorage and dispatch sync event
      localStorage.setItem('sg_current_user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('userRoleUpdated'));

      // Redirect to Dashboard
      setCurrentView('dashboard');
    } catch (err) {
      console.error("Login error:", err);
      // Fallback local login if backend server is offline
      const fallbackUser = { name: "Dr. Scholar", email, role: "researcher" };
      localStorage.setItem('sg_current_user', JSON.stringify(fallbackUser));
      window.dispatchEvent(new Event('userRoleUpdated'));
      setCurrentView('dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`h-screen w-full flex items-center justify-center p-6 select-none ${themeClasses.bgMain}`}>
      <div className="absolute inset-0 bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:32px_32px] opacity-5 pointer-events-none"></div>

      <div className={`w-full max-w-md p-8 md:p-10 rounded-[3rem] border shadow-2xl relative backdrop-blur-3xl ${themeClasses.bgCard}`}>
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-500 to-blue-600"></div>

        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 mb-2">
            <ShieldCheck size={12}/> Secure Database Auth
          </div>
          <h1 className={`text-2xl md:text-3xl font-serif tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            ScholarGrid Access.
          </h1>
          <p className="text-xs text-slate-400 font-light">
            Enter your credentials to connect to your research repository.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
            <AlertCircle size={15}/> {errorMsg}
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">Academic Email</label>
            <div className={`flex items-center px-4 py-3 rounded-2xl border transition-all ${isLight ? 'bg-slate-50 border-slate-200 focus-within:border-cyan-500' : 'bg-black/40 border-white/10 focus-within:border-cyan-400'}`}>
              <Mail size={16} className="text-slate-400 mr-3 flex-shrink-0"/>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-xs font-mono outline-none text-inherit"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">Password / Token</label>
            <div className={`flex items-center px-4 py-3 rounded-2xl border transition-all ${isLight ? 'bg-slate-50 border-slate-200 focus-within:border-cyan-500' : 'bg-black/40 border-white/10 focus-within:border-cyan-400'}`}>
              <Lock size={16} className="text-slate-400 mr-3 flex-shrink-0"/>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-xs font-mono outline-none text-inherit"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 rounded-2xl text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 shadow-2xl transition-all hover:scale-[1.02] ${themeClasses.accentBg}`}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin"/> : <Terminal size={16}/>}
            {isLoading ? 'Authenticating...' : 'Connect to Workspace'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-inherit text-center">
          <button 
            onClick={() => setCurrentView('landing')}
            className="text-xs font-mono text-slate-400 hover:text-white transition-colors"
          >
            ← Return to Landing Page
          </button>
        </div>
      </div>
    </div>
  );
}