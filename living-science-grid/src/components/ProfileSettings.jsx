// src/components/ProfileSettings.jsx
import React, { useState, useEffect } from 'react';
import { 
  User, Shield, Cpu, Sliders, HardDrive, Bell, Save, 
  CheckCircle2, RefreshCw, Terminal, Globe, Lock, Key, Sparkles,
  GraduationCap, Microscope, Code2, CheckSquare, BookOpen, Camera, Building2, BadgeCheck, LogOut
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ProfileSettings({ setCurrentView }) {
  const { themeClasses, isLight } = useTheme();

  const [user, setUser] = useState({
    name: "Dr. Scholar",
    email: "scholar@sciencegrid.io",
    title: "Principal Investigator",
    role: "researcher",
    affiliation: "Institute for Advanced Research",
    department: "Department of Computer Science & AI",
    lab: "Sovereign Systems & Neural Computing Lab",
    bio: "Specializing in transformer attention mechanics, latent vector representations, and sovereign computational systems.",
    avatarPreset: "cyan",
    publicWorkspaces: true,
    showLedgerTimeline: true
  });

  const [statusMessage, setStatusMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [isSaving, setIsSaving] = useState(false);

  const avatarPresets = [
    { id: 'cyan', bg: 'from-cyan-500 to-blue-600', label: 'Cyan Matrix' },
    { id: 'purple', bg: 'from-purple-500 to-indigo-600', label: 'Nebula Purple' },
    { id: 'emerald', bg: 'from-emerald-500 to-teal-600', label: 'Quantum Emerald' },
    { id: 'amber', bg: 'from-amber-500 to-rose-600', label: 'Solar Amber' }
  ];

  // Fetch profile settings from database backend on mount, falling back to localStorage
  useEffect(() => {
    const fetchProfileFromDB = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/user/profile');
        if (res.ok) {
          const dbData = await res.json();
          if (dbData && Object.keys(dbData).length > 0) {
            setUser(prev => ({ ...prev, ...dbData }));
            localStorage.setItem('sg_current_user', JSON.stringify(dbData));
            return;
          }
        }
      } catch (err) {
        console.warn("Backend profile database unreachable, loading from local storage state.");
      }

      try {
        const stored = localStorage.getItem('sg_current_user');
        if (stored) {
          setUser(JSON.parse(stored));
        }
      } catch (e) {
        console.warn("Failed to parse local storage user state.");
      }
    };

    fetchProfileFromDB();
  }, []);

  const handleUserChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUser(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });

      if (!response.ok) {
        throw new Error("Failed to synchronize profile settings with the database.");
      }

      localStorage.setItem('sg_current_user', JSON.stringify(user));
      window.dispatchEvent(new Event('userRoleUpdated'));

      setStatusMessage("Profile credentials and institutional settings saved to database successfully.");
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Database save error:", err);
      localStorage.setItem('sg_current_user', JSON.stringify(user));
      window.dispatchEvent(new Event('userRoleUpdated'));
      setStatusMessage("Saved locally (Database sync warning: check server connection).");
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    // 1. Wipe all local and session storage
    localStorage.clear();
    sessionStorage.clear();
    
    // 2. Alert the rest of the application
    window.dispatchEvent(new Event('userRoleUpdated'));
    
    // 3. Try standard React state update
    if (typeof setCurrentView === 'function') {
      setCurrentView('landing');
    }

    // 4. Force a hard browser reset to the root path to completely dump React memory
    setTimeout(() => {
      window.location.href = '/';
    }, 100);
  };

  return (
    <div className={`p-6 md:p-12 h-full max-w-[1500px] mx-auto flex flex-col overflow-y-auto custom-scrollbar animate-fadeIn select-none ${themeClasses.bgMain}`}>
      
      {/* ================= COSMIC HERO BANNER ================= */}
      <div className={`relative p-8 md:p-10 rounded-[3rem] border shadow-2xl overflow-hidden mb-10 backdrop-blur-3xl ${themeClasses.bgCard}`}>
        <div className="absolute top-0 right-0 w-[450px] h-[450px] rounded-full bg-gradient-to-br from-cyan-500/15 via-purple-500/10 to-transparent blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-emerald-500/10 via-cyan-500/5 to-transparent blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span> Profile Customization & Database Persistence
            </div>
            <h1 className={`text-3xl md:text-5xl font-serif tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Scholar Profiles & Settings.
            </h1>
            <p className="text-xs text-slate-400 font-light leading-relaxed">
              Tailor your personal credentials, institutional affiliation, avatar presentation, and security sessions. Profile changes persist securely in the database.
            </p>
          </div>

          {/* Tab Navigation Switches */}
          <div className="flex flex-wrap gap-2">
            <button 
              type="button"
              onClick={() => setActiveTab('personal')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'personal' ? `${themeClasses.accentBg} text-white font-bold shadow-lg` : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'}`}
            >
              <User size={14}/> Personal Info
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('institutional')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'institutional' ? `${themeClasses.accentBg} text-white font-bold shadow-lg` : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'}`}
            >
              <Building2 size={14}/> Institution
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('appearance')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'appearance' ? `${themeClasses.accentBg} text-white font-bold shadow-lg` : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'}`}
            >
              <Camera size={14}/> Avatar & Style
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('security')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'security' ? 'bg-rose-500 text-white font-bold shadow-lg' : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'}`}
            >
              <Shield size={14}/> Security & Session
            </button>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="mb-8 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={16}/> {statusMessage}
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSaveProfile} className="space-y-8">
        
        {/* ================= TAB 1: PERSONAL INFO ================= */}
        {activeTab === 'personal' && (
          <div className={`p-8 md:p-10 rounded-[3rem] border shadow-xl space-y-8 animate-fadeIn ${themeClasses.bgCard}`}>
            <div className="flex items-center justify-between border-b border-inherit pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                  <User size={22}/>
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Personal & Contact Credentials</h3>
                  <p className="text-xs text-slate-400 font-mono">Your primary identification across collaborative networks</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Full Name / Scholar Title</label>
                <input 
                  type="text" 
                  name="name" 
                  value={user.name || ''} 
                  onChange={handleUserChange}
                  className={`w-full p-4 rounded-2xl border text-xs font-mono outline-none transition-all ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-cyan-500' : 'bg-black/40 border-white/10 text-white focus:border-cyan-400'}`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Academic Email Address</label>
                <input 
                  type="email" 
                  name="email" 
                  value={user.email || ''} 
                  onChange={handleUserChange}
                  className={`w-full p-4 rounded-2xl border text-xs font-mono outline-none transition-all ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-cyan-500' : 'bg-black/40 border-white/10 text-white focus:border-cyan-400'}`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Professional Rank / Position</label>
                <input 
                  type="text" 
                  name="title" 
                  value={user.title || ''} 
                  onChange={handleUserChange}
                  placeholder="e.g. Principal Investigator / Senior Researcher"
                  className={`w-full p-4 rounded-2xl border text-xs font-mono outline-none transition-all ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-cyan-500' : 'bg-black/40 border-white/10 text-white focus:border-cyan-400'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Actor Persona Scope</label>
                <select 
                  name="role" 
                  value={user.role || 'researcher'} 
                  onChange={handleUserChange}
                  className={`w-full p-4 rounded-2xl border text-xs font-mono outline-none transition-all capitalize ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-cyan-500' : 'bg-[#0f0f0f] border-white/10 text-white focus:border-cyan-400'}`}
                >
                  <option value="researcher">Researcher / Author (Manuscripts & AST Execution)</option>
                  <option value="student">Student (Literature Parsing & Equations)</option>
                  <option value="developer">Developer / Programmer (Git Linker & REST APIs)</option>
                  <option value="reviewer">Peer Reviewer / Editor (Plagiarism & Replication)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Scholar Biography & Research Focus</label>
                <textarea 
                  name="bio" 
                  rows="3"
                  value={user.bio || ''} 
                  onChange={handleUserChange}
                  placeholder="Describe your research interests, publication domains, or experimental focus..."
                  className={`w-full p-4 rounded-2xl border text-xs font-mono outline-none transition-all resize-none ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-cyan-500' : 'bg-black/40 border-white/10 text-white focus:border-cyan-400'}`}
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: INSTITUTIONAL INFO ================= */}
        {activeTab === 'institutional' && (
          <div className={`p-8 md:p-10 rounded-[3rem] border shadow-xl space-y-8 animate-fadeIn ${themeClasses.bgCard}`}>
            <div className="flex items-center justify-between border-b border-inherit pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                  <Building2 size={22}/>
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Institutional Affiliation & Lab Metadata</h3>
                  <p className="text-xs text-slate-400 font-mono">Academic hierarchy and laboratory assignment</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">University / Institution Name</label>
                <input 
                  type="text" 
                  name="affiliation" 
                  value={user.affiliation || ''} 
                  onChange={handleUserChange}
                  placeholder="e.g. Institute for Advanced Research"
                  className={`w-full p-4 rounded-2xl border text-xs font-mono outline-none transition-all ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-cyan-500' : 'bg-black/40 border-white/10 text-white focus:border-cyan-400'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Department / Faculty</label>
                <input 
                  type="text" 
                  name="department" 
                  value={user.department || ''} 
                  onChange={handleUserChange}
                  placeholder="e.g. Department of Computer Science & AI"
                  className={`w-full p-4 rounded-2xl border text-xs font-mono outline-none transition-all ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-cyan-500' : 'bg-black/40 border-white/10 text-white focus:border-cyan-400'}`}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Research Laboratory / Working Group</label>
                <input 
                  type="text" 
                  name="lab" 
                  value={user.lab || ''} 
                  onChange={handleUserChange}
                  placeholder="e.g. Sovereign Systems & Neural Computing Lab"
                  className={`w-full p-4 rounded-2xl border text-xs font-mono outline-none transition-all ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-cyan-500' : 'bg-black/40 border-white/10 text-white focus:border-cyan-400'}`}
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: AVATAR & STYLE ================= */}
        {activeTab === 'appearance' && (
          <div className={`p-8 md:p-10 rounded-[3rem] border shadow-xl space-y-8 animate-fadeIn ${themeClasses.bgCard}`}>
            <div className="flex items-center justify-between border-b border-inherit pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                  <Camera size={22}/>
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Avatar Customization & Visual Presentation</h3>
                  <p className="text-xs text-slate-400 font-mono">Personalize your holographic avatar badge style</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-4">Select Avatar Aesthetic Theme</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {avatarPresets.map((preset) => (
                    <div 
                      key={preset.id}
                      onClick={() => setUser(prev => ({ ...prev, avatarPreset: preset.id }))}
                      className={`p-5 rounded-3xl border cursor-pointer transition-all flex flex-col items-center gap-3 ${user.avatarPreset === preset.id ? 'border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/10' : 'border-white/10 bg-white/[0.02] hover:border-white/30'}`}
                    >
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${preset.bg} flex items-center justify-center text-white font-serif text-xl font-bold shadow-md`}>
                        {user.name ? user.name.charAt(0) : 'S'}
                      </div>
                      <span className="text-xs font-mono text-slate-300">{preset.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-inherit space-y-4">
                <h4 className={`text-xs font-mono uppercase tracking-widest font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Community Privacy & Visibility Toggles
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center justify-between p-4.5 rounded-2xl border border-white/5 bg-white/[0.02] cursor-pointer">
                    <div>
                      <span className="text-xs font-bold block text-white">Public Workspaces</span>
                      <span className="text-[10px] text-slate-400 font-mono">Display active calculation nodes on your public profile.</span>
                    </div>
                    <input 
                      type="checkbox" 
                      name="publicWorkspaces"
                      checked={Boolean(user.publicWorkspaces)} 
                      onChange={handleUserChange}
                      className="w-4 h-4 accent-cyan-400 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4.5 rounded-2xl border border-white/5 bg-white/[0.02] cursor-pointer">
                    <div>
                      <span className="text-xs font-bold block text-white">Ledger Transaction Timeline</span>
                      <span className="text-[10px] text-slate-400 font-mono">Showcase peer-review logs and replication attempts.</span>
                    </div>
                    <input 
                      type="checkbox" 
                      name="showLedgerTimeline"
                      checked={Boolean(user.showLedgerTimeline)} 
                      onChange={handleUserChange}
                      className="w-4 h-4 accent-cyan-400 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: SECURITY & SESSION (LOGOUT) ================= */}
        {activeTab === 'security' && (
          <div className={`p-8 md:p-10 rounded-[3rem] border border-rose-500/20 shadow-xl space-y-8 animate-fadeIn ${themeClasses.bgCard}`}>
            <div className="flex items-center justify-between border-b border-inherit pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
                  <Shield size={22}/>
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Security & Session Control</h3>
                  <p className="text-xs text-slate-400 font-mono">Manage active authentication tokens and session state</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1 max-w-lg">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <LogOut size={16} className="text-rose-400"/> Terminate Current Session
                  </h4>
                  <p className="text-xs text-slate-400 font-light leading-relaxed">
                    Signing out will completely wipe local session storage memory and reload the application back to the landing view.
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={handleLogout}
                  className="px-6 py-3.5 rounded-2xl text-xs font-mono font-bold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 flex-shrink-0"
                >
                  <LogOut size={16}/> Sign Out & Wipe Session
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Bar */}
        {activeTab !== 'security' && (
          <div className="flex justify-end pt-4">
            <button 
              type="submit"
              disabled={isSaving}
              className={`px-8 py-4 rounded-2xl text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2 shadow-2xl transition-all hover:scale-105 disabled:opacity-50 ${themeClasses.accentBg}`}
            >
              {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16}/>} 
              {isSaving ? 'Saving to Database...' : 'Save Profile & Identity'}
            </button>
          </div>
        )}

      </form>

    </div>
  );
}