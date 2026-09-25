// src/components/Header.jsx
import {
  Activity,
  BookOpen,
  Database,
  FileCode,
  GitCompare,
  LayoutDashboard,
  Settings as SettingsIcon,
  ShieldCheck,
  Sliders
} from 'lucide-react';
import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function Header({ status, currentView, onViewChange }) {
  const { themeClasses, isLight } = useTheme();
  const [modelLabel, setModelLabel] = React.useState('ScholarGrid AI Active');

  React.useEffect(() => {
    fetch('http://127.0.0.1:8000/api/ai/tags')
      .then(res => res.json())
      .then(data => {
        if (data.current_model || (data.models && data.models[0])) {
          setModelLabel('ScholarGrid AI Active');
        }
      })
      .catch(() => setModelLabel('ScholarGrid AI Standby'));
  }, []);

  // Dynamic Island configuration mapping for every page/tool
  const islandConfig = {
    'dashboard': {
      icon: LayoutDashboard,
      label: 'Command Matrix',
      subtext: 'Operational Hub',
      accent: 'text-cyan-400',
      ring: 'border-cyan-500/30',
      defaultStatus: 'Dashboard Ready'
    },
    'latex-studio': {
      icon: FileCode,
      label: 'LaTeX Studio',
      subtext: 'Overleaf-Grade TeX Live IDE',
      accent: 'text-amber-400',
      ring: 'border-amber-500/30',
      defaultStatus: 'LaTeX Studio Ready'
    },
    'math-evaluator': {
      icon: Sliders,
      label: 'Math Evaluator',
      subtext: 'WASM Runtime Sandbox',
      accent: 'text-cyan-400',
      ring: 'border-cyan-500/30',
      defaultStatus: 'Sandbox Ready'
    },
    'insight-lens': {
      icon: BookOpen,
      label: 'InsightLens Reader',
      subtext: 'Layout-Aware RAG Active',
      accent: 'text-emerald-400',
      ring: 'border-emerald-500/30',
      defaultStatus: 'Reader Ready'
    },
    'domain-matrix': {
      icon: GitCompare,
      label: 'DomainMatrix AI',
      subtext: 'Cross-Examination Engine',
      accent: 'text-rose-400',
      ring: 'border-rose-500/30',
      defaultStatus: 'Matrix Ready'
    },
    'validation-rigor': {
      icon: ShieldCheck,
      label: 'ScholarAudit',
      subtext: 'Peer Review & Rigor Engine',
      accent: 'text-teal-400',
      ring: 'border-teal-500/30',
      defaultStatus: 'Audit Ready'
    },
    'central-vault': {
      icon: Database,
      label: 'Global Vault',
      subtext: 'pgvector Relational Tree',
      accent: 'text-purple-400',
      ring: 'border-purple-500/30',
      defaultStatus: 'Vault Ready'
    },
    'settings': {
      icon: SettingsIcon,
      label: 'Settings & Profile',
      subtext: 'Credentials, Themes & AI Core',
      accent: 'text-cyan-400',
      ring: 'border-cyan-500/30',
      defaultStatus: 'Settings Ready'
    }
  };

  const currentConfig = islandConfig[currentView] || islandConfig['dashboard'];
  const Icon = currentConfig.icon;

  // Show page-specific default status when the global status is just "Ready" or stale from another page
  const displayStatus = (status && status !== 'Ready') ? status : currentConfig.defaultStatus;

  return (
    <header className={`${themeClasses.bgHeader} px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between relative z-40 print:hidden transition-colors duration-300 border-b border-inherit`}>

      {/* Left: Minimal branding / breadcrumb — flex-1 to guarantee symmetric centering */}
      <div className="flex-1 flex items-center justify-start gap-3 min-w-0">
        <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group" onClick={() => onViewChange('dashboard')}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-300 group-hover:scale-105 shadow-md ${themeClasses.accentBg} ${themeClasses.accentBorder} bg-opacity-20`}>
            <span className={`text-xs font-black font-mono tracking-tight ${themeClasses.accentText}`}>SG</span>
          </div>
          <span className={`text-sm font-serif font-bold tracking-wide hidden sm:inline transition-colors ${isLight ? 'text-slate-900' : 'text-white'}`}>
            ScholarGrid
          </span>
        </div>
      </div>

      {/* Center: Dynamic Island Floating Capsule — flex-shrink-0 for absolute optical centering */}
      <div className="flex-shrink-0 flex justify-center px-2 max-w-full">
        <div className={`flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4.5 py-1.5 rounded-full border backdrop-blur-2xl shadow-xl transition-all duration-300 ease-out hover:scale-[1.02] max-w-xs sm:max-w-md lg:max-w-lg ${
          isLight ? 'bg-white/90 border-slate-200 text-slate-800 shadow-slate-200/50' : 'bg-black/75 border-white/15 text-slate-100'
        } ${currentConfig.ring}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center bg-white/10 flex-shrink-0 ${currentConfig.accent}`}>
            <Icon size={14} />
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm font-mono tracking-wider min-w-0">
            <span className="font-bold whitespace-nowrap">{currentConfig.label}</span>
            <span className="opacity-30 hidden sm:inline">•</span>
            <span className="text-[11px] sm:text-xs opacity-70 hidden md:inline truncate max-w-[180px] lg:max-w-[240px]">{currentConfig.subtext}</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5 flex-shrink-0" title="Active"></div>
        </div>
      </div>

      {/* Right: Engine status & pipeline indicator — flex-1 to guarantee symmetric centering */}
      <div className="flex-1 flex items-center justify-end gap-3 text-xs font-mono uppercase tracking-wider select-none min-w-0">
        <div className="hidden xl:flex items-center gap-2 text-slate-400 text-xs font-medium truncate">
          <Activity size={14} className="text-emerald-400 animate-pulse flex-shrink-0"/> 
          <span className="truncate">{modelLabel}</span>
        </div>
        <div className={`border px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold whitespace-nowrap shadow-sm transition-all duration-300 ${currentConfig.accent} ${
          isLight ? 'bg-white border-slate-200 shadow-slate-100' : 'bg-white/5 border-white/10'
        }`}>
          {displayStatus === currentConfig.defaultStatus ? `● ${displayStatus}` : `○ ${displayStatus}`}
        </div>
      </div>

    </header>
  );
}
