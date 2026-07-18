// src/components/Sidebar.jsx
import React from 'react';
import { Sliders, Database, Settings, ChevronLeft, ChevronRight, LayoutDashboard, BookOpen, Undo2 } from 'lucide-react';

export default function Sidebar({ currentView, onViewChange, isSidebarOpen, setIsSidebarOpen }) {
  const primaryRoutes = [
    { id: 'dashboard', label: 'Command Matrix', icon: LayoutDashboard, color: 'text-cyan-400', glow: 'bg-cyan-500/10 border-cyan-500/30' },
    { id: 'math-evaluator', label: 'Math Evaluator', icon: Sliders, color: 'text-cyan-400', glow: 'bg-cyan-500/10 border-cyan-500/30' },
    { id: 'insight-lens', label: 'InsightLens Reader', icon: BookOpen, color: 'text-emerald-400', glow: 'bg-emerald-500/10 border-emerald-500/30' }, 
  ];

  const administrativeRoutes = [
    { id: 'central-vault', label: 'Global Vault', icon: Database, color: 'text-purple-400', glow: 'bg-purple-500/10 border-purple-500/30' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'text-slate-400', glow: 'bg-white/10 border-white/20' },
  ];

  // Isolated structural sub-menu panel array mapping
  const renderingIsolatedSidebarMenu = currentView === 'central-vault' || currentView === 'settings';

  return (
    <div className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-[#0a0a0a] border-r border-white/5 flex flex-col justify-between transition-all duration-300 relative select-none z-50 shrink-0`}>
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="absolute top-6 -right-3 w-6 h-6 bg-[#0a0a0a] border border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors z-50"
      >
        {isSidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>

      {/* Primary Ingestion Tree Structure */}
      <div className="flex flex-col pt-6 flex-grow">
        <div className="px-6 mb-8 flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-cyan-400 font-mono">SG</span>
          </div>
          {isSidebarOpen && <span className="font-serif font-bold text-white text-base tracking-wide whitespace-nowrap">ScholarGrid</span>}
        </div>

        <nav className="px-3 space-y-1.5 flex-grow">
          {renderingIsolatedSidebarMenu ? (
            // Isolated Navigation Viewport Submenu Container
            <button 
              onClick={() => onViewChange('dashboard')}
              className="w-full flex items-center gap-3.5 px-4 py-3 bg-white/5 border border-white/10 text-slate-300 hover:text-white rounded-xl font-mono text-xs uppercase tracking-widest transition-all"
            >
              <Undo2 size={16} className="text-emerald-400 animate-pulse"/>
              {isSidebarOpen && <span className="truncate">Return Matrix</span>}
            </button>
          ) : (
            primaryRoutes.map(route => {
              const Icon = route.icon;
              const isActive = currentView === route.id;
              return (
                <button
                  key={route.id}
                  onClick={() => onViewChange(route.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-mono text-xs uppercase tracking-widest transition-all group border ${isActive ? route.glow + ' text-white font-bold' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'}`}
                >
                  <Icon size={16} className={isActive ? route.color : 'text-slate-500 group-hover:text-slate-300'} />
                  {isSidebarOpen && <span className="truncate">{route.label}</span>}
                </button>
              );
            })
          )}
        </nav>
      </div>

      {/* Permanently Locked Bottom Section Anchor */}
      <div className="border-t border-white/5 p-3 space-y-1.5 bg-black/40">
        {administrativeRoutes.map(route => {
          const Icon = route.icon;
          const isActive = currentView === route.id;
          return (
            <button
              key={route.id}
              onClick={() => onViewChange(route.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-mono text-xs uppercase tracking-widest transition-all group border ${isActive ? route.glow + ' text-white font-bold' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'}`}
            >
              <Icon size={16} className={isActive ? route.color : 'text-slate-500 group-hover:text-slate-300'} />
              {isSidebarOpen && <span className="truncate">{route.label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}