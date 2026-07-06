import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Sliders, FileText, Code2, Sparkles, Wand2, Database, ShieldCheck, CheckCircle, Activity, RefreshCw, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import 'katex/dist/katex.min.css';
import { generateScienceGridContent } from './aiHelper';
import { saveEquationToGraph } from './graphDatabase';
import { extractVariables } from './mathParser';

export default function App() {
  const [markdown, setMarkdown] = useState(`# The Living Science Grid\n\nInitialize the AI Assistant to generate a mathematical model.`);
  const [sliderValue, setSliderValue] = useState(4);
  const [pythonCode, setPythonCode] = useState(`# Awaiting generation...`);
  const [status, setStatus] = useState("Initializing Engine...");
  const [output, setOutput] = useState("");
  
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [detectedVariables, setDetectedVariables] = useState([]);
  
  // Restored Ledger States
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [proofHash, setProofHash] = useState(null);
  
  // Telemetry Chart State
  const [chartData, setChartData] = useState([]);
  
  const workerRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./pyodideWorker.js', import.meta.url), { type: 'module' });
    workerRef.current.onmessage = (event) => {
      if (event.data.type === "STATUS") setStatus(event.data.payload);
      if (event.data.type === "RESULT") setOutput(event.data.payload.stdout);
      if (event.data.type === "ERROR") setOutput(`Error: ${event.data.payload}`);
    };
    workerRef.current.postMessage({ type: "INIT" });
    return () => workerRef.current.terminate();
  }, []);

  useEffect(() => {
    if (status === "Ready" && workerRef.current) {
      workerRef.current.postMessage({ type: "RUN", code: pythonCode, variables: { slider_x: sliderValue } });
    }
  }, [sliderValue, pythonCode, status]);

  useEffect(() => {
    setDetectedVariables(extractVariables(markdown));
    setSaveSuccess(false);
    setProofHash(null);
    setChartData([]); 
  }, [markdown]);

  useEffect(() => {
    if (output && !output.includes('Error')) {
      const numbers = output.match(/-?\d+(\.\d+)?/g);
      if (numbers) {
        const resultValue = Number(numbers[numbers.length - 1]);
        setChartData(prevData => {
          const existingPointIndex = prevData.findIndex(p => p.x === sliderValue);
          let newData = [...prevData];
          if (existingPointIndex >= 0) newData[existingPointIndex] = { x: sliderValue, y: resultValue };
          else newData.push({ x: sliderValue, y: resultValue });
          return newData.sort((a, b) => a.x - b.x);
        });
      }
    }
  }, [output, sliderValue]);

  const handleAskAI = async () => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    const data = await generateScienceGridContent(aiPrompt);
    if (data) {
      setMarkdown(data.markdown);
      setPythonCode(data.pythonCode);
    }
    setIsGenerating(false);
  };

  const handleSaveToGraph = async () => {
    if (detectedVariables.length === 0) return;
    setIsSaving(true);
    setSaveSuccess(false);
    const success = await saveEquationToGraph(markdown, detectedVariables);
    if (success) setSaveSuccess(true);
    else alert("Failed to map to Neo4j. Is your cloud database paused/sleeping?");
    setIsSaving(false);
  };

  const handleGenerateProof = async () => {
    try {
      const response = await fetch('http://127.0.0.1:3000/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equation: markdown, variables: detectedVariables })
      });
      const data = await response.json();
      setProofHash(data.proof_hash);
    } catch (error) {
      alert("Connection to Rust Engine severed. Verify local server.");
    }
  };

  // NEW LOGIC: Instant Export to local file
  const handleExportAlgorithm = () => {
    const blob = new Blob([pythonCode], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'verified_algorithm.py';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-sans selection:bg-cyan-500/30 pb-20">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#050505]/70 border-b border-white/5 px-8 py-4 flex flex-col md:flex-row md:items-center justify-between">
        <h1 className="text-xl font-medium tracking-widest text-white uppercase flex items-center gap-3">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
          Living Science Grid
        </h1>
        <div className="mt-4 md:mt-0 flex items-center gap-3 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
          <span className="text-xs font-mono tracking-wider text-slate-400 uppercase">Engine Status</span>
          <span className={`text-xs font-bold tracking-widest uppercase ${status === 'Ready' ? 'text-emerald-400' : 'text-amber-400'}`}>{status}</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition duration-500"></div>
          <div className="relative bg-[#0a0a0a] p-2 rounded-2xl border border-white/10 flex flex-col md:flex-row gap-2 shadow-2xl">
            <input 
              type="text" 
              placeholder="Query the Grid (e.g., 'Model the area of a circle')"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="flex-grow px-6 py-4 bg-transparent text-white placeholder-slate-600 focus:outline-none text-lg font-light"
            />
            <button 
              onClick={handleAskAI}
              disabled={isGenerating || !aiPrompt}
              className="flex items-center justify-center gap-2 bg-white/5 hover:bg-cyan-500/20 text-cyan-400 border border-transparent hover:border-cyan-500/50 px-8 py-4 rounded-xl font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Wand2 size={18} />
              {isGenerating ? "Synthesizing..." : "Initialize"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column */}
          <div className="lg:col-span-5 space-y-6 flex flex-col">
            <section className="flex-grow bg-white/[0.02] rounded-2xl p-6 border border-white/5 backdrop-blur-md flex flex-col">
              <h2 className="flex items-center gap-3 text-sm font-mono tracking-widest text-slate-500 uppercase mb-6">
                <FileText size={16} className="text-blue-400" /> Canvas
              </h2>
              <div className="prose prose-invert prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 font-light flex-grow">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{markdown}</ReactMarkdown>
              </div>
            </section>

            <section className="bg-white/[0.02] rounded-2xl p-6 border border-white/5 backdrop-blur-md">
              <h2 className="flex items-center gap-3 text-sm font-mono tracking-widest text-slate-500 uppercase mb-6">
                <Sliders size={16} className="text-violet-400" /> Parameters
              </h2>
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <label className="text-sm text-slate-400">Target Variable <span className="text-white font-mono bg-white/10 px-2 py-0.5 rounded">slider_x</span></label>
                  <span className="text-2xl font-light text-violet-300">{sliderValue}</span>
                </div>
                <input type="range" min="1" max="100" value={sliderValue} onChange={(e) => setSliderValue(Number(e.target.value))} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"/>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-7 space-y-6 flex flex-col">
            
            <section className="bg-[#0a0a0a] rounded-2xl border border-white/5 overflow-hidden flex flex-col shadow-2xl">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <h2 className="flex items-center gap-3 text-sm font-mono tracking-widest text-slate-500 uppercase">
                  <Code2 size={16} className="text-emerald-400" /> Runtime Environment
                </h2>
                
                {/* NEW LOGIC: Instant Export Button */}
                <button onClick={handleExportAlgorithm} className="flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-400/10 hover:bg-emerald-400/20 px-3 py-1.5 rounded-lg transition-all border border-emerald-500/20">
                  <Download size={14} /> Export .PY
                </button>
              </div>
              <div className="p-6 text-emerald-400/80 font-mono text-sm whitespace-pre-wrap overflow-x-auto leading-loose">
                {pythonCode}
              </div>
              <div className="border-t border-white/5 bg-[#050505] p-6">
                <div className="flex items-center gap-2 text-slate-600 text-xs font-mono uppercase tracking-widest mb-3">
                  <Sparkles size={14} /> Output Stream
                </div>
                <div className="text-slate-300 font-mono text-sm">{output || "Awaiting execution..."}</div>
              </div>
            </section>

            {/* RESTORED: Cryptographic Ledger */}
            <section className="bg-white/[0.02] rounded-2xl p-6 border border-white/5 backdrop-blur-md">
              <h2 className="flex items-center justify-between text-sm font-mono tracking-widest text-slate-500 uppercase mb-6">
                <div className="flex items-center gap-3"><ShieldCheck size={16} className="text-slate-400" /> Cryptographic Ledger</div>
              </h2>
              
              <div className="mb-6">
                <span className="text-xs font-mono tracking-widest text-slate-500 uppercase block mb-3">Detected Network Nodes:</span>
                {detectedVariables.length === 0 ? (
                  <div className="text-xs text-slate-600 font-mono bg-white/5 p-3 rounded-lg border border-white/5">Waiting for valid equation...</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {detectedVariables.map(v => (
                      <span key={v} className="bg-violet-500/20 text-violet-300 border border-violet-500/30 px-3 py-1 rounded-md text-xs font-mono">
                        {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button 
                  onClick={handleSaveToGraph}
                  disabled={isSaving || detectedVariables.length === 0}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                    detectedVariables.length === 0 ? 'bg-white/5 text-slate-700 border-white/5 cursor-not-allowed opacity-50' : 
                    saveSuccess ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 
                    isSaving ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 cursor-wait' :
                    'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {saveSuccess ? <CheckCircle size={16} /> : isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Database size={16} />}
                  {saveSuccess ? 'Mapped' : isSaving ? 'Syncing...' : 'Sync to Graph'}
                </button>
                <button 
                  onClick={handleGenerateProof}
                  className="flex items-center justify-center gap-2 bg-white/5 hover:bg-blue-500/10 text-slate-300 hover:text-blue-400 border border-white/10 hover:border-blue-500/30 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                >
                  <ShieldCheck size={16} /> Hash Validation
                </button>
              </div>
              
              {proofHash && (
                <div className="mt-6 pt-6 border-t border-white/5">
                  <span className="text-xs font-mono tracking-widest text-slate-500 uppercase block mb-2">SHA-256 Signature:</span>
                  <div className="text-blue-400 font-mono text-xs break-all bg-[#050505] p-4 rounded-lg border border-white/5">{proofHash}</div>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Telemetry Graph Monitor */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
          
          <h2 className="flex items-center gap-3 text-sm font-mono tracking-widest text-slate-500 uppercase mb-8">
            <Activity size={16} className="text-cyan-400" /> Live Telemetry Monitor
          </h2>
          
          <div className="w-full h-80">
            {chartData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center border border-dashed border-white/10 rounded-xl">
                <p className="text-slate-600 font-mono uppercase tracking-widest text-sm">Move slider to plot telemetry...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="x" 
                    stroke="rgba(255,255,255,0.2)" 
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'monospace' }}
                    tickMargin={15}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.2)" 
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'monospace' }} 
                    tickMargin={15}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#050505', borderColor: 'rgba(34, 211, 238, 0.3)', borderRadius: '8px', color: '#fff', fontFamily: 'monospace' }}
                    itemStyle={{ color: '#22d3ee' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="y" 
                    stroke="#22d3ee" 
                    strokeWidth={3} 
                    dot={{ r: 3, fill: '#0a0a0a', stroke: '#22d3ee', strokeWidth: 2 }} 
                    activeDot={{ r: 6, fill: '#22d3ee', stroke: '#fff' }}
                    isAnimationActive={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}