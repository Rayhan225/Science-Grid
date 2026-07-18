import React from 'react';
import { Layers, ChevronRight, Activity } from 'lucide-react';

export default function Header({ status, currentView, onViewChange }) {
  return (
    <header className="bg-[#050505]/70 backdrop-blur-xl border-b border-white/5 px-8 py-4.5 flex justify-between items-center relative z-40 print:hidden">
      <div className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase tracking-widest">
        <Layers size={14} className="text-slate-600" />
        <span className="hover:text-slate-300 cursor-pointer" onClick={() => onViewChange('dashboard')}>ScholarGrid</span>
        <ChevronRight size={12} className="text-slate-700" />
        <span className="text-white font-medium">{currentView === 'math-evaluator' ? 'Mathematical Evaluator core' : 'Matrix Hub'}</span>
      </div>
      <div className="flex items-center gap-4 text-xs font-mono uppercase tracking-widest select-none">
        <div className="flex items-center gap-2 text-slate-500"><Activity size={14} className="text-slate-600 animate-pulse"/> Pipeline Active</div>
        <div className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full font-bold text-emerald-400">
          {status === 'Ready' ? '● Engine Online' : `○ ${status}`}
        </div>
      </div>
    </header>
  );
}