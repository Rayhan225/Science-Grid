// src/components/Sidebar.jsx
import { useState, useEffect } from 'react';
import { 
  Sliders, Database, Settings, LayoutDashboard, 
  BookOpen, GitCompare, Undo2, TerminalSquare, User, ChevronDown, ChevronUp, ShieldCheck,
  FileCode, BookMarked, Sparkles
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const AVATAR_GRADIENT_MAP = {
  cyan: 'from-cyan-500 to-blue-600',
  purple: 'from-purple-500 to-indigo-600',
  emerald: 'from-emerald-500 to-teal-600',
  amber: 'from-amber-500 to-rose-600'
};

export default function Sidebar({ currentView, onViewChange, currentUser }) {
  const { isLight } = useTheme();
  const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState(true);
  const [avatarPreset, setAvatarPreset] = useState('cyan');

  // Load avatar preset from DB profile on mount and when user changes
  useEffect(() => {
    const loadAvatarPreset = async () => {
      if (!currentUser?.id) return;
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/user/profile?user_id=${encodeURIComponent(currentUser.id)}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.avatar_preset) {
            setAvatarPreset(data.avatar_preset);
          }
        }
      } catch {}
    };
    loadAvatarPreset();

    // Also listen for profile save events to update avatar in real time
    const handleProfileUpdate = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('sg_current_user') || '{}');
        if (stored.avatar_preset) setAvatarPreset(stored.avatar_preset);
      } catch {}
    };
    window.addEventListener('userRoleUpdated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);
    return () => {
      window.removeEventListener('userRoleUpdated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, [currentUser?.id]);

  const avatarGradient = AVATAR_GRADIENT_MAP[avatarPreset] || AVATAR_GRADIENT_MAP.cyan;

  const primaryRoutes = [
    { id: 'dashboard', label: 'Command Matrix', icon: LayoutDashboard, color: 'text-cyan-400', glow: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 font-bold' },
    { id: 'latex-studio', label: 'LaTeX Studio', icon: FileCode, color: 'text-amber-400', glow: 'bg-amber-500/15 border-amber-500/40 text-amber-400 font-bold' },
    { id: 'math-evaluator', label: 'Math Evaluator', icon: Sliders, color: 'text-cyan-400', glow: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 font-bold' },
    { id: 'insight-lens', label: 'InsightLens Reader', icon: BookOpen, color: 'text-emerald-400', glow: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold' }, 
    { id: 'domain-matrix', label: 'DomainMatrix AI', icon: GitCompare, color: 'text-rose-400', glow: 'bg-rose-500/15 border-rose-500/40 text-rose-400 font-bold' },
    { id: 'validation-rigor', label: 'ScholarAudit', icon: ShieldCheck, color: 'text-teal-400', glow: 'bg-teal-500/15 border-teal-500/40 text-teal-400 font-bold' },
  ];

  const templateRoutes = [
    { id: 'templates', label: 'Paper Templates', icon: BookMarked, color: 'text-orange-400', glow: 'bg-orange-500/15 border-orange-500/40 text-orange-400 font-bold' },
  ];

  const administrativeRoutes = [
    { id: 'central-vault', label: 'Global Vault', icon: Database, color: 'text-purple-400', glow: 'bg-purple-500/15 border-purple-500/40 text-purple-400 font-bold' },
    { id: 'settings', label: 'Settings & Profile', icon: Settings, color: 'text-cyan-400', glow: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 font-bold' },
  ];

  const renderingIsolatedSidebarMenu = ['central-vault', 'settings'].includes(currentView);

  const NavItem = ({ route, isActive, onClick }) => {
    const Icon = route.icon;
    return (
      <button
        id={`nav-${route.id}`}
        data-testid={`nav-${route.id}`}
        onClick={onClick}
        aria-current={isActive ? 'page' : undefined}
        title={route.label}
        className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl font-mono text-[13px] tracking-wide transition-all duration-200 ease-out active:scale-[0.98] border group/item relative ${
          isActive 
            ? route.glow 
            : `border-transparent ${isLight ? 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900 font-medium' : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'}`
        }`}
      >
        <div className="flex-shrink-0 flex items-center justify-center">
          <Icon 
            size={20} 
            className={`transition-colors duration-200 ${isActive ? route.color : isLight ? 'text-slate-500 group-hover/item:text-slate-900' : 'text-slate-400 group-hover/item:text-slate-200'}`} 
          />
        </div>
        <span className="truncate whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75 font-sans font-medium">
          {route.label}
        </span>
      </button>
    );
  };

  return (
    <aside className="w-full h-full flex flex-col justify-between select-none z-50 bg-transparent overflow-hidden">
      <div className="flex flex-col pt-5 flex-grow overflow-x-hidden">
        
        {/* User Identity Preview Card — avatar synced from DB */}
        <div className="px-3 mb-5 flex items-center gap-3 overflow-hidden">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg bg-gradient-to-tr ${avatarGradient} text-white font-serif text-lg font-bold`}>
            {currentUser?.name?.charAt(0) || '?'}
          </div>
          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            <span className={`font-serif font-bold text-base tracking-wide truncate max-w-[150px] ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {currentUser?.name || 'Researcher'}
            </span>
            <span className={`text-[11px] font-mono tracking-wider uppercase font-semibold ${
              currentUser?.role === 'admin' ? 'text-amber-400' :
              currentUser?.role === 'programmer' ? 'text-indigo-400' :
              currentUser?.role === 'student' ? 'text-emerald-400' :
              currentUser?.role === 'reviewer' ? 'text-teal-400' :
              'text-cyan-400'
            }`}>
              {currentUser?.role === 'admin' ? 'Lab Director' :
               currentUser?.role === 'programmer' ? 'Research Engineer' :
               currentUser?.role === 'student' ? 'Graduate Student' :
               currentUser?.role === 'reviewer' ? 'Peer Reviewer' :
               'Academic Researcher'}
            </span>
          </div>
        </div>

        <div className="px-2 mb-2">
          <button 
            onClick={() => setIsWorkspaceExpanded(!isWorkspaceExpanded)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span className="opacity-0 group-hover:opacity-100 transition-opacity truncate font-bold">Workspaces</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
              {isWorkspaceExpanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
            </span>
          </button>
        </div>

        <nav className={`px-2 space-y-1.5 transition-all duration-300 ${isWorkspaceExpanded ? 'block' : 'hidden group-hover:block'}`} aria-label="Main Navigation">
          {renderingIsolatedSidebarMenu ? (
            <button 
              onClick={() => onViewChange('dashboard')}
              title="Return Matrix"
              className={`w-full flex items-center gap-4 px-3.5 py-3 rounded-xl font-mono text-xs uppercase tracking-widest transition-all duration-200 ease-out border group/item ${
                isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex-shrink-0 flex items-center justify-center">
                <Undo2 size={18} className="text-emerald-400 group-hover/item:-translate-x-1 transition-transform"/>
              </div>
              <span className="truncate opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Return Matrix</span>
            </button>
          ) : (
            primaryRoutes.map(route => (
              <NavItem 
                key={route.id} 
                route={route} 
                isActive={currentView === route.id} 
                onClick={() => onViewChange(route.id)} 
              />
            ))
          )}
        </nav>

        {/* ── SEPARATE SECTION: RESEARCH TEMPLATES ── */}
        {!renderingIsolatedSidebarMenu && (
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/5 px-2">
            <div className="w-full flex items-center justify-between px-2.5 py-1 mb-1 text-[11px] font-mono uppercase tracking-wider text-slate-400">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity truncate font-bold text-orange-400 flex items-center gap-1.5">
                <Sparkles size={12} className="text-orange-400" />
                Templates
              </span>
            </div>
            <nav className="space-y-1.5" aria-label="Templates Navigation">
              {templateRoutes.map(route => (
                <NavItem 
                  key={route.id} 
                  route={route} 
                  isActive={currentView === route.id} 
                  onClick={() => onViewChange(route.id)} 
                />
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* Administrative Navigation */}
      <div className={`border-t p-3 space-y-1.5 overflow-x-hidden ${isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-black/20 border-white/5'}`}>
        <nav aria-label="Administrative Navigation" className="space-y-1.5">
          {administrativeRoutes.map(route => (
            <NavItem 
              key={route.id} 
              route={route} 
              isActive={currentView === route.id} 
              onClick={() => onViewChange(route.id)} 
            />
          ))}
        </nav>
      </div>
    </aside>
  );
}