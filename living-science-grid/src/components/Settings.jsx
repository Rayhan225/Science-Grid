import React from 'react';
import { Settings as SettingsIcon, Zap, ShieldCheck, Smile, Cpu } from 'lucide-react';

export default function Settings({ settings, setSettings }) {
  return (
    <div className="p-6 md:p-8 space-y-8 max-w-[1000px] mx-auto animate-fadeIn pb-20">
      <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-500 to-slate-400 opacity-50"></div>
        
        <h2 className="text-xl font-mono tracking-widest text-white uppercase mb-8 flex items-center gap-3">
          <SettingsIcon size={20} className="text-slate-400" /> Platform Configuration
        </h2>

        <div className="space-y-10">
          {/* ScholarAI Engine Selection */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-4 border-b border-white/5 pb-2">ScholarAI Processing Engine</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => setSettings({ ...settings, scholarAIEngine: 'cloud-fast' })}
                className={`p-5 rounded-2xl border text-left transition-all ${settings.scholarAIEngine === 'cloud-fast' ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-[#050505] border-white/10 hover:border-white/20'}`}
              >
                <div className="flex items-center gap-2 mb-2"><Zap size={16} className={settings.scholarAIEngine === 'cloud-fast' ? 'text-cyan-400' : 'text-slate-400'} /> <span className="font-bold text-white text-sm">Cloud Fast API (Recommended)</span></div>
                <p className="text-xs text-slate-500 font-light leading-relaxed">Lightning fast responses. Offloads conversational AI to high-speed cloud models, reserving your local GPU entirely for heavy mathematical extraction.</p>
              </button>
              
              <button 
                onClick={() => setSettings({ ...settings, scholarAIEngine: 'local-secure' })}
                className={`p-5 rounded-2xl border text-left transition-all ${settings.scholarAIEngine === 'local-secure' ? 'bg-purple-500/10 border-purple-500/50' : 'bg-[#050505] border-white/10 hover:border-white/20'}`}
              >
                <div className="flex items-center gap-2 mb-2"><ShieldCheck size={16} className={settings.scholarAIEngine === 'local-secure' ? 'text-purple-400' : 'text-slate-400'} /> <span className="font-bold text-white text-sm">Local Secure (Ollama)</span></div>
                <p className="text-xs text-slate-500 font-light leading-relaxed">100% offline. Slower conversational responses during active document parsing due to VRAM sharing with the Math Evaluator agents.</p>
              </button>
            </div>
          </div>

          {/* ScholarAI Personality & Humor */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-4 border-b border-white/5 pb-2">Assistant Personality & Engagement</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['professional', 'occasional', 'frequent'].map(level => (
                <button 
                  key={level}
                  onClick={() => setSettings({ ...settings, humorLevel: level })}
                  className={`p-5 rounded-2xl border text-left transition-all ${settings.humorLevel === level ? 'bg-amber-500/10 border-amber-500/50' : 'bg-[#050505] border-white/10 hover:border-white/20'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Smile size={16} className={settings.humorLevel === level ? 'text-amber-400' : 'text-slate-400'} /> 
                    <span className="font-bold text-white text-sm capitalize">{level} Humor</span>
                  </div>
                  <p className="text-xs text-slate-500 font-light leading-relaxed">
                    {level === 'professional' && "Strictly academic. No jokes, no banter during loading times."}
                    {level === 'occasional' && "A balanced mix. Keeps you entertained while heavy AI agents are processing data."}
                    {level === 'frequent' && "Maximum engagement. Frequent cat-related academic puns and proactive banter."}
                  </p>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}