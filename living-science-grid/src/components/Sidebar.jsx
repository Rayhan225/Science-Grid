// src/components/Sidebar.jsx
import React, { useState } from 'react';
import { 
  Sliders, Database, Settings, LayoutDashboard, 
  BookOpen, GitCompare, Undo2, TerminalSquare, User, ChevronDown, ChevronUp 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Sidebar({ currentView, onViewChange, currentUser }) {
  const { themeClasses, isLight } = useTheme();
  const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState(true);

  const primaryRoutes = [
    { id: 'dashboard', label: 'Command Matrix', icon: LayoutDashboard, color: 'text-cyan-400', glow: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 font-bold' },
    { id: 'math-evaluator', label: 'Math Evaluator', icon: Sliders, color: 'text-cyan-400', glow: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 font-bold' },
    { id: 'insight-lens', label: 'InsightLens Reader', icon: BookOpen, color: 'text-emerald-400', glow: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold' }, 
    { id: 'domain-matrix', label: 'DomainMatrix AI', icon: GitCompare, color: 'text-rose-400', glow: 'bg-rose-500/15 border-rose-500/40 text-rose-400 font-bold' },
  ];

  const administrativeRoutes = [
    { id: 'profile-settings', label: 'Profile Settings', icon: User, color: 'text-cyan-400', glow: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 font-bold' },
    { id: 'central-vault', label: 'Global Vault', icon: Database, color: 'text-purple-400', glow: 'bg-purple-500/15 border-purple-500/40 text-purple-400 font-bold' },
    { id: 'developer-tools', label: 'Developer Tools', icon: TerminalSquare, color: 'text-orange-400', glow: 'bg-orange-500/15 border-orange-500/40 text-orange-400 font-bold' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'text-slate-400', glow: 'bg-white/10 border-white/20 text-white font-bold' },
  ];

  const renderingIsolatedSidebarMenu = ['central-vault', 'settings', 'developer-tools', 'profile-settings'].includes(currentView);

  const NavItem = ({ route, isActive, onClick }) => {
    const Icon = route.icon;
    return (
      <button
        onClick={onClick}
        aria-current={isActive ? 'page' : undefined}
        title={route.label}
        className={`w-full flex items-center gap-4 px-3.5 py-3 rounded-xl font-mono text-xs tracking-widest uppercase transition-all duration-200 ease-out active:scale-[0.98] border group/item relative ${
          isActive 
            ? route.glow 
            : `border-transparent ${isLight ? 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'}`
        }`}
      >
        <div className="flex-shrink-0 flex items-center justify-center">
          <Icon 
            size={18} 
            className={`transition-colors duration-200 ${isActive ? route.color : isLight ? 'text-slate-400 group-hover/item:text-slate-800' : 'text-slate-500 group-hover/item:text-slate-300'}`} 
          />
        </div>
        <span className="truncate whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
          {route.label}
        </span>
      </button>
    );
  };

  return (
    <aside className="w-full h-full flex flex-col justify-between select-none z-50 bg-transparent overflow-hidden">
      <div className="flex flex-col pt-6 flex-grow overflow-x-hidden">
        
        {/* User Identity Preview Card (Shows avatar in collapsed mode) */}
        <div className="px-5 mb-6 flex items-center gap-4 overflow-hidden">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg border text-lg bg-cyan-500/10 border-cyan-500/30`}>
            {currentUser?.avatar || '🐱'}
          </div>
          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            <span className={`font-serif font-bold text-sm tracking-wide truncate max-w-[140px] ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {currentUser?.name || 'Researcher'}
            </span>
            <span className={`text-[9px] font-mono tracking-widest uppercase text-cyan-400`}>
              {currentUser?.role || 'active'}
            </span>
          </div>
        </div>

        <div className="px-3 mb-2">
          <button 
            onClick={() => setIsWorkspaceExpanded(!isWorkspaceExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
          >
            <span className="opacity-0 group-hover:opacity-100 transition-opacity truncate">Workspaces</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
              {isWorkspaceExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </span>
          </button>
        </div>

        <nav className={`px-3 space-y-1.5 transition-all duration-300 ${isWorkspaceExpanded ? 'block' : 'hidden group-hover:block'}`} aria-label="Main Navigation">
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
      </div>

      {/* Administrative Navigation (Logout removed from here) */}
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