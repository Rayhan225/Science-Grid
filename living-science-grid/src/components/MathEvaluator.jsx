// src/components/MathEvaluator.jsx
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
  Plus, Pin, Trash2, Edit3, CheckCircle2, XCircle, PlayCircle, 
  ShieldCheck, Keyboard, Cpu, Info, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import 'katex/dist/katex.min.css';
import * as pdfjsLib from 'pdfjs-dist';
import { generatePaperSummary, extractRawEquations, analyzeSingleEquation, sanitizeDocument } from '../aiHelper';
import { useTheme } from '../context/ThemeContext';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const BACKEND_URL = "http://127.0.0.1:8000";

const globalStyles = `
  .hide-scrollbar::-webkit-scrollbar { display: none !important; }
  .hide-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
`;

const CustomLogicNode = ({ data }) => {
  let isLight = false;
  try {
    const ctx = useTheme();
    if (ctx) isLight = ctx.isLight;
  } catch (e) {}

  return (
    <div className={`p-4 rounded-xl shadow-xl min-w-[240px] max-w-[280px] select-text border ${isLight ? 'bg-white border-cyan-500/40 text-slate-800' : 'bg-[#0a0a0a] border-cyan-500/30 text-slate-300'}`}>
      <Handle className="w-3 h-3 bg-cyan-400 border-none" position={Position.Top} type="target"/>
      <div className={`flex items-center gap-2 border-b pb-2.5 mb-2.5 select-none ${isLight ? 'border-slate-100' : 'border-white/10'}`}>
        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
        <div className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest">{data.step || 'STEP'}</div>
      </div>
      <div className="text-xs font-light leading-relaxed">{data.label || 'No description provided.'}</div>
      <Handle className="w-3 h-3 bg-cyan-400 border-none" position={Position.Bottom} type="source"/>
    </div>
  );
};
const nodeTypes = { custom: CustomLogicNode };

const MATH_SYMBOLS = [
  '∫', '∬', '∮', '∂', '∇', '∞', '∑', '∏', 'lim', 'Δ',
  '𝔼', '𝕍', 'ℒ', '𝒩', '𝜎', '𝜇', '𝒲', '𝒷', '𝜂', '‖·‖',
  '≈', '≠', '≤', '≥', '∝', '∴', '∈', '∉', '⊂', 'ℝ',
  'α', 'β', 'γ', 'θ', 'λ', 'π', 'ρ', 'σ', 'τ', 'ω',
  '√', 'x²', 'x³', '^', '_', '{', '}', '[', ']', '('
];

