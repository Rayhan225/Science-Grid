import React from 'react';
import { ShieldCheck, Cpu, Network, ArrowRight, Binary } from 'lucide-react';

export default function LandingPage({ onLaunch }) {
  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-sans overflow-x-hidden selection:bg-cyan-500/30 relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      
      <header className="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-pulse"></div>
          <span className="text-xs font-mono uppercase tracking-widest text-white font-bold">ScholarGrid Platform</span>
        </div>
        <button onClick={onLaunch} className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2 rounded-full transition-all">
          Console Terminal <ArrowRight size={14} />
        </button>
      </header>

      <section className="max-w-4xl mx-auto text-center pt-24 pb-16 px-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[10px] font-mono tracking-widest text-cyan-400 uppercase mb-6">
          <Binary size={12}/> Sovereign Scientific OS Environment
        </div>
        <h1 className="text-4xl md:text-6xl font-serif text-white tracking-tight leading-tight mb-6">
          The Workspace for Next-Gen <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
            Algorithmic Peer Review
          </span>
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto font-light leading-relaxed mb-10">
          Deconstruct structural manuscripts, map equation state spaces, and run execution telemetry proofs safely within offline local browser containers overseen by ScholarAI.
        </p>
        <button onClick={onLaunch} className="px-8 py-4 bg-white text-black font-mono text-xs uppercase tracking-widest rounded-xl font-bold shadow-[0_0_30px_rgba(255,255,255,0.05)] hover:shadow-[0_0_40px_rgba(34,211,238,0.2)] transition-all">
          Launch Environment Core
        </button>
      </section>

      <section className="max-w-7xl mx-auto px-8 pb-32 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 relative overflow-hidden group">
            <Network size={20} className="text-blue-400 mb-4" />
            <h3 className="text-xs font-mono uppercase tracking-widest text-white mb-2">Agentic Processing</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-light">Asynchronous dual-phase workers slice dense page scripts down instantly into named JSON vectors under the supervision of ScholarAI.</p>
          </div>
          <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 relative overflow-hidden group">
            <ShieldCheck size={20} className="text-purple-400 mb-4" />
            <h3 className="text-xs font-mono uppercase tracking-widest text-white mb-2">Zero-Leakage Privacy</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-light">Processes embargoed algorithms completely on consumer GPUs, preventing proprietary leak vectors into third-party servers.</p>
          </div>
          <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 relative overflow-hidden group">
            <Cpu size={20} className="text-emerald-400 mb-4" />
            <h3 className="text-xs font-mono uppercase tracking-widest text-white mb-2">WASM Graph Telemetry</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-light">Generates dynamic sliders from discovered algebraic properties, plotting output trajectories directly via native client runtimes.</p>
          </div>
        </div>
      </section>
    </div>
  );
}