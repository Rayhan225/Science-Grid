// src/App.jsx
import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import MathEvaluator from './components/MathEvaluator';
import InsightLens from './components/InsightLens';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Settings from './components/Settings';
import ProfileSettings from './components/ProfileSettings';
import CentralVault from './components/CentralVault';
import DomainMatrix from './components/DomainMatrix';
import DeveloperTools from './components/DeveloperTools';
import { Send, X, RefreshCw, Lock, UserPlus, LogIn } from 'lucide-react';
import { ThemeProvider, useTheme } from './context/ThemeContext';

function AuthModal({ initialMode = 'login', onClose, onLoginSuccess }) {
  const { themeClasses, isLight } = useTheme();
  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('researcher');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const endpoint = isRegister ? 'http://127.0.0.1:8000/api/v1/auth/register' : 'http://127.0.0.1:8000/api/v1/auth/login';
      const body = isRegister ? { email, password, name, role } : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Authentication failed');

      const userWithAvatar = { ...data.user, avatar: '🐱' };

      localStorage.setItem('sg_token', data.access_token);
      localStorage.setItem('sg_user', JSON.stringify(userWithAvatar));
      
      // Save to saved profiles list
      try {
        const saved = JSON.parse(localStorage.getItem('sg_saved_profiles') || '[]');
        if (!saved.some(p => p.email === userWithAvatar.email)) {
          saved.push(userWithAvatar);
          localStorage.setItem('sg_saved_profiles', JSON.stringify(saved));
        }
      } catch (e) {}

      onLoginSuccess(userWithAvatar);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
      <div className={`relative max-w-md w-full border p-8 rounded-3xl shadow-2xl ${themeClasses.bgCard}`}>
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={18}/></button>
        
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-cyan-400 font-bold font-mono">SG</div>
          <h2 className={`text-2xl font-serif font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {isRegister ? 'Create ScholarGrid Account' : 'Sign In to Workspace'}
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-1">Sovereign Research OS</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono rounded-xl">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          {isRegister && (
            <>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Full Name</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500" placeholder="Dr. Jane Doe"/>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Select Role</label>
                <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 text-white">
                  <option value="student">Student (Focused Learning & Sandbox)</option>
                  <option value="researcher">Researcher (DomainMatrix & InsightLens)</option>
                  <option value="developer">Developer (API Notebooks & Git Linker)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Email Address</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500" placeholder="researcher@university.edu"/>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500" placeholder="••••••••"/>
          </div>

          <button type="submit" disabled={loading} className={`w-full py-3.5 rounded-xl font-bold uppercase tracking-widest text-white transition-all shadow-lg ${themeClasses.accentBg}`}>
            {loading ? 'Processing...' : isRegister ? 'Register Account' : 'Authenticate Session'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => setIsRegister(!isRegister)} className="text-xs text-slate-400 hover:text-white underline font-mono">
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
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
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar relative flex flex-col p-0 w-full h-full">
          <div className={currentView === 'dashboard' ? 'flex-1 animate-fadeIn flex flex-col p-6' : 'hidden'}>
            <Dashboard onSelectTool={setCurrentView} telemetry={telemetry} currentUser={currentUser} />
          </div>
          
          <div className={currentView === 'settings' ? 'flex-1 animate-fadeIn flex flex-col p-6' : 'hidden'}>
            <Settings settings={settings} setSettings={setSettings} currentUser={currentUser} />
          </div>

          <div className={currentView === 'profile-settings' ? 'flex-1 animate-fadeIn flex flex-col p-6' : 'hidden'}>
            <ProfileSettings 
              currentUser={currentUser} 
              onUpdateProfile={onUpdateUser}
              onSwitchProfile={onUpdateUser}
              onLogout={onLogout}
            />
          </div>
          
          <div className={currentView === 'central-vault' ? 'flex-1 animate-fadeIn flex flex-col h-full' : 'hidden'}>
            <CentralVault setCurrentView={setCurrentView} />
          </div>

          <div className={currentView === 'developer-tools' ? 'flex-1 animate-fadeIn flex flex-col h-full' : 'hidden'}>
            <DeveloperTools />
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

  const [settings, setSettings] = useState({
    theme: 'obsidian-core', 
    scholarAIEngine: 'cloud-fast', 
    humorLevel: 'occasional'
  });

  const handleUpdateUser = (updatedUser) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('sg_user', JSON.stringify(updatedUser));
  };

  const handleLogout = () => {
    localStorage.removeItem('sg_token');
    localStorage.removeItem('sg_user');
    setCurrentUser(null);
  };

  if (!currentUser) {
    return (
      <ThemeProvider theme={settings.theme} setTheme={() => {}}>
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
              setAuthModalMode(null);
            }} 
          />
        )}
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={settings.theme} setTheme={(newTheme) => setSettings({...settings, theme: newTheme})}>
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