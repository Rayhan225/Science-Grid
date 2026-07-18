import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useDropzone } from 'react-dropzone';
import { ReactFlow, Background, Controls, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Sliders, FileText, Code2, Sparkles, Activity, RefreshCw, UploadCloud, 
  AlertTriangle, Lightbulb, Workflow, BookOpen, Play, FilePlus, Loader2, 
  History, Terminal, Database, Clock, Paperclip, ArrowUp, PanelRightClose, 
  Plus, Pin, Trash2, CheckCircle2, XCircle, PlayCircle, 
  ShieldCheck, Keyboard, Cpu
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import 'katex/dist/katex.min.css';
import { useMathEvaluator } from '../hooks/useMathEvaluator';

const globalStyles = `
  .hide-scrollbar::-webkit-scrollbar { display: none !important; }
  .hide-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
`;

const CustomLogicNode = ({ data }) => (
  <div className="bg-[#0a0a0a] border border-cyan-500/30 p-5 rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.1)] min-w-[250px] max-w-[300px] select-text">
    <Handle type="target" position={Position.Top} className="w-3 h-3 bg-cyan-400 border-none" />
    <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-3 select-none">
      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
      <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">{data.step || 'STEP'}</div>
    </div>
    <div className="text-sm font-light text-slate-300 leading-relaxed">{data.label || 'No description provided.'}</div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-cyan-400 border-none" />
  </div>
);
const nodeTypes = { custom: CustomLogicNode };

// Comprehensive Mathematical & Data Science Symbols Keyboard
const MATH_SYMBOLS = [
  // Core Calculus & Advanced Math
  '∫', '∬', '∮', '∂', '∇', '∞', '∑', '∏', 'lim', 'Δ',
  // AI / ML / Stats / Logic
  '𝔼', '𝕍', 'ℒ', '𝒩', '𝜎', '𝜇', '𝑊', '𝑏', '𝜂', '‖·‖',
  // Algebra & Comparisons
  '≈', '≠', '≤', '≥', '∝', '∴', '∈', '∉', '⊂', 'ℝ',
  // Greek Alphabet (Common)
  'α', 'β', 'γ', 'θ', 'λ', 'π', 'ρ', 'σ', 'τ', 'ω',
  // Operators & Syntax
  '√', 'x²', 'x³', '^', '_', '{', '}', '[', ']', '('
];

export default function MathEvaluator({ telemetry: externalTelemetry, setTelemetry, status: externalStatus, setStatus, setAiContext }) {
  const [activeTab, setActiveTab] = useState('concept'); 
  const [manualPrompt, setManualPrompt] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMathKeyboardOpen, setIsMathKeyboardOpen] = useState(false);
  const [isBlindMode] = useState(false);
  
  const reportRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const {
    paperData, activeEqId, setActiveEqId, sliderValues, setSliderValues, outputLogs, chartData,
    status, telemetry, isGenerating, isSimulating, pipelineProgress, pipelineEta,
    sessionHistory, handleCloseWorkspace, handleTerminateProcess, executePipeline, resumePipeline,
    handleRunSimulation, restoreSession, deleteSession, togglePinSession, extractPagesFromDocument
  } = useMathEvaluator(isBlindMode);

  useEffect(() => {
    setTelemetry(telemetry);
    setStatus(status);
  }, [telemetry, status, setTelemetry, setStatus]);

  useEffect(() => {
    if (paperData) {
      const saveState = async () => {
        try {
          await fetch('http://localhost:5000/api/workspaces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...paperData,
              stateData: { equations: paperData.equations, sliderValues, outputLogs, chartData }
            })
          });
        } catch (err) {
          console.error("Database Sync Failed:", err);
        }
      };
      saveState();
    }
  }, [paperData, sliderValues, outputLogs, chartData]);

  // Auto-collapse history when processing
  useEffect(() => {
    if (isGenerating) setIsHistoryOpen(false);
  }, [isGenerating]);

  const currentEq = paperData?.equations?.find(e => e.id === activeEqId);

  useEffect(() => {
    if (currentEq && currentEq.status === 'complete') {
      setAiContext(`User is using Math Evaluator. Workspace: ${paperData?.title}. Formula: ${currentEq.name}. Variables: ${JSON.stringify(sliderValues[activeEqId] || {})}`);
    } else if (isGenerating) {
      setAiContext("User is waiting for agents to finish extracting mathematical matrices.");
    } else {
      setAiContext("User is on the ingestion screen. Encourage them to upload a file.");
    }
  }, [currentEq, sliderValues, activeEqId, paperData, isGenerating, setAiContext]);


  const syncToGlobalLibrary = async (filename, textContent) => {
    try {
      await fetch('http://localhost:5000/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: filename, type: 'file', parentId: null, textContent: textContent })
      });
    } catch (err) { console.warn("Silent Library Sync Failed:", err); }
  };

  const onDrop = useCallback(async acceptedFiles => {
    const file = acceptedFiles[0];
    if (!file) return;
    const allPages = await extractPagesFromDocument(file);
    const combinedText = allPages.map(p => p.text).join('\n\n');
    await syncToGlobalLibrary(file.name, combinedText);
    await executePipeline(allPages, false, file.name);
  }, [executePipeline, extractPagesFromDocument]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'] }, multiple: false, noClick: true
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allPages = await extractPagesFromDocument(file);
    const combinedText = allPages.map(p => p.text).join('\n\n');
    await syncToGlobalLibrary(file.name, combinedText);
    await executePipeline(allPages, false, file.name);
    e.target.value = null; 
  };

  const handleManualIngestSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!manualPrompt.trim() || isGenerating) return;

    // Advanced Regex for filename interception: Captures names without requiring extensions
    const fileCommandMatch = manualPrompt.match(/(?:evaluate|analyze|parse|load|bring)\s+['"“]?([^'"”\n]+)['"”]?/i);
    if (fileCommandMatch && fileCommandMatch[1]) {
      const targetFilename = fileCommandMatch[1].trim();
      setStatus(`Scanning vault indices for '${targetFilename}'...`);
      
      try {
        // Fallback Cascading Request: Exact -> .pdf -> .txt
        let response = await fetch(`http://localhost:5000/api/library/resolve-file?filename=${encodeURIComponent(targetFilename)}`);
        
        if (response.status === 444 || response.status === 404) {
          response = await fetch(`http://localhost:5000/api/library/resolve-file?filename=${encodeURIComponent(targetFilename + '.pdf')}`);
        }
        if (response.status === 444 || response.status === 404) {
          response = await fetch(`http://localhost:5000/api/library/resolve-file?filename=${encodeURIComponent(targetFilename + '.txt')}`);
        }

        if (response.status === 444 || response.status === 404) {
          alert(`Database Lookup Fault: File '${targetFilename}' could not be located inside global vault tables.`);
          setStatus("Ready"); 
          return;
        }

        const fileRecord = await response.json();
        const syntheticPages = [{ pageNum: 1, text: fileRecord.text_content }];
        await executePipeline(syntheticPages, true, fileRecord.name);
        setManualPrompt("");
        return;
      } catch (err) {
        console.error(err);
        setStatus("Repository Connection Failed"); 
        return;
      }
    }

    const syntheticPages = [{ pageNum: 1, text: manualPrompt }];
    await executePipeline(syntheticPages, true, "Manual Prompt Extraction");
    setManualPrompt("");
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const insertMathSymbol = (symbol) => {
    const cursorPosition = textareaRef.current.selectionStart || manualPrompt.length;
    const textBefore = manualPrompt.substring(0, cursorPosition);
    const textAfter = manualPrompt.substring(cursorPosition, manualPrompt.length);
    setManualPrompt(textBefore + symbol + textAfter);
    setTimeout(() => {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(cursorPosition + symbol.length, cursorPosition + symbol.length);
    }, 0);
  };

  const handleStartNewWorkspace = () => {
    handleCloseWorkspace();
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsHistoryOpen(false);
  };

  const sortedHistory = [...sessionHistory].sort((a, b) => (b.isPinned === a.isPinned) ? 0 : b.isPinned ? -1 : 1);

  return (
    <>
      <style>{globalStyles}</style>
      <div className="flex flex-col h-[calc(100vh-65px)] w-full overflow-hidden bg-[#050505] text-white relative font-sans select-none">
        
        {/* --- FLOATING STATUS & HISTORY --- */}
        <div className="absolute top-8 right-8 z-50 flex items-center gap-4">
          {isGenerating && (
            <div className="flex items-center gap-2 bg-[#0a0a0a]/90 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 shadow-2xl animate-fadeIn">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300 max-w-[200px] truncate">
                {status}
              </span>
            </div>
          )}
          <button 
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-widest transition-all border ${isHistoryOpen ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.15)]' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white backdrop-blur-md'}`}
            title="Toggle Ledger History"
          >
            <History size={16} /> Ledger
          </button>
        </div>

        {/* --- CLICK-OUTSIDE OVERLAY --- */}
        {isHistoryOpen && (
          <div 
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-all duration-300"
            onClick={() => setIsHistoryOpen(false)}
          />
        )}

        {/* --- MAIN WORKSPACE AREA --- */}
        <div {...(!paperData && !isGenerating ? getRootProps() : {})} className="flex-1 flex relative overflow-hidden outline-none">
          <input {...getInputProps()} />

          {isDragActive && !paperData && !isGenerating && (
            <div className="absolute inset-0 z-50 bg-cyan-900/20 backdrop-blur-md border-4 border-cyan-500 border-dashed m-8 rounded-3xl flex items-center justify-center">
               <div className="bg-[#0a0a0a] p-10 rounded-full shadow-2xl animate-bounce border border-cyan-500/30">
                 <UploadCloud size={56} className="text-cyan-400" />
               </div>
            </div>
          )}
          
          <div className="flex-1 flex flex-col relative transition-all duration-300">
            <div className="flex-1 overflow-y-auto hide-scrollbar px-6 md:px-16 pt-8 pb-48">
              <div className="max-w-[1300px] mx-auto space-y-12 animate-fadeIn">
                
                {/* STATE 1: ADVANCED GREETING DASHBOARD */}
                {!paperData && !isGenerating && (
                  <div className="flex flex-col items-center justify-center h-full mt-24 animate-fadeIn max-w-5xl mx-auto">
                     <div className="w-28 h-28 bg-gradient-to-br from-cyan-500/20 to-blue-500/5 rounded-[2rem] flex items-center justify-center mb-10 shadow-[0_0_60px_rgba(34,211,238,0.15)] ring-1 ring-cyan-500/30 rotate-3 transition-transform hover:rotate-0 duration-500">
                       <Cpu size={48} className="text-cyan-400" />
                     </div>
                     <h1 className="text-4xl md:text-6xl font-serif text-white tracking-tight mb-6 text-center">Research Grade Math Evaluation.</h1>
                     <p className="text-slate-400 font-light max-w-2xl text-center text-sm md:text-lg leading-relaxed mb-16">
                       Drop a technical document anywhere, or paste unstructured mathematical properties below. The ScholarGrid Engine deploys agents to map, isolate, and safely compile your algorithms natively in the browser.
                     </p>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-10 w-full">
                       <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-3xl hover:border-cyan-500/30 hover:bg-cyan-500/5 shadow-2xl transition-all group">
                         <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                           <ShieldCheck size={24} className="text-purple-400"/>
                         </div>
                         <h3 className="text-base font-bold text-white mb-3 tracking-wide">Local Sandboxing</h3>
                         <p className="text-xs text-slate-500 leading-relaxed font-light">Equations are translated to Python and executed securely using a Pyodide WebAssembly (WASM) runtime. Absolute zero server leakage.</p>
                       </div>
                       <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-3xl hover:border-emerald-500/30 hover:bg-emerald-500/5 shadow-2xl transition-all group">
                         <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                           <Terminal size={24} className="text-emerald-400"/>
                         </div>
                         <h3 className="text-base font-bold text-white mb-3 tracking-wide">Syntactic Radar</h3>
                         <p className="text-xs text-slate-500 leading-relaxed font-light">Automated parsing agents scan unstructured text blocks to cleanly isolate variables, structural mappings, and core logic components natively.</p>
                       </div>
                       <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-3xl hover:border-amber-500/30 hover:bg-amber-500/5 shadow-2xl transition-all group">
                         <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                           <Activity size={24} className="text-amber-400"/>
                         </div>
                         <h3 className="text-base font-bold text-white mb-3 tracking-wide">Interactive Metrics</h3>
                         <p className="text-xs text-slate-500 leading-relaxed font-light">Adjust isolated parameters on the fly via dynamically mapped sliders to observe coordinate trajectory outputs and functional definitions in real-time.</p>
                       </div>
                     </div>
                  </div>
                )}

                {/* STATE 2: LOADING TERMINAL */}
                {isGenerating && (
                  <div className="flex flex-col items-center justify-center h-[650px] bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] shadow-2xl animate-fadeIn max-w-4xl mx-auto mt-12 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent"></div>
                    <Loader2 size={64} className="animate-spin text-cyan-400 mb-10" />
                    <h2 className="text-2xl font-mono text-white uppercase tracking-widest mb-4">{status}</h2>
                    <p className="text-sm text-slate-500 font-light mb-12 max-w-lg text-center leading-relaxed">Deploying autonomous agents to parse text arrays, extract mathematical structures, and synthesize logic constraints...</p>

                    <div className="w-96 h-2 bg-white/5 rounded-full overflow-hidden mb-6">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ease-out" style={{ width: `${pipelineProgress}%` }}></div>
                    </div>

                    <div className="flex items-center gap-8 text-xs font-mono text-cyan-400/80 uppercase tracking-widest bg-cyan-500/10 px-8 py-3 rounded-full border border-cyan-500/20">
                      <span className="flex items-center gap-2"><Activity size={16}/> Progress: {pipelineProgress}%</span>
                      <span>|</span>
                      <span className="flex items-center gap-2"><Clock size={16}/> ETA: ~{pipelineEta}s</span>
                    </div>
                    
                    <button onClick={handleTerminateProcess} className="mt-16 px-8 py-3 border border-red-500/30 bg-red-500/10 text-red-400 rounded-full font-mono text-xs uppercase tracking-widest hover:bg-red-500 hover:text-black transition-all font-bold">
                      Suspend Process
                    </button>
                  </div>
                )}

                {/* STATE 3: ACTIVE WORKSPACE */}
                {paperData && !isGenerating && (
                  <>
                    <div className="flex items-center justify-between bg-[#0a0a0a] border border-white/5 rounded-3xl px-8 py-6 shadow-xl print:hidden animate-fadeIn">
                      <div className="flex items-center gap-10">
                        <div className="flex flex-col"><span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Workspace</span><span className="text-sm font-mono font-bold text-white max-w-[250px] truncate">{paperData.title || "Evaluation Layer"}</span></div>
                        <div className="w-px h-8 bg-white/10"></div>
                        <div className="flex flex-col"><span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Isolation</span><span className="text-sm font-mono font-bold text-cyan-400">{telemetry.isolatedPages} Segments</span></div>
                        <div className="w-px h-8 bg-white/10"></div>
                        <div className="flex flex-col"><span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Algorithms</span><span className="text-sm font-mono font-bold text-amber-400">{paperData.equations.length} Nodes</span></div>
                      </div>
                      <div className="flex items-center gap-4">
                        {paperData.equations.some(e => e.status === 'paused') && (
                          <button onClick={resumePipeline} className="flex items-center gap-2 bg-emerald-500/10 text-xs font-mono tracking-widest uppercase border border-emerald-500/30 text-emerald-400 px-6 py-3 rounded-xl hover:bg-emerald-500 hover:text-black transition-all font-bold">
                            <PlayCircle size={16}/> Resume
                          </button>
                        )}
                        <button onClick={handleCloseWorkspace} className="flex items-center gap-2 bg-white/5 text-xs font-mono tracking-widest uppercase border border-white/10 px-6 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all font-bold">
                          <FilePlus size={16}/> Close Workspace
                        </button>
                      </div>
                    </div>

                    {paperData.equations?.length > 0 && (
                      <div className="flex gap-6 overflow-x-auto pb-6 border-b border-white/5 hide-scrollbar print:hidden">
                        {paperData.equations.map((eq, idx) => (
                          <button key={eq.id} onClick={() => { setActiveEqId(eq.id); setOutputLogs({}); }} className={`px-6 py-5 rounded-[1.5rem] font-mono text-sm whitespace-nowrap flex flex-col items-start min-w-[280px] transition-all duration-300 ${activeEqId === eq.id ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.15)] scale-[1.02]' : 'bg-[#0a0a0a] text-slate-500 border border-white/10 hover:bg-white/5 hover:border-white/20'}`}>
                            <div className="flex items-center justify-between w-full mb-4">
                              <span className="text-[10px] font-mono bg-white/5 px-2.5 py-1 rounded-md text-slate-400 tracking-widest uppercase">Node {idx + 1}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] tracking-widest opacity-70 font-bold uppercase truncate max-w-[140px]">{eq.name}</span>
                                {eq.status === 'paused' && <div className="w-2.5 h-2.5 rounded-full bg-slate-500" title="Paused"></div>}
                                {eq.status === 'complete' && <CheckCircle2 size={14} className="text-emerald-400" />}
                                {eq.status === 'failed' && <XCircle size={14} className="text-red-500" />}
                              </div>
                            </div>
                            <span className="font-sans font-bold w-full overflow-hidden text-ellipsis text-left select-text"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{String(eq.latex || "Equation Node")}</ReactMarkdown></span>
                          </button>
                        ))}
                      </div>
                    )}

                    {!isGenerating && currentEq?.status === 'paused' && (
                      <div className="flex flex-col items-center justify-center h-[550px] border border-white/5 bg-[#0a0a0a] rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                        <h2 className="text-xl font-mono text-slate-400 uppercase tracking-widest mb-3">Process Suspended</h2>
                        <p className="text-sm text-slate-600 font-light">Click 'Resume' at the top to re-initialize agent compilation.</p>
                      </div>
                    )}

                    {currentEq?.status === 'complete' && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 select-text" ref={reportRef}>
                        <div className="lg:col-span-5 flex flex-col print:col-span-12">
                          <section className="flex-grow bg-[#0a0a0a] rounded-[2.5rem] border border-white/5 flex flex-col overflow-hidden shadow-2xl print:bg-white print:border-none print:shadow-none">
                            <div className="flex border-b border-white/5 bg-white/[0.01] overflow-x-auto hide-scrollbar print:hidden select-none">
                              <button onClick={() => setActiveTab('concept')} className={`flex-1 flex items-center justify-center gap-2 py-5 text-xs font-mono uppercase tracking-widest min-w-[100px] transition-colors ${activeTab === 'concept' ? 'bg-blue-500/10 text-blue-400 border-b-2 border-blue-400 font-bold' : 'text-slate-500 hover:bg-white/5'}`}><FileText size={16} /> Concept</button>
                              <button onClick={() => setActiveTab('review')} className={`flex-1 flex items-center justify-center gap-2 py-5 text-xs font-mono uppercase tracking-widest min-w-[100px] transition-colors ${activeTab === 'review' ? 'bg-amber-500/10 text-amber-400 border-b-2 border-amber-400 font-bold' : 'text-slate-500 hover:bg-white/5'}`}><AlertTriangle size={16} /> Review</button>
                              <button onClick={() => setActiveTab('options')} className={`flex-1 flex items-center justify-center gap-2 py-5 text-xs font-mono uppercase tracking-widest min-w-[100px] transition-colors ${activeTab === 'options' ? 'bg-emerald-500/10 text-emerald-400 border-b-2 border-emerald-400 font-bold' : 'text-slate-500 hover:bg-white/5'}`}><Lightbulb size={16} /> Options</button>
                              <button onClick={() => setActiveTab('map')} className={`flex-1 flex items-center justify-center gap-2 py-5 text-xs font-mono uppercase tracking-widest min-w-[100px] transition-colors ${activeTab === 'map' ? 'bg-purple-500/10 text-purple-400 border-b-2 border-purple-400 font-bold' : 'text-slate-500 hover:bg-white/5'}`}><Workflow size={16} /> Map</button>
                            </div>

                            <div className="p-10 prose prose-invert prose-slate max-w-none font-light flex-grow h-[700px] overflow-y-auto hide-scrollbar relative print:h-auto print:prose-p:text-black print:prose-headings:text-black">
                              {activeTab === 'concept' && (
                                <div className="animate-fadeIn">
                                  <div className="mb-10 pb-8 border-b border-white/5 select-none">
                                    <h3 className="text-xs font-mono text-cyan-400 tracking-widest uppercase mb-3 flex items-center gap-2"><BookOpen size={14}/> Executive Context</h3>
                                    <p className="text-sm text-slate-400 italic leading-relaxed font-serif">{paperData.paperSummary}</p>
                                  </div>
                                  <h3 className="text-[11px] font-mono text-slate-500 tracking-widest uppercase mb-5 select-none">Functional Definition</h3>
                                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{String(currentEq.concept || "")}</ReactMarkdown>
                                </div>
                              )}
                              {activeTab === 'review' && (
                                <div className="animate-fadeIn">
                                  {currentEq.rating && <div className="mb-8 inline-flex px-4 py-2 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)] select-none">Metric Rating: {currentEq.rating}</div>}
                                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{String(currentEq.critique || "")}</ReactMarkdown>
                                </div>
                              )}
                              {activeTab === 'options' && (
                                <div className="animate-fadeIn">
                                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{String(currentEq.alternatives || "")}</ReactMarkdown>
                                </div>
                              )}
                              {activeTab === 'map' && (
                                <div className="absolute inset-0 bg-[#050505] animate-fadeIn select-none">
                                  {currentEq.logicMap?.nodes?.length > 0 ? (
                                    <ReactFlow nodes={currentEq.logicMap.nodes} edges={currentEq.logicMap.edges} nodeTypes={nodeTypes} fitView proOptions={{ hideAttribution: true }}><Background color="#222" gap={20} /><Controls /></ReactFlow>
                                  ) : <div className="flex h-full items-center justify-center font-mono text-slate-500 text-xs uppercase tracking-widest">No structural node maps generated.</div>}
                                </div>
                              )}
                            </div>
                          </section>
                        </div>

                        <div className="lg:col-span-7 space-y-8 print:hidden">
                          <section className="bg-white/[0.01] rounded-[2.5rem] p-10 border border-white/5 backdrop-blur-md shadow-2xl animate-fadeIn select-none relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/5 rounded-full blur-3xl"></div>
                            <h2 className="flex items-center justify-between text-sm font-mono tracking-widest text-slate-400 uppercase mb-10 border-b border-white/10 pb-5 relative z-10">
                              <span className="flex items-center gap-3"><Sliders size={18} className="text-violet-400" /> Interactive Boundaries</span>
                            </h2>
                            <div className="space-y-10 relative z-10">
                              {currentEq.variables?.length > 0 ? currentEq.variables.map(v => (
                                <div key={v.symbol} className="space-y-5 group">
                                  <div className="flex justify-between items-end">
                                    <div className="max-w-[70%]">
                                      <label className="text-base font-semibold text-white block mb-1.5 truncate">{v.label}</label>
                                      <div className="flex items-center gap-3">
                                        <span className="text-[11px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 rounded tracking-widest uppercase">{v.symbol}</span>
                                        <span className="text-xs text-slate-400 truncate leading-none">{v.effect}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <input 
                                        type="number" 
                                        value={sliderValues[activeEqId]?.[v.symbol] ?? v.default}
                                        onChange={(e) => setSliderValues(prev => ({...prev, [activeEqId]: {...prev[activeEqId], [v.symbol]: Number(e.target.value)}}))}
                                        className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-center text-sm font-mono text-white focus:outline-none focus:border-violet-500/50 hide-scrollbar"
                                      />
                                      <span className="text-3xl font-light text-violet-300 font-mono leading-none min-w-[70px] text-right">{sliderValues[activeEqId]?.[v.symbol] ?? v.default}</span>
                                    </div>
                                  </div>
                                  <div className="relative w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                    <input 
                                      type="range" min={v.min || 0} max={v.max || 100} step={((v.max || 100) - (v.min || 0)) / 100} 
                                      value={sliderValues[activeEqId]?.[v.symbol] ?? v.default} 
                                      onChange={(e) => setSliderValues(prev => ({...prev, [activeEqId]: {...prev[activeEqId], [v.symbol]: Number(e.target.value)}}))} 
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                    />
                                    <div 
                                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all pointer-events-none" 
                                      style={{ width: `${(( (sliderValues[activeEqId]?.[v.symbol] ?? v.default) - (v.min || 0)) / ((v.max || 100) - (v.min || 0))) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )) : <p className="text-slate-600 text-sm font-mono uppercase tracking-widest text-center py-6">No variable properties bound by analyst.</p>}
                            </div>
                          </section>

                          <section className="bg-[#0a0a0a] rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col shadow-2xl animate-fadeIn">
                            <div className="px-10 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01] select-none">
                              <div className="flex flex-col">
                                <h2 className="flex items-center gap-3 text-sm font-mono tracking-widest text-slate-400 uppercase"><Code2 size={18} className="text-emerald-400" /> Secure WASM Sandbox</h2>
                              </div>
                              <button onClick={handleRunSimulation} disabled={isSimulating} className="flex items-center gap-2 text-xs text-[#0a0a0a] bg-emerald-400 hover:bg-emerald-300 px-6 py-3 rounded-xl font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] disabled:opacity-50">
                                {isSimulating ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} className="fill-current" />} Run Script
                              </button>
                            </div>
                            <div className="grid grid-cols-2 h-72 divide-x divide-white/5 border-b border-white/5 select-text">
                              <div className="p-8 text-emerald-400/80 font-mono text-sm whitespace-pre-wrap overflow-y-auto bg-[#0a0a0a] relative hide-scrollbar group">
                                <div className="text-[10px] text-slate-600 mb-4 uppercase tracking-widest border-b border-white/5 pb-2 select-none">Python Subroutine</div>
                                {currentEq.pythonCode || "# Operational logic mapping empty"}
                              </div>
                              <div className="p-8 text-slate-300 font-mono text-sm whitespace-pre-wrap overflow-y-auto bg-[#050505] flex flex-col relative hide-scrollbar">
                                <div className="text-[10px] text-slate-600 mb-4 uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-2 select-none"><Sparkles size={12}/> Standard Output</div>
                                <div className="flex-grow font-mono text-slate-400">{outputLogs[activeEqId] || "> Awaiting script execution call..."}</div>
                              </div>
                            </div>
                          </section>

                          <div className="bg-[#0a0a0a] p-10 rounded-[2.5rem] border border-white/10 shadow-2xl relative animate-fadeIn flex flex-col justify-between select-none">
                            <div className="flex items-center justify-between border-b border-white/5 pb-5 mb-6 select-none">
                              <h2 className="flex items-center gap-3 text-sm font-mono tracking-widest text-slate-400 uppercase"><Activity size={18} className="text-cyan-400" /> Coordinate Trajectory</h2>
                            </div>
                            <div className="w-full h-80 flex-grow">
                              {(!chartData[activeEqId] || chartData[activeEqId].length === 0) ? (
                                <div className="flex h-full items-center justify-center border border-dashed border-white/5 rounded-3xl"><p className="text-slate-600 font-mono text-xs uppercase tracking-widest text-center px-6 leading-relaxed">Adjust values and execute run call sequentially to populate graph nodes</p></div>
                              ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={chartData[activeEqId]} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                    <XAxis dataKey="x" stroke="rgba(255,255,255,0.15)" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: 'monospace' }} />
                                    <YAxis stroke="rgba(255,255,255,0.15)" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: 'monospace' }} domain={['auto', 'auto']}/>
                                    <Tooltip contentStyle={{ backgroundColor: '#050505', borderColor: 'rgba(34, 211, 238, 0.2)', borderRadius: '12px', fontSize: '12px', fontFamily: 'monospace' }} />
                                    <Line type="monotone" name="WASM Output" dataKey="true_y" stroke="#22d3ee" strokeWidth={3} dot={{ r: 5, fill: '#0a0a0a', stroke: '#22d3ee', strokeWidth: 2 }} activeDot={{ r: 8, fill: '#22d3ee' }} isAnimationActive={false} />
                                  </LineChart>
                                </ResponsiveContainer>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* --- BOTTOM INGESTION COMMAND BAR --- */}
            {(!paperData && !isGenerating) && (
              <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#050505] via-[#050505] to-transparent pt-20 pb-10 px-6 select-none z-30">
                <div className="max-w-4xl mx-auto relative">
                  
                  {/* Floating Math Keyboard Popover */}
                  {isMathKeyboardOpen && (
                    <div className="absolute bottom-full left-14 mb-4 p-5 bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-fadeIn z-50 w-[420px]">
                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-4 border-b border-white/5 pb-2 flex items-center gap-2"><Keyboard size={12} className="text-cyan-400"/> Mathematical & Data Symbol Pad</div>
                      <div className="grid grid-cols-10 gap-2">
                        {MATH_SYMBOLS.map(sym => (
                          <button 
                            key={sym} 
                            type="button" 
                            onClick={() => insertMathSymbol(sym)}
                            className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400 rounded-lg text-sm font-mono transition-all border border-transparent hover:border-cyan-500/30 active:scale-95"
                          >
                            {sym}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleManualIngestSubmit} className="relative bg-[#0a0a0a] border border-white/10 rounded-[2rem] shadow-[0_0_40px_rgba(0,0,0,0.8)] focus-within:border-cyan-500/50 focus-within:shadow-[0_0_30px_rgba(34,211,238,0.1)] transition-all flex items-end p-2.5">
                    
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.txt" />
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current.click()}
                      className="p-3.5 text-slate-400 hover:text-cyan-400 hover:bg-white/5 rounded-full transition-colors mb-1 ml-1"
                      title="Upload Document"
                    >
                      <Paperclip size={22} />
                    </button>

                    <div className="relative group">
                      <button 
                        type="button" 
                        onClick={() => setIsMathKeyboardOpen(!isMathKeyboardOpen)}
                        className={`p-3.5 rounded-full transition-colors mb-1 ml-1 ${isMathKeyboardOpen ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400 hover:text-cyan-400 hover:bg-white/5'}`}
                        title="Math Symbol Pad"
                      >
                        <Keyboard size={22} />
                      </button>
                    </div>

                    <textarea 
                      ref={textareaRef}
                      value={manualPrompt}
                      onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 250)}px`;
                        setManualPrompt(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleManualIngestSubmit(e);
                        }
                      }}
                      placeholder="Ask ScholarGrid to analyze formulas, parse document text, or evaluate vault files..."
                      className="flex-grow bg-transparent text-base text-white placeholder:text-slate-600 outline-none resize-none px-5 py-4 max-h-[250px] hide-scrollbar leading-relaxed font-mono select-text"
                      style={{ minHeight: '60px' }}
                    />

                    <button 
                      type="submit" 
                      disabled={!manualPrompt.trim()}
                      className="p-3.5 bg-white/5 text-slate-300 hover:text-black hover:bg-cyan-400 rounded-full transition-all disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-slate-300 mb-1 mr-1"
                    >
                      <ArrowUp size={22} />
                    </button>
                  </form>
                  <div className="text-center mt-4 text-[11px] font-mono text-slate-600 uppercase tracking-widest opacity-80">
                    ScholarGrid Engine • Zero-Leak Sandbox • <kbd className="font-sans px-1 border border-white/10 rounded">Shift</kbd> + <kbd className="font-sans px-1 border border-white/10 rounded">Enter</kbd> for newline
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* --- RIGHT SIDEBAR: SLIDE-OUT HISTORY MATRIX --- */}
          <div 
            className={`absolute top-0 right-0 h-full w-96 bg-[#0a0a0a]/95 backdrop-blur-2xl border-l border-white/5 shadow-[-30px_0_60px_rgba(0,0,0,0.6)] transition-transform duration-500 ease-in-out z-40 flex flex-col ${isHistoryOpen ? 'translate-x-0' : 'translate-x-full'}`}
          >
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-mono uppercase tracking-widest text-slate-300 flex items-center gap-3">
                <Database size={16} className="text-cyan-400" /> Evaluation Ledger
              </h3>
              <button 
                onClick={() => setIsHistoryOpen(false)}
                className="text-slate-500 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <PanelRightClose size={18} />
              </button>
            </div>

            <div className="p-5 border-b border-white/5">
              <button onClick={handleStartNewWorkspace} className="w-full flex items-center justify-between bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest px-5 py-4 rounded-2xl transition-all font-bold">
                <span className="flex items-center gap-3"><Plus size={16}/> Initialize Matrix</span>
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-5 space-y-3 hide-scrollbar">
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-5 px-3 flex items-center gap-2">
                <History size={14}/> Saved Sessions
              </div>
              
              {sortedHistory.length === 0 ? (
                <div className="text-center px-6 py-16 opacity-50">
                  <Database size={40} className="text-slate-600 mb-5 mx-auto" />
                  <p className="text-[11px] font-mono text-slate-400 uppercase tracking-widest">Vault Empty</p>
                  <p className="text-[11px] mt-2 text-slate-600">No recent evaluations saved.</p>
                </div>
              ) : (
                sortedHistory.map(session => (
                  <div key={session.id} onClick={() => restoreSession(session)} className={`group flex flex-col bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 rounded-2xl p-4 cursor-pointer transition-all relative overflow-hidden ${paperData?.id === session.id ? 'border-cyan-500/50 bg-cyan-500/5 shadow-[0_0_15px_rgba(34,211,238,0.05)]' : ''}`}>
                    <div className="flex justify-between items-start w-full">
                      <h4 className="text-sm font-medium text-white truncate max-w-[200px]">{session.title}</h4>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => {e.stopPropagation(); togglePinSession(session.id);}} className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${session.isPinned ? 'text-cyan-400 opacity-100' : 'text-slate-400'}`}><Pin size={14}/></button>
                        <button onClick={(e) => {e.stopPropagation(); deleteSession(session.id);}} className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={14}/></button>
                      </div>
                      {session.isPinned && <Pin size={12} className="text-cyan-400 absolute top-4 right-4 group-hover:hidden" />}
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-[10px] font-mono bg-white/5 px-2 py-1 rounded-md text-slate-400">{session.equations?.length || 0} Nodes</span>
                      <span className="text-[10px] font-mono text-slate-500 truncate">{session.lastAccessed}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>
      </div>
    </>
  );
}