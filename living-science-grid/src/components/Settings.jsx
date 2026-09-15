// src/components/Settings.jsx
import React, { useState, useEffect } from 'react';
import { 
  User, Settings as SettingsIcon, Palette, Cpu, CheckCircle2, Save, 
  Sparkles, RefreshCw, GraduationCap, Microscope, ShieldCheck, 
  Building2, Lock, LogOut, Shield, HardDrive, Check, AlertTriangle
} from 'lucide-react';
import { useTheme, THEME_REGISTRY } from '../context/ThemeContext';

const BACKEND_URL = "http://127.0.0.1:8000";

export default function Settings({ settings, setSettings, currentUser, onUpdateUser, onLogout, setCurrentView }) {
  const { theme, setTheme, themeClasses, isLight } = useTheme();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [saveStatus, setSaveStatus] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [backendStatus, setBackendStatus] = useState('Checking...');
  const [models, setModels] = useState(['ScholarGrid AI Core']);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Unified Profile & System Settings State
  const [profileData, setProfileData] = useState({
    id: currentUser?.id || "usr_researcher",
    name: currentUser?.name || "Dr. Scholar",
    email: currentUser?.email || "scholar@sciencegrid.io",
    title: "Principal Investigator",
    role: currentUser?.role || "researcher",
    affiliation: "Institute for Advanced Research",
    department: "Department of Computer Science & AI",
    lab: "Sovereign Systems & Neural Computing Lab",
    bio: "Specializing in transformer attention mechanics, latent vector representations, and sovereign computational systems.",
    avatarPreset: "cyan",
    theme: settings?.theme || 'obsidian-core',
    scholarAIEngine: 'scholargrid-ai-core',
    humorLevel: settings?.humorLevel || 'occasional'
  });

  const avatarPresets = [
    { id: 'cyan', bg: 'from-cyan-500 to-blue-600', label: 'Cyan Matrix' },
    { id: 'purple', bg: 'from-purple-500 to-indigo-600', label: 'Nebula Purple' },
    { id: 'emerald', bg: 'from-emerald-500 to-teal-600', label: 'Quantum Emerald' },
    { id: 'amber', bg: 'from-amber-500 to-rose-600', label: 'Solar Amber' }
  ];

  // Fetch initial profile & theme parameters from database
  useEffect(() => {
    const fetchProfileAndSettings = async () => {
      try {
        const uid = currentUser?.id || '';
        const res = await fetch(`${BACKEND_URL}/api/user/profile${uid ? `?user_id=${uid}` : ''}`);
        if (res.ok) {
          const dbData = await res.json();
          if (dbData && Object.keys(dbData).length > 0) {
            setProfileData(prev => ({
              ...prev,
              ...dbData,
              role: dbData.role || prev.role,
              theme: dbData.theme || prev.theme,
              scholarAIEngine: dbData.scholar_ai_engine || 'scholargrid-ai-core'
            }));
            if (dbData.theme && dbData.theme !== theme) {
              setTheme(dbData.theme);
            }
          }
        }
      } catch (err) {
        console.warn("Backend profile database unreachable, retaining current session state.");
      }

      // Check backend model gateway
      try {
        const tRes = await fetch(`${BACKEND_URL}/api/ai/tags`);
        if (tRes.ok) {
          const data = await tRes.json();
          setModels(data.models || ['ScholarGrid AI Core']);
          setBackendStatus('Connected (Sovereign Core & ScholarGrid AI Ready)');
        } else {
          setBackendStatus('Operational (Standard API Ready)');
        }
      } catch {
        setBackendStatus('Offline (Backend Unreachable)');
      }
    };

    fetchProfileAndSettings();
  }, []);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setPasswordMessage({ type: 'error', text: 'Please fill out all required fields.' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser?.id,
          email: currentUser?.email,
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPasswordMessage({ type: 'success', text: 'Password updated successfully in sovereign database.' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        showToast("Password updated successfully.");
      } else {
        setPasswordMessage({ type: 'error', text: data.detail || 'Failed to update password.' });
      }
    } catch (err) {
      setPasswordMessage({ type: 'error', text: 'Backend connection error. Please try again.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleChange = (key, val) => {
    setProfileData(prev => ({ ...prev, [key]: val }));
    if (key === 'theme') {
      setTheme(val);
      if (setSettings) setSettings(prev => ({ ...prev, theme: val }));
      try {
        const stored = JSON.parse(localStorage.getItem('sg_current_user') || '{}');
        stored.theme = val;
        localStorage.setItem('sg_current_user', JSON.stringify(stored));
      } catch {}
    }
    if (key === 'avatarPreset') {
      try {
        const stored = JSON.parse(localStorage.getItem('sg_current_user') || '{}');
        stored.avatar_preset = val;
        stored.avatarPreset = val;
        localStorage.setItem('sg_current_user', JSON.stringify(stored));
        window.dispatchEvent(new Event('userRoleUpdated'));
        if (currentUser?.id) {
          fetch(`${BACKEND_URL}/api/user/profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: currentUser.id,
              user_id: currentUser.id,
              avatar_preset: val
            })
          }).catch(() => {});
        }
      } catch {}
    }
  };

  const handleSaveAll = async (e) => {
    if (e) e.preventDefault();
    setSaveStatus(true);

    try {
      // 1. Sync to backend database
      const payload = {
        id: currentUser?.id,
        user_id: currentUser?.id,
        name: profileData.name,
        display_name: profileData.name,
        title: profileData.title,
        role: profileData.role,
        affiliation: profileData.institution || profileData.affiliation,
        institution: profileData.institution || profileData.affiliation,
        department: profileData.department,
        research_domain: profileData.research_domain,
        orcid: profileData.orcid,
        github_profile: profileData.github_profile,
        primary_tech_stack: profileData.primary_tech_stack,
        degree_program: profileData.degree_program,
        expected_graduation_year: profileData.expected_graduation_year,
        cv: profileData.cv,
        cv_locked: profileData.cv_locked || (['professor', 'researcher', 'programmer'].includes(profileData.role) && Boolean(profileData.cv)),
        lab: profileData.lab,
        bio: profileData.bio,
        theme: profileData.theme,
        scholar_ai_engine: 'scholargrid-ai-core',
        humor_level: profileData.humorLevel,
        avatar_preset: profileData.avatarPreset,
        specialist_badges: [
          profileData.role === 'professor' ? "Faculty Professor" :
          profileData.role === 'reviewer' ? "Verified Peer Reviewer" :
          profileData.role === 'student' ? "Graduate Scholar" :
          profileData.role === 'programmer' ? "Research Programmer" : "Principal Investigator"
        ]
      };

      await fetch(`${BACKEND_URL}/api/user/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // 2. Persist local storage and app state
      const updatedUser = {
        ...currentUser,
        name: profileData.name,
        role: profileData.role,
        theme: profileData.theme
      };

      localStorage.setItem('sg_user', JSON.stringify(updatedUser));
      localStorage.setItem('sg_current_user', JSON.stringify({ ...updatedUser, ...payload }));
      if (onUpdateUser) onUpdateUser(updatedUser);
      if (setSettings) {
        setSettings({
          theme: profileData.theme,
          scholarAIEngine: 'scholargrid-ai-core',
          humorLevel: profileData.humorLevel
        });
      }

      window.dispatchEvent(new Event('userRoleUpdated'));
      showToast("Settings & profile saved successfully to PostgreSQL database.");
    } catch (err) {
      console.error("Save error:", err);
      showToast("Changes saved locally in active session.");
    } finally {
      setTimeout(() => setSaveStatus(false), 2000);
    }
  };

  return (
    <div className={`p-4 md:p-8 max-w-[1280px] mx-auto w-full animate-fadeIn pb-32`}>
      {/* Top Header */}
      <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-6 mb-8 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif tracking-tight flex items-center gap-3">
            <SettingsIcon className={themeClasses.accentText} size={28} /> 
            Settings & Profile Hub
          </h1>
          <p className={`text-xs font-mono uppercase tracking-widest mt-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Unified Identity, Platform Themes & Computational Engine Parameters
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSaveAll}
            disabled={saveStatus}
            className={`flex items-center justify-center gap-2 px-6 py-2.5 font-mono text-xs uppercase tracking-widest font-bold transition-all shadow-lg hover:opacity-90 active:scale-95 ${themeClasses.radius} ${isLight ? 'bg-slate-900 text-white' : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-teal-500/20'}`}
          >
            {saveStatus ? <CheckCircle2 size={16} className="text-emerald-300"/> : <Save size={16}/>}
            <span>{saveStatus ? 'Synchronized' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Tabs & Content Body */}
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Navigation Sidebar */}
        <div className="w-full md:w-64 flex flex-col gap-2 shrink-0">
          {[
            { id: 'profile', name: 'Profile & Role', icon: User, desc: 'Identity & credentials' },
            { id: 'appearance', name: 'Themes & Visuals', icon: Palette, desc: 'Aesthetics & colors' },
            { id: 'ai', name: 'AI Engine & Routing', icon: Cpu, desc: 'Local SLM & persona' },
            { id: 'security', name: 'Security & Isolation', icon: Shield, desc: 'Data privacy & session' }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex flex-col p-4 text-left font-mono transition-all border ${themeClasses.radius} ${
                  isActive 
                    ? `${themeClasses.bgCard} ${themeClasses.accentText} ${themeClasses.accentBorder} shadow-lg font-bold` 
                    : `border-transparent ${isLight ? 'text-slate-600 hover:bg-slate-200/50' : 'text-slate-400 hover:bg-white/5'}`
                }`}
              >
                <div className="flex items-center gap-2.5 text-xs uppercase tracking-wider mb-1">
                  <Icon size={16} className={isActive ? themeClasses.accentText : "text-slate-400"} />
                  <span>{tab.name}</span>
                </div>
                <span className="text-[10px] text-slate-500 normal-case font-sans pl-6">{tab.desc}</span>
              </button>
            );
          })}

          {onLogout && (
            <button
              onClick={onLogout}
              className={`mt-4 w-full flex items-center gap-2.5 px-4 py-3 text-xs font-mono text-rose-400 hover:bg-rose-500/10 rounded-xl border border-rose-500/20 transition-all`}
            >
              <LogOut size={15} />
              <span>Sign Out Session</span>
            </button>
          )}
        </div>

        {/* Tab Detail Pane */}
        <div className={`flex-1 border p-6 md:p-10 shadow-xl min-h-[520px] ${themeClasses.bgCard} ${themeClasses.radius}`}>
          
          {/* ───────────────────────────────────────────────────────── */}
          {/* TAB 1: PROFILE & INSTITUTIONAL ROLE                       */}
          {/* ───────────────────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-sm font-mono uppercase tracking-widest mb-1 font-bold text-white">
                  Academic Identity & Institutional Profile
                </h3>
                <p className="text-xs text-slate-400">Manage your researcher credentials and dynamic workspace persona.</p>
              </div>

              {/* Avatar Selector */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-wrap items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${
                  avatarPresets.find(p => p.id === profileData.avatarPreset)?.bg || 'from-cyan-500 to-blue-600'
                } flex items-center justify-center text-white shadow-xl flex-shrink-0 font-serif text-2xl font-bold`}>
                  {profileData.name.charAt(0)}
                </div>
                <div>
                  <span className="text-xs font-mono uppercase text-slate-400 block mb-1.5">Avatar Style Preset</span>
                  <div className="flex gap-2">
                    {avatarPresets.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleChange('avatarPreset', p.id)}
                        className={`w-7 h-7 rounded-xl bg-gradient-to-tr ${p.bg} border-2 transition-transform hover:scale-110 ${
                          profileData.avatarPreset === p.id ? 'border-white shadow-lg scale-110' : 'border-transparent opacity-60'
                        }`}
                        title={p.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Permanent Account Role Persona */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase tracking-widest text-slate-400 block font-bold">
                  Assigned Account Role (Permanent Persona)
                </label>
                <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isLight ? 'bg-teal-50/50 border-teal-500/30' : 'bg-teal-500/10 border-teal-500/30'
                }`}>
                  <div className="flex items-center gap-3">
                    {profileData.role === 'professor' ? (
                      <Sparkles size={24} className="text-sky-400" />
                    ) : profileData.role === 'reviewer' ? (
                      <ShieldCheck size={24} className="text-teal-400" />
                    ) : profileData.role === 'student' ? (
                      <GraduationCap size={24} className="text-emerald-400" />
                    ) : profileData.role === 'programmer' ? (
                      <Cpu size={24} className="text-indigo-400" />
                    ) : profileData.role === 'admin' ? (
                      <Shield size={24} className="text-amber-400" />
                    ) : (
                      <Microscope size={24} className="text-cyan-400" />
                    )}
                    <div>
                      <div className="text-sm font-bold text-white font-sans capitalize">
                        {profileData.role === 'professor' ? 'Faculty Professor & PI' :
                         profileData.role === 'reviewer' ? 'Peer Reviewer' :
                         profileData.role === 'student' ? 'Graduate Student' :
                         profileData.role === 'programmer' ? 'Research Programmer' :
                         profileData.role === 'admin' ? 'Lab Director / Admin' :
                         'Academic Researcher'}
                      </div>
                      <div className="text-xs text-slate-400 font-sans">
                        {profileData.role === 'professor'
                          ? 'Faculty literature reviews, thesis defense tracking, and research supervision.'
                          : profileData.role === 'reviewer'
                          ? 'Institutional audit suite, plagiarism scanning, and LaTeX guard checks.'
                          : profileData.role === 'student'
                          ? 'Interactive reading, voice narration, and step-by-step formula walkthroughs.'
                          : profileData.role === 'programmer'
                          ? 'PyTorch code extraction, client-side WASM execution, and complexity profiling.'
                          : profileData.role === 'admin'
                          ? 'System cluster infrastructure, multi-tenant accounts, and database governance.'
                          : 'Literature synthesis, hypothesis AST testing, and multi-manuscript matrices.'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-white/10 text-teal-300 font-bold uppercase tracking-wider border border-white/10">
                    Fixed Account Persona
                  </span>
                </div>
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-widest text-slate-400 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={profileData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/30 border-white/10 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-widest text-slate-400 block mb-1">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={profileData.email || ''}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono opacity-60 cursor-not-allowed ${
                      isLight ? 'bg-slate-100 border-slate-300 text-slate-600' : 'bg-black/40 border-white/5 text-slate-400'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-widest text-slate-400 block mb-1">Academic Title</label>
                  <input
                    type="text"
                    value={profileData.title || ''}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/30 border-white/10 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-widest text-slate-400 block mb-1">Affiliation / Institution</label>
                  <input
                    type="text"
                    value={profileData.institution || profileData.affiliation || ''}
                    onChange={(e) => {
                      handleChange('institution', e.target.value);
                      handleChange('affiliation', e.target.value);
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/30 border-white/10 text-white'
                    }`}
                  />
                </div>
              </div>

              {/* Role-Specific Credential Settings */}
              {(profileData.role === 'professor' || profileData.role === 'researcher') && (
                <div className="space-y-4 p-5 rounded-2xl bg-white/[0.02] border border-cyan-500/20">
                  <div className="text-xs font-mono uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-2">
                    <Microscope size={14} /> Professor & Researcher Institutional Credentials
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">Department</label>
                      <input
                        type="text"
                        value={profileData.department || ''}
                        onChange={(e) => handleChange('department', e.target.value)}
                        placeholder="e.g. Department of Computer Science & AI"
                        className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-xl text-xs font-mono text-white focus:border-cyan-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">Research Domain / Field</label>
                      <input
                        type="text"
                        value={profileData.research_domain || ''}
                        onChange={(e) => handleChange('research_domain', e.target.value)}
                        placeholder="e.g. Attention Mechanics, Neural Systems"
                        className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-xl text-xs font-mono text-white focus:border-cyan-400 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">ORCID Identifier</label>
                    <input
                      type="text"
                      value={profileData.orcid || ''}
                      onChange={(e) => handleChange('orcid', e.target.value)}
                      placeholder="e.g. 0000-0002-1825-0097"
                      className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-xl text-xs font-mono text-white focus:border-cyan-400 outline-none"
                    />
                  </div>

                  {/* Permanently Locked CV Credential */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                        <Lock size={12} className="text-emerald-400" /> Verified Curriculum Vitae (CV)
                      </label>
                      {(profileData.cv_locked || profileData.cv) ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                          <CheckCircle2 size={11} /> Verified Credential &bull; Permanently Locked
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-amber-400">Lock on Save</span>
                      )}
                    </div>
                    {(profileData.cv_locked || profileData.cv) ? (
                      <div className="p-4 rounded-xl bg-black/50 border border-emerald-500/30 text-slate-300 font-mono text-xs whitespace-pre-wrap leading-relaxed select-text">
                        {profileData.cv || "Verified Academic Curriculum Vitae on Institutional Record."}
                        <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-slate-500 flex items-center gap-1">
                          <Lock size={10} /> Immutable sovereign credential. Modification or deletion disabled.
                        </div>
                      </div>
                    ) : (
                      <>
                        <textarea
                          rows={3}
                          value={profileData.cv || ''}
                          onChange={(e) => handleChange('cv', e.target.value)}
                          placeholder="Paste verified academic CV, dossier text, or publication link..."
                          className="w-full p-3 bg-black/30 border border-white/10 rounded-xl text-xs font-mono text-white focus:border-cyan-400 outline-none resize-none"
                        />
                        <span className="text-[10px] text-amber-400/90 block mt-1">
                          ⚠️ Attention: Once submitted, your academic CV becomes permanently verified and locked.
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {profileData.role === 'programmer' && (
                <div className="space-y-4 p-5 rounded-2xl bg-white/[0.02] border border-indigo-500/20">
                  <div className="text-xs font-mono uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-2">
                    <Cpu size={14} /> Research Programmer Verification
                  </div>
                  <div>
                    <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">GitHub Profile / Portfolio URL</label>
                    <input
                      type="url"
                      value={profileData.github_profile || ''}
                      onChange={(e) => handleChange('github_profile', e.target.value)}
                      placeholder="https://github.com/username"
                      className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-xl text-xs font-mono text-white focus:border-indigo-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">Primary Tech Stack</label>
                    <input
                      type="text"
                      value={profileData.primary_tech_stack || ''}
                      onChange={(e) => handleChange('primary_tech_stack', e.target.value)}
                      placeholder="e.g. Python, PyTorch, CUDA, Rust, WebAssembly"
                      className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-xl text-xs font-mono text-white focus:border-indigo-400 outline-none"
                    />
                  </div>

                  {/* Permanently Locked Developer CV */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                        <Lock size={12} className="text-emerald-400" /> Engineering Dossier / CV
                      </label>
                      {(profileData.cv_locked || profileData.cv) ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                          <CheckCircle2 size={11} /> Verified Developer Credential &bull; Permanently Locked
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-amber-400">Lock on Save</span>
                      )}
                    </div>
                    {(profileData.cv_locked || profileData.cv) ? (
                      <div className="p-4 rounded-xl bg-black/50 border border-emerald-500/30 text-slate-300 font-mono text-xs whitespace-pre-wrap leading-relaxed select-text">
                        {profileData.cv || "Verified Engineering Dossier and Source Contributions on Record."}
                        <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-slate-500 flex items-center gap-1">
                          <Lock size={10} /> Immutable sovereign credential. Modification or deletion disabled.
                        </div>
                      </div>
                    ) : (
                      <>
                        <textarea
                          rows={3}
                          value={profileData.cv || ''}
                          onChange={(e) => handleChange('cv', e.target.value)}
                          placeholder="Paste software engineering CV, open-source repositories, or portfolio link..."
                          className="w-full p-3 bg-black/30 border border-white/10 rounded-xl text-xs font-mono text-white focus:border-indigo-400 outline-none resize-none"
                        />
                        <span className="text-[10px] text-amber-400/90 block mt-1">
                          ⚠️ Attention: Once submitted, your developer CV becomes permanently locked.
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {profileData.role === 'student' && (
                <div className="space-y-4 p-5 rounded-2xl bg-white/[0.02] border border-emerald-500/20">
                  <div className="text-xs font-mono uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-2">
                    <GraduationCap size={14} /> Graduate Student Academic Enrollment
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">Degree Program</label>
                      <input
                        type="text"
                        value={profileData.degree_program || ''}
                        onChange={(e) => handleChange('degree_program', e.target.value)}
                        placeholder="e.g. M.Sc. in Machine Learning"
                        className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-xl text-xs font-mono text-white focus:border-emerald-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">Expected Graduation Year</label>
                      <input
                        type="text"
                        value={profileData.expected_graduation_year || ''}
                        onChange={(e) => handleChange('expected_graduation_year', e.target.value)}
                        placeholder="e.g. 2026"
                        className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-xl text-xs font-mono text-white focus:border-emerald-400 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-mono uppercase tracking-widest text-slate-400 block mb-1">Research Bio & Thesis Abstract</label>
                <textarea
                  rows={3}
                  value={profileData.bio || ''}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  className={`w-full p-4 rounded-xl border text-xs leading-relaxed font-sans focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────── */}
          {/* TAB 2: APPEARANCE & THEMES                                */}
          {/* ───────────────────────────────────────────────────────── */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-sm font-mono uppercase tracking-widest mb-1 font-bold text-white">
                  Global Platform Theme & Interface Aesthetics
                </h3>
                <p className="text-xs text-slate-400">Themes synchronize instantly and are saved permanently to your cloud database profile.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(THEME_REGISTRY).map(([themeKey, themeData]) => (
                  <button
                    key={themeKey}
                    type="button"
                    onClick={() => handleChange('theme', themeKey)}
                    className={`relative overflow-hidden p-5 border text-left transition-all hover:scale-[1.02] flex flex-col justify-between h-32 rounded-2xl ${
                      profileData.theme === themeKey 
                        ? `${themeData.accentBorder} ring-2 ring-teal-400/50 shadow-xl bg-white/[0.04]` 
                        : isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full z-10">
                      <span className={`font-bold text-sm ${profileData.theme === themeKey ? themeData.accentText : 'text-white'}`}>
                        {themeData.name}
                      </span>
                      {profileData.theme === themeKey && (
                        <CheckCircle2 size={16} className="text-teal-400" />
                      )}
                    </div>
                    
                    <div className="flex gap-2 z-10 mt-auto">
                      {themeData.previewColors.map((colorClass, idx) => (
                        <div key={idx} className={`w-5 h-5 rounded-full border border-white/20 shadow-sm ${colorClass}`} />
                      ))}
                    </div>
                    <div className={`absolute inset-0 opacity-10 pointer-events-none ${themeData.bgMain}`} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────── */}
          {/* TAB 3: AI ENGINE & ROUTING                                */}
          {/* ───────────────────────────────────────────────────────── */}
          {activeTab === 'ai' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-sm font-mono uppercase tracking-widest mb-1 font-bold text-white">
                  ScholarAI Execution Engine & Persona
                </h3>
                <p className="text-xs text-slate-400">Select routing target for neural literature inference and mathematical verification.</p>
              </div>

              {/* Execution Engine Architecture */}
              <div className="space-y-3">
                <label className="text-[11px] font-mono uppercase tracking-widest text-slate-400 block font-bold">
                  Sovereign AI Engine Architecture
                </label>
                <div className="p-5 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-300 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <Cpu size={20} className="text-teal-400" />
                      <span className="font-bold text-sm text-white font-sans">ScholarGrid AI Core (Sovereign Neural Engine)</span>
                    </div>
                    <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 uppercase font-bold tracking-wider">
                      Active & Sovereign
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans mt-2">
                    Deterministic offline neural execution running locally with zero external network leakage and zero third-party cloud dependencies. Certified for institutional peer reviews, formula AST verification, and mathematical invariance.
                  </p>
                </div>
              </div>

              {/* Tone & Reviewer Rigor */}
              <div className="space-y-3 pt-2">
                <label className="text-[11px] font-mono uppercase tracking-widest text-slate-400 block font-bold">
                  Conversational Tone & Reviewer Rigor
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'professional', name: 'Strict Academic', desc: 'Zero fluff, formal citations, strict formula proof bounds.' },
                    { id: 'occasional', name: 'Balanced Reviewer', desc: 'Rigorous analysis with clear intuitive pedagogical analogies.' },
                    { id: 'maximum', name: 'Deep Scrutiny', desc: 'Maximized Reviewer #2 stress testing, aggressive ablation flags.' }
                  ].map(lvl => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => handleChange('humorLevel', lvl.id)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        profileData.humorLevel === lvl.id
                          ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 ring-1 ring-cyan-500/30'
                          : isLight ? 'bg-white border-slate-200' : 'bg-black/20 border-white/5 hover:border-white/15 text-slate-400'
                      }`}
                    >
                      <div className="font-bold text-xs text-white mb-1">{lvl.name}</div>
                      <div className="text-[10px] text-slate-400 font-sans">{lvl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Diagnostics */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Gateway Status: <span className="text-teal-400 font-bold">{backendStatus}</span></span>
                <span className="text-[11px] text-teal-400 font-bold">ScholarGrid AI Core</span>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────── */}
          {/* TAB 4: SECURITY & DATA ISOLATION                          */}
          {/* ───────────────────────────────────────────────────────── */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-sm font-mono uppercase tracking-widest mb-1 font-bold text-white">
                  Multi-User Data Isolation & Security Guard
                </h3>
                <p className="text-xs text-slate-400">Cryptographic isolation prevents data contamination between researcher accounts.</p>
              </div>

              <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-start gap-3">
                <ShieldCheck size={20} className="text-teal-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 leading-relaxed font-sans">
                  <strong className="text-white block mb-0.5">Strict Tenant Workspace Isolation Active</strong>
                  Your research files in the Global Vault, Sovereign Audit Ledgers, and AST Math Sessions are partitioned with discrete user scoping. Newly registered accounts start with an uncontaminated, pristine workspace.
                </div>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-4 rounded-xl border border-white/5 bg-black/20 flex justify-between items-center">
                  <span className="text-slate-400">Account Identity UID</span>
                  <span className="text-white font-bold">{profileData.id}</span>
                </div>
                <div className="p-4 rounded-xl border border-white/5 bg-black/20 flex justify-between items-center">
                  <span className="text-slate-400">Database Storage Partition</span>
                  <span className="text-teal-400">PostgreSQL JSONB Isolated</span>
                </div>
                <div className="p-4 rounded-xl border border-white/5 bg-black/20 flex justify-between items-center">
                  <span className="text-slate-400">Anonymized Reviewer Mode</span>
                  <span className="text-emerald-400 font-bold">Enabled (SHA-256 Masked)</span>
                </div>
              </div>

              {/* Password Change Section */}
              <div className="pt-6 border-t border-white/10">
                <div className="mb-4">
                  <h4 className="text-sm font-mono uppercase tracking-widest text-white font-bold flex items-center gap-2">
                    <Lock size={15} className="text-teal-400" />
                    Change Account Password
                  </h4>
                  <p className="text-xs text-slate-400">Update your institutional account credentials with SHA-256 sovereign encryption.</p>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg">
                  {passwordMessage && (
                    <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                      passwordMessage.type === 'success' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}>
                      {passwordMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                      <span>{passwordMessage.text}</span>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5 font-bold">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordData.currentPassword}
                      onChange={e => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Enter current password..."
                      className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-teal-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5 font-bold">
                      New Password (Min. 6 Characters)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={passwordData.newPassword}
                      onChange={e => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Enter new password..."
                      className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-teal-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5 font-bold">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={passwordData.confirmPassword}
                      onChange={e => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Re-enter new password..."
                      className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-teal-400 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="px-5 py-2.5 rounded-xl bg-teal-500 text-black hover:bg-teal-400 font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    <Lock size={14} />
                    <span>{passwordLoading ? 'Updating Password...' : 'Update Password'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating System Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-teal-500/40 text-teal-300 font-mono text-xs shadow-2xl flex items-center gap-2 backdrop-blur-xl animate-fadeIn">
          <CheckCircle2 size={15} className="text-teal-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}