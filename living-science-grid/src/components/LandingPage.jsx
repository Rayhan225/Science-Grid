import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, Cpu, Network, ArrowRight, Binary, Sliders, 
  BookOpen, Database, Play, Check, X, Sparkles, Terminal, 
  Layers, Lock, RefreshCw, Volume2, Globe, Users, Code, Activity, Pause, RotateCcw,
  Maximize2, ChevronRight, ChevronLeft, Eye, Zap, MousePointerClick, FolderPlus, 
  FileText, FileSpreadsheet, Folder, MonitorPlay, CheckCircle2, ArrowUpRight, GitCompare, Sparkle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function LandingPage({ onLaunch, onOpenAuth }) {
  const { themeClasses, isLight, theme } = useTheme();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [visiblePhases, setVisibleSections] = useState({});
  const [interactiveVal, setInteractiveVal] = useState(55);

  const containerRef = useRef(null);
  const triggerRefs = useRef([]);

  // Track global viewport scroll for smooth parallax calculations
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      const currentScroll = window.scrollY;
      if (totalScroll > 0) {
        setScrollProgress((currentScroll / totalScroll) * 100);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Multi-layer Intersection Observer for scroll-unlocked states
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setVisibleSections(prev => ({ ...prev, [entry.target.id]: true }));
        }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -100px 0px' });

    triggerRefs.current.forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  // Continuous background animation loop for mock tools
  useEffect(() => {
    const interval = setInterval(() => {
      setInteractiveVal(v => (v < 90 ? v + 1 : 30));
    }, 120);
    return () => clearInterval(interval);
  }, []);

  return (
    <div ref={containerRef} className={`min-h-screen font-sans overflow-x-hidden relative select-none transition-colors duration-500 pb-32 ${isLight ? 'bg-slate-50 text-slate-900 selection:bg-cyan-500/15' : 'bg-[#050505] text-slate-300 selection:bg-cyan-500/30'}`}>
      
      {/* -------------------------------------------
          GLOBAL CINEMATIC BACKDROP LAYER
      ------------------------------------------- */}
      <div className="fixed top-0 left-0 w-full h-1 bg-transparent z-50">
        <div className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 transition-all duration-100" style={{ width: `${scrollProgress}%` }}></div>
      </div>
      <div className={`fixed inset-0 pointer-events-none z-0 transition-opacity duration-700 opacity-40 ${isLight ? 'bg-[linear-gradient(to_right,#00000004_1px,transparent_1px),linear-gradient(to_bottom,#00000004_1px,transparent_1px)] bg-[size:50px_50px]' : 'bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:50px_50px]'}`}></div>

      {/* Persistent Navigation Header */}
      <header className="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center relative z-40">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.9)] animate-pulse"></div>
          <span className={`text-xs font-mono uppercase tracking-widest font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>ScholarGrid Platform OS</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#pipeline" className={`text-xs font-mono uppercase tracking-widest transition-colors hidden md:block ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>Guided Journey</a>
          <a href="#features" className={`text-xs font-mono uppercase tracking-widest transition-colors hidden md:block ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>System Features</a>
          <a href="#comparison" className={`text-xs font-mono uppercase tracking-widest transition-colors hidden md:block ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>Comparison Matrix</a>
          
          <button onClick={() => onOpenAuth ? onOpenAuth('login') : onLaunch()} className={`text-xs font-mono uppercase tracking-widest transition-colors ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>
            Sign In
          </button>
          <button onClick={() => onOpenAuth ? onOpenAuth('register') : onLaunch()} className={`flex items-center gap-2 text-xs font-mono uppercase tracking-widest px-5 py-2.5 rounded-full transition-all shadow-lg border ${isLight ? 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800' : 'bg-white text-black hover:bg-slate-100'}`}>
            Get Started <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* -------------------------------------------
          HERO MODULE CLUSTER
      ------------------------------------------- */}
      <section className="min-h-[85vh] flex flex-col justify-center items-center text-center px-6 relative z-10 pt-12 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[10px] font-mono tracking-widest text-cyan-400 uppercase mb-8 shadow-inner animate-fadeIn">
          <Binary size={12}/> Sovereign Scientific Operating Environment
        </div>
        <h1 className={`text-4xl md:text-7xl font-serif tracking-tight leading-[1.1] mb-6 transition-all duration-700 ${isLight ? 'text-slate-900' : 'text-white'}`}>
          The Sovereign Workspace for <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500">
            Next-Gen Algorithmic Research
          </span>
        </h1>
        <p className={`text-sm md:text-base max-w-2xl mx-auto font-light leading-relaxed mb-12 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Deconstruct structural manuscripts, map equation state spaces, cross-examine literature streams, and execute code safely inside offline browser-based WASM containers overseen by ScholarAI.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <button onClick={() => onOpenAuth ? onOpenAuth('register') : onLaunch()} className={`w-full sm:w-auto px-8 py-4 font-mono text-xs uppercase tracking-widest rounded-2xl font-bold shadow-xl transition-all ${isLight ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-black hover:shadow-[0_0_50px_rgba(34,211,238,0.3)]'}`}>
            Create Account & Launch
          </button>
          <button onClick={() => onOpenAuth ? onOpenAuth('login') : onLaunch()} className={`w-full sm:w-auto px-8 py-4 border rounded-2xl font-mono text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isLight ? 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}>
            <Lock size={14} className="text-cyan-400"/> Authenticated Portal
          </button>
        </div>
      </section>

      {/* -------------------------------------------
          SCROLL-UNLOCKED GUIDED PIPELINE JOURNEY
      ------------------------------------------- */}
      <section id="pipeline" className="max-w-5xl mx-auto px-6 relative z-10 pt-16 pb-28">
        
        {/* Animated Central Core Line Indicator */}
        <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-slate-500/10 -translate-x-1/2 hidden sm:block">
          <div className="w-full bg-gradient-to-b from-cyan-400 via-blue-500 to-rose-500 transition-all duration-300 origin-top" style={{ height: `${scrollProgress}%` }}></div>
        </div>

        <div className="text-center max-w-xl mx-auto mb-24">
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">Interactive Walkthrough</span>
          <h2 className={`text-3xl font-serif tracking-tight mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>Sovereign Execution Pipeline</h2>
        </div>

        {/* PHASE 1: REPOSITORY VAULT */}
        <div 
          id="phase-vault"
          ref={el => triggerRefs.current[0] = el}
          className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center mb-32 transition-all duration-1000 transform ${visiblePhases['phase-vault'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}
        >
          <div className="space-y-4 md:text-right md:order-1">
            <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">Phase 01 // Asset Core</span>
            <h3 className={`text-2xl font-serif ${isLight ? 'text-slate-900' : 'text-white'}`}>Central Repository Vault</h3>
            <p className="text-xs md:text-sm text-slate-500 font-light leading-relaxed">
              Treats research documents as database entries. Maps incoming manuscripts into multi-tier trees using parent-child relationships, utilizing a zero-quota symbolic data-referencing pattern.
            </p>
          </div>
          <div className={`border rounded-3xl p-6 font-mono text-xs ${themeClasses.bgCard} md:order-2 h-52 flex flex-col justify-between shadow-xl relative group overflow-hidden`}>
            <div className="flex justify-between items-center text-[10px] text-slate-500 border-b pb-2 border-slate-500/10">
              <span className="text-purple-400 font-bold">CentralVault.jsx</span>
              <span>pgvector Active</span>
            </div>
            <div className="space-y-2">
              <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center gap-2 text-[10px] text-white">
                <Folder size={14} className="text-purple-400 fill-purple-400/20"/> /root/Quantum_Algorithms/
              </div>
              <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2 text-[10px] text-slate-400 ml-4">
                <FileText size={14} className="text-red-400"/> shor_analysis.pdf
              </div>
            </div>
            <span className="text-[10px] text-slate-600 block mt-2">Symbolic pointer registered cleanly. Zero replication.</span>
          </div>
        </div>

        {/* PHASE 2: INSIGHTLENS VIEWPORT */}
        <div 
          id="phase-lens"
          ref={el => triggerRefs.current[1] = el}
          className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center mb-32 transition-all duration-1000 transform ${visiblePhases['phase-lens'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}
        >
          <div className="space-y-4 md:order-2">
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">Phase 02 // Document UI</span>
            <h3 className={`text-2xl font-serif ${isLight ? 'text-slate-900' : 'text-white'}`}>InsightLens Pro Reader</h3>
            <p className="text-xs md:text-sm text-slate-500 font-light leading-relaxed">
              Maintains high-end layout rendering via precise DOM stacking. Placing text interaction nodes on the highest layer (`z-index: 10`) ensures native, seamless cursor text selection over complex vector canvases boxes.
            </p>
          </div>
          <div className={`border rounded-3xl p-6 font-mono text-xs ${themeClasses.bgCard} md:order-1 h-52 flex flex-col justify-between shadow-xl relative overflow-hidden`}>
            <div className="flex justify-between items-center text-[10px] text-slate-500 border-b pb-2 border-slate-500/10">
              <span className="text-emerald-400 font-bold">InsightLens.jsx</span>
              <span>z-index: 10 Viewport</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 font-serif italic text-xs animate-pulse">
              "Attention mechanisms map token vectors cleanly across hidden coordinate matrices..."
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 bg-black/40 p-2 rounded-lg">
              <span>RAG Copilot Frame</span>
              <span className="text-emerald-400 font-bold">Context Stream Verified</span>
            </div>
          </div>
        </div>

        {/* PHASE 3: MATH EVALUATOR */}
        <div 
          id="phase-evaluator"
          ref={el => triggerRefs.current[2] = el}
          className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center mb-32 transition-all duration-1000 transform ${visiblePhases['phase-evaluator'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}
        >
          <div className="space-y-4 md:text-right md:order-1">
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">Phase 03 // Computation Sandbox</span>
            <h3 className={`text-2xl font-serif ${isLight ? 'text-slate-900' : 'text-white'}`}>ScholarAI Math Evaluator</h3>
            <p className="text-xs md:text-sm text-slate-500 font-light leading-relaxed">
              Eliminates mathematical memory drift. Autonomous Sorter and Analyst agents isolate math expressions from texts and compile them safely inside browser-contained Pyodide WebAssembly sandboxes.
            </p>
          </div>
          <div className={`border rounded-3xl p-6 font-mono text-xs ${themeClasses.bgCard} md:order-2 h-52 flex flex-col justify-between shadow-xl relative overflow-hidden`}>
            <div className="flex justify-between items-center text-[10px] text-slate-500 border-b pb-2 border-slate-500/10">
              <span className="text-cyan-400 font-bold">MathEvaluator.jsx</span>
              <span>Pyodide WASM</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-cyan-300">
                <span>WASM Parameter Variable (r):</span>
                <span className="font-bold">{interactiveVal}</span>
              </div>
              <input type="range" readOnly value={interactiveVal} className="w-full accent-cyan-400 cursor-default" />
            </div>
            <div className="p-2.5 bg-black/40 rounded-xl text-[10px] text-emerald-400 border border-slate-500/10">
              Execution Output: {(interactiveVal * 2.45).toFixed(2)} [Computed Offline]
            </div>
          </div>
        </div>

        {/* PHASE 4: DOMAINMATRIX AI */}
        <div 
          id="phase-matrix"
          ref={el => triggerRefs.current[3] = el}
          className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center transition-all duration-1000 transform ${visiblePhases['phase-matrix'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}
        >
          <div className="space-y-4 md:order-2">
            <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">Phase 04 // Literature Synthesis</span>
            <h3 className={`text-2xl font-serif ${isLight ? 'text-slate-900' : 'text-white'}`}>DomainMatrix AI Synthesis</h3>
            <p className="text-xs md:text-sm text-slate-500 font-light leading-relaxed">
              Treats a collection of papers as a single, living debate. Evaluates datasets, flags contradictions, and calculates a Feasibility Research Index (FRI) score across up to 10 papers concurrently.
            </p>
          </div>
          <div className={`border rounded-3xl p-6 font-mono text-xs ${themeClasses.bgCard} md:order-1 h-52 flex flex-col justify-between shadow-xl relative overflow-hidden`}>
            <div className="flex justify-between items-center text-[10px] text-slate-500 border-b pb-2 border-slate-500/10">
              <span className="text-rose-400 font-bold">DomainMatrix.jsx</span>
              <span>Swarm Pipeline</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[9px] text-center font-bold">
              <div className="bg-white/5 p-2 rounded text-slate-300">Manuscript A</div>
              <div className="bg-white/5 p-2 rounded text-slate-300">Manuscript B</div>
              <div className="bg-rose-500/20 text-rose-400 p-2 rounded border border-rose-500/30 font-bold">FRI: 96/100</div>
            </div>
            <p className="text-[10px] text-slate-500 italic">Consensus & contradiction radar tracking limits cleanly.</p>
          </div>
        </div>

      </section>

      {/* -------------------------------------------
          COMPREHENSIVE LAYER FEATURES MATRIX
      ------------------------------------------- */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24 relative z-10 border-t border-slate-500/10">
        <div className="mb-16">
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">Granular Capabilities</span>
          <h2 className={`text-2xl md:text-4xl font-serif tracking-tight mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>System Specification Matrix</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { id: 'l1', title: 'L1: Document Viewport', items: ['InsightLens DOM stacking', 'Multiply markup coordinates', 'Frosted glass sidebar tabs'] },
            { id: 'l2', title: 'L2: Global Library Vault', items: ['Relational database trees', 'Zero-Quota asset replicas', 'Cross-workspace data shares'] },
            { id: 'l3', title: 'L3: Math Evaluator Node', items: ['AST compilation loops', 'state_data JSON columns', 'WASM runtime sandboxes'] },
            { id: 'l4', title: 'L4: Quality Control Suite', items: ['AI Rigor score metrics', 'Plagiarism string matching', 'Token AI discriminators'] },
            { id: 'l5', title: 'L5: Reference Engineering', items: ['Contextual typing buffers', 'In-Text database ref finder', 'Dynamic citation compilers'] },
            { id: 'l6', title: 'L7: Algorithmic Ingestion', items: ['Instant REST API generation', 'Git code tracing linking', 'Double-blind diff panels'] }
          ].map(layer => (
            <div key={layer.id} className={`border p-6 rounded-3xl transition-all hover:scale-[1.01] ${themeClasses.bgCard}`}>
              <h4 className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold mb-4 flex items-center gap-2">
                <Sparkle size={12}/> {layer.title}
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-500 font-light">
                {layer.items.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Check size={12} className="text-emerald-400 flex-shrink-0"/> {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* -------------------------------------------
          STATE-OF-THE-ART COMPARATIVE SURVEY
      ------------------------------------------- */}
      <section id="comparison" className="max-w-6xl mx-auto px-6 py-16 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">Benchmark Infrastructure</span>
          <h2 className={`text-2xl md:text-3xl font-serif tracking-tight mt-1 mb-3 ${isLight ? 'text-slate-900' : 'text-white'}`}>Architectural Capability Survey</h2>
          <p className="text-xs text-slate-500 font-light">Comparing ScholarGrid architecture directly against cloud literature aggregates and reference tools.</p>
        </div>

        <div className={`border rounded-[2.5rem] p-6 md:p-10 shadow-2xl overflow-x-auto ${isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-[#0a0a0a] border-white/10'}`}>
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b text-xs font-mono uppercase tracking-widest text-slate-500 border-slate-200/20">
                <th className="pb-6">System Architecture Vector</th>
                <th className="pb-6 text-cyan-400 font-bold">ScholarGrid OS</th>
                <th className="pb-6 text-slate-500">SciSpace</th>
                <th className="pb-6 text-slate-500">Overleaf</th>
                <th className="pb-6 text-slate-500">Mendeley / Zotero</th>
              </tr>
            </thead>
            <tbody className={`text-xs font-light divide-y ${isLight ? 'text-slate-700 divide-slate-100' : 'text-slate-300 divide-white/5'}`}>
              <tr>
                <td className="py-5 font-bold">Layout-Aware Ingestion (z-index: 10)</td>
                <td className="py-5 text-cyan-400 font-bold flex items-center gap-1.5"><Check size={16}/> Native DOM tier stacking</td>
                <td className="py-5 text-amber-500">Cloud raster only</td>
                <td className="py-5 text-red-500 flex items-center gap-1.5"><X size={16}/> LaTeX source code</td>
                <td className="py-5 text-red-500 flex items-center gap-1.5"><X size={16}/> Static metadata</td>
              </tr>
              <tr>
                <td className="py-5 font-bold">Sandboxed Algebraic Evaluation</td>
                <td className="py-5 text-cyan-400 font-bold flex items-center gap-1.5"><Check size={16}/> Pyodide WASM + REST API</td>
                <td className="py-5 text-red-500 flex items-center gap-1.5"><X size={16}/> None</td>
                <td className="py-5 text-amber-500">TeX compiler only</td>
                <td className="py-5 text-red-500 flex items-center gap-1.5"><X size={16}/> None</td>
              </tr>
              <tr>
                <td className="py-5 font-bold">Multi-Paper Cross-Examination</td>
                <td className="py-5 text-cyan-400 font-bold flex items-center gap-1.5"><Check size={16}/> DomainMatrix (FRI + Blindspots)</td>
                <td className="py-5 text-slate-500">Basic RAG summaries</td>
                <td className="py-5 text-red-500 flex items-center gap-1.5"><X size={16}/> None</td>
                <td className="py-5 text-red-500 flex items-center gap-1.5"><X size={16}/> None</td>
              </tr>
              <tr>
                <td className="py-5 font-bold">Global Vault Filesystem Storage</td>
                <td className="py-5 text-cyan-400 font-bold flex items-center gap-1.5"><Check size={16}/> pgvector + Zero-Quota Tree</td>
                <td className="py-5 text-amber-400">Basic cloud folders</td>
                <td className="py-5 text-amber-400">Project directories</td>
                <td className="py-5 text-emerald-400">Relational tags</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer Element */}
      <footer className={`max-w-7xl mx-auto px-8 py-12 border-t flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
          <span className={`text-xs font-mono uppercase tracking-widest font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>ScholarGrid Platform Environment</span>
        </div>
        <p className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">Sovereign Scientific Operating System • All Rights Reserved</p>
        <button onClick={() => onOpenAuth ? onOpenAuth('login') : onLaunch()} className={`px-6 py-2.5 rounded-xl font-mono text-xs uppercase tracking-widest transition-all border ${isLight ? 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}>
          Console Portal
        </button>
      </footer>

    </div>
  );
}