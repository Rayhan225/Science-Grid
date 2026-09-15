import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, Cpu, Network, ArrowRight, Binary, Sliders, 
  BookOpen, Database, Play, Check, X, Sparkles, Terminal, 
  Layers, Lock, RefreshCw, Volume2, Globe, Users, Code, Activity, Pause, RotateCcw,
  Maximize2, ChevronRight, ChevronLeft, Eye, Zap, MousePointerClick, FolderPlus, 
  FileText, FileSpreadsheet, Folder, MonitorPlay, CheckCircle2, ArrowUpRight, GitCompare, Sparkle,
  GraduationCap, UserCheck, ShieldAlert
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function LandingPage({ onLaunch, onOpenAuth }) {
  const { themeClasses, isLight, theme } = useTheme();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [visiblePhases, setVisibleSections] = useState({});
  const [interactiveVal, setInteractiveVal] = useState(55);
  const [selectedRoleTab, setSelectedRoleTab] = useState('researcher');

  const containerRef = useRef(null);
  const triggerRefs = useRef([]);

  // Hide global scrollbars while on the Landing Page to eliminate white line & unwanted tracks
  useEffect(() => {
    document.documentElement.classList.add('no-scrollbar');
    document.body.classList.add('no-scrollbar');
    document.documentElement.style.scrollbarWidth = 'none';
    document.body.style.scrollbarWidth = 'none';
    return () => {
      document.documentElement.classList.remove('no-scrollbar');
      document.body.classList.remove('no-scrollbar');
      document.documentElement.style.scrollbarWidth = '';
      document.body.style.scrollbarWidth = '';
    };
  }, []);

  // Track global viewport scroll for smooth progress indicator
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      const currentScroll = window.scrollY;
      if (totalScroll > 0) {
        setScrollProgress((currentScroll / totalScroll) * 100);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
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
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    triggerRefs.current.forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  // Continuous animation loop for mock WASM interactive parameter
  useEffect(() => {
    const interval = setInterval(() => {
      setInteractiveVal(v => (v < 90 ? v + 1 : 30));
    }, 120);
    return () => clearInterval(interval);
  }, []);

  // Five sovereign roles supported natively in ScholarGrid
  const rolesData = [
    {
      id: 'researcher',
      title: 'Academic Researcher',
      icon: Network,
      color: 'cyan',
      badge: 'Scientific Ingestion & Matrices',
      tagline: 'Multi-paper synthesis, AST mathematical modeling, and unified vector vaults.',
      features: [
        'DomainMatrix: Cross-examine up to 10 manuscripts for consensus & contradictions',
        'MathEvaluator: Offline Pyodide WASM sandbox execution for LaTeX equations',
        'CentralVault: Multi-tier hierarchical taxonomy with zero-quota pointers',
        'Account Isolation: Dedicated tenant storage partitioned by cryptographic user ID'
      ]
    },
    {
      id: 'professor',
      title: 'Faculty Professor',
      icon: UserCheck,
      color: 'indigo',
      badge: 'Academic Supervision & Curricula',
      tagline: 'Supervise graduate literature reviews, verify audit ledgers, and govern curricula.',
      features: [
        'Literature Review Oversight: Monitor student workspace synthesis matrices',
        'Audit Certification: Review forensic manuscript claims with whole-sentence anchors',
        'Verified Credentials: Permanent CV locking with verified faculty accreditation',
        'Curated Library: Push institutional reference decks directly to student cohorts'
      ]
    },
    {
      id: 'programmer',
      title: 'Research Programmer',
      icon: Terminal,
      color: 'purple',
      badge: 'PyTorch & Algorithmic WASM',
      tagline: 'PyTorch module extraction, SymPy AST compilation, and offline runtime benchmarking.',
      features: [
        'PyTorch Module Extraction: Auto-transpile algorithmic paper snippets to PyTorch',
        'In-Situ WebAssembly Sandbox: Execute Python 3.11 with NumPy and SymPy in browser',
        'Algorithmic Complexity Bounds: Verify asymptotic runtime and memory scaling',
        'GitHub Integration: Link verified algorithm implementations to repository trees'
      ]
    },
    {
      id: 'student',
      title: 'Graduate Student',
      icon: GraduationCap,
      color: 'emerald',
      badge: 'Study Decks & Real-Time Reader',
      tagline: 'Layout-aware manuscript reader, spaced-repetition flashcards, and instant translation.',
      features: [
        'InsightLens Pro Viewport: Native DOM text layer (z-index: 10) for friction-free selection',
        'PDF-Scoped Flashcards: Zero-duplicate cards generated exclusively per paper ledger',
        'Neural Multilingual Translation: Instant translation across 8 languages with speech synthesis',
        'Synchronized Notebook: Draw annotations, formulas, and notes saved to PDF workspace'
      ]
    },
    {
      id: 'reviewer',
      title: 'Peer Reviewer',
      icon: ShieldCheck,
      color: 'rose',
      badge: 'ScholarAudit Forensic Rigor',
      tagline: 'Forensic PDF manuscript auditing, multi-line claim jumping, and executive reports.',
      features: [
        'ScholarAudit Rigor Engine: Automated statistical consistency and methodology checks',
        'Multi-Line Anchor Navigation: Mark whole sentences and individual lines upon jump',
        'Executive PDF Audit Reports: Instant printable audit certificates with integrity scores',
        'Duplicate Ledger Prevention: Seamlessly restore previous audits with zero data loss'
      ]
    }
  ];

  return (
    <div 
      ref={containerRef} 
      className={`min-h-screen font-sans w-full max-w-full overflow-x-hidden relative select-none transition-colors duration-500 pb-32 no-scrollbar ${
        isLight ? 'bg-slate-50 text-slate-900 selection:bg-cyan-500/15' : 'bg-[#050505] text-slate-300 selection:bg-cyan-500/30'
      }`}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      
      {/* -------------------------------------------
          GLOBAL CINEMATIC BACKDROP LAYER
      ------------------------------------------- */}
      <div className="fixed top-0 left-0 w-full h-1 bg-transparent z-50 pointer-events-none">
        <div 
          className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 transition-all duration-100" 
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
      <div 
        className={`fixed inset-0 pointer-events-none z-0 transition-opacity duration-700 opacity-40 ${
          isLight 
            ? 'bg-[linear-gradient(to_right,#00000004_1px,transparent_1px),linear-gradient(to_bottom,#00000004_1px,transparent_1px)] bg-[size:50px_50px]' 
            : 'bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:50px_50px]'
        }`}
      />

      {/* Persistent Navigation Header */}
      <header className="max-w-7xl mx-auto px-6 md:px-8 py-6 flex justify-between items-center relative z-40">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.9)] animate-pulse" />
          <span className={`text-xs font-mono uppercase tracking-widest font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            ScholarGrid OS
          </span>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <a href="#pipeline" className={`text-xs font-mono uppercase tracking-widest transition-colors hidden md:block ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>
            Guided Journey
          </a>
          <a href="#roles" className={`text-xs font-mono uppercase tracking-widest transition-colors hidden md:block ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>
            User Roles
          </a>
          <a href="#features" className={`text-xs font-mono uppercase tracking-widest transition-colors hidden md:block ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>
            Architecture
          </a>
          <a href="#comparison" className={`text-xs font-mono uppercase tracking-widest transition-colors hidden md:block ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>
            Gap Analysis
          </a>
          
          <button 
            onClick={() => onOpenAuth ? onOpenAuth('login') : onLaunch()} 
            className={`text-xs font-mono uppercase tracking-widest transition-colors cursor-pointer ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
          >
            Sign In
          </button>
          <button 
            onClick={() => onOpenAuth ? onOpenAuth('register') : onLaunch()} 
            className={`flex items-center gap-2 text-xs font-mono uppercase tracking-widest px-5 py-2.5 rounded-full transition-all shadow-lg border cursor-pointer ${
              isLight 
                ? 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800' 
                : 'bg-white text-black hover:bg-slate-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]'
            }`}
          >
            Get Started <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* -------------------------------------------
          HERO MODULE CLUSTER
      ------------------------------------------- */}
      <section className="min-h-[80vh] flex flex-col justify-center items-center text-center px-6 relative z-10 pt-10 pb-16 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[10px] font-mono tracking-widest text-cyan-400 uppercase mb-8 shadow-inner animate-fadeIn">
          <Binary size={12}/> Sovereign Scientific Operating Environment
        </div>
        <h1 className={`text-4xl md:text-7xl font-serif tracking-tight leading-[1.1] mb-6 transition-all duration-700 ${isLight ? 'text-slate-900' : 'text-white'}`}>
          The Sovereign Software for <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500">
            Algorithmic Science & Research
          </span>
        </h1>
        <p className={`text-sm md:text-base max-w-2xl mx-auto font-light leading-relaxed mb-10 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Deconstruct structural manuscripts with layout-aware DOM stacking, map multi-paper synthesis matrices, compile equations offline inside client Pyodide WASM sandboxes, and audit claims with forensic anchor tracking.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full sm:w-auto">
          <button 
            onClick={() => onOpenAuth ? onOpenAuth('register') : onLaunch()} 
            className={`w-full sm:w-auto px-8 py-4 font-mono text-xs uppercase tracking-widest rounded-2xl font-bold shadow-xl transition-all cursor-pointer ${
              isLight 
                ? 'bg-slate-900 text-white hover:bg-slate-800' 
                : 'bg-white text-black hover:shadow-[0_0_40px_rgba(34,211,238,0.3)]'
            }`}
          >
            Create Account & Launch
          </button>
          <button 
            onClick={() => onOpenAuth ? onOpenAuth('login') : onLaunch()} 
            className={`w-full sm:w-auto px-8 py-4 border rounded-2xl font-mono text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50' 
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
            }`}
          >
            <Lock size={14} className="text-cyan-400"/> Authenticated Portal
          </button>
        </div>
      </section>

      {/* -------------------------------------------
          SCROLL-UNLOCKED GUIDED PIPELINE JOURNEY
      ------------------------------------------- */}
      <section id="pipeline" className="max-w-5xl mx-auto px-6 relative z-10 pt-16 pb-24">
        
        {/* Animated Central Core Line Indicator */}
        <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-slate-500/10 -translate-x-1/2 hidden sm:block">
          <div 
            className="w-full bg-gradient-to-b from-cyan-400 via-blue-500 to-rose-500 transition-all duration-300 origin-top" 
            style={{ height: `${scrollProgress}%` }}
          />
        </div>

        <div className="text-center max-w-xl mx-auto mb-20">
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">Interactive Walkthrough</span>
          <h2 className={`text-3xl font-serif tracking-tight mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Sovereign Execution Pipeline
          </h2>
        </div>

        {/* PHASE 1: REPOSITORY VAULT */}
        <div 
          id="phase-vault"
          ref={el => triggerRefs.current[0] = el}
          className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center mb-28 transition-all duration-1000 transform ${
            visiblePhases['phase-vault'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          <div className="space-y-4 md:text-right md:order-1">
            <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
              Phase 01 // Asset Core
            </span>
            <h3 className={`text-2xl font-serif ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Central Repository Vault
            </h3>
            <p className="text-xs md:text-sm text-slate-500 font-light leading-relaxed">
              Treats research documents as structured database entries. Maps incoming manuscripts into hierarchical folders using parent-child relational trees with zero-quota symbolic pointer referencing and account tenant isolation.
            </p>
          </div>
          <div className={`border rounded-3xl p-6 font-mono text-xs ${themeClasses.bgCard} md:order-2 h-52 flex flex-col justify-between shadow-xl relative group overflow-hidden`}>
            <div className="flex justify-between items-center text-[10px] text-slate-500 border-b pb-2 border-slate-500/10">
              <span className="text-purple-400 font-bold">CentralVault.jsx</span>
              <span>PostgreSQL Isolated</span>
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
          className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center mb-28 transition-all duration-1000 transform ${
            visiblePhases['phase-lens'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          <div className="space-y-4 md:order-2">
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Phase 02 // Document UI
            </span>
            <h3 className={`text-2xl font-serif ${isLight ? 'text-slate-900' : 'text-white'}`}>
              InsightLens Pro Reader
            </h3>
            <p className="text-xs md:text-sm text-slate-500 font-light leading-relaxed">
              Maintains high-fidelity document layout via precise DOM stacking. Text interaction nodes sit on the highest layer (<code className="text-emerald-400">z-index: 10</code>) over PDF canvases, with real-time multilingual translation and PDF-scoped study card ledgers.
            </p>
          </div>
          <div className={`border rounded-3xl p-6 font-mono text-xs ${themeClasses.bgCard} md:order-1 h-52 flex flex-col justify-between shadow-xl relative overflow-hidden`}>
            <div className="flex justify-between items-center text-[10px] text-slate-500 border-b pb-2 border-slate-500/10">
              <span className="text-emerald-400 font-bold">InsightLens.jsx</span>
              <span>z-index: 10 Viewport</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 font-serif italic text-xs">
              "Attention mechanisms map token vectors cleanly across hidden coordinate matrices..."
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 bg-black/40 p-2 rounded-lg">
              <span>PDF-Scoped Flashcards & Translations</span>
              <span className="text-emerald-400 font-bold">Synchronized</span>
            </div>
          </div>
        </div>

        {/* PHASE 3: MATH EVALUATOR */}
        <div 
          id="phase-evaluator"
          ref={el => triggerRefs.current[2] = el}
          className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center mb-28 transition-all duration-1000 transform ${
            visiblePhases['phase-evaluator'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          <div className="space-y-4 md:text-right md:order-1">
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
              Phase 03 // Computation Sandbox
            </span>
            <h3 className={`text-2xl font-serif ${isLight ? 'text-slate-900' : 'text-white'}`}>
              ScholarAI Math Evaluator
            </h3>
            <p className="text-xs md:text-sm text-slate-500 font-light leading-relaxed">
              Eliminates mathematical hallucination. Isolates math expressions from manuscripts, builds interactive Abstract Syntax Trees (AST), tunes variables dynamically, and evaluates numerical routines safely inside browser-contained Pyodide WebAssembly sandboxes with an interactive Math Copilot.
            </p>
          </div>
          <div className={`border rounded-3xl p-6 font-mono text-xs ${themeClasses.bgCard} md:order-2 h-52 flex flex-col justify-between shadow-xl relative overflow-hidden`}>
            <div className="flex justify-between items-center text-[10px] text-slate-500 border-b pb-2 border-slate-500/10">
              <span className="text-cyan-400 font-bold">MathEvaluator.jsx</span>
              <span>Pyodide WASM + SymPy</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-cyan-300">
                <span>WASM Parameter Variable (\alpha):</span>
                <span className="font-bold">{interactiveVal}</span>
              </div>
              <input type="range" readOnly value={interactiveVal} className="w-full accent-cyan-400 cursor-default" />
            </div>
            <div className="p-2.5 bg-black/40 rounded-xl text-[10px] text-emerald-400 border border-slate-500/10">
              Computed Trajectory: {(interactiveVal * 2.45).toFixed(2)} [Offline Zero-Leakage]
            </div>
          </div>
        </div>

        {/* PHASE 4: DOMAINMATRIX AI */}
        <div 
          id="phase-matrix"
          ref={el => triggerRefs.current[3] = el}
          className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center mb-28 transition-all duration-1000 transform ${
            visiblePhases['phase-matrix'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          <div className="space-y-4 md:order-2">
            <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
              Phase 04 // Literature Synthesis
            </span>
            <h3 className={`text-2xl font-serif ${isLight ? 'text-slate-900' : 'text-white'}`}>
              DomainMatrix AI Synthesis
            </h3>
            <p className="text-xs md:text-sm text-slate-500 font-light leading-relaxed">
              Treats a corpus of papers as a single living debate. Extracts comparative parameters, detects methodological gaps, isolates empirical contradictions, and calculates Feasibility Research Index (FRI) scores across up to 10 papers concurrently with an integrated RAG Copilot.
            </p>
          </div>
          <div className={`border rounded-3xl p-6 font-mono text-xs ${themeClasses.bgCard} md:order-1 h-52 flex flex-col justify-between shadow-xl relative overflow-hidden`}>
            <div className="flex justify-between items-center text-[10px] text-slate-500 border-b pb-2 border-slate-500/10">
              <span className="text-rose-400 font-bold">DomainMatrix.jsx</span>
              <span>Comparative Swarm</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[9px] text-center font-bold">
              <div className="bg-white/5 p-2 rounded text-slate-300">Manuscript A</div>
              <div className="bg-white/5 p-2 rounded text-slate-300">Manuscript B</div>
              <div className="bg-rose-500/20 text-rose-400 p-2 rounded border border-rose-500/30 font-bold">FRI: 96/100</div>
            </div>
            <p className="text-[10px] text-slate-500 italic">Consensus & contradiction radar tracking limits cleanly.</p>
          </div>
        </div>

        {/* PHASE 5: SCHOLARAUDIT VALIDATION RIGOR */}
        <div 
          id="phase-audit"
          ref={el => triggerRefs.current[4] = el}
          className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center transition-all duration-1000 transform ${
            visiblePhases['phase-audit'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          <div className="space-y-4 md:text-right md:order-1">
            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              Phase 05 // Forensic Audit
            </span>
            <h3 className={`text-2xl font-serif ${isLight ? 'text-slate-900' : 'text-white'}`}>
              ScholarAudit Validation Rigor
            </h3>
            <p className="text-xs md:text-sm text-slate-500 font-light leading-relaxed">
              Performs exhaustive methodological stress tests on PDF manuscripts. Highlights entire claims and line-by-line anchors upon jumping, verifies citations against canonical databases, and generates downloadable executive PDF audit reports.
            </p>
          </div>
          <div className={`border rounded-3xl p-6 font-mono text-xs ${themeClasses.bgCard} md:order-2 h-52 flex flex-col justify-between shadow-xl relative overflow-hidden`}>
            <div className="flex justify-between items-center text-[10px] text-slate-500 border-b pb-2 border-slate-500/10">
              <span className="text-amber-400 font-bold">ValidationRigor.jsx</span>
              <span>Forensic PDF Anchor Rigor</span>
            </div>
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-[10px] text-amber-300">
              <span>Overall Rigor Score</span>
              <span className="font-bold text-xs">92.4% Verified</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 bg-black/40 p-2 rounded-lg">
              <span>Anchor Jump Highlighting</span>
              <span className="text-amber-400 font-bold">Whole & Line Active</span>
            </div>
          </div>
        </div>

      </section>

      {/* -------------------------------------------
          USER ROLES & PERSONAS (5 SOVEREIGN ROLES)
      ------------------------------------------- */}
      <section id="roles" className="max-w-6xl mx-auto px-6 py-24 relative z-10 border-t border-slate-500/10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">Multi-Persona Ecosystem</span>
          <h2 className={`text-2xl md:text-4xl font-serif tracking-tight mt-1 mb-3 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Engineered for Five Specialized Roles
          </h2>
          <p className="text-xs md:text-sm text-slate-500 font-light leading-relaxed">
            ScholarGrid dynamically adapts UI workflows, data telemetry parameters, and credentials for every member of the scientific community.
          </p>
        </div>

        {/* Role Selection Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {rolesData.map(role => {
            const Icon = role.icon;
            const isSelected = selectedRoleTab === role.id;
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRoleTab(role.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-mono uppercase tracking-wider transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-md shadow-cyan-500/10'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon size={14}/> {role.title}
              </button>
            );
          })}
        </div>

        {/* Active Role Showcase Card */}
        {(() => {
          const currentRole = rolesData.find(r => r.id === selectedRoleTab) || rolesData[0];
          const Icon = currentRole.icon;
          return (
            <div className={`border rounded-[2.5rem] p-8 md:p-12 shadow-2xl transition-all ${themeClasses.bgCard}`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                <div className="md:col-span-1 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg">
                    <Icon size={28}/>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20">
                      {currentRole.badge}
                    </span>
                    <h3 className={`text-2xl font-serif font-bold mt-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {currentRole.title}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 font-light leading-relaxed">
                    {currentRole.tagline}
                  </p>
                  <button 
                    onClick={() => onOpenAuth ? onOpenAuth('register') : onLaunch()}
                    className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors pt-2 cursor-pointer"
                  >
                    Register as {currentRole.title} <ArrowRight size={14}/>
                  </button>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentRole.features.map((feat, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2 hover:border-cyan-500/30 transition-all">
                      <div className="flex items-center gap-2 text-xs font-bold font-mono text-cyan-300">
                        <CheckCircle2 size={15} className="text-cyan-400 flex-shrink-0"/> Feature 0{idx + 1}
                      </div>
                      <p className="text-xs text-slate-400 font-light leading-relaxed">
                        {feat}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      {/* -------------------------------------------
          COMPREHENSIVE LAYER FEATURES MATRIX
      ------------------------------------------- */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24 relative z-10 border-t border-slate-500/10">
        <div className="mb-16">
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">Granular Capabilities</span>
          <h2 className={`text-2xl md:text-4xl font-serif tracking-tight mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            System Specification Matrix
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { 
              id: 'l1', 
              title: 'L1: InsightLens Pro Viewport', 
              items: [
                'Native DOM text layer (z-index: 10)',
                'PDF-scoped study flashcards',
                'Neural translation across 8 languages',
                'Synchronized notes, code & drawing ledger'
              ] 
            },
            { 
              id: 'l2', 
              title: 'L2: Central Repository Vault', 
              items: [
                'Multi-tier hierarchical folder taxonomy',
                'Zero-quota symbolic pointer referencing',
                'Inline note editing & instant rename',
                'Cross-workspace document linking'
              ] 
            },
            { 
              id: 'l3', 
              title: 'L3: ScholarAI Math Evaluator', 
              items: [
                'Pyodide WebAssembly offline sandbox',
                'Natural queries & LaTeX formulations',
                'Interactive AST symbol deconstruction',
                'Math Copilot for derivations & proofs'
              ] 
            },
            { 
              id: 'l4', 
              title: 'L4: DomainMatrix AI Synthesis', 
              items: [
                'Multi-paper cross-examination matrices',
                'Feasibility Research Index (FRI)',
                'Consensus & contradiction radar',
                'RAG Comparative Literature Copilot'
              ] 
            },
            { 
              id: 'l5', 
              title: 'L5: ScholarAudit Validation Rigor', 
              items: [
                'Forensic PDF manuscript auditing',
                'Whole-sentence & line anchor jumping',
                'Downloadable executive PDF audit reports',
                'Duplicate audit ledger prevention'
              ] 
            },
            { 
              id: 'l6', 
              title: 'L6: Multi-Tenant Architecture', 
              items: [
                'Cryptographic tenant user_id isolation',
                'Role-tailored live database telemetry',
                'Permanent verified CV credentials',
                'Universal search across all asset classes'
              ] 
            }
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
          GAP ANALYSIS & SCIENTIFIC CAPABILITY MATRIX
      ------------------------------------------- */}
      <section id="comparison" className="max-w-7xl mx-auto px-6 py-20 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 mb-4">
            <Sparkles size={12} className="text-cyan-400" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-300 font-semibold">Institutional Benchmarks</span>
          </div>
          <h2 className={`text-3xl md:text-4xl font-serif tracking-tight mt-1 mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Gap Analysis: Sovereign OS vs. Fragmented Toolchains
          </h2>
          <p className="text-xs md:text-sm text-slate-400 font-light leading-relaxed">
            Direct capability matrix evaluating ScholarGrid against commercial web wrappers, cloud TeX compilers, and legacy citation managers.
          </p>
        </div>

        <div className={`relative rounded-[2.5rem] p-1 md:p-2 border backdrop-blur-2xl shadow-2xl overflow-hidden ${
          isLight ? 'bg-gradient-to-b from-slate-100 to-slate-200/80 border-slate-300' : 'bg-gradient-to-b from-white/[0.08] to-black/90 border-white/10'
        }`}>
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute -top-24 left-1/3 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className={`rounded-[2.2rem] p-6 md:p-8 overflow-x-auto no-scrollbar relative z-10 ${
            isLight ? 'bg-white/95' : 'bg-[#090b10]/95'
          }`} style={{ scrollbarWidth: 'none' }}>
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className={`border-b text-[11px] font-mono uppercase tracking-widest ${isLight ? 'border-slate-200 text-slate-500' : 'border-white/10 text-slate-400'}`}>
                  <th className="pb-5 pl-4 font-semibold">Scientific Capability</th>
                  <th className="pb-5 px-5 text-cyan-400 font-bold bg-cyan-500/10 rounded-t-2xl border-x border-t border-cyan-500/30">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-cyan-400" />
                      <span>ScholarGrid OS</span>
                      {/* <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 ml-1">Sovereign</span> */}
                    </div>
                  </th>
                  <th className="pb-5 px-4 font-medium">SciSpace / Consensus</th>
                  <th className="pb-5 px-4 font-medium">Overleaf</th>
                  <th className="pb-5 px-4 font-medium">Notion / Obsidian</th>
                  <th className="pb-5 px-4 font-medium">Zotero / Mendeley</th>
                </tr>
              </thead>
              <tbody className={`text-xs font-light divide-y ${isLight ? 'text-slate-700 divide-slate-100' : 'text-slate-300 divide-white/5'}`}>
                <tr className="hover:bg-cyan-500/[0.02] transition-colors group">
                  <td className="py-5 pl-4 font-semibold text-white/90">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                        <FileText size={14}/>
                      </div>
                      <div>
                        <div className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Layout-Aware PDF Ingestion</div>
                        <div className="text-[10px] text-slate-500 font-mono">Preserves multi-column linebreaks & coordinates</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-5 font-bold bg-cyan-500/10 border-x border-cyan-500/30">
                    <span className="inline-flex items-center gap-1.5 text-cyan-300 font-mono text-[11px] bg-cyan-500/20 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                      <Check size={14} className="text-cyan-400"/> Native DOM Stacking
                    </span>
                  </td>
                  <td className="py-5 px-4 text-amber-500/90 font-mono text-[11px]">Cloud raster OCR only</td>
                  <td className="py-5 px-4 text-red-400/80 flex items-center gap-1 font-mono text-[11px] pt-7"><X size={14}/> TeX source only</td>
                  <td className="py-5 px-4 text-red-400/80 font-mono text-[11px]">Static iframe embed</td>
                  <td className="py-5 px-4 text-amber-500/90 font-mono text-[11px]">Basic viewer / annotations</td>
                </tr>

                <tr className="hover:bg-cyan-500/[0.02] transition-colors group">
                  <td className="py-5 pl-4 font-semibold text-white/90">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Cpu size={14}/>
                      </div>
                      <div>
                        <div className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Offline WASM Math & Python Execution</div>
                        <div className="text-[10px] text-slate-500 font-mono">In-browser Pyodide, NumPy, and SymPy ASTs</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-5 font-bold bg-cyan-500/10 border-x border-cyan-500/30">
                    <span className="inline-flex items-center gap-1.5 text-cyan-300 font-mono text-[11px] bg-cyan-500/20 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                      <Check size={14} className="text-cyan-400"/> Pyodide WASM + SymPy
                    </span>
                  </td>
                  <td className="py-5 px-4 text-red-400/80 font-mono text-[11px]">No local execution</td>
                  <td className="py-5 px-4 text-amber-500/90 font-mono text-[11px]">LaTeX compilation only</td>
                  <td className="py-5 px-4 text-red-400/80 font-mono text-[11px]">No math sandbox</td>
                  <td className="py-5 px-4 text-red-400/80 font-mono text-[11px]">No code execution</td>
                </tr>

                <tr className="hover:bg-cyan-500/[0.02] transition-colors group">
                  <td className="py-5 pl-4 font-semibold text-white/90">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                        <Layers size={14}/>
                      </div>
                      <div>
                        <div className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Multi-Paper Comparative Synthesis</div>
                        <div className="text-[10px] text-slate-500 font-mono">Normalized variables, datasets, models & FRI</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-5 font-bold bg-cyan-500/10 border-x border-cyan-500/30">
                    <span className="inline-flex items-center gap-1.5 text-cyan-300 font-mono text-[11px] bg-cyan-500/20 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                      <Check size={14} className="text-cyan-400"/> DomainMatrix (Radar + FRI)
                    </span>
                  </td>
                  <td className="py-5 px-4 text-slate-400 font-mono text-[11px]">Isolated single summaries</td>
                  <td className="py-5 px-4 text-red-400/80 font-mono text-[11px]">None</td>
                  <td className="py-5 px-4 text-amber-500/90 font-mono text-[11px]">Manual markdown tables</td>
                  <td className="py-5 px-4 text-red-400/80 font-mono text-[11px]">Metadata tag filtering only</td>
                </tr>

                <tr className="hover:bg-cyan-500/[0.02] transition-colors group">
                  <td className="py-5 pl-4 font-semibold text-white/90">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <ShieldCheck size={14}/>
                      </div>
                      <div>
                        <div className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Forensic Rigor & AI Stylometry Audit</div>
                        <div className="text-[10px] text-slate-500 font-mono">Detects AI clichés, low burstiness, and missing baselines</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-5 font-bold bg-cyan-500/10 border-x border-cyan-500/30">
                    <span className="inline-flex items-center gap-1.5 text-cyan-300 font-mono text-[11px] bg-cyan-500/20 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                      <Check size={14} className="text-cyan-400"/> ScholarAudit Ledger
                    </span>
                  </td>
                  <td className="py-5 px-4 text-red-400/80 font-mono text-[11px]">No forensic validation</td>
                  <td className="py-5 px-4 text-red-400/80 font-mono text-[11px]">No verification guardrails</td>
                  <td className="py-5 px-4 text-red-400/80 font-mono text-[11px]">None</td>
                  <td className="py-5 px-4 text-red-400/80 font-mono text-[11px]">None</td>
                </tr>

                <tr className="hover:bg-cyan-500/[0.02] transition-colors group">
                  <td className="py-5 pl-4 font-semibold text-white/90">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        <Database size={14}/>
                      </div>
                      <div>
                        <div className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Zero-Disk Database user_id Isolation</div>
                        <div className="text-[10px] text-slate-500 font-mono">Multi-tenant row-level user privacy in PostgreSQL</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-5 font-bold bg-cyan-500/10 border-x border-cyan-500/30">
                    <span className="inline-flex items-center gap-1.5 text-cyan-300 font-mono text-[11px] bg-cyan-500/20 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                      <Check size={14} className="text-cyan-400"/> PostgreSQL JSONB Isolation
                    </span>
                  </td>
                  <td className="py-5 px-4 text-amber-500/90 font-mono text-[11px]">Central cloud vendor lock-in</td>
                  <td className="py-5 px-4 text-amber-500/90 font-mono text-[11px]">Shared cloud git workspace</td>
                  <td className="py-5 px-4 text-amber-500/90 font-mono text-[11px]">Proprietary sync cloud</td>
                  <td className="py-5 px-4 text-amber-500/90 font-mono text-[11px]">Local SQLite file / sync</td>
                </tr>

                <tr className="hover:bg-cyan-500/[0.02] transition-colors group">
                  <td className="py-5 pl-4 font-semibold text-white/90">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <BookOpen size={14}/>
                      </div>
                      <div>
                        <div className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>PDF-Scoped Flashcards & Translations</div>
                        <div className="text-[10px] text-slate-500 font-mono">Study decks & multi-language translation bound to ledger</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-5 font-bold bg-cyan-500/10 border-x border-cyan-500/30 rounded-b-2xl border-b">
                    <span className="inline-flex items-center gap-1.5 text-cyan-300 font-mono text-[11px] bg-cyan-500/20 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                      <Check size={14} className="text-cyan-400"/> Scoped Ledger Study Decks
                    </span>
                  </td>
                  <td className="py-5 px-4 text-amber-500/90 font-mono text-[11px]">Generic global chat answers</td>
                  <td className="py-5 px-4 text-red-400/80 font-mono text-[11px]">None</td>
                  <td className="py-5 px-4 text-amber-500/90 font-mono text-[11px]">Manual plugin required</td>
                  <td className="py-5 px-4 text-red-400/80 font-mono text-[11px]">None</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer Element */}
      <footer className={`max-w-7xl mx-auto px-6 md:px-8 py-12 border-t flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 ${
        isLight ? 'border-slate-200' : 'border-white/5'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
          <span className={`text-xs font-mono uppercase tracking-widest font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            ScholarGrid Platform Environment
          </span>
        </div>
        <p className="text-[11px] font-mono text-slate-500 uppercase tracking-widest text-center">
          Sovereign Scientific Operating System &bull; All Rights Reserved
        </p>
        <button 
          onClick={() => onOpenAuth ? onOpenAuth('login') : onLaunch()} 
          className={`px-6 py-2.5 rounded-xl font-mono text-xs uppercase tracking-widest transition-all border cursor-pointer ${
            isLight ? 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
          }`}
        >
          Console Portal
        </button>
      </footer>

    </div>
  );
}