// src/App.jsx
import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import MathEvaluator from './components/MathEvaluator';
import InsightLens from './components/InsightLens';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Settings from './components/Settings';
import CentralVault from './components/CentralVault';
import { Send, X, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [telemetry, setTelemetry] = useState({ totalPages: 0, isolatedPages: 0, rawFormulas: 0, validatedNodes: 0 });
  const [status, setStatus] = useState("Ready");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [settings, setSettings] = useState({
    scholarAIEngine: 'cloud-fast', 
    humorLevel: 'occasional' 
  });

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatTyping, setIsChatTyping] = useState(false);
  const [aiContext, setAiContext] = useState("User is browsing the platform dashboard.");

  // ScholarAI Random Banter Generator during long loads
  useEffect(() => {
    if (settings.humorLevel === 'professional') return;
    if (status.includes("Assigning Phase 1") || status.includes("Digitalizing") || status.includes("Extracting")) {
      const banters = [
        "Meow! While the heavy local agents crunch those intense matrices, did you know that the word 'Algorithm' comes from the Persian mathematician Al-Khwarizmi? [00:00:00]",
        "Processing large tensors takes a moment... almost as much computing power as calculating exactly when my food bowl will be empty again. [00:02:15]",
        "Deep scanning active... I'd offer to help the math agents, but I don't have opposable thumbs for typing Python. [00:06:43]"
      ];
      const randomBanter = banters[Math.floor(Math.random() * banters.length)];
      if (!chatHistory.some(msg => msg.content === randomBanter)) {
        setIsChatOpen(true);
        setChatHistory(prev => [...prev, { role: 'assistant', content: randomBanter }]);
      }
    }
  }, [status, settings.humorLevel, chatHistory]);

  const handleScholarAIChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { role: 'user', content: chatInput };
    const updatedHistory = [...chatHistory, userMsg];
    
    setChatHistory(updatedHistory);
    setChatInput("");
    setIsChatTyping(true);

    try {
      let responseText = "";
      const semanticInterceptorPrompt = `
        You are ScholarAI, an intelligent cat managing ScholarGrid. Tone: ${settings.humorLevel}.
        CRITICAL ACTION: If the user asks you to load, evaluate, analyze, or bring a file into the Math Evaluator tool, you MUST respond exactly with: '[TRIGGER_EVALUATE:filename.ext]' where filename.ext matches their text. Do not provide normal text or banter if this macro fires.
        Context: ${aiContext}. Query: ${chatInput}
      `;

      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3", 
          prompt: semanticInterceptorPrompt,
          stream: false
        })
      });
      
      const data = await response.json();
      responseText = data.response.trim();

      if (responseText.includes("[TRIGGER_EVALUATE:")) {
        const fileTargetName = responseText.match(/\[TRIGGER_EVALUATE:(.*?)\]/)[1];
        setCurrentView('math-evaluator');
        setIsChatOpen(false);

        setTimeout(() => {
          const mathTextarea = document.querySelector("textarea");
          if (mathTextarea) {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
            nativeSetter.call(mathTextarea, `evaluate '${fileTargetName}'`);
            mathTextarea.dispatchEvent(new Event('input', { bubbles: true }));
            const submitBtn = mathTextarea.closest("form")?.querySelector("button[type='submit']");
            if (submitBtn) submitBtn.click();
          }
        }, 400);

        setChatHistory([...updatedHistory, { role: 'assistant', content: `Context shifted to Math Evaluator. Programmatically processing file reference targeting: ${fileTargetName}... Meow! [00:08:54]` }]);
        setIsChatTyping(false);
        return;
      }

      setChatHistory([...updatedHistory, { role: 'assistant', content: responseText }]);
    } catch (err) {
      setChatHistory([...updatedHistory, { role: 'assistant', content: "Meow... System connection failed. Make sure your local Ollama engine is online." }]);
    }
    setIsChatTyping(false);
  };

  if (currentView === 'landing') {
    return <LandingPage onLaunch={() => setCurrentView('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-sans flex overflow-hidden select-none relative">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header status={status} currentView={currentView} onViewChange={setCurrentView} />
        
        <div className="flex-grow overflow-y-auto relative flex flex-col">
          <div className={currentView === 'dashboard' ? 'flex-grow' : 'hidden'}>
            <Dashboard onSelectTool={setCurrentView} telemetry={telemetry} />
          </div>
          <div className={currentView === 'settings' ? 'flex-grow' : 'hidden'}>
            <Settings settings={settings} setSettings={setSettings} />
          </div>
          <div className={currentView === 'central-vault' ? 'flex-grow h-full' : 'hidden'}>
            <CentralVault setCurrentView={setCurrentView} />
          </div>
          <div className={currentView === 'math-evaluator' ? 'flex-grow h-full' : 'hidden'}>
            <MathEvaluator telemetry={telemetry} setTelemetry={setTelemetry} status={status} setStatus={setStatus} setAiContext={setAiContext} />
          </div>
          <div className={currentView === 'insight-lens' ? 'flex-grow h-full' : 'hidden'}>
            <InsightLens setStatus={setStatus} setCurrentView={setCurrentView} />
          </div>
        </div>
      </div>

      {/* FLOATING CHATBOT CONTROLLER */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end">
        {isChatOpen && (
          <div className="w-96 h-[550px] bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl mb-4 flex flex-col overflow-hidden animate-fadeIn">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/50">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/30">
                  <span className="text-xl mt-1">🐱</span>
                  <span className="absolute -top-1.5 -right-1 text-sm transform rotate-12 drop-shadow-md">🧢</span>
                </div>
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">ScholarAI</h3>
                  <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    Cloud Link Active
                  </p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-slate-500 hover:text-white bg-white/5 p-2 rounded-full"><X size={14}/></button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-4 font-mono text-xs custom-scrollbar select-text">
              {chatHistory.length === 0 && (
                <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] text-slate-400 leading-relaxed font-sans text-xs">
                  Meow! I am ScholarAI. I track everything you do on the platform. How can I help you today?
                </div>
              )}
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`p-4 rounded-2xl border max-w-[85%] ${msg.role === 'user' ? 'ml-auto bg-white/5 border-white/10 text-white' : 'bg-cyan-950/20 border-cyan-500/20 text-slate-200 mr-auto'}`}>
                  <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1.5 font-bold select-none">{msg.role === 'user' ? 'You' : 'ScholarAI'}</div>
                  <p className="leading-relaxed font-light text-xs font-sans whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
              {isChatTyping && (
                <div className="text-[10px] text-cyan-400 animate-pulse flex items-center gap-2 font-mono uppercase">
                  <RefreshCw size={12} className="animate-spin" /> Fetching response...
                </div>
              )}
            </div>

            <form onSubmit={handleScholarAIChat} className="p-4 border-t border-white/5 bg-black/50 flex items-center gap-3">
              <input 
                type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask ScholarAI..."
                className="flex-grow bg-[#050505] border border-white/10 rounded-2xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/30"
              />
              <button type="submit" disabled={isChatTyping || !chatInput.trim()} className="p-3 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl"><Send size={14} /></button>
            </form>
          </div>
        )}

        <button onClick={() => setIsChatOpen(!isChatOpen)} className="w-16 h-16 bg-[#0a0a0a] border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all group">
          {isChatOpen ? <X size={24} /> : (
            <div className="relative flex items-center justify-center w-full h-full">
               <span className="text-2xl mt-1 opacity-80 group-hover:opacity-100">🐱</span>
               <span className="absolute top-2 right-2 text-lg transform rotate-12 drop-shadow-lg">🧢</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}