// src/components/Settings.jsx
import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Palette, Cpu, CheckCircle2, Save, Sparkles, RefreshCw
} from 'lucide-react';
import { useTheme, THEME_REGISTRY } from '../context/ThemeContext';

const BACKEND_URL = "http://127.0.0.1:8000";

export default function Settings({ settings, setSettings }) {
  const { theme, setTheme, themeClasses, isLight } = useTheme();
  const [activeTab, setActiveTab] = useState('general');
  const [saveStatus, setSaveStatus] = useState(false);
  const [models, setModels] = useState(['llama3']);
  const [backendStatus, setBackendStatus] = useState('Checking...');

  const [localSettings, setLocalSettings] = useState({
    theme: settings?.theme || 'obsidian-core',
    scholarAIEngine: settings?.scholarAIEngine || 'cloud-fast',
    humorLevel: settings?.humorLevel || 'occasional'
  });

  const checkConnection = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/tags`);
      if (res.ok) {
        const data = await res.json();
        setModels(data.models || ['llama3']);
        setBackendStatus('Connected (Supabase & Ollama Online)');
      } else {
        setBackendStatus('Degraded Backend');
      }
    } catch (err) {
      setBackendStatus('Offline (Cannot reach port 8000)');
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleUpdate = (key, value) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    if (key === 'theme') {
      setTheme(value);
    }
  };

  const handleSave = () => {
    if (setSettings) setSettings(localSettings);
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 2500);
  };

  return (
    <div className={`p-4 md:p-8 max-w-[1200px] mx-auto w-full animate-fadeIn pb-32`}>
      <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-6 mb-8 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
        <div>
          <h1 className="text-3xl font-serif tracking-tight flex items-center gap-3">
            <SettingsIcon className={themeClasses.accentText} size={28} /> 
            System Configuration
          </h1>
          <p className={`text-xs font-mono uppercase tracking-widest mt-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Global Workspace Parameters & Runtime Engines
          </p>
        </div>
        <button 
          onClick={handleSave}
          className={`flex items-center justify-center gap-2 px-6 py-3 font-mono text-xs uppercase tracking-widest font-bold transition-all shadow-lg hover:opacity-90 ${themeClasses.radius} ${isLight ? 'bg-slate-900 text-white' : 'bg-white text-black'}`}
        >
          {saveStatus ? <CheckCircle2 size={16} className="text-emerald-400"/> : <Save size={16}/>}
          {saveStatus ? 'Configuration Saved' : 'Save Changes'}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 flex flex-col gap-2 shrink-0">
          {[
            { id: 'general', name: 'Themes & Aesthetics', icon: Palette },
            { id: 'ai', name: 'ScholarAI Personality', icon: Sparkles },
            { id: 'engine', name: 'LLM Execution Engine', icon: Cpu }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-5 py-4 font-mono text-xs uppercase tracking-wider transition-all border ${themeClasses.radius} ${isActive ? `${themeClasses.bgCard} ${themeClasses.accentText} ${themeClasses.accentBorder} shadow-lg font-bold` : `border-transparent ${isLight ? 'text-slate-600 hover:bg-slate-200/50' : 'text-slate-400 hover:bg-white/5'}`}`}
              >
                <Icon size={16}/> {tab.name}
              </button>
            );
          })}
        </div>

        <div className={`flex-1 border p-8 md:p-10 shadow-xl min-h-[500px] ${themeClasses.bgCard} ${themeClasses.radius}`}>
          {activeTab === 'general' && (
            <div className="space-y-8 animate-fadeIn">
              <div>
                <h3 className="text-sm font-mono uppercase tracking-widest mb-6 border-b border-inherit pb-2">Global Platform Themes</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Object.entries(THEME_REGISTRY).map(([themeKey, themeData]) => (
                    <button
                      key={themeKey}
                      onClick={() => handleUpdate('theme', themeKey)}
                      className={`relative overflow-hidden p-5 border text-left transition-all hover:scale-[1.02] flex flex-col justify-between h-28 ${themeClasses.radius} ${localSettings.theme === themeKey ? `${themeData.accentBorder} shadow-lg ring-1 ring-inherit` : isLight ? 'border-slate-200' : 'border-white/10 hover:border-white/20'}`}
                    >
                      <span className={`font-bold text-sm z-10 ${localSettings.theme === themeKey ? themeData.accentText : ''}`}>{themeData.name}</span>
                      <div className="flex gap-2 z-10 mt-auto">
                        {themeData.previewColors.map((colorClass, idx) => (
                          <div key={idx} className={`w-5 h-5 rounded-full border border-white/20 shadow-sm ${colorClass}`}></div>
                        ))}
                      </div>
                      <div className={`absolute inset-0 opacity-10 pointer-events-none ${themeData.bgMain}`}></div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-8 animate-fadeIn">
              <h3 className="text-sm font-mono uppercase tracking-widest border-b border-inherit pb-2 mb-6">ScholarAI Persona Directives</h3>
              <div className="space-y-4">
                <label className="text-[11px] font-mono uppercase tracking-widest opacity-70">Conversational Tone & Humor Level</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { id: 'professional', name: 'Professional', desc: 'Strict, concise, fact-driven.' },
                    { id: 'occasional', name: 'Occasional Banter', desc: 'Helpful with mild cat puns.' },
                    { id: 'maximum', name: 'Maximum Chaos', desc: 'Unrestricted feline superiority.' }
                  ].map(lvl => (
                    <button
                      key={lvl.id}
                      onClick={() => handleUpdate('humorLevel', lvl.id)}
                      className={`p-4 border text-left transition-all ${themeClasses.radius} ${localSettings.humorLevel === lvl.id ? `${themeClasses.accentBorder} shadow-lg ring-1 ring-inherit` : isLight ? 'border-slate-200 hover:bg-slate-50' : 'border-white/10 hover:bg-white/5'}`}
                    >
                      <div className={`font-bold text-sm mb-1 ${localSettings.humorLevel === lvl.id ? themeClasses.accentText : ''}`}>{lvl.name}</div>
                      <div className="text-[10px] opacity-70">{lvl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'engine' && (
            <div className="space-y-8 animate-fadeIn">
              <h3 className="text-sm font-mono uppercase tracking-widest border-b border-inherit pb-2 mb-6">Execution Engine Routing</h3>
              
              <div className="space-y-4">
                <label className="text-[11px] font-mono uppercase tracking-widest opacity-70">Inference Node Target</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: 'cloud-fast', name: 'Cloud Fast API', desc: 'Offloads LLM inference to lightning-fast cloud endpoints. Best for standard devices.' },
                    { id: 'local-llama', name: 'Local Ollama Node', desc: 'Routes all prompts to port 8000 proxy. Requires running Ollama. 100% offline & secure.' }
                  ].map(eng => (
                    <button
                      key={eng.id}
                      onClick={() => handleUpdate('scholarAIEngine', eng.id)}
                      className={`p-5 border text-left transition-all ${themeClasses.radius} ${localSettings.scholarAIEngine === eng.id ? `${themeClasses.accentBorder} shadow-lg ring-1 ring-inherit` : isLight ? 'border-slate-200 hover:bg-slate-50' : 'border-white/10 hover:bg-white/5'}`}
                    >
                      <div className={`font-bold text-sm mb-2 ${localSettings.scholarAIEngine === eng.id ? themeClasses.accentText : ''}`}>{eng.name}</div>
                      <div className="text-xs opacity-70 leading-relaxed">{eng.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-inherit space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="opacity-70">Gateway Status: {backendStatus}</span>
                  <button onClick={checkConnection} className="flex items-center gap-1 text-cyan-400 hover:underline">
                    <RefreshCw size={12} /> Re-check Connection
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}