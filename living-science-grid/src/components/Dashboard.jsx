// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  Activity, Database, BookOpen, ShieldCheck, Clock, 
  ArrowRight, Sparkles, Terminal, FileText, BarChart3, 
  CheckCircle2, GraduationCap, Microscope, Code2, Award, 
  GitBranch, User, PlusCircle, FolderOpen, Layers, Zap, 
  Compass, TrendingUp, RefreshCw, ChevronRight, Search, ExternalLink, Cpu, CheckSquare, Globe
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import { useTheme } from '../context/ThemeContext';

export default function Dashboard({ setCurrentView }) {
  const { themeClasses, isLight } = useTheme();
  
  // Read and sync user role from active user profile with real-time event listener
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sg_current_user') || '{"name": "Dr. Scholar", "role": "researcher"}');
    } catch {
      return { name: "Dr. Scholar", role: "researcher" };
    }
  });

  useEffect(() => {
    const syncUserRole = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('sg_current_user') || '{"name": "Dr. Scholar", "role": "researcher"}');
        setCurrentUser(stored);
      } catch (e) {
        console.warn("Failed to sync user role from storage.");
      }
    };

    window.addEventListener('storage', syncUserRole);
    window.addEventListener('userRoleUpdated', syncUserRole);
    
    return () => {
      window.removeEventListener('storage', syncUserRole);
      window.removeEventListener('userRoleUpdated', syncUserRole);
    };
  }, []);

  const activeRole = currentUser.role || 'researcher';

  const [stats, setStats] = useState({
    totalPagesRead: 24,
    annotationVolumes: 16,
    processingVelocityDays: 8,
    validationCount: 12,
    karmaGrowthScore: 1840
  });
  
  const [quotes, setQuotes] = useState([]);
  const [currentQuoteIdx, setCurrentQuoteIdx] = useState(0);
  const [recentWorkspaces, setRecentWorkspaces] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Manuscript pipeline velocity telemetry data
  const velocityData = [
    { phase: 'Ingestion', velocity: 15 },
    { phase: 'Vault Index', velocity: 32 },
    { phase: 'AST Sandbox', velocity: 28 },
    { phase: 'API Gen', velocity: 52 },
    { phase: 'Validation', velocity: 44 },
    { phase: 'Published', velocity: 78 },
  ];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, quotesRes, wsRes] = await Promise.all([
          fetch('http://127.0.0.1:8000/api/telemetry/stats').catch(() => null),
          fetch('http://127.0.0.1:8000/api/quotes').catch(() => null),
          fetch('http://127.0.0.1:8000/api/workspaces').catch(() => null)
        ]);

        if (statsRes && statsRes.ok) {
          const sData = await statsRes.json();
          setStats(prev => ({ ...prev, ...sData }));
        }
        if (quotesRes && quotesRes.ok) {
          const qData = await quotesRes.json();
          if (Array.isArray(qData) && qData.length > 0) setQuotes(qData);
        }
        if (wsRes && wsRes.ok) {
          const wData = await wsRes.json();
          if (Array.isArray(wData)) setRecentWorkspaces(wData);
        }
      } catch (err) {
        console.warn("Failed to fetch platform backend telemetry.");
      }
    };
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (quotes.length === 0) return;
    const interval = setInterval(() => {
      setCurrentQuoteIdx(prev => (prev + 1) % quotes.length);
    }, 16000);
    return () => clearInterval(interval);
  }, [quotes]);

  const activeQuote = quotes[currentQuoteIdx] || { 
    quote: "An equation means nothing to me unless it expresses a thought of God.", 
    author: "Srinivasa Ramanujan" 
  };

  const handleNextQuote = () => {
    if (quotes.length > 0) {
      setCurrentQuoteIdx((currentQuoteIdx + 1) % quotes.length);
    }
  };

  const filteredWorkspaces = recentWorkspaces.filter(ws => 
    ws.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`p-6 md:p-12 h-full max-w-[1680px] mx-auto flex flex-col overflow-y-auto custom-scrollbar animate-fadeIn select-none ${themeClasses.bgMain}`}>
      
      {/* ================= ULTRA-MODERN BENTO COMMAND HERO ================= */}
      <div className={`relative p-8 md:p-12 rounded-[3rem] border shadow-2xl overflow-hidden mb-10 backdrop-blur-2xl ${themeClasses.bgCard}`}>
        {/* Ambient lighting art gradients */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-cyan-500/15 via-purple-500/10 to-transparent blur-3xl pointer-events-none -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-emerald-500/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none -ml-24 -mb-24"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span> ScholarGrid System Specification • Active Scope: {activeRole}
            </div>
            
            <h1 className={`text-4xl md:text-6xl font-serif tracking-tight leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Research Infrastructure Command.
            </h1>
            
            <div className="flex items-center gap-3 pt-1">
              <p className="text-xs text-slate-400 font-light italic font-serif leading-relaxed">
                "{activeQuote.quote}" — <span className="not-italic font-mono text-[11px] text-cyan-400 font-medium">{activeQuote.author}</span>
              </p>
              <button 
                onClick={handleNextQuote}
                title="Shuffle Quote"
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex-shrink-0"
              >
                <RefreshCw size={12}/>
              </button>
            </div>
          </div>

          {/* Quick Metrics Deck */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
            <div className={`px-6 py-4 rounded-2xl border flex items-center justify-between gap-8 backdrop-blur-md ${isLight ? 'bg-white/90 border-slate-200' : 'bg-black/40 border-white/10'}`}>
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <FileText size={20}/>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Global Vault Library</span>
                  <span className={`text-sm font-bold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{stats.totalPagesRead} Indexed Files</span>
                </div>
              </div>
              <button onClick={() => setCurrentView('insight-lens')} className="text-xs text-cyan-400 hover:underline font-mono font-bold">Access →</button>
            </div>

            <div className={`px-6 py-4 rounded-2xl border flex items-center justify-between gap-8 backdrop-blur-md ${isLight ? 'bg-white/90 border-slate-200' : 'bg-black/40 border-white/10'}`}>
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <Cpu size={20}/>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">AST Math Engine</span>
                  <span className={`text-sm font-bold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{stats.validationCount} Active Nodes</span>
                </div>
              </div>
              <button onClick={() => setCurrentView('math-evaluator')} className="text-xs text-purple-400 hover:underline font-mono font-bold">Access →</button>
            </div>
          </div>
        </div>

        {/* Search & Toolchain Action Bar */}
        <div className="mt-10 pt-6 border-t border-inherit flex flex-col md:flex-row items-center justify-between gap-4">
          <div className={`relative w-full md:w-96 border rounded-2xl overflow-hidden flex items-center px-4 py-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/10'}`}>
            <Search size={15} className="text-slate-400 mr-3 flex-shrink-0"/>
            <input 
              type="text" 
              placeholder="Search workspaces, formulas, and vault nodes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs font-mono outline-none text-inherit placeholder:text-slate-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            <button 
              onClick={() => setCurrentView('insight-lens')} 
              className={`px-5 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2 shadow-xl transition-all hover:scale-105 ${themeClasses.accentBg}`}
            >
              <BookOpen size={15}/> InsightLens Pro Viewer
            </button>
            <button 
              onClick={() => setCurrentView('math-evaluator')} 
              className={`px-5 py-3 rounded-xl text-xs font-mono uppercase tracking-wider border transition-all flex items-center gap-2 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
            >
              <Terminal size={15}/> Math AST Evaluator
            </button>
            <button 
              onClick={() => setCurrentView('domain-matrix')} 
              className={`px-5 py-3 rounded-xl text-xs font-mono uppercase tracking-wider border transition-all flex items-center gap-2 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
            >
              <Activity size={15}/> Domain Synthesis Matrix
            </button>
          </div>
        </div>
      </div>

      {/* ================= ARCHITECTURE PILLARS GRID ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div onClick={() => setCurrentView('insight-lens')} className={`p-7 rounded-[2rem] border cursor-pointer transition-all duration-300 hover:border-cyan-500/40 group ${themeClasses.bgCard}`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold px-3 py-1 rounded-full bg-cyan-500/10">Layer 1 Viewport</span>
            <BookOpen size={18} className="text-cyan-400 group-hover:scale-110 transition-transform"/>
          </div>
          <h3 className={`text-base font-bold mb-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>InsightLens Pro</h3>
          <p className="text-xs text-slate-400 font-light leading-relaxed">Layout-aware PDF parsing with vector path annotations and neural audio player translation.</p>
        </div>

        <div onClick={() => setCurrentView('math-evaluator')} className={`p-7 rounded-[2rem] border cursor-pointer transition-all duration-300 hover:border-purple-500/40 group ${themeClasses.bgCard}`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-purple-400 font-bold px-3 py-1 rounded-full bg-purple-500/10">Layer 3 Sandbox</span>
            <Terminal size={18} className="text-purple-400 group-hover:scale-110 transition-transform"/>
          </div>
          <h3 className={`text-base font-bold mb-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>Drop-In API Notebook</h3>
          <p className="text-xs text-slate-400 font-light leading-relaxed">AST processing engine instantly generating sandboxed REST endpoints for formula execution.</p>
        </div>

        <div onClick={() => setCurrentView('domain-matrix')} className={`p-7 rounded-[2rem] border cursor-pointer transition-all duration-300 hover:border-emerald-500/40 group ${themeClasses.bgCard}`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold px-3 py-1 rounded-full bg-emerald-500/10">Layer 4 Engine</span>
            <Activity size={18} className="text-emerald-400 group-hover:scale-110 transition-transform"/>
          </div>
          <h3 className={`text-base font-bold mb-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>Validation & Rigor</h3>
          <p className="text-xs text-slate-400 font-light leading-relaxed">AI Rigor Score engine, string-matching plagiarism scanner, and terminology grammar guard.</p>
        </div>

        <div onClick={() => setCurrentView('central-vault')} className={`p-7 rounded-[2rem] border cursor-pointer transition-all duration-300 hover:border-amber-500/40 group ${themeClasses.bgCard}`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold px-3 py-1 rounded-full bg-amber-500/10">Layer 2 Vault</span>
            <Database size={18} className="text-amber-400 group-hover:scale-110 transition-transform"/>
          </div>
          <h3 className={`text-base font-bold mb-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>Global Vault Library</h3>
          <p className="text-xs text-slate-400 font-light leading-relaxed">Zero-quota asset sharing and relational file filesystem mapping symbolic rows.</p>
        </div>
      </div>

      {/* ================= ACTOR PERSONA SPECIFICATION SECTION ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
        
        {/* Left Column (Span 8): Active Actor Profile & Workspace Queues */}
        <div className={`lg:col-span-8 p-8 md:p-10 rounded-[2.5rem] border flex flex-col justify-between ${themeClasses.bgCard}`}>
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-inherit">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  {activeRole === 'researcher' && <Microscope size={22}/>}
                  {activeRole === 'student' && <GraduationCap size={22}/>}
                  {activeRole === 'developer' && <Code2 size={22}/>}
                  {activeRole === 'reviewer' && <CheckSquare size={22}/>}
                </div>
                <div>
                  <h2 className={`text-base font-bold capitalize ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Actor Persona Scope: {activeRole}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">System architecture access scope & operational profile</p>
                </div>
              </div>
              <span className="text-xs font-mono px-3.5 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Active Profile
              </span>
            </div>

            {/* Persona Objective Callout */}
            <div className="p-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 mb-6 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-cyan-400"/>
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">Mandated System Objective</span>
              </div>
              <p className={`text-xs md:text-sm font-serif italic ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                {activeRole === 'researcher' && '“Compiles formatted manuscripts, builds reference trees, evaluates mathematical execution models, and checks pre-flight compliance.”'}
                {activeRole === 'student' && '“Parses high-density literature patterns, decomposes structural equations, and reviews technical translations without destroying domain vernacular.”'}
                {activeRole === 'developer' && '“Verifies computational logic paths, links system codebases to manuscript equations, and deploys algorithm production micro-services.”'}
                {activeRole === 'reviewer' && '“Assesses replication data files, tracks source plagiarism boundaries, handles author anonymity masking, and monitors behavioral telemetry.”'}
              </p>
            </div>

            {filteredWorkspaces.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div onClick={() => setCurrentView('domain-matrix')} className="p-5 rounded-2xl border border-white/5 bg-white/[0.01] hover:border-cyan-500/30 cursor-pointer transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono text-cyan-400">Synthesis Engine</span>
                    <ChevronRight size={15} className="text-slate-500 group-hover:text-cyan-400 transition-colors"/>
                  </div>
                  <h3 className={`text-xs font-bold mb-1 ${isLight ? 'text-slate-800' : 'text-white'}`}>Transformer Encoder Latent Mapping</h3>
                  <p className="text-[11px] text-slate-500 font-light">4 Matrix Nodes verified • Feasibility Index: 88/100</p>
                </div>

                <div onClick={() => setCurrentView('insight-lens')} className="p-5 rounded-2xl border border-white/5 bg-white/[0.01] hover:border-purple-500/30 cursor-pointer transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono text-purple-400">Peer Review Suite</span>
                    <ChevronRight size={15} className="text-slate-500 group-hover:text-purple-400 transition-colors"/>
                  </div>
                  <h3 className={`text-xs font-bold mb-1 ${isLight ? 'text-slate-800' : 'text-white'}`}>Frugal Innovation in ESP32 Systems</h3>
                  <p className="text-[11px] text-slate-500 font-light">Citation validation complete • 42 references checked</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar">
                {filteredWorkspaces.slice(0, 4).map(ws => (
                  <div 
                    key={ws.id} 
                    onClick={() => setCurrentView('math-evaluator')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group ${isLight ? 'bg-slate-50 border-slate-200 hover:border-cyan-400' : 'bg-white/[0.02] border-white/5 hover:border-cyan-500/30'}`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 flex-shrink-0">
                        <Terminal size={18}/>
                      </div>
                      <div className="min-w-0">
                        <h4 className={`text-xs font-bold truncate ${isLight ? 'text-slate-800 group-hover:text-cyan-600' : 'text-white group-hover:text-cyan-400'}`}>{ws.title}</h4>
                        <p className="text-[10px] font-mono text-slate-500 mt-0.5">{ws.timestamp || 'Today'} • {ws.equations?.length || 0} AST Nodes</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">Open Workspace →</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-inherit flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>PostgreSQL Relational Storage Layer Active</span>
            <button onClick={() => setCurrentView('central-vault')} className="text-cyan-400 hover:underline">Open Central Vault Ledger →</button>
          </div>
        </div>

        {/* Right Column (Span 4): Processing Velocity Chrono Chart */}
        <div className={`lg:col-span-4 p-8 md:p-10 rounded-[2.5rem] border flex flex-col justify-between ${themeClasses.bgCard}`}>
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-inherit">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-cyan-400"/>
                <h3 className={`text-xs font-mono uppercase tracking-widest font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Processing Velocity
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Chrono Timeline</span>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="specGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false}/>
                  <XAxis dataKey="phase" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'monospace' }}/>
                  <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'monospace' }}/>
                  <Tooltip contentStyle={{ backgroundColor: '#0c0c0c', borderColor: 'rgba(34, 211, 238, 0.2)', borderRadius: '16px', fontSize: '11px', fontFamily: 'monospace' }}/>
                  <Area type="monotone" dataKey="velocity" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#specGradient)"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-inherit flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Average Turnaround</span>
            <span className="text-cyan-400 font-bold">{stats.processingVelocityDays} Days Cycle</span>
          </div>
        </div>

      </div>

    </div>
  );
}