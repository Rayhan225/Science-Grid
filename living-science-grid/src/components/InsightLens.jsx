// src/components/InsightLens.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import * as pdfjsLib from 'pdfjs-dist';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { 
  BookOpen, ChevronLeft, ChevronRight, Search, Send, RefreshCw, 
  Highlighter, X, Crop, BookMarked, MessageSquare, Database, 
  Play, Pause, Square, Volume2, PenTool, Save, Undo2, Redo2, Eraser, 
  ZoomIn, ZoomOut, UploadCloud, BrainCircuit, Info, Orbit, CloudDownload,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, CheckCircle2, Trash2,
  Pin, Edit3, Plus, Copy, Check, Sparkles, Tag, ExternalLink, Download, Languages,
  FileText, BookmarkPlus, AlertCircle, GraduationCap, Code2, Layers, CheckSquare
} from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { generatePaperSummary, sanitizeDocument, sanitizeKatexString } from '../aiHelper';

const rehypeKatexOptions = [rehypeKatex, { strict: false, throwOnError: false }];

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || pdfjs.version}/build/pdf.worker.min.mjs`;

const BACKEND_URL = "http://127.0.0.1:8000";
const MAJOR_SECTIONS = /^(abstract|introduction|background|literature\s+review|methodology|methods|experimental\s+setup|results|discussion|conclusion|references)$/i;

const globalStyles = `
  .pdf-render-canvas-viewport { display: flex; justify-content: center; width: 100%; padding-bottom: 40px; }
  .pdf-render-canvas-viewport .react-pdf__Page { box-shadow: 0 30px 60px -15px rgba(0,0,0,0.5) !important; border: 1px solid rgba(255,255,255,0.06) !important; background-color: #ffffff; position: relative; }
  .react-pdf__Page__textContent { pointer-events: auto !important; z-index: 10 !important; mix-blend-mode: multiply; }
  .react-pdf__Page__textContent > span { color: transparent !important; cursor: text !important; }
  ::selection { background: rgba(16,185,129,0.35) !important; color: transparent !important; }
  .hide-scrollbar::-webkit-scrollbar { display: none !important; }
  .hide-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
`;

export default function InsightLens({ setStatus: setParentStatus, setCurrentView }) {
  let themeContext = { 
    isLight: false, 
    themeClasses: { 
      bgCard: 'bg-[#0a0a0a]', 
      bgMain: 'bg-[#050505]', 
      accentText: 'text-emerald-400', 
      accentBorder: 'border-emerald-500', 
      accentBg: 'bg-emerald-500' 
    } 
  };
  
  try {
    const ctx = useTheme();
    if (ctx) themeContext = ctx;
  } catch (e) {}
  const { themeClasses, isLight } = themeContext;
  
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);

  const [leftSidebarTab, setLeftSidebarTab] = useState('ledger'); 
  const [activeRightTab, setActiveRightTab] = useState('copilot');
  const [showManual, setShowManual] = useState(false);
  
  const [pdfFile, setPdfFile] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [interactionMode, setInteractionMode] = useState('read'); 
  const [activeColor, setActiveColor] = useState('#eab308'); 

  const [activeSelectionText, setActiveSelectionText] = useState("");
  const [activeBase64Image, setActiveBase64Image] = useState(null);
  
  const [isDrawingCrop, setIsDrawingCrop] = useState(false);
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });
  const [cropCurrent, setCropCurrent] = useState({ x: 0, y: 0 });

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState(null);
  
  const [vaultFiles, setVaultFiles] = useState([]);
  const [vaultNotesList, setVaultNotesList] = useState([]);
  const [manualNoteText, setManualNoteText] = useState('');
  const [manualNoteSource, setManualNoteSource] = useState('InsightLens Manual Note');
  const [noteSaveStatus, setNoteSaveStatus] = useState(null);

  // SciSpace Research Notebook State
  const [paperNotes, setPaperNotes] = useState([]);
  const [activeNoteCategory, setActiveNoteCategory] = useState('All');
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [isComposingNote, setIsComposingNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState('Key Finding');
  const [newNotePage, setNewNotePage] = useState(1);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteQuote, setNewNoteQuote] = useState('');
  const [newNoteImage, setNewNoteImage] = useState(null);
  const [copiedNoteId, setCopiedNoteId] = useState(null);
  const [exportFeedback, setExportFeedback] = useState(false);
  const [copiedChatIdx, setCopiedChatIdx] = useState(null);

  // Citations & BibTeX State (Academic Researcher)
  const [citationModal, setCitationModal] = useState(false);
  const [citationsData, setCitationsData] = useState(null);
  const [loadingCitations, setLoadingCitations] = useState(false);
  const [copiedCitationFormat, setCopiedCitationFormat] = useState(null);

  // Concept Flashcards State (Graduate Student)
  const [paperFlashcards, setPaperFlashcards] = useState([]);
  const [loadingFlashcards, setLoadingFlashcards] = useState(false);
  const [flippedCardId, setFlippedCardId] = useState(null);
  const [flashcardGenStatus, setFlashcardGenStatus] = useState(null);

  // PyTorch Code Extractor State (Programmer / ML Engineer)
  const [extractedCode, setExtractedCode] = useState(null);
  const [loadingCodeExtract, setLoadingCodeExtract] = useState(false);
  const [copiedCodeStatus, setCopiedCodeStatus] = useState(false);

  // In-Situ Pyodide WASM Sandbox State
  const [isWasmSandboxOpen, setIsWasmSandboxOpen] = useState(false);
  const [wasmCode, setWasmCode] = useState('');
  const [wasmOutput, setWasmOutput] = useState('');
  const [isWasmRunning, setIsWasmRunning] = useState(false);
  const wasmWorkerRef = useRef(null);
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');

  // Reading Stream & Translation State
  const [translatedStreamText, setTranslatedStreamText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);

  const [chatInput, setChatInput] = useState("");
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [aiResponseBuffer, setAiResponseBuffer] = useState("");
  const [isAiEvaluating, setIsAiEvaluating] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState('en-US');
  const [audioState, setAudioState] = useState({ isPlaying: false, isPaused: false, progress: 0, text: "" });

  // Unified State
  const [paperData, setPaperData] = useState(null);
  const [status, setStatusInternal] = useState("Ready");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [annotations, setAnnotations] = useState({});
  const [redoStack, setRedoStack] = useState({});

  const annotationCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const pdfWrapperRef = useRef(null);
  const cancelRef = useRef(false);
  const speechUtteranceRef = useRef(null);

  const getCurrentUserId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('sg_current_user') || '{}');
      return user.id || 'usr_admin';
    } catch {
      return 'usr_admin';
    }
  };

  // Citations Modal Handler
  const handleOpenCiteModal = async () => {
    setCitationModal(true);
    setLoadingCitations(true);
    try {
      const title = paperData?.title || "Attention Is All You Need";
      const authors = paperData?.metadata?.authors || "Vaswani et al.";
      const year = paperData?.metadata?.year || 2024;
      const res = await fetch(`${BACKEND_URL}/api/citations/export?title=${encodeURIComponent(title)}&authors=${encodeURIComponent(authors)}&year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setCitationsData(data);
      }
    } catch (e) {
      console.warn("Citation export error:", e);
    } finally {
      setLoadingCitations(false);
    }
  };

  const handleCopyCitation = (format, text) => {
    navigator.clipboard.writeText(text);
    setCopiedCitationFormat(format);
    setTimeout(() => setCopiedCitationFormat(null), 2500);
  };

  const handleDownloadBibFile = () => {
    if (!citationsData?.formats?.bibtex) return;
    const blob = new Blob([citationsData.formats.bibtex], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${citationsData.bibtexKey || 'citation'}.bib`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const fetchPaperFlashcards = useCallback(async () => {
    setLoadingFlashcards(true);
    try {
      const uid = getCurrentUserId();
      const pTitle = paperData?.title ? `?paper_title=${encodeURIComponent(paperData.title)}&user_id=${encodeURIComponent(uid)}` : `?user_id=${encodeURIComponent(uid)}`;
      const res = await fetch(`${BACKEND_URL}/api/student/flashcards${pTitle}`);
      if (res.ok) {
        const cards = await res.json();
        setPaperFlashcards(Array.isArray(cards) ? cards : []);
        if (paperData) {
          saveWorkspaceToDB(paperData, chatHistory, annotations, paperNotes, cards, extractedCode);
        }
      }
    } catch (e) {
      console.warn("Fetch flashcards error:", e);
    } finally {
      setLoadingFlashcards(false);
    }
  }, [paperData?.title, paperData, chatHistory, annotations, paperNotes, extractedCode]);

  useEffect(() => {
    if (activeRightTab === 'flashcards') {
      fetchPaperFlashcards();
    }
  }, [activeRightTab, fetchPaperFlashcards]);

  const handleGenerateFlashcards = async () => {
    setFlashcardGenStatus('generating');
    try {
      const currentPageText = paperData?.pages?.[pageNumber - 1] || paperData?.paperSummary || activeSelectionText || "Scaled dot-product attention computes softmax(QK^T/sqrt(d_k))V";
      const res = await fetch(`${BACKEND_URL}/api/student/flashcards/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paper_title: paperData?.title || "Research Manuscript",
          content: currentPageText,
          user_id: getCurrentUserId()
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.cards) {
          setPaperFlashcards(prev => [...data.cards, ...prev]);
          setFlashcardGenStatus('success');
          setTimeout(() => setFlashcardGenStatus(null), 2500);
        }
      }
    } catch (e) {
      setFlashcardGenStatus('error');
      setTimeout(() => setFlashcardGenStatus(null), 3000);
    }
  };

  const handleToggleMastery = async (card) => {
    const nextLevel = ((card.mastery_level || 0) + 1) % 3;
    setPaperFlashcards(prev => prev.map(c => c.id === card.id ? { ...c, mastery_level: nextLevel } : c));
    try {
      await fetch(`${BACKEND_URL}/api/student/flashcards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: card.id,
          concept: card.concept,
          definition: card.definition,
          formula: card.formula,
          mastery_level: nextLevel
        })
      });
    } catch (e) {}
  };

  // PyTorch Algorithm Code Extractor Handler
  const handleExtractPyTorchCode = async () => {
    setLoadingCodeExtract(true);
    try {
      const currentPageText = paperData?.pages?.[pageNumber - 1] || paperData?.paperSummary || activeSelectionText || "Multi-head attention mechanism with query key value linear projections and residual skip connections.";
      const res = await fetch(`${BACKEND_URL}/api/code/implementations/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paper_title: paperData?.title || "Research Manuscript",
          content: currentPageText,
          user_id: getCurrentUserId()
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.implementation) {
          setExtractedCode(data.implementation);
        }
      }
    } catch (e) {
      console.warn("PyTorch extraction error:", e);
    } finally {
      setLoadingCodeExtract(false);
    }
  };

  const handleCopyExtractedCode = () => {
    if (!extractedCode?.code_snippet) return;
    navigator.clipboard.writeText(extractedCode.code_snippet);
    setCopiedCodeStatus(true);
    setTimeout(() => setCopiedCodeStatus(false), 2000);
  };

  const handleSendToMathSandbox = () => {
    if (setCurrentView) {
      setCurrentView('math-evaluator');
    }
  };

  const fetchSavedSessions = useCallback(async () => {
    try {
      const uid = getCurrentUserId();
      const res = await fetch(`${BACKEND_URL}/api/insightlens/workspaces?user_id=${encodeURIComponent(uid)}`);
      if (res.ok) {
        const data = await res.json();
        setSessionHistory(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn("Unable to fetch InsightLens workspaces from Supabase.");
    }
  }, []);

  // WebWorker for In-Situ WASM Pyodide Execution
  useEffect(() => {
    try {
      wasmWorkerRef.current = new Worker(new URL('../pyodideWorker.js', import.meta.url), { type: 'module' });
      wasmWorkerRef.current.onmessage = (event) => {
        setIsWasmRunning(false);
        if (event.data.type === "RESULT") {
          const out = event.data.payload.stdout || String(event.data.payload || "Kernel execution completed (exit code: 0).");
          setWasmOutput(out);
        } else if (event.data.type === "ERROR") {
          setWasmOutput(`Runtime Error: ${event.data.payload}`);
        }
      };
    } catch (e) {
      console.warn("WASM Pyodide worker initialization warning:", e);
    }
    return () => {
      if (wasmWorkerRef.current) wasmWorkerRef.current.terminate();
    };
  }, []);

  const handleRunWasmExecution = () => {
    setIsWasmRunning(true);
    setWasmOutput("Executing in Pyodide WebAssembly numerical sandbox...");
    if (wasmWorkerRef.current) {
      let runCode = wasmCode || extractedCode?.code_snippet || "import math\nprint('Pyodide WASM Kernel active')\nresult = 42\nprint('Computed Result:', result)";
      
      // Auto-shim PyTorch imports to NumPy for browser WASM compatibility
      if (runCode.includes("torch") && !runCode.includes("# Torch NumPy Emulation")) {
        const torchShim = `# Torch NumPy Emulation for Browser WASM
import numpy as np

class _TorchTensor(np.ndarray):
    pass

class _TorchModule:
    class Module:
        def __init__(self): pass
        def forward(self, x): return x
        def __call__(self, *a, **k): return self.forward(*a, **k)
    class Linear:
        def __init__(self, in_f, out_f):
            self.weight = np.random.randn(out_f, in_f) * 0.01
            self.bias = np.zeros(out_f)
        def __call__(self, x):
            return np.dot(x, self.weight.T) + self.bias
    class ReLU:
        def __call__(self, x): return np.maximum(0, x)
    class Softmax:
        def __init__(self, dim=-1): self.dim = dim
        def __call__(self, x):
            e = np.exp(x - np.max(x, axis=self.dim, keepdims=True))
            return e / e.sum(axis=self.dim, keepdims=True)

class _TorchShim:
    Tensor = _TorchTensor
    nn = _TorchModule()
    @staticmethod
    def randn(*shape): return np.random.randn(*shape).view(_TorchTensor)
    @staticmethod
    def zeros(*shape): return np.zeros(shape).view(_TorchTensor)
    @staticmethod
    def ones(*shape): return np.ones(shape).view(_TorchTensor)
    @staticmethod
    def tensor(d): return np.array(d).view(_TorchTensor)
    @staticmethod
    def matmul(a, b): return np.matmul(a, b).view(_TorchTensor)

torch = _TorchShim()
`;
        runCode = torchShim + "\n" + runCode.replace(/import torch(\.nn(\.functional)?)?(\s+as\s+\w+)?/g, "# [PyTorch Shimmied]");
      }

      wasmWorkerRef.current.postMessage({
        type: "RUN",
        code: runCode,
        variables: {}
      });
    }
  };

  useEffect(() => {
    fetchVaultNotes();
    fetchSavedSessions();
  }, [fetchSavedSessions]);

  const fetchVaultNotes = async () => {
    try {
      const uid = getCurrentUserId();
      const res = await fetch(`${BACKEND_URL}/api/vault/notes?user_id=${encodeURIComponent(uid)}`);
      if (res.ok) setVaultNotesList(await res.json());
    } catch (err) {
      console.warn("Could not fetch vault notes.");
    }
  };

  const saveWorkspaceToDB = async (updatedWorkspace, currentChat, currentAnnotations, currentNotes = null, currentFlashcards = null, currentExtractedCode = null) => {
    if (!updatedWorkspace) return;
    try {
      const effectiveNotes = currentNotes !== null ? currentNotes : (paperNotes || []);
      const effectiveFlashcards = currentFlashcards !== null ? currentFlashcards : (paperFlashcards || []);
      const effectiveCode = currentExtractedCode !== null ? currentExtractedCode : extractedCode;
      const statePayload = {
        ...(updatedWorkspace.stateData || {}),
        notes: effectiveNotes,
        flashcards: effectiveFlashcards,
        extractedCode: effectiveCode,
        annotations: currentAnnotations || annotations || {}
      };

      await fetch(`${BACKEND_URL}/api/insightlens/workspaces`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: updatedWorkspace.id,
          userId: getCurrentUserId(),
          title: updatedWorkspace.title,
          fileId: updatedWorkspace.fileId,
          totalPages: updatedWorkspace.totalPages || 1,
          timestamp: updatedWorkspace.timestamp,
          lastAccessed: new Date().toISOString(),
          isPinned: updatedWorkspace.isPinned || false,
          paperSummary: updatedWorkspace.paperSummary || "",
          chatHistory: currentChat || [],
          annotations: currentAnnotations || annotations || {},
          metadata: updatedWorkspace.metadata || {},
          stateData: statePayload
        })
      });
      fetchSavedSessions();
    } catch (err) {
      console.error("Failed to commit InsightLens workspace to Supabase:", err);
    }
  };

  const resetWorkspaceState = () => {
    setAnnotations({});
    setRedoStack({});
    setChatHistory([]);
    setPaperData(null);
    setStatusInternal("Ready");
  };

  const executeExtractionPipeline = async (file, existingFileId = null) => {
    cancelRef.current = false;

    // Deduplication: Check if workspace with same name already exists for this user
    const cleanFileName = file.name;
    const existing = sessionHistory.find(s => (s.title || '').toLowerCase() === cleanFileName.toLowerCase());
    if (existing) {
      handleSelectLedgerSession(existing);
      return;
    }

    resetWorkspaceState();
    setIsGenerating(true); 
    setPipelineProgress(5); 
    setStatusInternal("Parsing document structure...");

    let synthesizedWorkspace = null;
    try {
      const arrayBuffer = await file.arrayBuffer();
      let pdf = null;
      let totalPages = 1;
      try {
        pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer), isEvalSupported: false }).promise;
        totalPages = pdf?.numPages || 1;
      } catch (pdfErr) {
        console.warn("PDF extraction warning, using graceful fallback:", pdfErr);
      }
      const newWorkspaceId = `lens_${Date.now()}`;
      
      synthesizedWorkspace = {
        id: newWorkspaceId, 
        fileId: existingFileId,
        title: file.name,
        totalPages: totalPages,
        timestamp: new Date().toLocaleDateString(), 
        lastAccessed: new Date().toLocaleTimeString(),
        isPinned: false, 
        paperSummary: "Processing manuscript...", 
        chatHistory: [],
        metadata: { 
          title: file.name, 
          journal: "Scientific Reports", 
          authors: "Extracted", 
          year: new Date().getFullYear().toString() 
        },
        stateData: { sections: [], paperMemory: {} }
      };

      setPaperData(synthesizedWorkspace);
      await saveWorkspaceToDB(synthesizedWorkspace, [], {});

      if (pdf) {
        for (let i = 1; i <= totalPages; i++) {
          if (cancelRef.current) break;
          setStatusInternal(`Indexing: Page ${i}/${totalPages}`);
          setPipelineProgress(Math.round((i / totalPages) * 100));

          try {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageLines = textContent.items.map(item => item.str);
            const rawPageText = pageLines.join(" ");

            synthesizedWorkspace.stateData.paperMemory[i.toString()] = rawPageText;

            if (i === 1 && pageLines.length > 3) {
              synthesizedWorkspace.metadata.title = pageLines[0].trim() || file.name;
              const yearMatch = rawPageText.match(/\b(19|20\d{2})\b/);
              if (yearMatch) synthesizedWorkspace.metadata.year = yearMatch[1];
            }

            pageLines.forEach(line => {
              const cleanLine = line.replace('.', '').trim();
              if (cleanLine.split(/\s+/).length <= 4 && MAJOR_SECTIONS.test(cleanLine)) {
                synthesizedWorkspace.stateData.sections.push({ title: line.trim(), page: i });
              }
            });

            setPaperData({ ...synthesizedWorkspace });
          } catch (pErr) {
            console.warn(`Page ${i} extraction notice:`, pErr);
          }
        }
      }

      if (synthesizedWorkspace.stateData.sections.length === 0) {
        synthesizedWorkspace.stateData.sections = [
          { title: "Introduction", page: 1 },
          { title: "Methodology", page: Math.min(2, totalPages) },
          { title: "Results & Discussion", page: Math.min(3, totalPages) }
        ];
      }

      const summaryText = await generatePaperSummary(synthesizedWorkspace.stateData.paperMemory["1"] || file.name || "");
      synthesizedWorkspace.paperSummary = summaryText;

      // Connect to local SLM ingest endpoint to populate smart review questions
      try {
        const formData = new FormData();
        formData.append("file", file);
        const ingestRes = await fetch(`${BACKEND_URL}/api/research/ingest`, {
          method: "POST",
          body: formData
        });
        if (ingestRes.ok) {
          const ingestJson = await ingestRes.json();
          if (ingestJson.smartQuestions && ingestJson.smartQuestions.length > 0) {
            synthesizedWorkspace.chatHistory = [
              {
                role: 'assistant',
                content: `### 🤖 ScholarGrid AI Peer Review Prompts\n\n${ingestJson.smartQuestions.join('\n\n')}`
              }
            ];
          }
        }
      } catch (e) {
        console.warn("Server-side SLM ingest note:", e);
      }

      await saveWorkspaceToDB(synthesizedWorkspace, synthesizedWorkspace.chatHistory, {});
      setPaperData({ ...synthesizedWorkspace });
      setStatusInternal("Ready"); 
      setIsGenerating(false);
    } catch (err) {
      console.error("Pipeline runtime exception:", err);
      if (!synthesizedWorkspace) {
        synthesizedWorkspace = {
          id: `lens_${Date.now()}`,
          fileId: existingFileId,
          title: file.name,
          totalPages: 1,
          timestamp: new Date().toLocaleDateString(),
          lastAccessed: new Date().toLocaleTimeString(),
          isPinned: false,
          paperSummary: "Manuscript loaded into viewer.",
          chatHistory: [],
          metadata: { title: file.name, journal: "Scientific Manuscript", authors: "Extracted", year: new Date().getFullYear().toString() },
          stateData: { sections: [{ title: "Overview", page: 1 }], paperMemory: { "1": file.name } }
        };
      }
      setPaperData(synthesizedWorkspace);
      setStatusInternal("Ready"); 
      setIsGenerating(false);
    }
  };

  const addAnnotationLine = (pageNum, lineObj) => {
    setAnnotations(prev => {
      const updated = { ...prev, [pageNum]: [...(prev[pageNum] || []), lineObj] };
      if (paperData) saveWorkspaceToDB(paperData, chatHistory, updated);
      return updated;
    });
    setRedoStack(prev => ({ ...prev, [pageNum]: [] }));
  };

  const undoAnnotation = (pageNum) => {
    setAnnotations(prev => {
      const lines = prev[pageNum] || [];
      if (lines.length === 0) return prev;
      setRedoStack(rs => ({ ...rs, [pageNum]: [...(rs[pageNum] || []), lines[lines.length - 1]] }));
      const updated = { ...prev, [pageNum]: lines.slice(0, -1) };
      if (paperData) saveWorkspaceToDB(paperData, chatHistory, updated);
      return updated;
    });
  };

  const redoAnnotation = (pageNum) => {
    setRedoStack(prev => {
      const redos = prev[pageNum] || [];
      if (redos.length === 0) return prev;
      const restoredLine = redos[redos.length - 1];
      setAnnotations(an => {
        const updated = { ...an, [pageNum]: [...(an[pageNum] || []), restoredLine] };
        if (paperData) saveWorkspaceToDB(paperData, chatHistory, updated);
        return updated;
      });
      return { ...prev, [pageNum]: redos.slice(0, -1) };
    });
  };

  const eraseAnnotations = (pageNum) => {
    setAnnotations(prev => {
      const updated = { ...prev, [pageNum]: [] };
      if (paperData) saveWorkspaceToDB(paperData, chatHistory, updated);
      return updated;
    });
    setRedoStack(prev => ({ ...prev, [pageNum]: [] }));
  };

  const renameSession = async (id, newTitle) => {
    try {
      await fetch(`${BACKEND_URL}/api/insightlens/workspaces/${id}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      fetchSavedSessions();
      if (paperData?.id === id) {
        setPaperData(prev => ({ ...prev, title: newTitle }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const togglePinSession = async (id) => {
    const target = sessionHistory.find(s => s.id === id);
    if (!target) return;
    const newStatus = !target.isPinned;
    try {
      await fetch(`${BACKEND_URL}/api/insightlens/workspaces/${id}/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: newStatus })
      });
      fetchSavedSessions();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteSession = async (id) => {
    try {
      await fetch(`${BACKEND_URL}/api/insightlens/workspaces/${id}`, { method: 'DELETE' });
      fetchSavedSessions();
      if (paperData?.id === id) resetWorkspaceState();
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualSaveNote = async (e) => {
    e.preventDefault();
    if (!manualNoteText.trim()) return;

    try {
      const uid = getCurrentUserId();
      const payload = {
        title: manualNoteSource ? `${manualNoteSource} (p. ${pageNumber})` : `InsightLens Note (p. ${pageNumber})`,
        source: manualNoteSource || paperData?.title || "InsightLens Document",
        page_number: pageNumber,
        text: manualNoteText,
        insight: "User observation entry",
        user_id: uid,
        type: 'insight_lens'
      };

      const res = await fetch(`${BACKEND_URL}/api/vault/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setManualNoteText('');
        setNoteSaveStatus("Saved to Supabase database & Central Vault.");
        fetchVaultNotes();
        window.dispatchEvent(new CustomEvent('vaultNotesUpdated', { detail: payload }));
        setTimeout(() => setNoteSaveStatus(null), 3000);
      }
    } catch (err) {
      setNoteSaveStatus("Failed to save note.");
    }
  };

  const handleDeleteVaultNote = async (noteId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/vault/notes/${noteId}`, { method: 'DELETE' });
      if (res.ok) fetchVaultNotes();
    } catch (err) {
      console.error(err);
    }
  };

  const createPdfFileFromRaw = (rawContent, filename) => {
    let blob;
    if (typeof rawContent === 'string' && (rawContent.startsWith('data:application/pdf') || rawContent.startsWith('data:') || rawContent.includes('base64,') || rawContent.startsWith('JVBER'))) {
      const base64Data = rawContent.includes(',') ? rawContent.split(',')[1] : rawContent;
      const cleanBase64 = base64Data.replace(/\s/g, '');
      const paddedBase64 = cleanBase64.padEnd(cleanBase64.length + (4 - cleanBase64.length % 4) % 4, '=');
      const binaryStr = window.atob(paddedBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      blob = new Blob([bytes], { type: 'application/pdf' });
    } else if (typeof rawContent === 'string' && rawContent.startsWith('%PDF')) {
      const bytes = new Uint8Array(rawContent.length);
      for (let i = 0; i < rawContent.length; i++) {
        bytes[i] = rawContent.charCodeAt(i);
      }
      blob = new Blob([bytes], { type: 'application/pdf' });
    } else {
      blob = new Blob([rawContent], { type: 'application/pdf' });
    }
    return new File([blob], filename, { type: 'application/pdf' });
  };

  const mountPdfOnlyFromUrl = async (url, filename, targetPage = 1) => {
    try {
      setStatusInternal(`Loading ${filename}...`);
      const res = await fetch(url);
      const data = await res.json();
      const rawContent = data.content || data.text_content || "";
      if (rawContent) {
        const file = createPdfFileFromRaw(rawContent, filename);
        setPdfFile(file);
        setPageNumber(targetPage);
      }
      setStatusInternal("Ready");
    } catch (err) {
      console.warn("PDF mount notice:", err);
      setStatusInternal("Ready");
    }
  };

  const loadPdfFileFromUrl = async (url, filename, targetPage = 1) => {
    try {
      setStatusInternal(`Loading ${filename}...`);
      const res = await fetch(url);
      const data = await res.json();
      const rawContent = data.content || data.text_content || "";
      const file = createPdfFileFromRaw(rawContent, filename);
      setPdfFile(file);
      setPageNumber(targetPage);
      await executeExtractionPipeline(file, data.id);
      fetchSavedSessions();
    } catch (err) {
      console.error(err);
      setStatusInternal("Failed to parse document stream.");
    }
  };

  const handleVaultFileSelect = async (fileData) => {
    const existingSession = sessionHistory.find(s => s.title.toLowerCase() === fileData.title.toLowerCase());
    if (existingSession) {
      handleSelectLedgerSession(existingSession);
    } else {
      loadPdfFileFromUrl(`${BACKEND_URL}/api/library/file/${fileData.id}`, fileData.title);
    }
  };

  const handleSelectLedgerSession = async (session) => {
    if (isGenerating) cancelRef.current = true;
    setIsGenerating(false);
    setStatusInternal("Ready");

    // Flush previous session changes if switching to another paper
    if (paperData && paperData.id !== session.id) {
      saveWorkspaceToDB(paperData, chatHistory, annotations, paperNotes, paperFlashcards, extractedCode);
    }

    setPaperData(session);
    setChatHistory(session.chatHistory || []);
    setAnnotations(session.annotations || session.stateData?.annotations || {});
    setPaperNotes(session.stateData?.notes || []);
    setPaperFlashcards(session.stateData?.flashcards || []);
    setExtractedCode(session.stateData?.extractedCode || null);
    setIsWasmSandboxOpen(false);
    setPageNumber(1);

    const fileId = session.fileId || session.stateData?.fileId;
    if (fileId) {
      mountPdfOnlyFromUrl(`${BACKEND_URL}/api/library/file/${fileId}`, session.title, 1);
    } else {
      const res = await fetch(`${BACKEND_URL}/api/library/resolve-file?filename=${encodeURIComponent(session.title)}`);
      if (res.ok) {
        const data = await res.json();
        mountPdfOnlyFromUrl(`${BACKEND_URL}/api/library/file/${data.id}`, session.title, 1);
      }
    }
  };

  // Cross-Tool Dispatch Listener
  // Cross-Tool Dispatch Listener & Active Vault File Ingestion
  useEffect(() => {
    const handleOpenFileEvent = (e) => {
      const file = e.detail;
      if (file && file.title) {
        const existingSession = sessionHistory.find(s => s.title.toLowerCase() === file.title.toLowerCase());
        if (existingSession) {
          handleSelectLedgerSession(existingSession);
        } else {
          loadPdfFileFromUrl(file.url, file.title, file.pageNumber || 1);
        }
      }
    };

    window.addEventListener('sg-open-file', handleOpenFileEvent);

    // Check if a vault file was queued for opening from Central Vault
    try {
      const stored = localStorage.getItem('sg_active_vault_file');
      if (stored) {
        localStorage.removeItem('sg_active_vault_file');
        const file = JSON.parse(stored);
        if (file && file.url && file.title) {
          loadPdfFileFromUrl(file.url, file.title, file.pageNumber || 1);
        }
      }
    } catch (e) {
      console.warn("Vault file mount check notice:", e);
    }

    return () => window.removeEventListener('sg-open-file', handleOpenFileEvent);
  }, [sessionHistory]);

  const handleStartFreshDocument = () => {
    if (paperData) {
      saveWorkspaceToDB(paperData, chatHistory, annotations, paperNotes, paperFlashcards, extractedCode);
    }
    resetWorkspaceState();
    setPaperNotes([]);
    setPaperFlashcards([]);
    setExtractedCode(null);
    setIsWasmSandboxOpen(false);
    setPdfFile(null);
    setPageNumber(1);
    if (fileInputRef.current) fileInputRef.current.value = null;
    fetchSavedSessions();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!paperData) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setPageNumber(p => Math.min(paperData.totalPages, p + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setPageNumber(p => Math.max(1, p - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.speechSynthesis.cancel();
    };
  }, [paperData]);

  const loadFromVault = async () => {
    try {
      const uid = getCurrentUserId();
      const res = await fetch(`${BACKEND_URL}/api/vault/files?user_id=${encodeURIComponent(uid)}`);
      if (res.ok) setVaultFiles(await res.json());
    } catch (err) {}
  };

  const handleDocumentIngestion = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPdfFile(file);
    setPageNumber(1);
    await executeExtractionPipeline(file);
    fetchSavedSessions();
  };

  const handleNativeSelection = useCallback(() => {
    if (interactionMode !== 'read') return;
    setTimeout(() => {
      const text = window.getSelection().toString().trim();
      if (text.length > 5) {
        setActiveSelectionText(text);
        setActiveBase64Image(null);
        setActiveRightTab('copilot');
      }
    }, 100);
  }, [interactionMode]);

  const getCanvasMousePos = (e, canvasElement) => {
    const rect = canvasElement.getBoundingClientRect();
    const scaleX = canvasElement.width / rect.width;
    const scaleY = canvasElement.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const renderCanvas = useCallback(() => {
    const canvas = annotationCanvasRef.current;
    const pdfCanvas = document.querySelector('.react-pdf__Page__canvas');
    if (!canvas || !pdfCanvas) return;
    canvas.width = pdfCanvas.width; 
    canvas.height = pdfCanvas.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round'; 
    ctx.lineJoin = 'round';

    const pathsToDraw = [...(annotations[pageNumber] || [])];
    if (currentPath) pathsToDraw.push(currentPath);

    pathsToDraw.forEach(path => {
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      if (path.tool === 'highlight') {
        ctx.lineWidth = 18 * scale; 
        ctx.globalCompositeOperation = 'multiply'; 
        ctx.globalAlpha = 0.3;
      } else {
        ctx.lineWidth = 3 * scale; 
        ctx.globalCompositeOperation = 'source-over'; 
        ctx.globalAlpha = 1.0;
      }
      path.points.forEach((p, i) => { 
        if (i === 0) ctx.moveTo(p.x, p.y); 
        else ctx.lineTo(p.x, p.y); 
      });
      ctx.stroke();
    });
  }, [annotations, pageNumber, currentPath, scale]);

  const handleCanvasMouseDown = (e) => {
    if (interactionMode === 'read') return;
    if (interactionMode === 'crop') {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setCropStart(pos); 
      setCropCurrent(pos); 
      setIsDrawingCrop(true);
      return;
    }
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    setCurrentPath({ tool: interactionMode, color: activeColor, points: [getCanvasMousePos(e, canvas)] });
    setIsDrawing(true);
  };

  const handleCanvasMouseMove = (e) => {
    if (interactionMode === 'crop' && isDrawingCrop) {
      const rect = e.currentTarget.getBoundingClientRect();
      setCropCurrent({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      return;
    }
    if (isDrawing && currentPath) {
      setCurrentPath(prev => ({ ...prev, points: [...prev.points, getCanvasMousePos(e, annotationCanvasRef.current)] }));
      renderCanvas(); 
    }
  };

  const handleCanvasMouseUp = () => {
    if (interactionMode === 'crop' && isDrawingCrop) {
      setIsDrawingCrop(false);
      const box = {
        x: Math.min(cropStart.x, cropCurrent.x), 
        y: Math.min(cropStart.y, cropCurrent.y),
        w: Math.abs(cropCurrent.x - cropStart.x), 
        h: Math.abs(cropCurrent.y - cropStart.y)
      };
      if (box.w > 20 && box.h > 25) {
        setInteractionMode('read');
        const pdfCanvas = document.querySelector('.react-pdf__Page__canvas');
        if (pdfCanvas) {
          const rect = pdfCanvas.getBoundingClientRect();
          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = box.w * (pdfCanvas.width / rect.width);
          cropCanvas.height = box.h * (pdfCanvas.height / rect.height);
          cropCanvas.getContext('2d').drawImage(
            pdfCanvas, 
            box.x * (pdfCanvas.width / rect.width), 
            box.y * (pdfCanvas.height / rect.height), 
            cropCanvas.width, 
            cropCanvas.height, 
            0, 0, 
            cropCanvas.width, 
            cropCanvas.height
          );
          setActiveBase64Image(cropCanvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
          setActiveSelectionText(`[Visual Element Extracted]`);
          setActiveRightTab('copilot');
        }
      }
      return;
    }
    if (isDrawing && currentPath) {
      setIsDrawing(false);
      addAnnotationLine(pageNumber, currentPath);
      setCurrentPath(null);
    }
  };

  useEffect(() => { 
    setTimeout(renderCanvas, 100); 
  }, [pageNumber, renderCanvas, scale]);

  // --- SCI-SPACE CONTEXT QUERY (Routed directly to Copilot Chatbox) ---
  const executeContextQuery = async (text, promptOverride) => {
    setActiveRightTab('copilot');
    const isImage = !!activeBase64Image;
    const defaultPrompt = isImage
      ? "Explain this figure/table snip from the manuscript in detail. Analyze its structure, key metrics, and scientific significance."
      : `Explain this academic excerpt from page ${pageNumber} and its core implication.`;
    const userInstruction = promptOverride || defaultPrompt;
    await handleChatSubmit(null, userInstruction);
  };

  // --- SCI-SPACE MULTI-PAGE CHAT WITH PDF ---
  const handleChatSubmit = async (e = null, customQuery = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const query = customQuery || chatInput;
    if (!query.trim() || !paperData) return;

    const currentSnipImage = activeBase64Image;
    const currentExcerpt = activeSelectionText;

    let formattedUserMsg = query;
    if (currentExcerpt && currentExcerpt !== '[Visual Element Extracted]' && !query.includes(currentExcerpt)) {
      formattedUserMsg = `[Referenced Excerpt p.${pageNumber}: "${currentExcerpt}"]\n\n${query}`;
    }

    const userMessage = { 
      role: 'user', 
      content: formattedUserMsg, 
      image: currentSnipImage || null,
      page: pageNumber
    };
    const newHistory = [...chatHistory, userMessage];
    setChatHistory(newHistory); 
    setChatInput(""); 
    setIsAgentTyping(true);

    // Clear active snip and excerpt immediately so user can select/snip additional elements
    setActiveBase64Image(null);
    setActiveSelectionText("");
    setAiResponseBuffer("");

    const currentPageText = paperData.stateData?.paperMemory?.[pageNumber.toString()] || "";
    let contextData = `=== ACTIVE VIEW: PAGE ${pageNumber} ===\n${currentPageText.slice(0, 3000)}`;

    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !['what', 'when', 'where', 'which', 'explain', 'summarize', 'about', 'paper', 'this'].includes(w));
    if (paperData.stateData?.paperMemory) {
      let otherPages = [];
      Object.entries(paperData.stateData.paperMemory).forEach(([pageNumStr, pageContent]) => {
        if (pageNumStr === pageNumber.toString()) return;
        const pageLower = pageContent.toLowerCase();
        const score = keywords.reduce((acc, kw) => acc + (pageLower.includes(kw) ? 1 : 0), 0);
        if (score > 0) otherPages.push({ pageNum: pageNumStr, content: pageContent, score });
      });
      otherPages.sort((a, b) => b.score - a.score);
      otherPages.slice(0, 2).forEach(p => {
        contextData += `\n\n=== RELEVANT CROSS-PAGE EXCERPT: PAGE ${p.pageNum} ===\n${p.content.slice(0, 1500)}`;
      });
    }

    const systemPrompt = `You are InsightLens Copilot, an elite academic research assistant. Answer strictly based on the document excerpts provided. Cite exact page numbers in brackets (e.g. [Page ${pageNumber}]) for evidence. Maintain scholarly clarity with concise headers, bold key points, and bulleted takeaways.`;

    try {
      const res = await fetch(`${BACKEND_URL}/api/research/swarm`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          query: formattedUserMsg,
          system: systemPrompt,
          context: contextData,
          image: currentSnipImage || null,
          quote: currentExcerpt && currentExcerpt !== '[Visual Element Extracted]' ? currentExcerpt : null,
          page: pageNumber
        }) 
      });
      if (res.ok) {
        const data = await res.json();
        const assistantMessage = { 
          role: 'assistant', 
          content: data.response || "No response received.",
          page: pageNumber
        };
        const updatedHistory = [...newHistory, assistantMessage];
        setChatHistory(updatedHistory);
        saveWorkspaceToDB(paperData, updatedHistory, annotations, paperNotes);
      } else {
        const errorMsg = { role: 'assistant', content: "Backend server returned an error.", page: pageNumber };
        setChatHistory([...newHistory, errorMsg]);
      }
    } catch (err) { 
      setChatHistory([...newHistory, { role: 'assistant', content: "Local AI execution pipeline offline.", page: pageNumber }]); 
    } finally { 
      setIsAgentTyping(false); 
      setActiveBase64Image(null); 
      setActiveSelectionText(""); 
      setAiResponseBuffer("");
    }
  };

  // --- SCI-SPACE RESEARCH NOTEBOOK HANDLERS ---
  const handleAddNote = async (noteData) => {
    const noteId = `note_${Date.now()}`;
    const newNote = {
      id: noteId,
      title: noteData.title || `Note (p. ${noteData.page || pageNumber})`,
      category: noteData.category || 'General',
      page: Number(noteData.page || pageNumber),
      quote: noteData.quote || "",
      image: noteData.image || null,
      insight: noteData.insight || "",
      text: noteData.text || "",
      createdAt: new Date().toISOString()
    };

    const updatedNotes = [newNote, ...paperNotes];
    setPaperNotes(updatedNotes);

    if (paperData) {
      const updatedWorkspace = {
        ...paperData,
        stateData: {
          ...(paperData.stateData || {}),
          notes: updatedNotes
        }
      };
      setPaperData(updatedWorkspace);
      saveWorkspaceToDB(updatedWorkspace, chatHistory, annotations, updatedNotes);
    }

    try {
      const uid = getCurrentUserId();
      const vaultPayload = {
        title: newNote.title || `Observation (p. ${newNote.page})`,
        source: paperData?.title || "InsightLens Document",
        page_number: newNote.page,
        text: newNote.text || newNote.quote || "Research observation",
        insight: newNote.insight || (newNote.quote ? `Quote: "${newNote.quote}"` : (newNote.category ? `Category: ${newNote.category}` : "")),
        image: newNote.image || null,
        user_id: uid,
        category: newNote.category || 'General',
        type: 'insight_lens'
      };
      const res = await fetch(`${BACKEND_URL}/api/vault/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vaultPayload)
      });
      if (res.ok) {
        fetchVaultNotes();
        window.dispatchEvent(new CustomEvent('vaultNotesUpdated', { detail: vaultPayload }));
      }
    } catch (e) {
      console.warn("Vault note sync error:", e);
    }

    setIsComposingNote(false);
    setNewNoteTitle('');
    setNewNoteText('');
    setNewNoteQuote('');
    setNewNoteImage(null);
  };

  const handleDeletePaperNote = async (noteId) => {
    const updatedNotes = paperNotes.filter(n => n.id !== noteId);
    setPaperNotes(updatedNotes);
    if (paperData) {
      const updatedWorkspace = {
        ...paperData,
        stateData: {
          ...(paperData.stateData || {}),
          notes: updatedNotes
        }
      };
      setPaperData(updatedWorkspace);
      saveWorkspaceToDB(updatedWorkspace, chatHistory, annotations, updatedNotes);
    }
  };

  const handleExportNotesMarkdown = () => {
    if (paperNotes.length === 0) return;
    const md = `# Research Notes: ${paperData?.title || 'Document'}\nExported: ${new Date().toLocaleString()}\n\n` +
      paperNotes.map((n, i) => {
        let block = `### ${i + 1}. ${n.title} [Page ${n.page}] (${n.category})\n`;
        if (n.quote) block += `> "${n.quote}"\n\n`;
        if (n.insight) block += `**AI Insight:**\n${n.insight}\n\n`;
        if (n.text) block += `**Observations:**\n${n.text}\n\n`;
        return block;
      }).join('---\n\n');

    navigator.clipboard.writeText(md);
    setExportFeedback(true);
    setTimeout(() => setExportFeedback(false), 2500);
  };

  const saveInsightAsNote = (category = 'Key Finding') => {
    handleAddNote({
      title: activeSelectionText ? `Excerpt Review (p. ${pageNumber})` : `Visual Snip (p. ${pageNumber})`,
      category: category,
      page: pageNumber,
      quote: activeSelectionText || "",
      image: activeBase64Image || null,
      insight: aiResponseBuffer,
      text: "Captured from Copilot targeted evaluation."
    });
    setActiveSelectionText("");
    setActiveBase64Image(null);
    setAiResponseBuffer("");
    setActiveRightTab('notebook');
  };

  const handleTranslateCurrentPage = async (targetLangKey = speechLanguage) => {
    const sourceText = paperData?.stateData?.paperMemory?.[pageNumber.toString()] || paperData?.pages?.[pageNumber - 1];
    if (!sourceText) return;

    setIsTranslating(true);
    const langMap = { 
      "en-US": "English", 
      "bn-BD": "Bengali", 
      "fr-FR": "French", 
      "es-ES": "Spanish", 
      "de-DE": "German", 
      "ja-JP": "Japanese",
      "zh-CN": "Chinese"
    };
    const targetLangName = langMap[targetLangKey] || targetLangKey;

    try {
      let translated = "";
      try {
        const resFast = await fetch(`${BACKEND_URL}/api/research/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            text: sourceText.slice(0, 3000), 
            target_lang: targetLangName.toLowerCase()
          })
        });
        if (resFast.ok) {
          const fastData = await resFast.json();
          translated = fastData.translated_text || fastData.translation || fastData.response || "";
        }
      } catch (e) {}

      if (!translated) {
        const res = await fetch(`${BACKEND_URL}/api/research/swarm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            query: `translate to ${targetLangName}: ${sourceText.slice(0, 3000)}`, 
            context: sourceText.slice(0, 3000)
          })
        });
        if (res.ok) {
          const data = await res.json();
          translated = data.translated_text || data.translation || data.response || "";
        }
      }

      setTranslatedStreamText(translated || "Translation completed.");
    } catch (e) {
      setTranslatedStreamText("Translation engine offline.");
    } finally {
      setIsTranslating(false);
    }
  };

  const stopAudio = () => {
    window.speechSynthesis.cancel();
    setAudioState({ isPlaying: false, isPaused: false, progress: 0, text: "" });
  };

  const toggleAudio = async () => {
    if (audioState.isPlaying) {
      if (audioState.isPaused) {
        window.speechSynthesis.resume();
        setAudioState(prev => ({ ...prev, isPaused: false, text: "Streaming reading narration..." }));
      } else {
        window.speechSynthesis.pause();
        setAudioState(prev => ({ ...prev, isPaused: true, text: "Paused." }));
      }
      return;
    }

    const sourceText = translatedStreamText || paperData?.stateData?.paperMemory?.[pageNumber.toString()];
    if (!sourceText) return;

    setAudioState({ isPlaying: true, isPaused: false, progress: 0, text: "Synthesizing speech stream..." });

    try {
      window.speechSynthesis.cancel();
      const textToSpeak = sourceText.slice(0, 3500);
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = speechLanguage; 
      utterance.rate = speechRate;

      try {
        const voices = window.speechSynthesis.getVoices();
        const langCode = speechLanguage.split('-')[0];
        const matchVoice = voices.find(v => v.lang.toLowerCase().startsWith(langCode));
        if (matchVoice) utterance.voice = matchVoice;
      } catch (err) {}

      utterance.onboundary = (e) => {
        setAudioState(prev => ({ 
          ...prev, 
          progress: Math.min(100, Math.round((e.charIndex / textToSpeak.length) * 100)) 
        }));
      };

      utterance.onend = () => {
        setAudioState({ isPlaying: false, isPaused: false, progress: 0, text: "" });
      };

      utterance.onerror = () => {
        setAudioState({ isPlaying: false, isPaused: false, progress: 0, text: "TTS playback ended." });
      };

      speechUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setAudioState({ isPlaying: true, isPaused: false, progress: 0, text: "Active audio reading stream..." });
    } catch (e) { 
      setAudioState({ isPlaying: false, isPaused: false, progress: 0, text: "TTS failure." }); 
    }
  };

  return (
    <>
      <style>{globalStyles}</style>
      
      {showManual && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-fadeIn">
          <div className={`${themeClasses.bgCard} p-6 md:p-8 max-w-3xl w-full shadow-2xl relative rounded-3xl border border-white/15 max-h-[90vh] overflow-y-auto custom-scrollbar`}>
            <button onClick={() => setShowManual(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <BookOpen size={20} />
              </div>
              <div>
                <h2 className="text-xl font-serif font-bold text-white tracking-tight">InsightLens Operator Manual</h2>
                <p className="text-xs font-mono text-slate-400">Multi-Page Synthesis, Citation Ledger & In-Situ WASM Pyodide Runtime</p>
              </div>
            </div>

            <div className="space-y-4 font-sans text-xs">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                <h3 className="font-bold text-sm text-cyan-300 flex items-center gap-2 mb-2 font-mono">
                  <FileText size={15} /> 1. Viewport & Multi-Mode Marking
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Switch between <strong>Read</strong> (selection & text query), <strong>Snip</strong> (bounding box visual OCR), 
                  <strong>Mark</strong> (vector highlighting), and <strong>Draw</strong> (freehand ink with undo/redo and eraser).
                  All annotations and drawings are permanently persisted to PostgreSQL per-paper JSONB state.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                <h3 className="font-bold text-sm text-emerald-300 flex items-center gap-2 mb-2 font-mono">
                  <BookMarked size={15} /> 2. SciSpace Research Notebook & Citations
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Extract precision study notes, capture verbatim text selections with source attribution, and export formatted academic citations 
                  (BibTeX, APA, IEEE, Chicago) with 1-click clipboard copy or <code className="text-emerald-400">.bib</code> file download.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                <h3 className="font-bold text-sm text-indigo-300 flex items-center gap-2 mb-2 font-mono">
                  <Code2 size={15} /> 3. PyTorch Synthesizer & Client WASM Sandbox
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Automatically extracts algorithmic formulations from paper mathematics into runnable <code className="text-indigo-300">nn.Module</code> PyTorch code.
                  Launch the in-situ <strong>Pyodide WebAssembly Sandbox</strong> to test numerical calculations directly in your browser without external server calls.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                <h3 className="font-bold text-sm text-amber-300 flex items-center gap-2 mb-2 font-mono">
                  <GraduationCap size={15} /> 4. Active Recall Concept Flashcards
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Generate concept flashcards with definitions and formulas directly from manuscript content. 
                  Track learning progression across 3 mastery stages (Review, Learning, Mastered) with zero cloud data leakage.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
              <button onClick={() => setShowManual(false)} className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs transition-all shadow-lg cursor-pointer">
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-full w-full bg-transparent overflow-hidden font-sans relative select-none">
        {/* LEFT SIDEBAR */}
        <div className="relative flex h-full z-20">
          <div className={`h-full transition-all duration-300 ease-in-out overflow-hidden border-r ${isLight ? 'border-slate-200 bg-white/50' : 'border-white/10 bg-black/40'} ${isLeftOpen ? 'w-80' : 'w-0'}`}>
            <div className="w-80 h-full flex flex-col overflow-hidden">
              <div className={`p-2 border-b flex items-center justify-between gap-1 flex-shrink-0 ${isLight ? 'border-slate-200 bg-black/5' : 'border-white/10 bg-black/60'}`}>
                <div className="flex flex-1 gap-1">
                  <button 
                    onClick={() => { setLeftSidebarTab('ledger'); fetchSavedSessions(); }} 
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest ${leftSidebarTab==='ledger'?'bg-white/10 text-white font-bold':'text-slate-500 hover:bg-white/5 transition-colors'}`}
                  >
                    Ledger
                  </button>
                  <button 
                    onClick={() => setLeftSidebarTab('index')} 
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest ${leftSidebarTab==='index'?'bg-white/10 text-white font-bold':'text-slate-500 hover:bg-white/5 transition-colors'}`}
                  >
                    Structure
                  </button>
                  <button 
                    onClick={() => setLeftSidebarTab('thumbnails')} 
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest ${leftSidebarTab==='thumbnails'?'bg-white/10 text-white font-bold':'text-slate-500 hover:bg-white/5 transition-colors'}`}
                  >
                    Pages
                  </button>
                  <button 
                    onClick={() => { setLeftSidebarTab('vault'); loadFromVault(); }} 
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest ${leftSidebarTab==='vault'?'bg-white/10 text-white font-bold':'text-slate-500 hover:bg-white/5 transition-colors'}`}
                  >
                    Vault
                  </button>
                </div>
                <button
                  onClick={() => setIsLeftOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors ml-1"
                  title="Collapse Structure Sidebar"
                >
                  <PanelLeftClose size={14} />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                {leftSidebarTab === 'ledger' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Document Ledgers</span>
                      <button onClick={handleStartFreshDocument} className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 hover:text-emerald-300 uppercase font-bold cursor-pointer">
                        <Plus size={12} /> New Session
                      </button>
                    </div>

                    {/* Case-insensitive Ledger Search */}
                    <div className="relative mb-3">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={ledgerSearchQuery}
                        onChange={e => setLedgerSearchQuery(e.target.value)}
                        placeholder="Search document ledgers..."
                        className="w-full pl-7 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-[11px] font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>

                    {sessionHistory.filter(s => (s.title || '').toLowerCase().includes(ledgerSearchQuery.toLowerCase())).length === 0 ? (
                      <p className="text-xs text-slate-500 text-center mt-4">No matching document ledgers found.</p>
                    ) : (
                      sessionHistory
                        .filter(s => (s.title || '').toLowerCase().includes(ledgerSearchQuery.toLowerCase()))
                        .map(s => (
                        <div 
                          key={s.id} 
                          onClick={() => handleSelectLedgerSession(s)} 
                          className={`p-3.5 border rounded-xl cursor-pointer transition-all relative group ${paperData?.id === s.id ? `${themeClasses.accentBorder} bg-black/40 shadow-lg` : 'border-white/5 bg-white/[0.01] hover:border-white/15'}`}
                        >
                          <div className="flex items-center justify-between w-full mb-1">
                            <h4 className="text-xs font-bold text-white truncate max-w-[170px]">{s.title}</h4>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => { e.stopPropagation(); togglePinSession(s.id); }} 
                                className={`p-1 rounded hover:bg-white/10 ${s.isPinned ? 'text-emerald-400' : 'text-slate-400'}`}
                                title="Pin Ledger"
                              >
                                <Pin size={12} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newName = prompt("Rename Document Ledger:", s.title);
                                  if (newName && newName.trim()) renameSession(s.id, newName.trim());
                                }} 
                                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                                title="Rename Ledger"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Delete ledger '${s.title}' permanently?`)) deleteSession(s.id);
                                }} 
                                className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                                title="Delete Ledger"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            {s.isPinned && <Pin className="text-emerald-400 absolute top-3 right-3 group-hover:hidden" size={10} />}
                          </div>
                          <div className="flex items-center gap-2 text-[9px] font-mono text-slate-500">
                            <span>{s.lastAccessed ? s.lastAccessed.substring(0, 10) : s.timestamp}</span>
                            <span>•</span>
                            <span>{s.chatHistory?.length || 0} Chats</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {leftSidebarTab === 'index' && paperData && (
                  <div className="space-y-1 mt-2">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold block px-1 mb-3">Extracted Chapters</span>
                    {paperData.stateData?.sections?.map((sec, idx) => (
                      <button key={idx} onClick={() => setPageNumber(sec.page)} className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex justify-between transition-all ${pageNumber === sec.page ? 'bg-black/20 font-bold border border-white/10 text-white' : 'text-slate-500 hover:bg-black/10 hover:text-white'}`}>
                        <span className="truncate pr-2">{sec.title}</span><span className="opacity-50 font-mono">P.{sec.page}</span>
                      </button>
                    ))}
                  </div>
                )}

                {leftSidebarTab === 'thumbnails' && pdfFile && (
                  <div className="flex flex-col items-center gap-4">
                    <Document file={pdfFile}>
                      {Array.from(new Array(paperData?.totalPages || 0), (el, index) => (
                        <div key={index} onClick={() => setPageNumber(index + 1)} className={`relative mb-2 p-1 border-2 rounded-lg cursor-pointer transition-all ${pageNumber === index + 1 ? `${themeClasses.accentBorder} bg-black/20` : 'border-transparent hover:border-white/10'}`}>
                          <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 font-bold">{index + 1}</span>
                          <Page pageNumber={index + 1} renderAnnotationLayer={false} renderTextLayer={false} width={120} />
                        </div>
                      ))}
                    </Document>
                  </div>
                )}

                {leftSidebarTab === 'vault' && (
                  <div className="space-y-2">
                    {vaultFiles.map(file => (
                      <div key={file.id} onClick={() => handleVaultFileSelect(file)} className="p-4 bg-white/[0.01] border border-white/5 hover:border-white/30 rounded-xl cursor-pointer transition-all group">
                        <div className="flex items-start gap-3">
                          <CloudDownload size={15} className={`text-slate-500 group-hover:${themeClasses.accentText} mt-0.5 flex-shrink-0`} />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-300 group-hover:text-white truncate">{file.title}</h4>
                            <p className="text-[9px] font-mono text-slate-600 mt-0.5">{file.date}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CENTER VIEWPORT */}
        <div className="flex-grow flex flex-col relative min-w-0 h-full bg-transparent">
          <div className={`h-14 border-b flex items-center justify-between px-4 sm:px-6 z-10 flex-shrink-0 backdrop-blur-md ${isLight ? 'border-slate-200 bg-white/50' : 'border-white/10 bg-black/40'}`}>
            <div className="flex items-center gap-3 min-w-0">
              {!isLeftOpen && (
                <button
                  onClick={() => setIsLeftOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-cyan-400 hover:bg-cyan-500/20 text-xs font-mono flex items-center gap-1.5 transition-all shadow shrink-0 cursor-pointer"
                  title="Expand Structure & Ledger Sidebar"
                >
                  <PanelLeftOpen size={14} />
                  <span className="hidden sm:inline text-[11px] font-bold">Ledger</span>
                </button>
              )}
              <span className="font-serif text-sm uppercase tracking-widest truncate">{paperData?.title || "InsightLens"}</span>
            </div>
            
            {paperData && (
              <div className="hidden lg:flex items-center gap-3 bg-black/20 rounded-lg p-1 border border-white/5 text-[10px] font-mono uppercase">
                <button onClick={() => setInteractionMode('read')} className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${interactionMode === 'read' ? 'bg-white/10 text-white shadow' : 'text-slate-400 hover:text-white'}`}><BookOpen size={12} /> Read</button>
                <button onClick={() => setInteractionMode('crop')} className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${interactionMode === 'crop' ? 'bg-white/10 text-white shadow' : 'text-slate-400 hover:text-white'}`}><Crop size={12} /> Snip</button>
                <div className="w-px h-4 bg-white/10 mx-1 self-center"></div>
                <button onClick={() => {setInteractionMode('highlight'); setActiveColor('#eab308');}} className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${interactionMode === 'highlight' ? 'bg-white/10 text-white shadow' : 'text-slate-400 hover:text-white'}`}><Highlighter size={12} /> Mark</button>
                <button onClick={() => {setInteractionMode('draw'); setActiveColor('#ef4444');}} className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${interactionMode === 'draw' ? 'bg-white/10 text-white shadow' : 'text-slate-400 hover:text-white'}`}><PenTool size={12} /> Draw</button>
                
                {(interactionMode === 'draw' || interactionMode === 'highlight') && (
                  <div className="flex items-center gap-1 ml-2 pl-2 border-l border-white/10">
                    <input type="color" value={activeColor} onChange={e=>setActiveColor(e.target.value)} className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"/>
                    <button onClick={()=>undoAnnotation(pageNumber)} className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded"><Undo2 size={12} /></button>
                    <button onClick={()=>redoAnnotation(pageNumber)} className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded"><Redo2 size={12} /></button>
                    <button onClick={()=>eraseAnnotations(pageNumber)} className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"><Eraser size={12} /></button>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-2 sm:gap-3">
              {paperData && (
                <div className="flex items-center gap-2 text-xs font-mono bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                  <button onClick={() => setScale(s => Math.max(0.6, s - 0.1))} className="hover:text-white text-slate-400"><ZoomOut size={13} /></button>
                  <span className="w-10 text-center opacity-80">{Math.round(scale * 100)}%</span>
                  <button onClick={() => setScale(s => Math.min(2.5, s + 0.1))} className="hover:text-white text-slate-400"><ZoomIn size={13} /></button>
                  <div className="w-px h-3 bg-white/10 mx-1"></div>
                  <button disabled={pageNumber<=1} onClick={()=>setPageNumber(p=>p-1)} className="hover:text-white disabled:opacity-20 text-slate-400"><ChevronLeft size={14} /></button>
                  <span className="opacity-80">{pageNumber} / {paperData.totalPages}</span>
                  <button disabled={pageNumber>=paperData.totalPages} onClick={()=>setPageNumber(p=>p+1)} className="hover:text-white disabled:opacity-20 text-slate-400"><ChevronRight size={14} /></button>
                </div>
              )}
              {paperData && (
                <button 
                  onClick={handleOpenCiteModal}
                  className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all bg-teal-500/15 border border-teal-500/30 text-teal-300 hover:bg-teal-500/25 font-mono text-[10px] uppercase font-bold tracking-wider cursor-pointer"
                  title="Export Citation (BibTeX, APA, IEEE, Chicago)"
                >
                  <FileText size={12} />
                  <span className="hidden sm:inline">Cite</span>
                </button>
              )}
              <button onClick={() => setShowManual(true)} className="text-slate-400 hover:text-white bg-white/5 p-2 rounded-lg transition-colors cursor-pointer" title="View Manual">
                <Info size={16} />
              </button>
              {!isRightOpen && paperData && (
                <button
                  onClick={() => setIsRightOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-cyan-400 hover:bg-cyan-500/20 text-xs font-mono flex items-center gap-1.5 transition-all shadow shrink-0 cursor-pointer"
                  title="Expand Copilot Sidebar"
                >
                  <PanelRightOpen size={14} />
                  <span className="hidden sm:inline text-[11px] font-bold">Copilot</span>
                </button>
              )}
            </div>
          </div>

          <div 
            className="flex-grow overflow-y-auto p-8 flex flex-col items-center custom-scrollbar select-text bg-transparent" 
            onMouseUp={handleNativeSelection}
            onWheel={(e) => {
              if (!paperData) return;
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 0.1 : -0.1;
                setScale(s => Math.min(2.5, Math.max(0.6, Number((s + delta).toFixed(2)))));
              }
            }}
          >
            {isGenerating && (
              <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 bg-black/90 p-8 rounded-3xl border border-white/10 z-50 shadow-2xl backdrop-blur-md">
                 <RefreshCw size={32} className={`${themeClasses.accentText} animate-spin`} />
                 <span className={`text-xs font-mono uppercase ${themeClasses.accentText} tracking-widest`}>{status} ({pipelineProgress}%)</span>
              </div>
            )}

            {/* DOCUMENT CANVAS / NATIVE PDF RENDER */}
            {!pdfFile ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-12 max-w-lg">
                <div className="p-8 border border-white/10 rounded-3xl bg-black/40 backdrop-blur-xl shadow-2xl flex flex-col items-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500"></div>
                  <BookOpen size={48} className="text-slate-600 mb-6" />
                  <h3 className="text-lg font-serif text-white mb-2">No Manuscript Ingested</h3>
                  <p className="text-xs text-slate-400 font-light mb-6 leading-relaxed">
                    Upload an academic paper (PDF) to initiate document parsing, semantic indexing, AST extraction, and continuous multi-page reading.
                  </p>
                  
                  <label className="cursor-pointer">
                    <input 
                      type="file" 
                      accept="application/pdf" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setPdfFile(file);
                          setPageNumber(1);
                          executeExtractionPipeline(file);
                        }
                      }}
                    />
                    <span className={`px-6 py-3 rounded-xl font-mono text-xs uppercase tracking-widest text-white transition-all shadow-lg flex items-center gap-2 ${themeClasses.accentBg}`}>
                      <UploadCloud size={16} /> Mount PDF Stream
                    </span>
                  </label>
                  
                  <div className="flex justify-center gap-4 mt-6 opacity-40">
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><BrainCircuit size={11} /> Chained RAG</span>
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Volume2 size={11} /> Audio Stream</span>
                  </div>
                </div>
              </div>
            ) : (
              <div ref={pdfWrapperRef} className="relative" onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp}>
                <Document file={pdfFile} className="pdf-render-canvas-viewport">
                  <Page pageNumber={pageNumber} scale={scale} renderTextLayer={true} renderAnnotationLayer={false} />
                </Document>
                <canvas ref={annotationCanvasRef} className="absolute top-0 left-0 w-full h-full z-20 mix-blend-normal" style={{ pointerEvents: interactionMode === 'read' ? 'none' : 'auto' }}/>
                {isDrawingCrop && (
                  <div className={`absolute border border-dashed bg-opacity-10 z-50 pointer-events-none ${themeClasses.accentBorder} ${themeClasses.accentBg}`} style={{ left: Math.min(cropStart.x, cropCurrent.x), top: Math.min(cropStart.y, cropCurrent.y), width: Math.abs(cropCurrent.x - cropStart.x), height: Math.abs(cropCurrent.y - cropStart.y) }}/>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        {paperData && (
          <div className="relative flex h-full z-20">
            <div className={`h-full transition-all duration-300 ease-in-out overflow-hidden border-l ${isLight ? 'border-slate-200 bg-white/70' : 'border-white/10 bg-black/40'} ${isRightOpen ? 'w-[390px]' : 'w-0'}`}>
              <div className="w-[390px] h-full flex flex-col overflow-hidden">
                <div className={`p-1.5 border-b flex items-center flex-shrink-0 gap-1 ${isLight ? 'border-slate-200 bg-slate-100/80' : 'border-white/10 bg-black/60'}`}>
                  <button onClick={() => setActiveRightTab('copilot')} className={`flex-1 py-1.5 flex justify-center items-center gap-1 rounded-lg text-[9px] font-mono uppercase tracking-widest transition-all ${activeRightTab==='copilot' ? (isLight ? 'bg-white text-slate-900 font-bold shadow-sm' : 'bg-white/10 text-white font-bold shadow') : (isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-black/5' : 'text-slate-400 hover:text-white hover:bg-white/5')}`}><MessageSquare size={11} /> Chat</button>
                  <button onClick={() => setActiveRightTab('notebook')} className={`flex-1 py-1.5 flex justify-center items-center gap-1 rounded-lg text-[9px] font-mono uppercase tracking-widest transition-all ${activeRightTab==='notebook' ? (isLight ? 'bg-white text-slate-900 font-bold shadow-sm' : 'bg-white/10 text-white font-bold shadow') : (isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-black/5' : 'text-slate-400 hover:text-white hover:bg-white/5')}`}>
                    <BookMarked size={11} /> Notes {paperNotes.length > 0 && <span className="bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded-full text-[8px] font-bold">{paperNotes.length}</span>}
                  </button>
                  <button onClick={() => setActiveRightTab('flashcards')} className={`flex-1 py-1.5 flex justify-center items-center gap-1 rounded-lg text-[9px] font-mono uppercase tracking-widest transition-all ${activeRightTab==='flashcards' ? (isLight ? 'bg-white text-slate-900 font-bold shadow-sm' : 'bg-white/10 text-white font-bold shadow') : (isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-black/5' : 'text-slate-400 hover:text-white hover:bg-white/5')}`}><GraduationCap size={11} /> Study</button>
                  <button onClick={() => setActiveRightTab('code')} className={`flex-1 py-1.5 flex justify-center items-center gap-1 rounded-lg text-[9px] font-mono uppercase tracking-widest transition-all ${activeRightTab==='code' ? (isLight ? 'bg-white text-slate-900 font-bold shadow-sm' : 'bg-white/10 text-white font-bold shadow') : (isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-black/5' : 'text-slate-400 hover:text-white hover:bg-white/5')}`}><Code2 size={11} /> PyTorch</button>
                  <button onClick={() => setActiveRightTab('audio')} className={`flex-1 py-1.5 flex justify-center items-center gap-1 rounded-lg text-[9px] font-mono uppercase tracking-widest transition-all ${activeRightTab==='audio' ? (isLight ? 'bg-white text-slate-900 font-bold shadow-sm' : 'bg-white/10 text-white font-bold shadow') : (isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-black/5' : 'text-slate-400 hover:text-white hover:bg-white/5')}`}><Volume2 size={11} /> Audio</button>
                </div>

                <div className="flex-grow overflow-y-auto p-4 custom-scrollbar flex flex-col">
                  {/* COPILOT TAB */}
                  {activeRightTab === 'copilot' && (
                    <>
                      {/* Suggested Review Questions */}
                      {paperData?.stateData?.smartQuestions && chatHistory.length === 0 && !activeSelectionText && !activeBase64Image && (
                        <div className="mb-4 space-y-2 animate-fadeIn">
                          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold flex items-center gap-1.5 mb-2">
                            <BrainCircuit size={12}/> Suggested Review Questions
                          </span>
                          {paperData.stateData.smartQuestions.map((q, idx) => (
                            <button key={idx} onClick={() => handleChatSubmit(null, q)} className="w-full text-left p-3 bg-black/30 hover:bg-white/5 border border-white/5 hover:border-emerald-500/30 rounded-xl text-xs text-slate-300 transition-colors">
                              {q}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* SciSpace Quick Prompt Chips */}
                      {chatHistory.length > 0 && (
                        <div className="mb-3 pb-2 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto hide-scrollbar flex-shrink-0">
                          <button onClick={() => handleChatSubmit(null, "ELI5: Deconstruct and explain the core mechanism of this paper in simple, intuitive terms with an everyday analogy")} className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[9px] font-mono uppercase tracking-wider rounded-lg whitespace-nowrap border border-emerald-500/20 font-bold">
                            🎓 ELI5 Deconstruct
                          </button>
                          <button onClick={() => handleChatSubmit(null, "Summarize the core novelty and empirical contributions of this paper")} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 text-[9px] font-mono uppercase tracking-wider rounded-lg whitespace-nowrap border border-white/5">
                            📌 Novelty & Summary
                          </button>
                          <button onClick={() => handleChatSubmit(null, `Explain the methodology and technical architecture discussed around page ${pageNumber}`)} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 text-[9px] font-mono uppercase tracking-wider rounded-lg whitespace-nowrap border border-white/5">
                            🔬 Methods (p.{pageNumber})
                          </button>
                          <button onClick={() => handleChatSubmit(null, "Identify limitations, assumptions, and theoretical bottlenecks")} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 text-[9px] font-mono uppercase tracking-wider rounded-lg whitespace-nowrap border border-white/5">
                            ⚠️ Bottlenecks
                          </button>
                        </div>
                      )}

                      {/* Targeted Selection & Visual Snippet Card */}
                      {(activeSelectionText || activeBase64Image) && (
                        <div className="mb-4 bg-black/40 border border-white/10 p-4 rounded-xl shadow-lg animate-fadeIn select-none">
                          <div className="flex justify-between items-center mb-3">
                            <span className={`text-[10px] font-mono uppercase tracking-widest font-bold ${themeClasses.accentText}`}>Targeted Excerpt (p. {pageNumber})</span>
                            <button onClick={()=>{setActiveSelectionText(""); setActiveBase64Image(null); setAiResponseBuffer("");}} className="bg-white/5 p-1 rounded-full hover:bg-white/10">
                              <X size={11} className="text-slate-400" />
                            </button>
                          </div>
                          
                          {activeBase64Image ? (
                            <img src={`data:image/jpeg;base64,${activeBase64Image}`} alt="Crop Frame" className="w-full rounded-lg border border-white/10 mb-3 shadow-inner max-h-48 object-contain bg-black/50"/>
                          ) : (
                            <div className="bg-black/40 p-3 rounded-lg border border-white/5 mb-3 max-h-24 overflow-y-auto custom-scrollbar">
                              <p className={`text-xs font-serif italic text-slate-300 border-l-2 pl-2 select-text ${themeClasses.accentBorder}`}>"{activeSelectionText}"</p>
                            </div>
                          )}

                          {!aiResponseBuffer && !isAiEvaluating ? (
                            <div className="grid grid-cols-3 gap-1.5">
                              <button onClick={()=>executeContextQuery(activeSelectionText, activeBase64Image ? "Explain this figure/table visual crop in detail. What are the key observations, axes, and takeaways?" : "Explain this academic excerpt and its core implication.")} className="py-2 bg-white/5 hover:bg-white/10 text-[10px] font-bold font-mono uppercase text-slate-300 rounded-lg border border-white/5 transition-all flex items-center justify-center gap-1">
                                <Sparkles size={11} className="text-cyan-400"/> Explain
                              </button>
                              <button onClick={()=>executeContextQuery(activeSelectionText, activeBase64Image ? "Critique this visual data/table crop. Are the baselines fair, bounds validated, and metrics reproducible?" : "Critique the methodology, validity, and potential bottlenecks.")} className="py-2 bg-white/5 hover:bg-white/10 text-[10px] font-bold font-mono uppercase text-slate-300 rounded-lg border border-white/5 transition-all flex items-center justify-center gap-1">
                                <AlertCircle size={11} className="text-amber-400"/> Critique
                              </button>
                              <button onClick={() => {
                                setNewNoteQuote(activeSelectionText || "");
                                setNewNoteImage(activeBase64Image || null);
                                setNewNotePage(pageNumber);
                                setNewNoteTitle(`Excerpt (p. ${pageNumber})`);
                                setIsComposingNote(true);
                                setActiveRightTab('notebook');
                              }} className="py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-[10px] font-bold font-mono uppercase text-emerald-400 rounded-lg border border-emerald-500/20 transition-all flex items-center justify-center gap-1">
                                <BookmarkPlus size={11}/> Note
                              </button>
                            </div>
                          ) : (
                            <div className="bg-black/50 p-3.5 rounded-xl border border-white/10 mt-1">
                              {isAiEvaluating ? (
                                <div className={`text-[10px] font-mono tracking-widest uppercase animate-pulse flex items-center gap-2 ${themeClasses.accentText}`}>
                                  <RefreshCw size={11} className="animate-spin"/> Evaluating Excerpt...
                                </div>
                              ) : (
                                <>
                                  <div className="prose prose-invert max-w-none text-xs leading-relaxed select-text space-y-1.5 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-emerald-400 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:text-emerald-300 mb-3">
                                    <ReactMarkdown rehypePlugins={[rehypeKatexOptions]} remarkPlugins={[remarkMath]}>
                                      {aiResponseBuffer}
                                    </ReactMarkdown>
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => saveInsightAsNote('Key Finding')} className="flex-1 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] uppercase tracking-widest font-bold font-mono rounded-lg flex justify-center items-center gap-1.5 border border-emerald-500/30 transition-all">
                                      <BookmarkPlus size={12} /> Pin to Notes
                                    </button>
                                    <button onClick={() => { navigator.clipboard.writeText(aiResponseBuffer); }} className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-mono rounded-lg border border-white/10">
                                      <Copy size={12}/>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Chat Messages */}
                      <div className="flex-grow space-y-3">
                        {chatHistory.map((msg, i) => (
                          <div key={i} className={`p-4 rounded-2xl border ${msg.role === 'user' ? (isLight ? 'bg-slate-100 border-slate-200 ml-3' : 'bg-black/30 border-white/10 ml-3') : (isLight ? 'bg-white border-slate-200 mr-2 shadow-sm' : 'bg-black/10 border-white/10 mr-2 shadow-sm')}`}>
                            <div className="text-[9px] font-mono uppercase tracking-widest mb-1.5 flex items-center justify-between opacity-60">
                              <span>{msg.role === 'user' ? 'You' : 'InsightLens Copilot'}</span>
                              {msg.role !== 'user' && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      handleAddNote({
                                        title: `Copilot Insight (p. ${msg.page || pageNumber})`,
                                        category: 'AI Insight',
                                        page: msg.page || pageNumber,
                                        insight: msg.content,
                                        text: 'Pinned from Copilot discussion.'
                                      });
                                      setActiveRightTab('notebook');
                                    }}
                                    className="hover:text-emerald-400 flex items-center gap-1 text-[9px] font-mono normal-case"
                                    title="Pin to Notes"
                                  >
                                    <BookmarkPlus size={11} /> Save to Notes
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(msg.content);
                                      setCopiedChatIdx(i);
                                      setTimeout(() => setCopiedChatIdx(null), 2000);
                                    }}
                                    className="hover:text-emerald-400 flex items-center gap-1 text-[9px] font-mono normal-case"
                                    title="Copy response"
                                  >
                                    {copiedChatIdx === i ? <Check size={11} className="text-emerald-400"/> : <Copy size={11}/>}
                                  </button>
                                </div>
                              )}
                            </div>
                            {msg.image && <img src={`data:image/jpeg;base64,${msg.image}`} alt="Attachment" className="w-full rounded-lg mb-2.5 border border-white/10 shadow-md max-h-48 object-contain"/>}
                            {msg.role === 'user' ? (
                              <p className={`text-xs font-light whitespace-pre-wrap leading-relaxed select-text ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{msg.content}</p>
                            ) : (
                              <div className={`prose ${isLight ? 'prose-slate text-slate-800' : 'prose-invert text-slate-200'} max-w-none text-xs leading-relaxed select-text [&_h3]:text-xs [&_h3]:font-bold [&_h3]:font-mono [&_h3]:text-emerald-500 [&_h3]:mb-2 [&_h3]:mt-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 [&_strong]:text-emerald-400 [&_p]:mb-2`}>
                                <ReactMarkdown rehypePlugins={[rehypeKatexOptions]} remarkPlugins={[remarkMath]}>
                                  {msg.content}
                                </ReactMarkdown>
                              </div>
                            )}
                          </div>
                        ))}
                        {isAgentTyping && <div className={`text-[10px] font-mono animate-pulse ml-1 flex items-center gap-2 ${themeClasses.accentText}`}><RefreshCw size={11} className="animate-spin"/> Evaluating multi-page context...</div>}
                      </div>
                    </>
                  )}

                  {/* SCISPACE RESEARCH NOTEBOOK TAB */}
                  {activeRightTab === 'notebook' && (
                    <div className="space-y-3.5 select-none flex-grow flex flex-col">
                      {/* Notebook Control Bar */}
                      <div className={`p-3 border rounded-2xl flex items-center justify-between ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-black/30 border-white/10'}`}>
                        <div>
                          <div className={`text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            <BookMarked size={14} className="text-emerald-500"/> Research Notebook
                          </div>
                          <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                            {paperNotes.length} notes total • {paperNotes.filter(n => n.page === pageNumber).length} on p.{pageNumber}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={handleExportNotesMarkdown}
                            className={`px-2.5 py-1.5 border rounded-lg text-[9px] font-mono uppercase tracking-wider flex items-center gap-1 transition-colors ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'}`}
                            title="Copy all notes as formatted academic Markdown"
                          >
                            {exportFeedback ? <Check size={11} className="text-emerald-500"/> : <Download size={11}/>}
                            {exportFeedback ? "Copied" : "Export"}
                          </button>
                          <button
                            onClick={() => {
                              setIsComposingNote(!isComposingNote);
                              setNewNotePage(pageNumber);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase font-bold tracking-wider flex items-center gap-1 transition-all ${isComposingNote ? 'bg-emerald-500 text-black' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'}`}
                          >
                            <Plus size={12}/> Note
                          </button>
                        </div>
                      </div>

                      {/* Category Filter Pills */}
                      <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar pb-1 flex-shrink-0">
                        {['All', 'Key Finding', 'Methodology', 'Result', 'Limitation', 'AI Insight', 'General'].map(cat => (
                          <button
                            key={cat}
                            onClick={() => setActiveNoteCategory(cat)}
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider whitespace-nowrap transition-colors border ${
                              activeNoteCategory === cat
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                                : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      {/* Note Search */}
                      <div className="flex items-center bg-black/20 border border-white/10 rounded-xl px-2.5 py-1.5 focus-within:border-emerald-500/40 transition-colors">
                        <Search size={12} className="text-slate-500 mr-2 shrink-0"/>
                        <input
                          type="text"
                          value={noteSearchQuery}
                          onChange={(e) => setNoteSearchQuery(e.target.value)}
                          placeholder="Search notebook entries..."
                          className="bg-transparent text-xs text-white outline-none w-full font-mono placeholder:text-slate-600"
                        />
                        {noteSearchQuery && (
                          <button onClick={() => setNoteSearchQuery('')} className="text-slate-500 hover:text-white">
                            <X size={12}/>
                          </button>
                        )}
                      </div>

                      {/* Inline Note Composer */}
                      {isComposingNote && (
                        <div className="p-4 bg-black/50 border border-emerald-500/30 rounded-2xl space-y-3 animate-fadeIn shadow-2xl">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5">
                              <Edit3 size={12}/> Compose Note
                            </span>
                            <button onClick={() => setIsComposingNote(false)} className="text-slate-500 hover:text-white">
                              <X size={13}/>
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                              <input
                                type="text"
                                value={newNoteTitle}
                                onChange={(e) => setNewNoteTitle(e.target.value)}
                                placeholder="Note title..."
                                className="w-full p-2 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-white outline-none focus:border-emerald-500/50"
                              />
                            </div>
                            <div>
                              <select
                                value={newNoteCategory}
                                onChange={(e) => setNewNoteCategory(e.target.value)}
                                className="w-full p-2 bg-[#0d0d0d] border border-white/10 rounded-xl text-xs font-mono text-slate-300 outline-none cursor-pointer"
                              >
                                <option value="Key Finding">Key Finding</option>
                                <option value="Methodology">Methodology</option>
                                <option value="Result">Result</option>
                                <option value="Limitation">Limitation</option>
                                <option value="AI Insight">AI Insight</option>
                                <option value="General">General</option>
                              </select>
                            </div>
                          </div>

                          {/* Quote Attachment */}
                          {newNoteQuote && (
                            <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 relative group">
                              <div className="text-[8px] font-mono text-emerald-400 uppercase tracking-widest mb-1 flex justify-between">
                                <span>Attached Quote (p.{newNotePage})</span>
                                <button onClick={() => setNewNoteQuote('')} className="hover:text-red-400"><X size={10}/></button>
                              </div>
                              <p className="text-xs font-serif italic text-slate-300 leading-relaxed border-l pl-2 border-emerald-500">"{newNoteQuote}"</p>
                            </div>
                          )}

                          {/* Image Attachment */}
                          {newNoteImage && (
                            <div className="p-2 bg-black/40 rounded-xl border border-white/5 relative">
                              <div className="text-[8px] font-mono text-emerald-400 uppercase tracking-widest mb-1 flex justify-between">
                                <span>Attached Snippet (p.{newNotePage})</span>
                                <button onClick={() => setNewNoteImage(null)} className="hover:text-red-400"><X size={10}/></button>
                              </div>
                              <img src={`data:image/jpeg;base64,${newNoteImage}`} alt="Snippet" className="max-h-24 rounded object-contain"/>
                            </div>
                          )}

                          <textarea
                            rows="3"
                            value={newNoteText}
                            onChange={(e) => setNewNoteText(e.target.value)}
                            placeholder="Add your synthesis, experimental observations, or critique..."
                            className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-sans text-white outline-none resize-none focus:border-emerald-500/50"
                          />

                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                              <span>Page:</span>
                              <input
                                type="number"
                                min="1"
                                max={paperData?.totalPages || 1}
                                value={newNotePage}
                                onChange={(e) => setNewNotePage(Number(e.target.value))}
                                className="w-12 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-center text-xs font-mono text-white"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setIsComposingNote(false)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-mono rounded-lg">Cancel</button>
                              <button
                                onClick={() => handleAddNote({
                                  title: newNoteTitle.trim() || `Observation (p. ${newNotePage})`,
                                  category: newNoteCategory,
                                  page: newNotePage,
                                  quote: newNoteQuote,
                                  image: newNoteImage,
                                  text: newNoteText
                                })}
                                disabled={!newNoteText.trim() && !newNoteQuote && !newNoteImage}
                                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold font-mono text-xs uppercase tracking-wider rounded-lg disabled:opacity-40"
                              >
                                Save Note
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SciSpace Note Cards List */}
                      <div className="space-y-2.5 flex-grow overflow-y-auto custom-scrollbar select-text pr-1">
                        {paperNotes
                          .filter(n => activeNoteCategory === 'All' || n.category === activeNoteCategory)
                          .filter(n => !noteSearchQuery.trim() || (
                            (n.title && n.title.toLowerCase().includes(noteSearchQuery.toLowerCase())) ||
                            (n.text && n.text.toLowerCase().includes(noteSearchQuery.toLowerCase())) ||
                            (n.quote && n.quote.toLowerCase().includes(noteSearchQuery.toLowerCase())) ||
                            (n.insight && n.insight.toLowerCase().includes(noteSearchQuery.toLowerCase()))
                          ))
                          .length === 0 ? (
                            <div className="text-center py-12 text-slate-500 text-xs font-mono">
                              No notes in this view. Click "+ Note" or highlight document text to clip observations.
                            </div>
                          ) : (
                            paperNotes
                              .filter(n => activeNoteCategory === 'All' || n.category === activeNoteCategory)
                              .filter(n => !noteSearchQuery.trim() || (
                                (n.title && n.title.toLowerCase().includes(noteSearchQuery.toLowerCase())) ||
                                (n.text && n.text.toLowerCase().includes(noteSearchQuery.toLowerCase())) ||
                                (n.quote && n.quote.toLowerCase().includes(noteSearchQuery.toLowerCase())) ||
                                (n.insight && n.insight.toLowerCase().includes(noteSearchQuery.toLowerCase()))
                              ))
                              .map(note => (
                                <div
                                  key={note.id}
                                  className={`p-3.5 border rounded-2xl shadow-sm relative group transition-all ${isLight ? 'bg-white border-slate-200 hover:border-slate-300' : 'bg-black/40 border-white/10 hover:border-white/20'}`}
                                >
                                  {/* Note Card Header */}
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase font-bold tracking-wider border ${
                                        note.category === 'Key Finding' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                                        note.category === 'Methodology' ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' :
                                        note.category === 'Result' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
                                        note.category === 'Limitation' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                                        note.category === 'AI Insight' ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' :
                                        (isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-white/10 text-slate-300 border-white/10')
                                      }`}>
                                        {note.category}
                                      </span>

                                      {/* Clickable Page Badge */}
                                      <button
                                        onClick={() => setPageNumber(Number(note.page))}
                                        className={`px-2 py-0.5 rounded-full text-[9px] font-mono border transition-colors flex items-center gap-1 ${isLight ? 'bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border-slate-200' : 'bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-300 border-white/10'}`}
                                        title={`Jump to Page ${note.page}`}
                                      >
                                        <ExternalLink size={9}/> Page {note.page}
                                      </button>
                                    </div>

                                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => {
                                          const md = `### ${note.title} [p.${note.page}]\n${note.quote ? '> ' + note.quote + '\n\n' : ''}${note.insight ? '**AI Insight:** ' + note.insight + '\n\n' : ''}${note.text || ''}`;
                                          navigator.clipboard.writeText(md);
                                          setCopiedNoteId(note.id);
                                          setTimeout(() => setCopiedNoteId(null), 2000);
                                        }}
                                        className="p-1 text-slate-500 hover:text-white"
                                        title="Copy Markdown"
                                      >
                                        {copiedNoteId === note.id ? <Check size={11} className="text-emerald-400"/> : <Copy size={11}/>}
                                      </button>
                                      <button
                                        onClick={() => handleDeletePaperNote(note.id)}
                                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                                        title="Delete Note"
                                      >
                                        <Trash2 size={11}/>
                                      </button>
                                    </div>
                                  </div>

                                  <h4 className={`text-xs font-bold mb-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>{note.title}</h4>

                                  {/* Quoted Text */}
                                  {note.quote && (
                                    <div className={`p-2.5 rounded-xl border mb-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/30 border-white/5'}`}>
                                      <p className={`text-[11px] font-serif italic leading-relaxed border-l-2 pl-2 border-emerald-500 select-text ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                                        "{note.quote}"
                                      </p>
                                    </div>
                                  )}

                                  {/* Cropped Image */}
                                  {note.image && (
                                    <div className={`my-2 rounded-xl overflow-hidden border p-1 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/40'}`}>
                                      <img src={`data:image/jpeg;base64,${note.image}`} alt="Snippet" className="max-h-36 rounded object-contain mx-auto"/>
                                    </div>
                                  )}

                                  {/* AI Insight */}
                                  {note.insight && (
                                    <div className={`text-[11px] mt-2 border p-2.5 rounded-xl select-text ${isLight ? 'bg-purple-50/80 border-purple-200 text-slate-800' : 'bg-purple-950/20 border-purple-500/20 text-slate-300'}`}>
                                      <div className="text-[9px] font-mono text-purple-500 uppercase tracking-wider mb-1 flex items-center gap-1 font-bold">
                                        <Sparkles size={10}/> AI Synthesis
                                      </div>
                                      <div className={`prose ${isLight ? 'prose-slate text-slate-800' : 'prose-invert'} max-w-none text-[11px] leading-relaxed`}>
                                        <ReactMarkdown rehypePlugins={[rehypeKatexOptions]} remarkPlugins={[remarkMath]}>
                                          {note.insight}
                                        </ReactMarkdown>
                                      </div>
                                    </div>
                                  )}

                                  {/* User Text */}
                                  {note.text && (
                                    <div className={`text-xs font-light mt-2 leading-relaxed select-text ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                                      <ReactMarkdown rehypePlugins={[rehypeKatexOptions]} remarkPlugins={[remarkMath]}>
                                        {note.text}
                                      </ReactMarkdown>
                                    </div>
                                  )}

                                  <div className="text-[8px] font-mono text-slate-600 mt-2 text-right">
                                    {note.createdAt ? note.createdAt.substring(0, 10) : 'Saved'}
                                  </div>
                                </div>
                              ))
                          )}
                      </div>
                    </div>
                  )}

                  {/* ACADEMIC READING STREAM & BANGLA TRANSLATION TAB */}
                  {activeRightTab === 'audio' && (
                    <div className="flex flex-col h-full space-y-4 select-none">
                      {/* Teleprompter Stream Box */}
                      <div className="flex-1 bg-black/30 border border-white/10 rounded-2xl p-4 flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                          <div className="flex items-center gap-2">
                            <Languages size={14} className="text-cyan-400"/>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-white font-bold">Reading Stream & Translation</span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-500">Page {pageNumber}</span>
                        </div>

                        {/* Translation Controls Bar */}
                        <div className="flex items-center gap-2 mb-3">
                          <select
                            value={speechLanguage}
                            onChange={e => {
                              setSpeechLanguage(e.target.value);
                              setTranslatedStreamText('');
                            }}
                            className="bg-[#0e0e0e] text-xs text-slate-300 border border-white/10 rounded-xl px-2.5 py-1.5 outline-none font-mono flex-1 cursor-pointer"
                          >
                            <option value="bn-BD">Bengali (বাংলা)</option>
                            <option value="en-US">English</option>
                            <option value="es-ES">Spanish (Español)</option>
                            <option value="fr-FR">French (Français)</option>
                            <option value="de-DE">German (Deutsch)</option>
                            <option value="ja-JP">Japanese (日本語)</option>
                            <option value="zh-CN">Chinese (中文)</option>
                          </select>

                          <button
                            onClick={() => handleTranslateCurrentPage(speechLanguage)}
                            disabled={isTranslating}
                            className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-mono uppercase font-bold tracking-wider rounded-xl border border-cyan-500/30 transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-40"
                          >
                            {isTranslating ? <RefreshCw size={11} className="animate-spin"/> : <Languages size={11}/>}
                            Translate Page
                          </button>
                        </div>

                        {/* Teleprompter Text Display */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 bg-black/40 rounded-xl border border-white/5 select-text text-xs leading-relaxed text-slate-300 space-y-2">
                          {translatedStreamText ? (
                            <div>
                              <div className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest mb-1.5 font-bold flex items-center justify-between">
                                <span>Translated Stream ({speechLanguage === 'bn-BD' ? 'বাংলা' : speechLanguage})</span>
                                <button
                                  onClick={() => navigator.clipboard.writeText(translatedStreamText)}
                                  className="text-slate-500 hover:text-white flex items-center gap-1 normal-case"
                                >
                                  <Copy size={10}/> Copy
                                </button>
                              </div>
                              <p className="font-sans leading-relaxed text-emerald-200/90 whitespace-pre-wrap">{translatedStreamText}</p>
                            </div>
                          ) : (
                            <div>
                              <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">
                                Original Page Stream (p.{pageNumber})
                              </div>
                              <p className="font-light leading-relaxed whitespace-pre-wrap">
                                {paperData?.stateData?.paperMemory?.[pageNumber.toString()] || "No text available on current page."}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Live Audio Progress Bar */}
                        <div className="mt-3 w-full bg-black border border-white/5 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-300 ${themeClasses.accentBg}`} style={{ width: `${audioState.progress}%` }}/>
                        </div>
                      </div>

                      {/* Playback Controls Card */}
                      <div className="bg-black/30 border border-white/10 rounded-2xl p-3.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={toggleAudio}
                            className={`px-4 py-2.5 rounded-xl font-mono uppercase tracking-wider text-[10px] font-bold flex items-center gap-1.5 transition-all ${
                              audioState.isPlaying
                                ? (audioState.isPaused ? `${themeClasses.accentBg} text-white` : 'bg-amber-500/20 text-amber-400 border border-amber-500/30')
                                : `${themeClasses.accentBg} text-white hover:opacity-90`
                            }`}
                          >
                            {audioState.isPlaying ? (audioState.isPaused ? <><Play size={12} fill="currentColor"/> Resume</> : <><Pause size={12} fill="currentColor"/> Pause</>) : <><Play size={12} fill="currentColor"/> Start Audio</>}
                          </button>

                          {audioState.isPlaying && (
                            <button onClick={stopAudio} className="px-3 py-2.5 rounded-xl font-mono text-[10px] uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center gap-1">
                              <Square size={12} fill="currentColor"/> Stop
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                          <span className="text-[9px] uppercase tracking-widest text-slate-500">Speed:</span>
                          {[0.8, 1.0, 1.2].map(speed => (
                            <button
                              key={speed}
                              onClick={() => setSpeechRate(speed)}
                              className={`px-2 py-1 rounded border text-[9px] ${speechRate === speed ? 'bg-white/10 border-white/20 text-white font-bold' : 'border-transparent text-slate-500 hover:text-white'}`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FLASHCARDS TAB (Graduate Student) */}
                  {activeRightTab === 'flashcards' && (
                    <div className="flex-1 flex flex-col h-full space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                            <GraduationCap size={14} /> Concept Deck
                          </div>
                          <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                            Active study retention & mathematical formula deck
                          </p>
                        </div>
                        <button
                          onClick={handleGenerateFlashcards}
                          disabled={flashcardGenStatus === 'generating'}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
                            flashcardGenStatus === 'generating'
                              ? 'bg-white/10 text-slate-400 cursor-wait'
                              : `${themeClasses.accentBg} text-white hover:opacity-90 shadow-md`
                          }`}
                        >
                          <Sparkles size={11} className={flashcardGenStatus === 'generating' ? 'animate-spin' : ''} />
                          {flashcardGenStatus === 'generating' ? 'Extracting...' : '+ New Cards'}
                        </button>
                      </div>

                      {/* Flashcard Stats & Quick Mastery Filter */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 rounded-xl bg-black/30 border border-white/5 text-center">
                          <div className="text-[9px] font-mono uppercase text-slate-500">Deck Total</div>
                          <div className="text-base font-bold font-mono text-white mt-0.5">{paperFlashcards.length}</div>
                        </div>
                        <div className="p-2 rounded-xl bg-black/30 border border-white/5 text-center">
                          <div className="text-[9px] font-mono uppercase text-amber-400">Reviewing</div>
                          <div className="text-base font-bold font-mono text-amber-300 mt-0.5">
                            {paperFlashcards.filter(c => c.mastery_level === 1).length}
                          </div>
                        </div>
                        <div className="p-2 rounded-xl bg-black/30 border border-white/5 text-center">
                          <div className="text-[9px] font-mono uppercase text-emerald-400">Mastered</div>
                          <div className="text-base font-bold font-mono text-emerald-300 mt-0.5">
                            {paperFlashcards.filter(c => c.mastery_level === 2).length}
                          </div>
                        </div>
                      </div>

                      {/* Flashcards List */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                        {loadingFlashcards ? (
                          <div className="py-12 text-center text-slate-400 font-mono text-xs flex flex-col items-center gap-2">
                            <RefreshCw size={18} className="animate-spin text-emerald-400" />
                            Loading concept flashcards...
                          </div>
                        ) : paperFlashcards.length === 0 ? (
                          <div className="py-12 text-center p-6 border border-dashed border-white/10 rounded-2xl bg-black/20">
                            <GraduationCap size={28} className="mx-auto text-slate-600 mb-2" />
                            <h4 className="text-xs font-mono font-bold text-slate-300">No Flashcards Yet</h4>
                            <p className="text-[11px] text-slate-500 font-sans mt-1 leading-relaxed">
                              Synthesize key terminology, algorithmic definitions, and formulas directly from this paper.
                            </p>
                            <button
                              onClick={handleGenerateFlashcards}
                              className={`mt-4 px-3 py-1.5 rounded-xl font-mono text-[10px] font-bold uppercase tracking-wider text-white ${themeClasses.accentBg}`}
                            >
                              Auto-Generate from Page {pageNumber}
                            </button>
                          </div>
                        ) : (
                          paperFlashcards.map((card, idx) => {
                            const isFlipped = flippedCardId === (card.id || idx);
                            const masteryLabels = ['Learning', 'Reviewing', 'Mastered'];
                            const masteryColors = [
                              'bg-slate-700/50 text-slate-300 border-slate-600',
                              'bg-amber-500/10 text-amber-300 border-amber-500/30',
                              'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            ];
                            const currentLevel = card.mastery_level || 0;

                            return (
                              <div
                                key={card.id || idx}
                                className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                                  isFlipped
                                    ? 'bg-black/60 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                                    : 'bg-black/30 border-white/10 hover:border-white/20'
                                }`}
                                onClick={() => setFlippedCardId(isFlipped ? null : (card.id || idx))}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">
                                    Card #{idx + 1}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleMastery(card);
                                    }}
                                    className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border transition-colors ${masteryColors[currentLevel]}`}
                                    title="Click to advance mastery level"
                                  >
                                    ● {masteryLabels[currentLevel]}
                                  </button>
                                </div>

                                <h4 className="text-xs font-bold text-white mb-2 leading-snug font-sans">
                                  {card.concept}
                                </h4>

                                {isFlipped ? (
                                  <div className="space-y-2 pt-2 border-t border-white/10 animate-fadeIn text-[11px] font-sans text-slate-300 leading-relaxed">
                                    <p>{card.definition}</p>
                                    {card.formula && (
                                      <div className="p-2 rounded-lg bg-black/60 border border-emerald-500/20 font-mono text-[10px] text-emerald-300 overflow-x-auto">
                                        <code>{card.formula}</code>
                                      </div>
                                    )}
                                    <div className="text-[9px] font-mono text-slate-500 text-right pt-1">
                                      Click to flip back
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-[10px] font-mono text-cyan-400 flex items-center justify-between pt-1">
                                    <span>Click to reveal definition & formula</span>
                                    <span>↻</span>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* PYTORCH CODE EXTRACTOR TAB (Programmer / ML Engineer) */}
                  {activeRightTab === 'code' && (
                    <div className="flex-1 flex flex-col h-full space-y-3">
                      {isWasmSandboxOpen ? (
                        /* IN-SITU PYODIDE WASM SANDBOX VIEW */
                        <div className="flex-1 flex flex-col h-full space-y-3">
                          <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setIsWasmSandboxOpen(false)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                                  isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-white/10 hover:bg-white/20 text-white'
                                }`}
                              >
                                <ChevronLeft size={13} /> Go Back
                              </button>
                              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                WASM Sandbox
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {extractedCode?.code_snippet && (
                                <button
                                  onClick={() => setWasmCode(extractedCode.code_snippet)}
                                  className="px-2 py-1 rounded-lg text-[9px] font-mono text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 transition-all"
                                  title="Reset editor to extracted paper code"
                                >
                                  Load Paper Code
                                </button>
                              )}
                              <button
                                onClick={handleRunWasmExecution}
                                disabled={isWasmRunning}
                                className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md ${
                                  isWasmRunning
                                    ? 'bg-emerald-800/50 text-slate-400 cursor-wait'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                                }`}
                              >
                                <Play size={11} className={isWasmRunning ? 'animate-spin' : ''} />
                                {isWasmRunning ? 'Executing...' : 'Run Code'}
                              </button>
                            </div>
                          </div>

                          {/* Code Editor */}
                          <div className="flex-1 flex flex-col min-h-0 bg-black/80 rounded-xl border border-white/15 overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10 text-[9px] font-mono text-slate-400">
                              <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                                <Code2 size={11} className="text-cyan-400" />
                                sandbox_kernel.py
                              </span>
                              <span>Pyodide WebAssembly Python 3.11</span>
                            </div>
                            <textarea
                              value={wasmCode}
                              onChange={(e) => setWasmCode(e.target.value)}
                              placeholder="# Write or paste Python / PyTorch-style code here...&#10;import math&#10;print('Hello from Sovereign WASM Kernel')"
                              className="w-full flex-1 p-3 bg-transparent text-emerald-300 font-mono text-[11px] leading-relaxed resize-none focus:outline-none custom-scrollbar selection:bg-emerald-500/30"
                              spellCheck="false"
                            />
                          </div>

                          {/* Terminal Output Console */}
                          <div className="h-44 flex flex-col bg-black/90 rounded-xl border border-white/15 overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10 text-[9px] font-mono text-slate-400">
                              <span className="flex items-center gap-1.5 text-slate-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                                stdout / execution log
                              </span>
                              <button
                                onClick={() => setWasmOutput('')}
                                className="hover:text-white transition-colors"
                              >
                                Clear
                              </button>
                            </div>
                            <pre className="p-3 flex-1 overflow-y-auto font-mono text-[10.5px] leading-relaxed text-slate-300 custom-scrollbar selection:bg-cyan-500/30 whitespace-pre-wrap">
                              {wasmOutput || (
                                <span className="text-slate-600 italic">No output yet. Click &quot;Run Code&quot; to execute in browser.</span>
                              )}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        /* EXTRACTED CODE & SYNTHESIS VIEW */
                        <div className="flex-1 flex flex-col h-full space-y-3">
                          <div className="flex items-center justify-between pb-3 border-b border-white/10">
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                                <Code2 size={14} /> PyTorch Extractor
                              </div>
                              <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                                Synthesize runnable nn.Module from paper mathematics
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  if (!wasmCode && extractedCode?.code_snippet) {
                                    setWasmCode(extractedCode.code_snippet);
                                  } else if (!wasmCode) {
                                    setWasmCode("import math\nprint('PyTorch WASM Sandbox Ready')\n");
                                  }
                                  setIsWasmSandboxOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-all"
                              >
                                <Play size={10} /> Open Sandbox
                              </button>
                              <button
                                onClick={handleExtractPyTorchCode}
                                disabled={loadingCodeExtract}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
                                  loadingCodeExtract
                                    ? 'bg-white/10 text-slate-400 cursor-wait'
                                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md'
                                }`}
                              >
                                <Sparkles size={11} className={loadingCodeExtract ? 'animate-spin' : ''} />
                                {loadingCodeExtract ? 'Synthesizing...' : 'Extract Module'}
                              </button>
                            </div>
                          </div>

                          {/* Extracted Code View */}
                          {loadingCodeExtract ? (
                            <div className="py-16 text-center text-slate-400 font-mono text-xs flex flex-col items-center gap-2">
                              <RefreshCw size={20} className="animate-spin text-cyan-400" />
                              <span>Generating PyTorch Module with Tensor Dimensions...</span>
                              <span className="text-[10px] text-slate-500">Mapping mathematical notations to nn.Module</span>
                            </div>
                          ) : extractedCode ? (
                            <div className="flex-1 flex flex-col space-y-3 overflow-y-auto custom-scrollbar pr-1">
                              {/* Metadata pill banner */}
                              <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                                <div>
                                  <div className="text-xs font-mono font-bold text-white">
                                    {extractedCode.algorithm_name || "Algorithmic Module"}
                                  </div>
                                  <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                                    Complexity: <span className="text-amber-300 font-bold">{extractedCode.complexity || "O(N · d)"}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                                    {extractedCode.language || "PyTorch"}
                                  </span>
                                </div>
                              </div>

                              {/* Code Block with Actions */}
                              <div className="relative rounded-2xl bg-black/80 border border-white/15 overflow-hidden flex flex-col shadow-xl">
                                <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10 text-[10px] font-mono text-slate-400">
                                  <span className="flex items-center gap-1 text-slate-300">
                                    <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
                                    module.py
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={handleCopyExtractedCode}
                                      className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 transition-all"
                                    >
                                      {copiedCodeStatus ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                                      {copiedCodeStatus ? 'Copied!' : 'Copy'}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setWasmCode(extractedCode.code_snippet);
                                        setIsWasmSandboxOpen(true);
                                      }}
                                      className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 flex items-center gap-1 transition-all"
                                      title="Run code in Pyodide WASM sandbox"
                                    >
                                      <Play size={10} /> In-Situ Sandbox
                                    </button>
                                  </div>
                                </div>
                                <pre className="p-3 text-[10.5px] font-mono text-emerald-300 overflow-x-auto leading-relaxed max-h-[340px] custom-scrollbar selection:bg-cyan-500/30">
                                  <code>{extractedCode.code_snippet}</code>
                                </pre>
                              </div>

                              {/* Docstring & Mathematical Shape Card */}
                              {extractedCode.docstring && (
                                <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-[10px] font-sans text-slate-300 leading-relaxed">
                                  <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1 font-bold">
                                    Tensor I/O & Architectural Specification
                                  </div>
                                  <p className="whitespace-pre-line">{extractedCode.docstring}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="py-12 text-center p-6 border border-dashed border-white/10 rounded-2xl bg-black/20">
                              <Code2 size={28} className="mx-auto text-slate-600 mb-2" />
                              <h4 className="text-xs font-mono font-bold text-slate-300">No PyTorch Module Extracted</h4>
                              <p className="text-[11px] text-slate-500 font-sans mt-1 leading-relaxed">
                                Automatically convert mathematical equations, architectures, or pseudocode on page {pageNumber} into a clean, typed PyTorch nn.Module.
                              </p>
                              <div className="mt-4 flex items-center justify-center gap-2">
                                <button
                                  onClick={handleExtractPyTorchCode}
                                  className="px-3 py-1.5 rounded-xl font-mono text-[10px] font-bold uppercase tracking-wider text-white bg-cyan-600 hover:bg-cyan-500 shadow-md"
                                >
                                  Synthesize PyTorch Module
                                </button>
                                <button
                                  onClick={() => {
                                    setWasmCode("import math\nprint('Pyodide WASM Sandbox Ready')\n");
                                    setIsWasmSandboxOpen(true);
                                  }}
                                  className="px-3 py-1.5 rounded-xl font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30"
                                >
                                  Open Clean Sandbox
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Copilot Chat Input Form */}
                {activeRightTab === 'copilot' && (
                  <div className={`p-3 border-t flex-shrink-0 ${isLight ? 'border-slate-200 bg-white/50' : 'border-white/10 bg-black/40'}`}>
                    <form onSubmit={handleChatSubmit} className="flex flex-col gap-2">
                      <div className="flex items-center bg-black/20 border border-white/10 rounded-xl p-1 focus-within:border-white/30 transition-colors shadow-inner">
                        <Search size={14} className="text-slate-600 ml-2.5 shrink-0" />
                        <input 
                          type="text" 
                          value={chatInput} 
                          onChange={(e) => setChatInput(e.target.value)} 
                          placeholder={activeSelectionText ? "Ask about targeted excerpt..." : "Ask document questions (cites exact pages)..."}
                          className="flex-grow bg-transparent text-xs text-white px-3 py-2 outline-none font-sans" 
                          disabled={isAgentTyping}
                        />
                        <button type="submit" disabled={!chatInput.trim()} className={`p-2 rounded-lg text-white transition-all disabled:opacity-20 ${themeClasses.accentBg}`}>
                          <Send size={12} />
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CITATION MODAL (Academic Researcher & Reviewer) */}
      {citationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-2xl bg-[#0e0e10] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-teal-400" />
                <div>
                  <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                    Academic Citation Exporter
                  </h3>
                  <p className="text-[11px] text-slate-400 font-sans truncate max-w-md">
                    {paperData?.title || "Research Manuscript"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCitationModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {loadingCitations ? (
              <div className="py-12 text-center text-slate-400 font-mono text-xs flex flex-col items-center gap-2">
                <RefreshCw size={18} className="animate-spin text-teal-400" />
                Formatting multi-standard academic citations...
              </div>
            ) : citationsData ? (
              <div className="space-y-4">
                {/* BibTeX Entry */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    <span className="font-bold text-teal-300">BibTeX Citation</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyCitation('bibtex', citationsData.formats?.bibtex)}
                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 transition-all"
                      >
                        {copiedCitationFormat === 'bibtex' ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                        {copiedCitationFormat === 'bibtex' ? 'Copied' : 'Copy BibTeX'}
                      </button>
                      <button
                        onClick={handleDownloadBibFile}
                        className="px-2 py-0.5 rounded bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 flex items-center gap-1 transition-all"
                      >
                        <Download size={10} /> Download .bib
                      </button>
                    </div>
                  </div>
                  <pre className="p-3 bg-black/60 border border-white/10 rounded-xl text-[10.5px] font-mono text-emerald-300 overflow-x-auto leading-relaxed select-text">
                    <code>{citationsData.formats?.bibtex}</code>
                  </pre>
                </div>

                {/* Standard Inline Citations */}
                <div className="grid grid-cols-1 gap-2.5 pt-2 border-t border-white/10">
                  {['apa', 'ieee', 'chicago'].map(fmt => (
                    <div key={fmt} className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 block font-bold">
                          {fmt.toUpperCase()} {fmt === 'apa' ? '(7th ed.)' : ''}
                        </span>
                        <p className="text-xs text-slate-300 font-serif leading-relaxed mt-0.5 select-text">
                          {citationsData.formats?.[fmt]}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopyCitation(fmt, citationsData.formats?.[fmt])}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono flex items-center gap-1 shrink-0 transition-all"
                      >
                        {copiedCitationFormat === fmt ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                        {copiedCitationFormat === fmt ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 font-mono text-xs">
                Citation could not be generated. Please check metadata.
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                onClick={() => setCitationModal(false)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs uppercase tracking-wider cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPERATOR MANUAL MODAL */}
      {showManual && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-fadeIn">
          <div className={`border rounded-3xl p-6 md:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl relative ${themeClasses.bgCard}`}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500"></div>
            <button onClick={() => setShowManual(false)} className="absolute top-5 right-5 text-slate-500 hover:text-white cursor-pointer">
              <X size={18}/>
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <BookOpen size={20} />
              </div>
              <div>
                <h2 className={`text-xl md:text-2xl font-serif tracking-tight font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  InsightLens User Manual & Operator Guide
                </h2>
                <p className="text-xs font-mono text-slate-400">
                  Continuous Multi-Page Reading, Targeted Vector Snip, AI Copilot & Research Notebook
                </p>
              </div>
            </div>
            
            <div className="space-y-4 font-sans text-xs text-slate-300 leading-relaxed select-text">
              {/* Step 1: Uploading Manuscripts */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                <h3 className="font-mono uppercase tracking-wider text-xs font-bold text-cyan-400 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px]">1</span>
                  Ingesting & Loading Manuscripts
                </h3>
                <p>
                  You can load research papers into InsightLens through <strong>three easy methods</strong>:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li><strong>Direct Upload</strong>: Click the central upload zone or the folder button to pick any local PDF manuscript.</li>
                  <li><strong>Central Vault</strong>: Switch the left sidebar to the <strong>Vault</strong> tab and click any stored paper to mount it instantly.</li>
                  <li><strong>Document Ledgers</strong>: Open the left sidebar <strong>Ledger</strong> tab to resume past reading sessions with all your notes, chat history, and highlights intact.</li>
                </ul>
              </div>

              {/* Step 2: Continuous Multi-Page Reading & Navigation */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                <h3 className="font-mono uppercase tracking-wider text-xs font-bold text-purple-400 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px]">2</span>
                  Continuous Reading, Zoom & Page Navigation
                </h3>
                <p>
                  Read comfortably with research-grade viewport controls:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li><strong>Continuous Multi-Page Flow</strong>: Scroll vertically to read smoothly across all pages without abrupt page cuts.</li>
                  <li><strong>Zoom Controls</strong>: Use <code className="text-cyan-300">Ctrl + Mouse Wheel</code> or the toolbar zoom buttons (<code className="text-cyan-300">+ / -</code>) to zoom between 60% and 250%.</li>
                  <li><strong>Page Navigation</strong>: Use the page arrows in the top toolbar to jump directly to any page or section.</li>
                </ul>
              </div>

              {/* Step 3: Targeted Vector Snip & Text Selection */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                <h3 className="font-mono uppercase tracking-wider text-xs font-bold text-amber-400 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">3</span>
                  Targeted Excerpt Selection & Vector Snip Tool
                </h3>
                <p>
                  Direct the AI Copilot to analyze specific sections of the paper:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li><strong>Native Text Selection</strong>: Highlight any paragraph or formula with your cursor to open the action popover (Explain, Summarize, Add Note).</li>
                  <li><strong>Visual Snip / Lasso</strong>: Click the <strong>Snip</strong> tool in the reading bar to draw a rectangle over diagrams, tables, or complex mathematical formulas to extract and analyze them visually.</li>
                </ul>
              </div>

              {/* Step 4: Persona-Aware Copilot Modules */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                <h3 className="font-mono uppercase tracking-wider text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px]">4</span>
                  Interactive AI Copilot & Automated Modules
                </h3>
                <p>
                  The right sidebar provides specialized research tools based on your active role:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li><strong>Conversational Copilot</strong>: Ask natural questions about the paper; answers cite exact page numbers.</li>
                  <li><strong>PyTorch Module Extractor</strong>: Synthesize executable PyTorch architectures from mathematical formulations.</li>
                  <li><strong>Concept Flashcards</strong>: Generate active-recall flashcard decks for learning and spaced repetition.</li>
                  <li><strong>Client WASM Sandbox</strong>: Test Python and numerical subroutines locally with zero external network leakage.</li>
                </ul>
              </div>

              {/* Step 5: Research Notebook & Vault Citations */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                <h3 className="font-mono uppercase tracking-wider text-xs font-bold text-teal-400 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center text-[10px]">5</span>
                  Research Notebook & Academic Citations
                </h3>
                <p>
                  Organize findings and export standardized citations:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li><strong>Pinned Research Notes</strong>: Save observations with automated page attribution to your notebook.</li>
                  <li><strong>Multi-Standard Citations</strong>: Click <strong>Cite</strong> in the header to copy or download BibTeX, APA, IEEE, or Chicago citations.</li>
                  <li><strong>Sovereign Cloud Sync</strong>: All annotations and workspaces auto-save to your isolated PostgreSQL account.</li>
                </ul>
              </div>
            </div>

            <button onClick={() => setShowManual(false)} className="mt-6 w-full bg-gradient-to-r from-cyan-500 to-teal-400 text-black font-bold uppercase tracking-widest text-xs py-3 rounded-xl hover:opacity-95 transition-opacity shadow-lg cursor-pointer">
              Acknowledge & Close Manual
            </button>
          </div>
        </div>
      )}
    </>
  );
}