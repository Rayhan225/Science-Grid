// src/components/Header.jsx
import React from 'react';
import { 
  Activity, Sliders, BookOpen, GitCompare, 
  Database, TerminalSquare, Settings as SettingsIcon, LayoutDashboard, Sparkles 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Header({ status, currentView, onViewChange }) {
  const { themeClasses, isLight } = useTheme();

  // Dynamic Island configuration mapping for every page/tool
  const islandConfig = {
    'dashboard': {
      icon: LayoutDashboard,
      label: 'Command Matrix',
      subtext: 'Operational Hub',
      accent: 'text-cyan-400',
      ring: 'border-cyan-500/30'
    },
    'math-evaluator': {
      icon: Sliders,
      label: 'Math Evaluator',
      subtext: 'WASM Runtime Sandbox',
      accent: 'text-cyan-400',
      ring: 'border-cyan-500/30'
    },
    'insight-lens': {
      icon: BookOpen,
      label: 'InsightLens Reader',
      subtext: 'Layout-Aware RAG Active',
      accent: 'text-emerald-400',
      ring: 'border-emerald-500/30'
    },
    'domain-matrix': {
      icon: GitCompare,
      label: 'DomainMatrix AI',
      subtext: 'Cross-Examination Engine',
      accent: 'text-rose-400',
      ring: 'border-rose-500/30'
    },
    'central-vault': {
      icon: Database,
      label: 'Global Vault',
      subtext: 'pgvector Relational Tree',
      accent: 'text-purple-400',
      ring: 'border-purple-500/30'
    },
    'developer-tools': {
      icon: TerminalSquare,
      label: 'Developer Tools',
      subtext: 'Layer 7 API Core',
      accent: 'text-orange-400',
      ring: 'border-orange-500/30'
    },
    'settings': {
      icon: SettingsIcon,
      label: 'System Configuration',
      subtext: 'Themes & Preferences',
      accent: 'text-slate-400',
      ring: 'border-slate-500/30'
    }
  };

  const currentConfig = islandConfig[currentView] || islandConfig['dashboard'];
  const Icon = currentConfig.icon;

  return (
    <header className={`${themeClasses.bgHeader} px-8 py-3.5 flex justify-between items-center relative z-40 print:hidden transition-colors border-b border-inherit`}>
      
      {/* Left: Minimal branding / breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => onViewChange('dashboard')}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-transform group-hover:scale-105 ${themeClasses.accentBg} ${themeClasses.accentBorder} bg-opacity-20`}>
            <span className={`text-xs font-bold font-mono ${themeClasses.accentText}`}>SG</span>
          </div>
          <span className={`text-xs font-serif font-bold tracking-wide hidden sm:inline ${isLight ? 'text-slate-900' : 'text-white'}`}>ScholarGrid</span>
        </div>
      </div>

      {/* Center: iPhone Dynamic Island Style Floating Capsule */}
      <div className="absolute left-1/2 transform -translate-x-1/2">
        <div className={`flex items-center gap-3 px-4 py-1.5 rounded-full border backdrop-blur-xl shadow-2xl transition-all duration-500 ease-out hover:scale-105 ${isLight ? 'bg-white/80 border-slate-200 text-slate-800' : 'bg-black/70 border-white/10 text-slate-200'} ${currentConfig.ring}`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center bg-white/5 ${currentConfig.accent}`}>
            <Icon size={13} />
          </div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-wider">
            <span className="font-bold">{currentConfig.label}</span>
            <span className="opacity-30">•</span>
            <span className="text-[10px] opacity-70 hidden md:inline">{currentConfig.subtext}</span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" title="Active"></div>
        </div>
      </div>

      {/* Right: Engine status & pipeline indicator (Profile and logout are handled in the sidebar) */}
      <div className="flex items-center gap-4 text-xs font-mono uppercase tracking-widest select-none">
        <div className="hidden lg:flex items-center gap-2 text-slate-500 text-[10px]">
          <Activity size={13} className="text-emerald-500 animate-pulse"/> Engine Online
        </div>
        <div className={`border px-3 py-1 rounded-full text-[10px] font-bold ${currentConfig.accent} ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
          {status === 'Ready' ? '● System Ready' : `○ ${status}`}
        </div>
      </div>

    </header>
  );
}