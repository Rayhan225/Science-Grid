import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const THEME_REGISTRY = {
  'obsidian-core': {
    name: 'Obsidian Core (Classic)',
    type: 'dark',
    bgMain: 'bg-[#050505] text-slate-300 font-sans',
    bgPattern: 'bg-[radial-gradient(#ffffff05_1px,transparent_1px)] bg-[size:30px_30px]', // Restored original subtle dot grid
    bgCard: 'bg-[#0a0a0a] border border-white/5 text-white shadow-2xl rounded-2xl',
    bgSidebar: 'bg-[#050505] border-r border-white/5',
    bgHeader: 'bg-[#050505]/95 border-b border-white/5 backdrop-blur-xl',
    accentText: 'text-cyan-400',
    accentBorder: 'border-cyan-500/50',
    accentBg: 'bg-cyan-500',
    radius: 'rounded-2xl',
    previewColors: ['bg-[#050505]', 'bg-[#0a0a0a]', 'bg-cyan-400']
  },
  'circuit-board': {
    name: 'Circuit Board',
    type: 'dark',
    bgMain: 'bg-[#0a0f0d] text-emerald-100 font-mono',
    bgPattern: 'bg-[url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M54.627 0l.83.83v58.34l-.83.83H5.373l-.83-.83V.83l.83-.83h49.254zM53.5 58.5V1.5H6.5v57h47zM30 28.5v3h-3v-3h3zm15 15v3h-3v-3h3zm-30-30v3h-3v-3h3z\' fill=\'%2310b981\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")]',
    bgCard: 'bg-[#0d1712]/90 border border-emerald-500/20 text-emerald-50 shadow-[0_0_30px_rgba(16,185,129,0.05)] rounded-none backdrop-blur-md',
    bgSidebar: 'bg-[#0a0f0d] border-r border-emerald-500/20',
    bgHeader: 'bg-[#0a0f0d]/90 border-b border-emerald-500/20 backdrop-blur-xl',
    accentText: 'text-emerald-400',
    accentBorder: 'border-emerald-500',
    accentBg: 'bg-emerald-500',
    radius: 'rounded-none',
    previewColors: ['bg-[#0a0f0d]', 'bg-[#0d1712]', 'bg-emerald-500']
  },
  'blueprint-engineer': {
    name: 'Engineering Blueprint',
    type: 'light',
    bgMain: 'bg-[#1e3a8a] text-blue-50 font-sans',
    bgPattern: 'bg-[linear-gradient(to_right,#ffffff20_1px,transparent_1px),linear-gradient(to_bottom,#ffffff20_1px,transparent_1px)] bg-[size:40px_40px]',
    bgCard: 'bg-[#1e3a8a]/80 border-2 border-white/30 text-white shadow-xl rounded-sm backdrop-blur-sm',
    bgSidebar: 'bg-[#1e3a8a] border-r border-white/20',
    bgHeader: 'bg-[#1e3a8a]/90 border-b border-white/20 backdrop-blur-md',
    accentText: 'text-white font-bold',
    accentBorder: 'border-white/50',
    accentBg: 'bg-white text-blue-900',
    radius: 'rounded-sm',
    previewColors: ['bg-[#1e3a8a]', 'bg-white/20', 'bg-white']
  },
  'topography-dark': {
    name: 'Topography Map',
    type: 'dark',
    bgMain: 'bg-[#111111] text-amber-100 font-sans',
    bgPattern: 'bg-[url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5z\' fill=\'%23f59e0b\' fill-opacity=\'0.03\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")]',
    bgCard: 'bg-[#1a1a1a]/95 border border-amber-500/10 text-white shadow-xl rounded-3xl',
    bgSidebar: 'bg-[#111111] border-r border-amber-500/10',
    bgHeader: 'bg-[#111111]/90 border-b border-amber-500/10 backdrop-blur-md',
    accentText: 'text-amber-500',
    accentBorder: 'border-amber-500/50',
    accentBg: 'bg-amber-600',
    radius: 'rounded-3xl',
    previewColors: ['bg-[#111111]', 'bg-[#1a1a1a]', 'bg-amber-500']
  },
  'glass-ocean': {
    name: 'Glass Ocean',
    type: 'dark',
    bgMain: 'bg-gradient-to-br from-[#000428] via-[#001e36] to-[#000428] text-teal-50 font-sans',
    bgPattern: 'bg-[url("data:image/svg+xml,%3Csvg width=\'100\' height=\'20\' viewBox=\'0 0 100 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M21.184 20c.357-.13.72-.264 1.088-.402l1.768-.661C33.64 15.347 39.647 14 50 14c10.271 0 15.362 1.222 24.629 4.928.955.383 1.869.74 2.75 1.072h6.225c-2.51-.73-5.139-1.691-8.233-2.928C65.888 13.278 60.562 12 50 12c-10.626 0-16.855 1.397-26.66 5.063l-1.767.662c-2.475.923-4.66 1.674-6.724 2.275h16.335zm0-20C13.258 2.892 8.077 4 0 4V2c5.744 0 9.951-.574 14.85-2h6.334zM42.11 0c-3.13 1.237-5.76 2.198-8.272 2.928h6.224c.882-.332 1.796-.689 2.75-1.072C52.179.623 57.27 0 67.54 0c10.334 0 16.34 1.347 25.96 4.938l1.767.662c.368.138.731.272 1.088.402h6.335c-2.064-.601-4.249-1.352-6.724-2.275l-1.767-.662C84.396 2.397 78.17 1 67.54 1c-10.562 0-15.888 1.278-25.43 4.928z\' fill=\'%232dd4bf\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")]',
    bgCard: 'bg-white/5 border border-white/10 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-3xl',
    bgSidebar: 'bg-white/5 border-r border-white/10 backdrop-blur-3xl',
    bgHeader: 'bg-transparent border-b border-white/10 backdrop-blur-md',
    accentText: 'text-teal-400',
    accentBorder: 'border-teal-400/50',
    accentBg: 'bg-teal-500',
    radius: 'rounded-3xl',
    previewColors: ['bg-[#001e36]', 'bg-white/20', 'bg-teal-400']
  },
  'synthwave-grid': {
    name: 'Synthwave Grid',
    type: 'dark',
    bgMain: 'bg-[#120428] text-pink-100 font-sans',
    bgPattern: 'bg-[linear-gradient(to_right,#ff00ff15_1px,transparent_1px),linear-gradient(to_bottom,#ff00ff15_1px,transparent_1px)] bg-[size:50px_50px] [transform:perspective(500px)_rotateX(60deg)] origin-bottom',
    bgCard: 'bg-[#1d0b3b]/95 border border-pink-500/40 shadow-[0_0_15px_rgba(255,0,255,0.2)] rounded-lg backdrop-blur-sm',
    bgSidebar: 'bg-[#0f0221] border-r border-pink-500/30',
    bgHeader: 'bg-[#120428]/90 border-b border-pink-500/30 backdrop-blur-lg',
    accentText: 'text-cyan-400',
    accentBorder: 'border-cyan-400',
    accentBg: 'bg-pink-500',
    radius: 'rounded-lg',
    previewColors: ['bg-[#120428]', 'bg-[#1d0b3b]', 'bg-pink-500']
  },
  'paper-minimalist': {
    name: 'Paper Minimalist',
    type: 'light',
    bgMain: 'bg-[#f4f4f5] text-slate-800 font-serif',
    bgPattern: '',
    bgCard: 'bg-white border border-slate-200 shadow-sm rounded-md',
    bgSidebar: 'bg-[#f4f4f5] border-r border-slate-200',
    bgHeader: 'bg-[#f4f4f5]/90 border-b border-slate-200 backdrop-blur-sm',
    accentText: 'text-indigo-600',
    accentBorder: 'border-indigo-600',
    accentBg: 'bg-indigo-600',
    radius: 'rounded-md',
    previewColors: ['bg-[#f4f4f5]', 'bg-white', 'bg-indigo-600']
  },

  'quantum-nebula': {
  name: 'Quantum Nebula',
  type: 'dark',
  bgMain: 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1a0b2e] via-[#050014] to-[#000000] text-fuchsia-50 font-sans',
  bgPattern: 'bg-[url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\' fill=\'%23d946ef\' fill-opacity=\'0.05\'/%3E%3C/g%3E%3C/svg%3E")] animate-pulse-slow',
  bgCard: 'bg-[#1a0b2e]/40 border border-fuchsia-500/20 backdrop-blur-3xl shadow-[0_0_50px_rgba(217,70,239,0.1)] rounded-[2.5rem]',
  bgSidebar: 'bg-[#050014]/80 border-r border-fuchsia-500/10 backdrop-blur-2xl',
  bgHeader: 'bg-transparent border-b border-fuchsia-500/10 backdrop-blur-md',
  accentText: 'text-fuchsia-400',
  accentBorder: 'border-fuchsia-500/50',
  accentBg: 'bg-fuchsia-500',
  radius: 'rounded-[2.5rem]',
  previewColors: ['bg-[#050014]', 'bg-[#1a0b2e]', 'bg-fuchsia-400']
},
'solar-flare': {
  name: 'Solar Flare',
  type: 'dark',
  bgMain: 'bg-gradient-to-br from-[#2a0800] via-[#1a0500] to-[#000000] text-orange-50 font-sans',
  bgPattern: 'bg-[linear-gradient(to_right,#ff8a000a_1px,transparent_1px),linear-gradient(to_bottom,#ff8a000a_1px,transparent_1px)] bg-[size:24px_24px]',
  bgCard: 'bg-[#1a0500]/60 border-t border-l border-orange-500/30 text-white shadow-2xl rounded-tr-3xl rounded-bl-3xl rounded-tl-sm rounded-br-sm backdrop-blur-lg',
  bgSidebar: 'bg-[#000000] border-r border-orange-500/20',
  bgHeader: 'bg-[#000000]/90 border-b border-orange-500/20',
  accentText: 'text-orange-400',
  accentBorder: 'border-orange-500',
  accentBg: 'bg-gradient-to-r from-orange-500 to-red-500',
  radius: 'rounded-tr-3xl rounded-bl-3xl rounded-tl-sm rounded-br-sm',
  previewColors: ['bg-[#1a0500]', 'bg-orange-500', 'bg-red-500']
}
};

export function ThemeProvider({ children, theme, setTheme }) {
  const activeTheme = THEME_REGISTRY[theme] || THEME_REGISTRY['obsidian-core'];
  const isLight = activeTheme.type === 'light';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isLight, themeClasses: activeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}