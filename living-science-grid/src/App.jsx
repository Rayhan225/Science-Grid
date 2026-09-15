// src/App.jsx
import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import MathEvaluator from './components/MathEvaluator';
import InsightLens from './components/InsightLens';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Settings from './components/Settings';
import CentralVault from './components/CentralVault';
import DomainMatrix from './components/DomainMatrix';
import ValidationRigor from './components/ValidationRigor';
import { Send, X, RefreshCw, Lock, UserPlus, LogIn, Microscope, GraduationCap, Code2, Cpu, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { ThemeProvider, useTheme } from './context/ThemeContext';

function AuthModal({ initialMode = 'login', onClose, onLoginSuccess }) {
  const { themeClasses, isLight } = useTheme();
  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('researcher');
  const [institution, setInstitution] = useState('');
  const [department, setDepartment] = useState('');
  const [researchDomain, setResearchDomain] = useState('');
  const [orcid, setOrcid] = useState('');
  const [githubProfile, setGithubProfile] = useState('');
  const [primaryTechStack, setPrimaryTechStack] = useState('');
  const [degreeProgram, setDegreeProgram] = useState('');
  const [expectedGraduationYear, setExpectedGraduationYear] = useState('');
  const [cv, setCv] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const DEMO_PERSONAS = [
    {
      id: 'professor',
      email: 'professor@scholargrid.io',
      name: 'Prof. Alistair Vance',
      role: 'professor',
      label: 'Faculty Professor',
      icon: Sparkles,
      color: 'text-sky-400',
      border: 'border-sky-500/30 hover:border-sky-400',
      bg: 'bg-sky-500/10 hover:bg-sky-500/20',
      desc: 'Graduate supervision, curriculum curation, and rigor oversight'
    },
    {
      id: 'researcher',
      email: 'researcher@scholargrid.io',
      name: 'Dr. Elena Rostova',
      role: 'researcher',
      label: 'Academic Researcher',
      icon: Microscope,
      color: 'text-cyan-400',
      border: 'border-cyan-500/30 hover:border-cyan-400',
      bg: 'bg-cyan-500/10 hover:bg-cyan-500/20',
      desc: 'Literature synthesis, AST math, and vault citations'
    },
    {
      id: 'student',
      email: 'student@scholargrid.io',
      name: 'Alex Chen',
      role: 'student',
      label: 'Graduate Student',
      icon: GraduationCap,
      color: 'text-emerald-400',
      border: 'border-emerald-500/30 hover:border-emerald-400',
      bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
      desc: 'Concept flashcards, active recall, and formula deconstruction'
    },
    {
      id: 'programmer',
      email: 'programmer@scholargrid.io',
      name: 'Devin Vance',
      role: 'programmer',
      label: 'Research Programmer',
      icon: Code2,
      color: 'text-indigo-400',
      border: 'border-indigo-500/30 hover:border-indigo-400',
      bg: 'bg-indigo-500/10 hover:bg-indigo-500/20',
      desc: 'PyTorch code extraction, client WASM sandbox, and complexity bounds'
    },
    {
      id: 'admin',
      email: 'admin@scholargrid.io',
      name: 'System Director',
      role: 'admin',
      label: 'Lab Director / Admin',
      icon: Cpu,
      color: 'text-amber-400',
      border: 'border-amber-500/30 hover:border-amber-400',
      bg: 'bg-amber-500/10 hover:bg-amber-500/20',
      desc: 'Multi-tenant users, PostgreSQL telemetry, and quota governance'
    },
    {
      id: 'reviewer',
      email: 'reviewer@scholargrid.io',
      name: 'Prof. Marcus Thorne',
      role: 'reviewer',
      label: 'Peer Reviewer',
      icon: ShieldCheck,
      color: 'text-teal-400',
      border: 'border-teal-500/30 hover:border-teal-400',
      bg: 'bg-teal-500/10 hover:bg-teal-500/20',
      desc: 'ScholarAudit rigor scoring, AI stylometry, and canonical overlap'
    }
  ];

  const handleQuickDemoLogin = async (persona) => {
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: persona.email, password: 'password123' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Demo login failed');

      const avatarSymbol = 
        persona.role === 'admin' ? '⚡' :
        persona.role === 'programmer' ? '💻' :
        persona.role === 'student' ? '🎓' :
        persona.role === 'reviewer' ? '🛡️' : '🔬';

      const userWithAvatar = { ...data.user, avatar: avatarSymbol };
      localStorage.setItem('sg_token', data.access_token);
      localStorage.setItem('sg_user', JSON.stringify(userWithAvatar));
      localStorage.setItem('sg_current_user', JSON.stringify(userWithAvatar));
      window.dispatchEvent(new Event('userRoleUpdated'));
      onLoginSuccess(userWithAvatar);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const endpoint = isRegister ? 'http://127.0.0.1:8000/api/v1/auth/register' : 'http://127.0.0.1:8000/api/v1/auth/login';
      const body = isRegister ? { 
        email, 
        password, 
        name, 
        role,
        institution: institution.trim() || undefined,
        department: department.trim() || undefined,
        research_domain: researchDomain.trim() || undefined,
        orcid: orcid.trim() || undefined,
        github_profile: githubProfile.trim() || undefined,
        primary_tech_stack: primaryTechStack.trim() || undefined,
        degree_program: degreeProgram.trim() || undefined,
        expected_graduation_year: expectedGraduationYear.trim() || undefined,
        cv: cv.trim() || undefined,
        cv_locked: ['professor', 'researcher', 'programmer'].includes(role) && Boolean(cv.trim())
      } : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Authentication failed');

      const avatarSymbol = 
        (data.user?.role || role) === 'professor' ? '🏛️' :
        (data.user?.role || role) === 'admin' ? '⚡' :
        (data.user?.role || role) === 'programmer' ? '💻' :
        (data.user?.role || role) === 'student' ? '🎓' :
        (data.user?.role || role) === 'reviewer' ? '🛡️' : '🔬';

      const userWithAvatar = { ...data.user, avatar: avatarSymbol };

      localStorage.setItem('sg_token', data.access_token);
      localStorage.setItem('sg_user', JSON.stringify(userWithAvatar));
      localStorage.setItem('sg_current_user', JSON.stringify(userWithAvatar));
      
      try {
        const saved = JSON.parse(localStorage.getItem('sg_saved_profiles') || '[]');
        if (!saved.some(p => p.email === userWithAvatar.email)) {
          saved.push(userWithAvatar);
          localStorage.setItem('sg_saved_profiles', JSON.stringify(saved));
        }
      } catch (e) {}

      window.dispatchEvent(new Event('userRoleUpdated'));
      onLoginSuccess(userWithAvatar);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-fadeIn">
      <div className={`relative max-w-xl w-full border p-6 md:p-8 rounded-3xl shadow-2xl overflow-y-auto max-h-[92vh] custom-scrollbar ${themeClasses.bgCard}`}>
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X size={20}/></button>
        
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3 text-cyan-400 font-bold font-mono text-base">SG</div>
          <h2 className={`text-2xl font-serif font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {isRegister ? 'Create Institutional Account' : 'Authenticate Session'}
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">Sovereign PostgreSQL Multi-Persona Research OS</p>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex rounded-xl p-1 bg-black/30 border border-white/10 mb-6 font-mono text-xs">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setErrorMsg(''); }}
            className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              !isRegister ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn size={13} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setErrorMsg(''); }}
            className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              isRegister ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus size={13} />
            <span>Create Account</span>
          </button>
        </div>

        {/* 1-Click Quick Demo Login Section */}
        {!isRegister && (
          <div className="mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-teal-400 font-bold flex items-center gap-1.5">
                <Sparkles size={12} /> 1-Click Quick Demo Role Access
              </span>
              <span className="text-[10px] font-mono text-slate-500">Zero Password Entry</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_PERSONAS.map(p => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleQuickDemoLogin(p)}
                    disabled={loading}
                    className={`p-2.5 rounded-xl border text-left font-mono transition-all cursor-pointer flex items-center gap-2.5 ${p.bg} ${p.border}`}
                  >
                    <div className={`w-7 h-7 rounded-lg bg-black/40 flex items-center justify-center ${p.color} flex-shrink-0`}>
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">{p.label}</div>
                      <div className="text-[9px] text-slate-400 truncate">{p.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono rounded-xl flex items-center gap-2">
            <span>●</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          {isRegister && (
            <>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1 font-bold">Full Name / Academic Title</label>
                <input 
                  type="text" 
                  required 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 text-white" 
                  placeholder="e.g. Dr. Jane Doe"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1 font-bold">Account Role Persona (Strict Sovereign Binding)</label>
                <select 
                  value={role} 
                  onChange={e => setRole(e.target.value)} 
                  className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 text-white text-xs font-mono"
                >
                  <option value="professor">Faculty Professor — Mentorship, Supervision & Rigor Oversight</option>
                  <option value="researcher">Academic Researcher — Literature Synthesis & Central Vault</option>
                  <option value="programmer">Research Programmer — PyTorch Modules & Client WASM</option>
                  <option value="student">Graduate Student — Active Recall & Concept Study Decks</option>
                  <option value="reviewer">Peer Reviewer — ScholarAudit & Rigor Certification</option>
                </select>
                <p className="text-[10px] text-amber-400/90 font-mono mt-1.5 leading-relaxed">
                  ⚠️ Note: Role features are strictly isolated to your account. Administrator accounts cannot be registered publicly.
                </p>
              </div>

              {/* Conditional Role-Specific Fields */}
              {(role === 'professor' || role === 'researcher') && (
                <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-cyan-500/20">
                  <div className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1.5">
                    <Microscope size={12} /> Academic Verification Credentials
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase block mb-1">Institution *</label>
                      <input
                        type="text"
                        required
                        value={institution}
                        onChange={e => setInstitution(e.target.value)}
                        placeholder="e.g. Stanford University"
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:border-cyan-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase block mb-1">Department *</label>
                      <input
                        type="text"
                        required
                        value={department}
                        onChange={e => setDepartment(e.target.value)}
                        placeholder="e.g. Dept. of Computer Science"
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:border-cyan-400 outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase block mb-1">Research Domain *</label>
                      <input
                        type="text"
                        required
                        value={researchDomain}
                        onChange={e => setResearchDomain(e.target.value)}
                        placeholder="e.g. Sparse Attention, Formal Proofs"
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:border-cyan-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase block mb-1">ORCID iD *</label>
                      <input
                        type="text"
                        required
                        value={orcid}
                        onChange={e => setOrcid(e.target.value)}
                        placeholder="e.g. 0000-0002-1825-0097"
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:border-cyan-400 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Curriculum Vitae (CV) / Dossier Summary *</label>
                    <textarea
                      required
                      rows={3}
                      value={cv}
                      onChange={e => setCv(e.target.value)}
                      placeholder="Paste academic CV summary, publication list, or permanent portfolio link..."
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:border-cyan-400 outline-none resize-none"
                    />
                    <span className="text-[9px] text-amber-400/90 block mt-1">
                      🔒 Verified Credential: Once submitted, your academic CV is permanently verified and cannot be removed or modified.
                    </span>
                  </div>
                </div>
              )}

              {role === 'programmer' && (
                <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-indigo-500/20">
                  <div className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-1.5">
                    <Code2 size={12} /> Developer & Engineering Verification
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">GitHub Profile URL *</label>
                    <input
                      type="url"
                      required
                      value={githubProfile}
                      onChange={e => setGithubProfile(e.target.value)}
                      placeholder="https://github.com/username"
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:border-indigo-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Primary Tech Stack *</label>
                    <input
                      type="text"
                      required
                      value={primaryTechStack}
                      onChange={e => setPrimaryTechStack(e.target.value)}
                      placeholder="e.g. Python, PyTorch, CUDA, Rust, TypeScript"
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:border-indigo-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Curriculum Vitae / Engineering Dossier *</label>
                    <textarea
                      required
                      rows={3}
                      value={cv}
                      onChange={e => setCv(e.target.value)}
                      placeholder="Paste software engineering CV, open-source repositories, or portfolio link..."
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:border-indigo-400 outline-none resize-none"
                    />
                    <span className="text-[9px] text-amber-400/90 block mt-1">
                      🔒 Verified Credential: Once submitted, your engineering CV is permanently locked to your account.
                    </span>
                  </div>
                </div>
              )}

              {role === 'student' && (
                <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-emerald-500/20">
                  <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <GraduationCap size={12} /> Academic Program Enrollment
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase block mb-1">University / Institution *</label>
                      <input
                        type="text"
                        required
                        value={institution}
                        onChange={e => setInstitution(e.target.value)}
                        placeholder="e.g. University of Toronto"
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:border-emerald-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase block mb-1">Degree / Program *</label>
                      <input
                        type="text"
                        required
                        value={degreeProgram}
                        onChange={e => setDegreeProgram(e.target.value)}
                        placeholder="e.g. M.Sc. in Computer Science"
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:border-emerald-400 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Expected Graduation Year *</label>
                    <input
                      type="text"
                      required
                      value={expectedGraduationYear}
                      onChange={e => setExpectedGraduationYear(e.target.value)}
                      placeholder="e.g. 2026"
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:border-emerald-400 outline-none"
                    />
                  </div>
                </div>
              )}

              {role === 'reviewer' && (
                <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-teal-500/20">
                  <div className="text-[10px] uppercase font-bold text-teal-400 tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={12} /> Peer Reviewer Accreditation
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Institution / Editorial Board *</label>
                    <input
                      type="text"
                      required
                      value={institution}
                      onChange={e => setInstitution(e.target.value)}
                      placeholder="e.g. ACM Transactions, IEEE Peer Reviewer Board"
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:border-teal-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">ORCID iD (Optional)</label>
                    <input
                      type="text"
                      value={orcid}
                      onChange={e => setOrcid(e.target.value)}
                      placeholder="e.g. 0000-0002-1825-0097"
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:border-teal-400 outline-none"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1 font-bold">Institutional Email</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 text-white" 
              placeholder="user@scholargrid.io"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1 font-bold">Password</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 text-white" 
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className={`w-full py-3.5 rounded-xl font-bold uppercase tracking-widest text-white transition-all shadow-lg cursor-pointer ${themeClasses.accentBg}`}
          >
            {loading ? 'Authenticating...' : isRegister ? 'Register Sovereign Account' : 'Authenticate Session'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-white/5 text-center">
          <button 
            type="button"
            onClick={() => { setIsRegister(!isRegister); setErrorMsg(''); }} 
            className="text-xs text-slate-400 hover:text-white underline font-mono cursor-pointer"
          >
            {isRegister ? 'Already have an institutional account? Sign In' : "Don't have an account yet? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AppContent({ settings, setSettings, currentUser, onUpdateUser, onLogout }) {
  const { themeClasses } = useTheme();
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [telemetry, setTelemetry] = useState({ totalPages: 0, isolatedPages: 0, rawFormulas: 0, validatedNodes: 0 });
  const [status, setStatus] = useState("Ready");

  return (
    <div className={`h-screen w-screen flex overflow-hidden select-none relative transition-colors duration-700 ${themeClasses.bgMain}`}>
      <div className={`absolute inset-0 pointer-events-none z-0 ${themeClasses.bgPattern}`}></div>

      <div className={`group flex-shrink-0 h-full relative z-40 transition-all duration-300 ease-in-out shadow-2xl w-20 hover:w-72 overflow-hidden ${themeClasses.bgSidebar}`}>
        <Sidebar currentView={currentView} onViewChange={setCurrentView} currentUser={currentUser} />
      </div>
      
      <div className="flex-1 flex flex-col h-full min-w-0 min-h-0 relative z-10">
        <div className={`flex-shrink-0 z-30 transition-colors duration-700 ${themeClasses.bgHeader}`}>
          <Header status={status} currentView={currentView} onViewChange={setCurrentView} />
        </div>
        
        <main className={`flex-1 overflow-hidden relative flex flex-col p-0 w-full h-full min-h-0 ${themeClasses.bgMain}`}>
          <div className={currentView === 'dashboard' ? 'flex-1 animate-fadeIn flex flex-col h-full min-h-0 overflow-hidden' : 'hidden'}>
            <Dashboard onSelectTool={setCurrentView} telemetry={telemetry} currentUser={currentUser} currentView={currentView} />
          </div>
          
          <div className={(currentView === 'settings' || currentView === 'profile-settings') ? 'flex-1 animate-fadeIn flex flex-col p-6 h-full overflow-y-auto custom-scrollbar' : 'hidden'}>
            <Settings 
              settings={settings} 
              setSettings={setSettings} 
              currentUser={currentUser} 
              onUpdateUser={onUpdateUser}
              onLogout={onLogout}
              setCurrentView={setCurrentView}
            />
          </div>
          
          <div className={currentView === 'central-vault' ? 'flex-1 animate-fadeIn flex flex-col h-full' : 'hidden'}>
            <CentralVault setCurrentView={setCurrentView} />
          </div>
          
          <div className={currentView === 'math-evaluator' ? 'flex-1 animate-fadeIn flex flex-col h-full' : 'hidden'}>
            <MathEvaluator telemetry={telemetry} setTelemetry={setTelemetry} status={status} setStatus={setStatus} setAiContext={() => {}} />
          </div>
          
          <div className={currentView === 'insight-lens' ? 'flex-1 animate-fadeIn flex flex-col h-full' : 'hidden'}>
            <InsightLens setStatus={setStatus} setCurrentView={setCurrentView} />
          </div>
          
          <div className={currentView === 'domain-matrix' ? 'flex-1 animate-fadeIn flex flex-col h-full' : 'hidden'}>
            <DomainMatrix setStatus={setStatus} setCurrentView={setCurrentView} />
          </div>

          <div className={currentView === 'validation-rigor' ? 'flex-1 animate-fadeIn flex flex-col h-full' : 'hidden'}>
            <ValidationRigor setStatus={setStatus} setCurrentView={setCurrentView} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('sg_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [authModalMode, setAuthModalMode] = useState(null);

  const [settings, setSettings] = useState(() => {
    const savedTheme = localStorage.getItem('sg_theme');
    const user = currentUser;
    return {
      theme: savedTheme || user?.theme || 'obsidian-core', 
      scholarAIEngine: 'scholargrid-ai-core', 
      humorLevel: 'occasional'
    };
  });

  // Fetch user's saved theme from database upon user session change
  useEffect(() => {
    if (currentUser?.id) {
      fetch(`http://127.0.0.1:8000/api/user/profile?user_id=${encodeURIComponent(currentUser.id)}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.theme) {
            setSettings(prev => ({ ...prev, theme: data.theme }));
            localStorage.setItem('sg_theme', data.theme);
          }
        })
        .catch(() => {});
    }
  }, [currentUser?.id]);

  const handleUpdateUser = (updatedUser) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('sg_user', JSON.stringify(updatedUser));
    if (updatedUser.theme) {
      setSettings(prev => ({ ...prev, theme: updatedUser.theme }));
      localStorage.setItem('sg_theme', updatedUser.theme);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sg_token');
    localStorage.removeItem('sg_user');
    localStorage.removeItem('sg_current_user');
    setCurrentUser(null);
  };

  const handleThemeChange = (newTheme) => {
    setSettings(prev => ({ ...prev, theme: newTheme }));
    localStorage.setItem('sg_theme', newTheme);
    if (currentUser?.id) {
      fetch('http://127.0.0.1:8000/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          id: currentUser.id,
          theme: newTheme
        })
      }).catch(() => {});
    }
  };

  if (!currentUser) {
    return (
      <ThemeProvider theme={settings.theme} setTheme={handleThemeChange}>
        <LandingPage 
          onLaunch={() => setAuthModalMode('login')} 
          onOpenAuth={(mode) => setAuthModalMode(mode)} 
        />
        {authModalMode && (
          <AuthModal 
            initialMode={authModalMode} 
            onClose={() => setAuthModalMode(null)} 
            onLoginSuccess={(user) => {
              setCurrentUser(user);
              if (user.theme) {
                setSettings(prev => ({ ...prev, theme: user.theme }));
                localStorage.setItem('sg_theme', user.theme);
              }
              setAuthModalMode(null);
            }} 
          />
        )}
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={settings.theme} setTheme={handleThemeChange}>
      <AppContent 
        settings={settings} 
        setSettings={setSettings} 
        currentUser={currentUser} 
        onUpdateUser={handleUpdateUser}
        onLogout={handleLogout} 
      />
    </ThemeProvider>
  );
}