export default function MathEvaluator({ telemetry: externalTelemetry, setTelemetry, status: externalStatus, setStatus, setAiContext }) {
  let themeContext = { isLight: false, themeClasses: { bgCard: 'bg-[#0a0a0a]', bgMain: 'bg-[#050505]' } };
  try {
    const ctx = useTheme();
    if (ctx) themeContext = ctx;
  } catch (e) {}
  const { themeClasses, isLight } = themeContext;
  
  // UI Panels and Overlays
  const [openSections, setOpenSections] = useState({ concept: true, review: true, options: false, map: false });
  const toggleSection = (k) => setOpenSections(prev => ({ ...prev, [k]: !prev[k] }));

  const [manualPrompt, setManualPrompt] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMathKeyboardOpen, setIsMathKeyboardOpen] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [vaultFiles, setVaultFiles] = useState([]);
  const [isBlindMode] = useState(false);
  
  // History Editing State
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Core MathEvaluator State
  const [paperData, setPaperData] = useState(null);
  const [activeEqId, setActiveEqId] = useState(null);
  const [sliderValues, setSliderValues] = useState({});
  const [outputLogs, setOutputLogs] = useState({});
  const [chartData, setChartData] = useState({});
  const [status, setInternalStatus] = useState("Ready");
  const [telemetry, setInternalTelemetry] = useState({ totalPages: 0, isolatedPages: 0, rawFormulas: 0, validatedNodes: 0 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [pipelineEta, setPipelineEta] = useState(0);
  const [sessionHistory, setSessionHistory] = useState([]);

  // Refs for Process Lifecycles
  const reportRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const workerRef = useRef(null);
  const cancelRef = useRef(false);
  const stateRef = useRef({ activeEqId, paperData, sliderValues });

  useEffect(() => {
    stateRef.current = { activeEqId, paperData, sliderValues };
  }, [activeEqId, paperData, sliderValues]);

  // ==========================================
  // DATABASE PERSISTENCE & FETCHING
  // ==========================================
  const fetchDatabaseSessions = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/math-evaluator/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessionHistory(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn("Unable to fetch MathEvaluator sessions from Supabase.");
    }
  }, []);

  const fetchVault = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/vault/files`);
      if (res.ok) setVaultFiles(await res.json());
    } catch (err) {
      console.warn("Vault offline");
    }
  }, []);

  useEffect(() => {
    fetchVault();
    fetchDatabaseSessions();
  }, [fetchVault, fetchDatabaseSessions]);

  const saveWorkspaceToDB = async (sessionData, currentSliderVals, currentOutputLogs, currentChartData) => {
    if (!sessionData) return;
    try {
      const payload = {
        id: sessionData.id,
        title: sessionData.title || "Untitled Matrix",
        timestamp: sessionData.timestamp || new Date().toLocaleDateString(),
        lastAccessed: new Date().toISOString(),
        isPinned: Boolean(sessionData.isPinned),
        equations: Array.isArray(sessionData.equations) ? sessionData.equations : [],
        sliderValues: currentSliderVals || {},
        outputLogs: currentOutputLogs || {},
        chartData: currentChartData || {}
      };

      const res = await fetch(`${BACKEND_URL}/api/math-evaluator/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchDatabaseSessions();
      } else {
        const errText = await res.text();
        console.warn("Database Sync Warning:", res.status, errText);
      }
    } catch (err) { 
      console.warn("Database Sync Notice:", err.message); 
    }
  };

  // ==========================================
  // WORKER PIPELINE (PYODIDE WASM EXECUTION)
  // ==========================================
  useEffect(() => {
    try {
      workerRef.current = new Worker(new URL('../pyodideWorker.js', import.meta.url), { type: 'module' });
      workerRef.current.onmessage = (event) => {
        const currentActiveId = stateRef.current.activeEqId;
        const currentPaperData = stateRef.current.paperData;
        const currentSliderVals = stateRef.current.sliderValues;

        if (event.data.type === "RESULT") {
          const resultText = event.data.payload.stdout;
          const updatedLogs = { ...outputLogs, [currentActiveId]: resultText };
          setOutputLogs(updatedLogs);

          const numbers = resultText.match(/-?\d+(\.\d+)?/g);
          if (numbers && currentPaperData) {
            const resultValue = Number(numbers[numbers.length - 1]);
            const eq = currentPaperData.equations?.find(e => e.id === currentActiveId);
            if (eq?.variables?.length > 0) {
              const xAxisVar = eq.variables[0].symbol;
              const xValue = currentSliderVals[currentActiveId]?.[xAxisVar] ?? eq.variables[0].default;
              setChartData(prev => {
                const eqData = prev[currentActiveId] || [];
                const newData = [...eqData.filter(p => p.x !== xValue), { x: xValue, true_y: resultValue }];
                const updatedChart = { ...prev, [currentActiveId]: newData.sort((a, b) => a.x - b.x) };
                saveWorkspaceToDB(currentPaperData, currentSliderVals, updatedLogs, updatedChart);
                return updatedChart;
              });
            }
          }
          setIsSimulating(false);
        }
        if (event.data.type === "ERROR") {
          setOutputLogs(prev => ({ ...prev, [currentActiveId]: `Error: ${event.data.payload}` }));
          setIsSimulating(false);
        }
      };
    } catch (e) {
      console.warn("Pyodide WebWorker failed to initialize.");
    }
    return () => { if (workerRef.current) workerRef.current.terminate(); };
  }, [outputLogs]);

  useEffect(() => {
    let interval;
    if (isGenerating && pipelineEta > 0) {
      interval = setInterval(() => {
        setPipelineEta(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isGenerating, pipelineEta]);

  const handleRunSimulation = () => {
    const active = paperData?.equations?.find(e => e.id === activeEqId);
    if (!workerRef.current || !active || active.status !== 'complete') return;
    setIsSimulating(true);
    workerRef.current.postMessage({ type: "RUN", code: active.pythonCode, variables: sliderValues[activeEqId] || {} });
  };

  // ==========================================
  // DOCUMENT EXTRACTION & COMPILATION
  // ==========================================
  const extractPagesFromDocument = async (file) => {
    let pages = [];
    if (file.type === "application/pdf" || file.name.endsWith('.pdf')) {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        pages.push({ pageNum: i, text: textContent.items.map(item => item.str).join(' ') });
      }
    } else {
      const text = await file.text();
      const chunks = text.match(/[\s\S]{1,2500}/g) || [];
      chunks.forEach((chunk, i) => pages.push({ pageNum: i + 1, text: chunk }));
    }
    return pages;
  };

  const executePipeline = async (allPages, skipRadar = false, workspaceTitle = "Untitled Matrix") => {
    cancelRef.current = false;
    setIsGenerating(true);
    setPipelineProgress(5);
    setInternalStatus(skipRadar ? "Processing Input..." : "Parsing Document...");
    setInternalTelemetry({ totalPages: allPages.length, isolatedPages: 0, rawFormulas: 0, validatedNodes: 0 });

    try {
      const newSessionId = `math_session_${Date.now()}`;
      const introText = (allPages[0]?.text || "") + " " + (allPages[1]?.text || "");
      
      let activeSession = {
        id: newSessionId, 
        title: workspaceTitle, 
        timestamp: new Date().toLocaleDateString(),
        lastAccessed: new Date().toLocaleTimeString(), 
        isPinned: false, 
        equations: []
      };
      
      setPaperData(activeSession);
      await saveWorkspaceToDB(activeSession, {}, {}, {});

      const summaryPromise = generatePaperSummary(isBlindMode ? sanitizeDocument(introText) : introText);

      let targetPages = allPages;
      if (!skipRadar) {
        setPipelineProgress(20);
        setInternalStatus("Isolating Math Formulations...");
        const scoredPages = allPages.map(page => {
          const text = page.text;
          const funcCalls = (text.match(/(softmax|layernorm|tanh|relu|sigmoid|σ|exp|log)\s*\(/gi) || []).length;
          const algebraic = (text.match(/[a-zA-Z0-9_]+\s*=\s*[^=]{1,30}[+\-*\/]/g) || []).length;
          const mathSymbols = (text.match(/[∑∫πθαβγσ∈ℝλμπω]/g) || []).length;
          const score = (funcCalls * 3) + (algebraic * 2) + (mathSymbols * 3);
          return { ...page, score };
        }).filter(p => p.score >= 3);

        scoredPages.sort((a, b) => b.score - a.score);
        targetPages = scoredPages.slice(0, 3);
      }

      if (cancelRef.current) return;
      if (targetPages.length === 0) targetPages = [allPages[0]];

      setInternalTelemetry(prev => ({ ...prev, isolatedPages: targetPages.length }));
      setPipelineProgress(35);
      setInternalStatus("Extracting mathematical representations...");
      
      let masterTaskQueue = [];
      for (const page of targetPages) {
        if (cancelRef.current) return;
        let textToProcess = isBlindMode ? sanitizeDocument(page.text) : page.text;
        const rawEquations = await extractRawEquations(textToProcess);
        if (rawEquations?.length > 0 && !cancelRef.current) {
          rawEquations.forEach(rawEq => {
            masterTaskQueue.push({
              id: `eq_${page.pageNum}_${Math.random().toString(36).substring(7)}`,
              latex: rawEq.latex,
              name: rawEq.name || "Equation",
              pageNum: page.pageNum,
              status: 'pending',
              sourceText: textToProcess
            });
          });
        }
      }

      if (cancelRef.current) return;
      masterTaskQueue = masterTaskQueue.slice(0, 3);
      setInternalTelemetry(prev => ({ ...prev, rawFormulas: masterTaskQueue.length }));

      if (masterTaskQueue.length === 0) {
        masterTaskQueue.push({
          id: `eq_fallback_${Date.now()}`,
          latex: '$$ y = f(x) $$',
          name: 'General Formulation',
          pageNum: 1,
          status: 'pending',
          sourceText: introText
        });
      }

      const paperSummary = await summaryPromise;
      if (cancelRef.current) return;

      activeSession = { 
        ...activeSession, 
        paperSummary: paperSummary || "Algorithmic synthesis mapped.",
        equations: [...masterTaskQueue] 
      };
      setPaperData(activeSession);
      setActiveEqId(masterTaskQueue[0].id);

      setPipelineProgress(55);
      const estTimePerFormula = 6; 
      let remainingTasks = masterTaskQueue.length;
      setPipelineEta(remainingTasks * estTimePerFormula);
      setInternalStatus("Compiling Python numerical subroutines...");

      for (const task of masterTaskQueue) {
        if (cancelRef.current) return;
        const detailedReview = await analyzeSingleEquation(task, task.sourceText);
        if (cancelRef.current) return;

        remainingTasks--;
        setPipelineEta(remainingTasks * estTimePerFormula);
        setPipelineProgress(55 + Math.floor(((masterTaskQueue.length - remainingTasks) / masterTaskQueue.length) * 45));

        if (detailedReview) {
          setPaperData(prev => {
            if (!prev) return prev;
            const updatedEquations = prev.equations.map(eq => eq.id === task.id ? { ...eq, ...detailedReview, status: 'complete' } : eq);
            const updatedSession = { ...prev, equations: updatedEquations };
            saveWorkspaceToDB(updatedSession, sliderValues, outputLogs, chartData);
            return updatedSession;
          });

          setSliderValues(prev => {
            let newSliders = { ...prev, [task.id]: {} };
            detailedReview.variables?.forEach(v => { newSliders[task.id][v.symbol] = v.default; });
            return newSliders;
          });
          setInternalTelemetry(prev => ({ ...prev, validatedNodes: prev.validatedNodes + 1 }));
        }
      }

      if (!cancelRef.current) {
        setInternalStatus("Session Compiled.");
        setPipelineProgress(100);
        setPipelineEta(0);
        setIsGenerating(false);
      }
    } catch (error) {
      if (!cancelRef.current) {
        console.error(error);
        setInternalStatus("Ready");
        setIsGenerating(false);
      }
    }
  };

  const restoreSession = async (sessionRecord) => {
    if (isGenerating) cancelRef.current = true;
    setPaperData(sessionRecord);
    setActiveEqId(sessionRecord.equations?.[0]?.id || null);
    setInternalStatus("Session Restored.");
    setSliderValues(sessionRecord.sliderValues || {});
    setOutputLogs(sessionRecord.outputLogs || {});
    setChartData(sessionRecord.chartData || {});
  };

  const handleCloseWorkspace = () => {
    setPaperData(null); 
    setActiveEqId(null);
    setInternalTelemetry({ totalPages: 0, isolatedPages: 0, rawFormulas: 0, validatedNodes: 0 });
    setInternalStatus("Ready");
    setIsGenerating(false);
    cancelRef.current = false;
  };

  const handleTerminateProcess = () => {
    cancelRef.current = true;
    setIsGenerating(false);
    setInternalStatus("Process Suspended.");
    setPipelineProgress(0);
    setPipelineEta(0);
  };

  const deleteSession = async (id) => {
    try {
      await fetch(`${BACKEND_URL}/api/math-evaluator/sessions/${id}`, { method: 'DELETE' });
      fetchDatabaseSessions();
      if (paperData?.id === id) handleCloseWorkspace();
    } catch (e) {}
  };

  const renameSession = async (id, newTitle) => {
    try {
      await fetch(`${BACKEND_URL}/api/math-evaluator/sessions/${id}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      fetchDatabaseSessions();
      if (paperData?.id === id) setPaperData(prev => ({ ...prev, title: newTitle }));
    } catch (e) {}
  };

  const togglePinSession = async (id) => {
    const target = sessionHistory.find(s => s.id === id);
    if (!target) return;
    const newStatus = !target.isPinned;
    try {
      await fetch(`${BACKEND_URL}/api/math-evaluator/sessions/${id}/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: newStatus })
      });
      fetchDatabaseSessions();
    } catch (e) {}
  };

  // Sync to outer props
  useEffect(() => {
    if (setTelemetry) setTelemetry(telemetry);
    if (setStatus) setStatus(status);
  }, [telemetry, status, setTelemetry, setStatus]);

  const currentEq = paperData?.equations?.find(e => e.id === activeEqId) || paperData?.equations?.[0];

  useEffect(() => {
    if (!setAiContext) return;
    if (currentEq && (currentEq.status === 'complete' || !currentEq.status)) {
      setAiContext(`User in MathEvaluator: ${paperData?.title}, Formula: ${currentEq.name}, Sliders: ${JSON.stringify(sliderValues[activeEqId] || {})}`);
    } else if (isGenerating) {
      setAiContext("Evaluating mathematical equations via agentic workers.");
    }
  }, [currentEq, sliderValues, activeEqId, paperData, isGenerating, setAiContext]);

  // Dropzone handling
  const syncToGlobalLibrary = async (filename, textContent) => {
    try {
      await fetch(`${BACKEND_URL}/api/library`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: filename, type: 'file', parentId: null, textContent: textContent })
      });
    } catch (err) {}
  };

  const onDrop = useCallback(async acceptedFiles => {
    const file = acceptedFiles[0];
    if (!file) return;

    const existing = sessionHistory.find(s => s.title?.toLowerCase() === file.name.toLowerCase());
    if (existing) {
      restoreSession(existing);
      return;
    }

    const allPages = await extractPagesFromDocument(file);
    const combinedText = allPages.map(p => p.text).join('\n\n');
    syncToGlobalLibrary(file.name, combinedText);
    await executePipeline(allPages, false, file.name);
  }, [executePipeline, sessionHistory]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'] }, multiple: false, noClick: true
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const existing = sessionHistory.find(s => s.title?.toLowerCase() === file.name.toLowerCase());
    if (existing) {
      restoreSession(existing);
      e.target.value = null;
      return;
    }

    const allPages = await extractPagesFromDocument(file);
    const combinedText = allPages.map(p => p.text).join('\n\n');
    syncToGlobalLibrary(file.name, combinedText);
    await executePipeline(allPages, false, file.name);
    e.target.value = null; 
  };

  const handleVaultFileSelect = async (file) => {
    setShowVaultModal(false);
    
    const existing = sessionHistory.find(s => s.title?.toLowerCase() === file.title?.toLowerCase());
    if (existing) {
      restoreSession(existing);
      return;
    }

    if (setStatus) setStatus(`Extracting ${file.title}...`);
    try {
      const response = await fetch(`${BACKEND_URL}/api/library/file/${file.id}`);
      const data = await response.json();
      const rawContent = data.content || "";

      if (rawContent.startsWith('data:application/pdf') || rawContent.startsWith('data:')) {
        const base64Data = rawContent.includes(',') ? rawContent.split(',')[1] : rawContent;
        const cleanBase64 = base64Data.replace(/\s/g, '');
        const binaryStr = window.atob(cleanBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        let extractedPages = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          extractedPages.push({ pageNum: i, text: textContent.items.map(item => item.str).join(" ") });
        }
        await executePipeline(extractedPages, false, file.title);
      } else {
        const syntheticPages = [{ pageNum: 1, text: rawContent }];
        await executePipeline(syntheticPages, false, file.title);
      }
    } catch (err) {
      console.error(err);
      if (setStatus) setStatus("Vault Extraction Failed");
    }
  };

  const handleManualIngestSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!manualPrompt.trim() || isGenerating) return;

    const fileCommandMatch = manualPrompt.match(/(?:evaluate|analyze|parse|load|bring)\s+['"“]?([^'"”\s\n]+)['"”]?/i);
    if (fileCommandMatch && fileCommandMatch[1]) {
      const targetFilename = fileCommandMatch[1].trim();
      if (setStatus) setStatus(`Resolving '${targetFilename}'...`);
      
      try {
        let response = await fetch(`${BACKEND_URL}/api/library/resolve-file?filename=${encodeURIComponent(targetFilename)}`);
        if (!response.ok) {
          response = await fetch(`${BACKEND_URL}/api/library/resolve-file?filename=${encodeURIComponent(targetFilename + '.pdf')}`);
        }
        if (!response.ok) {
          alert(`File '${targetFilename}' could not be located in database vault.`);
          if (setStatus) setStatus("Ready"); 
          return;
        }

        const fileRecord = await response.json();
        const syntheticPages = [{ pageNum: 1, text: fileRecord.text_content }];
        await executePipeline(syntheticPages, true, fileRecord.name);
        setManualPrompt("");
        return;
      } catch (err) {
        console.error(err);
        return;
      }
    }

    const syntheticPages = [{ pageNum: 1, text: manualPrompt }];
    await executePipeline(syntheticPages, true, "Manual Formulation Extraction");
    setManualPrompt("");
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const insertMathSymbol = (symbol) => {
    const cursorPosition = textareaRef.current?.selectionStart || manualPrompt.length;
    const textBefore = manualPrompt.substring(0, cursorPosition);
    const textAfter = manualPrompt.substring(cursorPosition, manualPrompt.length);
    setManualPrompt(textBefore + symbol + textAfter);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(cursorPosition + symbol.length, cursorPosition + symbol.length);
    }, 0);
  };

  const handleStartNewWorkspace = () => {
    handleCloseWorkspace();
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsHistoryOpen(false);
  };

  const sortedHistory = [...sessionHistory].sort((a, b) => (b.isPinned === a.isPinned ? 0 : b.isPinned ? -1 : 1));

  const activeOutputLog = typeof outputLogs === 'string'
    ? outputLogs
    : (outputLogs?.[activeEqId] || (outputLogs && typeof outputLogs === 'object' ? Object.values(outputLogs)[0] : null));

  const activeChartData = Array.isArray(chartData)
    ? chartData
    : (chartData?.[activeEqId] || (chartData && typeof chartData === 'object' ? Object.values(chartData)[0] : []));

  return (
    <>
      <style>{globalStyles}</style>
      
      {showManual && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-fadeIn">
          <div className={`border rounded-3xl p-8 max-w-2xl shadow-2xl relative overflow-hidden ${themeClasses.bgCard}`}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-600 to-cyan-400"></div>
            <button onClick={() => setShowManual(false)} className="absolute top-5 right-5 text-slate-500 hover:text-white">
              <X size={18}/>
            </button>
            
            <h2 className={`text-2xl font-serif tracking-tight mb-5 flex items-center gap-3 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <BookOpen className="text-cyan-400" size={24}/> MathEvaluator Manual
            </h2>
            
            <div className="grid grid-cols-2 gap-6 text-xs font-light text-slate-400 leading-relaxed select-text">
              <div className="space-y-3">
                <h3 className={`font-mono uppercase tracking-widest text-[11px] border-b pb-2 ${isLight ? 'text-slate-900 border-slate-200' : 'text-white border-white/10'}`}>Ingestion</h3>
                <ul className="space-y-2">
                  <li><span className="text-cyan-400 font-bold">1.</span> Direct PDF/TXT parsing with binary-safe extraction.</li>
                  <li><span className="text-cyan-400 font-bold">2.</span> Instant Database Cache restore on duplicate documents.</li>
                  <li><span className="text-cyan-400 font-bold">3.</span> Automated LaTeX syntax radar and parameter mapping.</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className={`font-mono uppercase tracking-widest text-[11px] border-b pb-2 ${isLight ? 'text-slate-900 border-slate-200' : 'text-white border-white/10'}`}>Execution</h3>
                <p>Adjust parameters via sliders. Click <strong className="text-emerald-400">Run Script</strong> to compile via Pyodide WebAssembly sandboxes locally without server round-trips.</p>
              </div>
            </div>
            <button onClick={() => setShowManual(false)} className="mt-8 w-full bg-cyan-500 text-black font-bold uppercase tracking-widest text-xs py-3 rounded-xl hover:bg-cyan-400 transition-colors">
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {showVaultModal && (
        <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 animate-fadeIn">
          <div className={`border rounded-2xl p-5 w-full max-w-md shadow-2xl relative ${themeClasses.bgCard}`}>
            <div className={`flex justify-between items-center mb-4 border-b pb-3 ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
              <h3 className={`font-mono uppercase tracking-widest text-xs flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Database className="text-purple-400" size={15}/> Select Vault File
              </h3>
              <button onClick={() => setShowVaultModal(false)} className="text-slate-500 hover:text-white">
                <X size={16}/>
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto custom-scrollbar space-y-2">
              {vaultFiles.length === 0 ? (
                <p className="text-center text-slate-500 text-xs py-8">Vault is empty.</p>
              ) : (
                vaultFiles.map(file => (
                  <button key={file.id} onClick={() => handleVaultFileSelect(file)} className={`w-full text-left p-3.5 border rounded-xl transition-all flex justify-between items-center group ${isLight ? 'bg-slate-50 border-slate-200 hover:border-purple-400' : 'bg-white/[0.02] border-white/5 hover:border-purple-500/30'}`}>
                    <div>
                      <h4 className={`text-xs font-medium truncate ${isLight ? 'text-slate-800 group-hover:text-purple-600' : 'text-slate-200 group-hover:text-purple-400'}`}>{file.title}</h4>
                      <p className="text-[9px] font-mono text-slate-500 mt-0.5">{file.date}</p>
                    </div>
                    <FilePlus className="text-slate-500 group-hover:text-purple-400" size={15}/>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* DATABASE LEDGER DRAWER */}
      {isHistoryOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsHistoryOpen(false)} 
          />
          <div className={`fixed top-0 right-0 bottom-0 z-50 w-80 md:w-96 border-l shadow-2xl flex flex-col transition-transform duration-300 animate-slideLeft ${themeClasses.bgCard} ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="text-cyan-400" size={16}/>
                <h3 className={`font-mono text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Math Ledger History
                </h3>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X size={16}/>
              </button>
            </div>

            <div className="p-3 border-b border-white/5">
              <button
                onClick={() => {
                  fetchDatabaseSessions();
                  handleStartNewWorkspace();
                }}
                className="w-full flex items-center justify-center gap-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl py-2.5 px-3 text-xs font-mono uppercase tracking-wider font-bold transition-all"
              >
                <Plus size={14}/> New Workspace
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 hide-scrollbar">
              {sortedHistory.length === 0 ? (
                <div className="text-center text-slate-500 text-xs py-10 font-mono">No saved sessions found.</div>
              ) : (
                sortedHistory.map((item) => (
                  <div
                    key={item.id}
                    className={`group relative p-3 border rounded-xl transition-all flex flex-col gap-2 ${
                      paperData?.id === item.id
                        ? 'border-cyan-500/50 bg-cyan-500/10'
                        : isLight ? 'bg-slate-50 border-slate-200 hover:border-slate-300' : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      {editingSessionId === item.id ? (
                        <div className="flex items-center gap-1 flex-1">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="w-full bg-black/40 border border-cyan-500/50 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              renameSession(item.id, editingTitle);
                              setEditingSessionId(null);
                            }}
                            className="p-1 text-emerald-400 hover:text-emerald-300"
                          >
                            <CheckCircle2 size={14}/>
                          </button>
                          <button
                            onClick={() => setEditingSessionId(null)}
                            className="p-1 text-slate-400 hover:text-white"
                          >
                            <X size={14}/>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            restoreSession(item);
                            setIsHistoryOpen(false);
                          }}
                          className="flex-1 text-left font-mono text-xs font-bold truncate text-slate-200 group-hover:text-cyan-400"
                        >
                          {item.title || "Untitled Session"}
                        </button>
                      )}

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={() => togglePinSession(item.id)}
                          className={`p-1 rounded hover:bg-white/10 ${item.isPinned ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
                          title={item.isPinned ? "Unpin session" : "Pin session"}
                        >
                          <Pin className={item.isPinned ? "fill-amber-400" : ""} size={13}/>
                        </button>
                        <button
                          onClick={() => {
                            setEditingSessionId(item.id);
                            setEditingTitle(item.title || "");
                          }}
                          className="p-1 rounded text-slate-500 hover:text-cyan-400 hover:bg-white/10"
                          title="Rename"
                        >
                          <Edit3 size={13}/>
                        </button>
                        <button
                          onClick={() => deleteSession(item.id)}
                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-white/10"
                          title="Delete"
                        >
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>{item.timestamp}</span>
                      <span>{item.equations?.length || 0} equations</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <div className={`flex flex-col h-full w-full overflow-hidden relative font-sans select-none ${themeClasses.bgMain}`}>
        {/* HEADER ACTION BAR */}
        <div className={`flex items-center justify-between px-6 py-4 border-b z-30 flex-shrink-0 backdrop-blur-md ${isLight ? 'border-slate-200 bg-white/70' : 'border-white/10 bg-black/40'}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
              <Cpu size={16}/>
            </div>
            <div>
              <h2 className={`text-xs font-mono font-bold uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>Math Evaluator Sandbox</h2>
              <p className="text-[10px] font-mono text-slate-400">Supabase Connected Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setShowManual(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono uppercase tracking-wider border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 transition-all">
              <Info size={14}/> Manual
            </button>
            <button 
              onClick={() => {
                fetchDatabaseSessions();
                setIsHistoryOpen(!isHistoryOpen);
              }} 
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-widest transition-all border ${isHistoryOpen ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-md' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
            >
              <History size={14}/> Database Ledger ({sortedHistory.length})
            </button>
          </div>
        </div>

        <div {...(!paperData && !isGenerating ? getRootProps() : {})} className="flex-1 flex flex-col relative overflow-hidden outline-none">
          <input {...getInputProps()} />

          {isDragActive && !paperData && !isGenerating && (
            <div className="absolute inset-0 z-50 bg-cyan-900/20 backdrop-blur-md border-4 border-cyan-500 border-dashed m-6 rounded-3xl flex items-center justify-center">
              <div className={`p-8 rounded-full shadow-2xl animate-bounce border border-cyan-500/30 ${themeClasses.bgCard}`}>
                <UploadCloud className="text-cyan-400" size={48}/>
              </div>
            </div>
          )}
          
          <div className="flex-1 flex flex-col relative transition-all duration-300 overflow-hidden">
            <div className="flex-1 overflow-y-auto hide-scrollbar px-6 md:px-10 pt-5 pb-5">
              <div className="max-w-[1300px] mx-auto space-y-8 animate-fadeIn">
                
                {!paperData && !isGenerating && (
                  <div className="flex flex-col items-center justify-center h-full my-4 animate-fadeIn max-w-4xl mx-auto">
                    <div className="w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-blue-500/5 rounded-2xl flex items-center justify-center mb-6 shadow-xl ring-1 ring-cyan-500/30 rotate-3 transition-transform hover:rotate-0 duration-500">
                      <Cpu className="text-cyan-400" size={36}/>
                    </div>
                    <h1 className={`text-2xl md:text-4xl font-serif tracking-tight mb-3 text-center ${isLight ? 'text-slate-900' : 'text-white'}`}>Research Grade Math Evaluation.</h1>
                    <p className="text-slate-400 font-light max-w-xl text-center text-xs md:text-sm leading-relaxed mb-8">
                      Drop a technical document or select from the Supabase Vault. Algorithms are compiled natively in isolated browser WebAssembly sandboxes.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
                      <div className={`border p-5 rounded-2xl shadow-lg transition-all group ${themeClasses.bgCard}`}>
                        <div className="w-9 h-9 bg-purple-500/10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <ShieldCheck className="text-purple-400" size={18}/>
                        </div>
                        <h3 className={`text-xs font-bold mb-1.5 tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>Local Sandboxing</h3>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-light">Equations compile in Pyodide WebAssembly with state tracking synced to Supabase.</p>
                      </div>
                      <div className={`border p-5 rounded-2xl shadow-lg transition-all group ${themeClasses.bgCard}`}>
                        <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Terminal className="text-emerald-400" size={18}/>
                        </div>
                        <h3 className={`text-xs font-bold mb-1.5 tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>Syntactic Radar</h3>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-light">Prioritizes dense mathematical pages to prevent LLM processing queue bottlenecks.</p>
                      </div>
                      <div className={`border p-5 rounded-2xl shadow-lg transition-all group ${themeClasses.bgCard}`}>
                        <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Activity className="text-amber-400" size={18}/>
                        </div>
                        <h3 className={`text-xs font-bold mb-1.5 tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>Interactive Telemetry</h3>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-light">Sliders manipulate algebraic parameters to map live coordinate trajectories.</p>
                      </div>
                    </div>
                  </div>
                )}

                {isGenerating && (
                  <div className={`border rounded-3xl shadow-2xl animate-fadeIn max-w-3xl mx-auto my-4 p-8 flex flex-col items-center justify-center relative overflow-hidden ${themeClasses.bgCard}`}>
                    <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent"></div>
                    <Loader2 className="animate-spin text-cyan-400 mb-6" size={48}/>
                    <h2 className="text-lg font-mono uppercase tracking-widest mb-2">{status}</h2>
                    <p className="text-xs text-slate-500 font-light mb-6 max-w-md text-center leading-relaxed">Parsing mathematical nodes and compiling execution subroutines...</p>

                    <div className="w-72 h-1.5 bg-white/5 rounded-full overflow-hidden mb-5">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ease-out" style={{ width: `${pipelineProgress}%` }}></div>
                    </div>

                    <div className="flex items-center gap-5 text-xs font-mono text-cyan-400/80 uppercase tracking-widest bg-cyan-500/10 px-5 py-2 rounded-full border border-cyan-500/20">
                      <span className="flex items-center gap-1.5"><Activity size={13}/> Progress: {pipelineProgress}%</span>
                      <span>|</span>
                      <span className="flex items-center gap-1.5"><Clock size={13}/> ETA: ~{pipelineEta}s</span>
                    </div>
                    
                    <button onClick={handleTerminateProcess} className="mt-8 px-5 py-2 border border-red-500/30 bg-red-500/10 text-red-400 rounded-full font-mono text-xs uppercase tracking-widest hover:bg-red-500 hover:text-black transition-all font-bold">
                      Suspend Process
                    </button>
                  </div>
                )}

                {paperData && !isGenerating && (
                  <>
                    <div className={`border rounded-2xl px-5 py-3.5 shadow-xl print:hidden animate-fadeIn flex items-center justify-between ${themeClasses.bgCard}`}>
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-0.5">Workspace</span>
                          <span className={`text-xs font-mono font-bold max-w-[180px] truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{paperData.title || "Evaluation Layer"}</span>
                        </div>
                        <div className={`w-px h-5 ${isLight ? 'bg-slate-200' : 'bg-white/10'}`}></div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-0.5">Isolation</span>
                          <span className="text-xs font-mono font-bold text-cyan-400">{telemetry.isolatedPages || 1} Segments</span>
                        </div>
                        <div className={`w-px h-5 ${isLight ? 'bg-slate-200' : 'bg-white/10'}`}></div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-0.5">Algorithms</span>
                          <span className="text-xs font-mono font-bold text-amber-400">{paperData.equations?.length || 0} Nodes</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <button onClick={handleCloseWorkspace} className="flex items-center gap-1.5 bg-white/5 text-xs font-mono tracking-widest uppercase border border-white/10 px-4 py-2 rounded-xl hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all font-bold">
                          <FilePlus size={13}/> Close
                        </button>
                      </div>
                    </div>

                    {paperData.equations?.length > 0 && (
                      <div className="flex gap-3 overflow-x-auto pb-3 border-b border-white/5 hide-scrollbar print:hidden">
                        {paperData.equations.map((eq, idx) => (
                          <button key={eq.id || idx} onClick={() => { setActiveEqId(eq.id); }} className={`px-4 py-3 rounded-xl font-mono text-xs whitespace-nowrap flex flex-col items-start min-w-[240px] transition-all duration-300 border ${activeEqId === eq.id ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/50 shadow-md scale-[1.01]' : `${themeClasses.bgCard} text-slate-400 hover:bg-white/5`}`}>
                            <div className="flex items-center justify-between w-full mb-2">
                              <span className="text-[9px] font-mono bg-white/5 px-1.5 py-0.5 rounded text-slate-400 tracking-widest uppercase">Node {idx + 1}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] tracking-widest opacity-70 font-bold uppercase truncate max-w-[100px]">{eq.name || 'Equation'}</span>
                                {eq.status === 'paused' && <div className="w-2 h-2 rounded-full bg-slate-500" title="Paused"></div>}
                                {(eq.status === 'complete' || !eq.status) && <CheckCircle2 className="text-emerald-400" size={12}/>}
                                {eq.status === 'failed' && <XCircle className="text-red-500" size={12}/>}
                              </div>
                            </div>
                            <span className="font-sans font-bold w-full overflow-hidden text-ellipsis text-left select-text">
                              <ReactMarkdown rehypePlugins={[rehypeKatex]} remarkPlugins={[remarkMath]}>
                                {String(eq.latex || "Equation Node")}
                              </ReactMarkdown>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {currentEq && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 select-text" ref={reportRef}>
                        <div className="lg:col-span-5 flex flex-col space-y-3 print:col-span-12">
                          <div className={`rounded-2xl border overflow-hidden shadow-lg ${themeClasses.bgCard}`}>
                            <button onClick={() => toggleSection('concept')} className="w-full flex items-center justify-between px-4 py-3 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 transition-colors border-b border-white/5">
                              <span className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest font-bold">
                                <FileText size={14}/> Concept & Definition
                              </span>
                              {openSections.concept ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </button>
                            {openSections.concept && (
                              <div className="p-4 prose prose-invert prose-slate max-w-none font-light animate-fadeIn text-xs">
                                <div className="mb-3 pb-3 border-b border-white/5 select-none">
                                  <h4 className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase mb-1 flex items-center gap-1.5"><BookOpen size={11}/> Executive Context</h4>
                                  <p className="text-[11px] text-slate-400 italic leading-relaxed font-serif">{paperData.paperSummary || "Algorithmic synthesis mapped."}</p>
                                </div>
                                <h4 className="text-[10px] font-mono text-slate-500 tracking-widest uppercase mb-1.5 select-none">Functional Definition</h4>
                                <ReactMarkdown rehypePlugins={[rehypeKatex]} remarkPlugins={[remarkMath]}>{String(currentEq.concept || "Mathematical parameters isolated.")}</ReactMarkdown>
                              </div>
                            )}
                          </div>

                          <div className={`rounded-2xl border overflow-hidden shadow-lg ${themeClasses.bgCard}`}>
                            <button onClick={() => toggleSection('review')} className="w-full flex items-center justify-between px-4 py-3 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400 transition-colors border-b border-white/5">
                              <span className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest font-bold">
                                <AlertTriangle size={14}/> Critical Review & Critique
                              </span>
                              {openSections.review ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </button>
                            {openSections.review && (
                              <div className="p-4 prose prose-invert prose-slate max-w-none font-light animate-fadeIn text-xs">
                                {currentEq.rating && (
                                  <div className="mb-3 inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest border bg-amber-500/10 text-amber-400 border-amber-500/30">
                                    Metric Rating: {currentEq.rating}
                                  </div>
                                )}
                                <ReactMarkdown rehypePlugins={[rehypeKatex]} remarkPlugins={[remarkMath]}>{String(currentEq.critique || "Standard boundary parameters observed.")}</ReactMarkdown>
                              </div>
                            )}
                          </div>

                          <div className={`rounded-2xl border overflow-hidden shadow-lg ${themeClasses.bgCard}`}>
                            <button onClick={() => toggleSection('options')} className="w-full flex items-center justify-between px-4 py-3 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 transition-colors border-b border-white/5">
                              <span className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest font-bold">
                                <Lightbulb size={14}/> Alternative Implementations
                              </span>
                              {openSections.options ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </button>
                            {openSections.options && (
                              <div className="p-4 prose prose-invert prose-slate max-w-none font-light animate-fadeIn text-xs">
                                <ReactMarkdown rehypePlugins={[rehypeKatex]} remarkPlugins={[remarkMath]}>{String(currentEq.alternatives || "Standard formulations verified.")}</ReactMarkdown>
                              </div>
                            )}
                          </div>

                          <div className={`rounded-2xl border overflow-hidden shadow-lg ${themeClasses.bgCard}`}>
                            <button onClick={() => toggleSection('map')} className="w-full flex items-center justify-between px-4 py-3 bg-purple-500/5 hover:bg-purple-500/10 text-purple-400 transition-colors border-b border-white/5">
                              <span className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest font-bold">
                                <Workflow size={14}/> Logic Flow Map
                              </span>
                              {openSections.map ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </button>
                            {openSections.map && (
                              <div className="h-72 relative bg-[#050505] animate-fadeIn select-none">
                                {currentEq.logicMap?.nodes?.length > 0 ? (
                                  <ReactFlow 
                                    nodes={currentEq.logicMap.nodes} 
                                    edges={currentEq.logicMap.edges} 
                                    nodeTypes={nodeTypes} 
                                    fitView 
                                    proOptions={{ hideAttribution: true }}
                                  >
                                    <Background color="#222" gap={20}/>
                                    <Controls/>
                                  </ReactFlow>
                                ) : (
                                  <div className="flex h-full items-center justify-center font-mono text-slate-500 text-xs uppercase tracking-widest">
                                    No structural node maps generated.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="lg:col-span-7 space-y-5 print:hidden">
                          <section className={`rounded-2xl p-6 border shadow-xl animate-fadeIn select-none relative overflow-hidden ${themeClasses.bgCard}`}>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl"></div>
                            <h2 className="flex items-center justify-between text-xs font-mono tracking-widest text-slate-400 uppercase mb-6 border-b border-white/10 pb-3 relative z-10">
                              <span className="flex items-center gap-2"><Sliders className="text-violet-400" size={15}/> Interactive Boundaries</span>
                            </h2>
                            <div className="space-y-6 relative z-10">
                              {currentEq.variables?.length > 0 ? currentEq.variables.map(v => {
                                const currentVal = sliderValues[activeEqId]?.[v.symbol] ?? sliderValues[v.symbol] ?? v.default;
                                return (
                                  <div key={v.symbol} className="space-y-2.5 group">
                                    <div className="flex justify-between items-end">
                                      <div className="max-w-[70%]">
                                        <label className="text-xs font-semibold text-white block mb-0.5 truncate">{v.label}</label>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded tracking-widest uppercase">{v.symbol}</span>
                                          <span className="text-[11px] text-slate-400 truncate leading-none">{v.effect}</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2.5">
                                        <input 
                                          type="number" 
                                          value={currentVal}
                                          onChange={(e) => setSliderValues(prev => ({...prev, [activeEqId]: {...prev[activeEqId], [v.symbol]: Number(e.target.value)}}))}
                                          className="w-14 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-center text-xs font-mono text-white focus:outline-none focus:border-violet-500/50 hide-scrollbar"
                                        />
                                        <span className="text-xl font-light text-violet-300 font-mono leading-none min-w-[50px] text-right">{currentVal}</span>
                                      </div>
                                    </div>
                                    <div className="relative w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                      <input 
                                        type="range" min={v.min || 0} max={v.max || 100} step={((v.max || 100) - (v.min || 0)) / 100} 
                                        value={currentVal} 
                                        onChange={(e) => setSliderValues(prev => ({...prev, [activeEqId]: {...prev[activeEqId], [v.symbol]: Number(e.target.value)}}))} 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                      />
                                      <div 
                                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all pointer-events-none" 
                                        style={{ width: `${(((currentVal) - (v.min || 0)) / ((v.max || 100) - (v.min || 0))) * 100}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                );
                              }) : <p className="text-slate-600 text-xs font-mono uppercase tracking-widest text-center py-3">No variable properties bound by analyst.</p>}
                            </div>
                          </section>

                          <section className={`rounded-2xl border overflow-hidden flex flex-col shadow-xl animate-fadeIn ${themeClasses.bgCard}`}>
                            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01] select-none">
                              <div className="flex flex-col">
                                <h2 className="flex items-center gap-2 text-xs font-mono tracking-widest text-slate-400 uppercase"><Code2 className="text-emerald-400" size={14}/> Secure WASM Sandbox</h2>
                              </div>
                              <button onClick={handleRunSimulation} disabled={isSimulating} className="flex items-center gap-1.5 text-xs text-[#0a0a0a] bg-emerald-400 hover:bg-emerald-300 px-4 py-2 rounded-xl font-bold uppercase tracking-widest transition-all shadow-md disabled:opacity-50">
                                {isSimulating ? <RefreshCw className="animate-spin" size={12}/> : <Play className="fill-current" size={12}/>} Run Script
                              </button>
                            </div>
                            <div className="grid grid-cols-2 h-52 divide-x divide-white/5 border-b border-white/5 select-text">
                              <div className="p-5 text-emerald-400/80 font-mono text-xs whitespace-pre-wrap overflow-y-auto bg-[#0a0a0a] relative hide-scrollbar group">
                                <div className="text-[9px] text-slate-600 mb-2 uppercase tracking-widest border-b border-white/5 pb-1.5 select-none">Python Subroutine</div>
                                {currentEq.pythonCode || "# Operational logic mapping empty"}
                              </div>
                              <div className="p-5 text-slate-300 font-mono text-xs whitespace-pre-wrap overflow-y-auto bg-[#050505] flex flex-col relative hide-scrollbar">
                                <div className="text-[9px] text-slate-600 mb-2 uppercase tracking-widest border-b border-white/5 pb-1.5 flex items-center gap-1.5 select-none"><Sparkles size={11}/> Standard Output</div>
                                <div className="flex-grow font-mono text-slate-400">{activeOutputLog || "> Awaiting script execution call..."}</div>
                              </div>
                            </div>
                          </section>

                          <div className={`p-6 rounded-2xl border shadow-xl relative animate-fadeIn flex flex-col justify-between select-none min-h-[260px] ${themeClasses.bgCard}`}>
                            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3 select-none">
                              <h2 className="flex items-center gap-2 text-xs font-mono tracking-widest text-slate-400 uppercase"><Activity className="text-cyan-400" size={14}/> Coordinate Trajectory</h2>
                            </div>
                            <div className="w-full h-56 min-h-[220px] flex-grow">
                              {(!activeChartData || activeChartData.length === 0) ? (
                                <div className="flex h-full items-center justify-center border border-dashed border-white/5 rounded-xl"><p className="text-slate-600 font-mono text-[11px] uppercase tracking-widest text-center px-4 leading-relaxed">Adjust values and execute run call sequentially to populate graph nodes</p></div>
                              ) : (
                                <ResponsiveContainer width="100%" height={220} minWidth={100}>
                                  <LineChart data={activeChartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" vertical={false}/>
                                    <XAxis dataKey="x" stroke="rgba(255,255,255,0.15)" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'monospace' }}/>
                                    <YAxis domain={['auto', 'auto']} stroke="rgba(255,255,255,0.15)" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'monospace' }}/>
                                    <Tooltip contentStyle={{ backgroundColor: '#050505', borderColor: 'rgba(34, 211, 238, 0.2)', borderRadius: '10px', fontSize: '11px', fontFamily: 'monospace' }}/>
                                    <Line type="monotone" dataKey="true_y" stroke="#22d3ee" strokeWidth={2.5} dot={{ fill: '#22d3ee', r: 3 }} activeDot={{ r: 6, fill: '#0a0a0a', stroke: '#22d3ee', strokeWidth: 2 }} isAnimationActive={false} name="WASM Output"/>
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

            {(!paperData && !isGenerating) && (
              <div className="flex-shrink-0 bg-transparent border-t border-white/5 py-3 px-6 select-none z-30">
                <div className="max-w-3xl mx-auto relative">
                  
                  {isMathKeyboardOpen && (
                    <div className={`absolute bottom-full left-12 mb-3 p-3.5 backdrop-blur-2xl border rounded-2xl shadow-2xl animate-fadeIn z-50 w-[380px] ${themeClasses.bgCard}`}>
                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2.5 border-b border-white/5 pb-1.5 flex items-center gap-1.5"><Keyboard className="text-cyan-400" size={11}/> Mathematical & Data Symbol Pad</div>
                      <div className="grid grid-cols-10 gap-1.5">
                        {MATH_SYMBOLS.map(sym => (
                          <button 
                            key={sym} 
                            type="button" 
                            onClick={() => insertMathSymbol(sym)}
                            className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400 rounded-lg text-xs font-mono transition-all border border-transparent hover:border-cyan-500/30 active:scale-95"
                          >
                            {sym}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleManualIngestSubmit} className={`relative border rounded-[2rem] shadow-xl transition-all flex items-end p-2 ${themeClasses.bgCard}`}>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.txt" />
                    
                    <div className="flex bg-white/5 p-1 rounded-full mb-0.5 ml-0.5">
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
                        title="Upload Local File"
                      >
                        <Paperclip size={15}/>
                      </button>
                      
                      <div className="w-px bg-white/10 my-2 mx-1"></div>
                      
                      <button 
                        type="button" 
                        onClick={() => setShowVaultModal(true)}
                        className="p-2 text-slate-400 hover:text-purple-400 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
                        title="Select Vault File"
                      >
                        <Database size={15}/>
                      </button>
                    </div>

                    <div className="relative group mx-1">
                      <button 
                        type="button"
                        onClick={() => setIsMathKeyboardOpen(!isMathKeyboardOpen)}
                        className={`p-2 rounded-full transition-colors flex items-center justify-center ${isMathKeyboardOpen ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-400 hover:text-cyan-400 hover:bg-white/10'}`}
                        title="Toggle Math Keyboard"
                      >
                        <Keyboard size={15}/>
                      </button>
                    </div>

                    <textarea
                      ref={textareaRef}
                      value={manualPrompt}
                      onChange={(e) => setManualPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleManualIngestSubmit(e);
                        }
                      }}
                      placeholder="Type LaTeX expression, e.g., \int f(x)dx, or 'evaluate file.pdf'..."
                      rows={1}
                      className="flex-1 bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-0 resize-none px-3 py-2 max-h-32 hide-scrollbar font-mono"
                    />

                    <button
                      type="submit"
                      disabled={!manualPrompt.trim() || isGenerating}
                      className="p-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:hover:bg-cyan-500 text-black rounded-full transition-all font-bold flex items-center justify-center mb-0.5 mr-0.5 shadow-md"
                      title="Run Evaluation"
                    >
                      <ArrowUp size={15}/>
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}