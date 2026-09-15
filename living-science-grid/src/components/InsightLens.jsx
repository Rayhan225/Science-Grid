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
  FileText, BookmarkPlus
} from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useTheme } from '../context/ThemeContext';
import { generatePaperSummary, sanitizeDocument } from '../aiHelper';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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

export default function InsightLens() {
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

  const fetchSavedSessions = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/insightlens/workspaces`);
      if (res.ok) {
        const data = await res.json();
        setSessionHistory(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn("Unable to fetch InsightLens workspaces from Supabase.");
    }
  }, []);

  useEffect(() => {
    fetchVaultNotes();
    fetchSavedSessions();
  }, [fetchSavedSessions]);

  const fetchVaultNotes = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/vault/notes`);
      if (res.ok) setVaultNotesList(await res.json());
    } catch (err) {
      console.warn("Could not fetch vault notes.");
    }
  };

  const saveWorkspaceToDB = async (updatedWorkspace, currentChat, currentAnnotations, currentNotes = null) => {
    if (!updatedWorkspace) return;
    try {
      const effectiveNotes = currentNotes !== null ? currentNotes : (paperNotes || []);
      const statePayload = {
        ...(updatedWorkspace.stateData || {}),
        notes: effectiveNotes
      };

      await fetch(`${BACKEND_URL}/api/insightlens/workspaces`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: updatedWorkspace.id,
          title: updatedWorkspace.title,
          fileId: updatedWorkspace.fileId,
          totalPages: updatedWorkspace.totalPages || 1,
          timestamp: updatedWorkspace.timestamp,
          lastAccessed: new Date().toISOString(),
          isPinned: updatedWorkspace.isPinned || false,
          paperSummary: updatedWorkspace.paperSummary || "",
          chatHistory: currentChat || [],
          annotations: currentAnnotations || {},
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
    resetWorkspaceState();
    setIsGenerating(true); 
    setPipelineProgress(5); 
    setStatusInternal("Parsing document structure...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const totalPages = pdf.numPages;
      const newWorkspaceId = `lens_${Date.now()}`;
      
      let synthesizedWorkspace = {
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

      for (let i = 1; i <= totalPages; i++) {
        if (cancelRef.current) break;
        setStatusInternal(`Indexing: Page ${i}/${totalPages}`);
        setPipelineProgress(Math.round((i / totalPages) * 100));

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
      }

      const summaryText = await generatePaperSummary(synthesizedWorkspace.stateData.paperMemory["1"] || "");
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
                content: `### 🤖 Llama-3.2-3B Peer Review Prompts\n\n${ingestJson.smartQuestions.join('\n\n')}`
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
      console.error(err);
      setStatusInternal("Pipeline runtime exception."); 
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
      const payload = {
        source: manualNoteSource || paperData?.title || "InsightLens Document",
        page_number: pageNumber,
        text: manualNoteText,
        insight: "User observation entry"
      };

      const res = await fetch(`${BACKEND_URL}/api/vault/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setManualNoteText('');
        setNoteSaveStatus("Saved to Supabase database.");
        fetchVaultNotes();
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
    if (rawContent.startsWith('data:application/pdf') || rawContent.startsWith('data:')) {
      const base64Data = rawContent.includes(',') ? rawContent.split(',')[1] : rawContent;
      const cleanBase64 = base64Data.replace(/\s/g, '');
      const binaryStr = window.atob(cleanBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
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

    setPaperData(session);
    setChatHistory(session.chatHistory || []);
    setAnnotations(session.annotations || session.stateData?.annotations || {});
    setPaperNotes(session.stateData?.notes || []);
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
    return () => window.removeEventListener('sg-open-file', handleOpenFileEvent);
  }, [sessionHistory]);

  const handleStartFreshDocument = () => {
    resetWorkspaceState();
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
      const res = await fetch(`${BACKEND_URL}/api/vault/files`);
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

  // --- SCI-SPACE CONTEXT QUERY (No Prompt Leakage) ---
  const executeContextQuery = async (text, promptOverride) => {
    setIsAiEvaluating(true); 
    setAiResponseBuffer("");
    try {
      const userInstruction = promptOverride || "Provide a concise, rigorous academic explanation of this excerpt from page " + pageNumber + ".";
      const res = await fetch(`${BACKEND_URL}/api/research/swarm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: `Instruction: Directly provide an academic evaluation of the referenced text. Do not echo system instructions or prompt headers. Cite details clearly:\n\n${userInstruction}`, 
          context: `Document: ${paperData?.title || 'Manuscript'}\nPage: ${pageNumber}\nExcerpt: ${text}` 
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiResponseBuffer(data.response || "Inference completed.");
      } else {
        setAiResponseBuffer("Failed to retrieve AI inference response.");
      }
    } catch(err) { 
      setAiResponseBuffer("Local AI core connection fault."); 
    } finally { 
      setIsAiEvaluating(false); 
    }
  };

  // --- SCI-SPACE MULTI-PAGE CHAT WITH PDF ---
  const handleChatSubmit = async (e = null, customQuery = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const query = customQuery || chatInput;
    if (!query.trim() || !paperData) return;

    let formattedUserMsg = query;
    if (activeSelectionText && !query.includes(activeSelectionText)) {
      formattedUserMsg = `[Referenced Excerpt p.${pageNumber}: "${activeSelectionText}"]\n\n${query}`;
    }

    const userMessage = { role: 'user', content: formattedUserMsg, image: activeBase64Image };
    const newHistory = [...chatHistory, userMessage];
    setChatHistory(newHistory); 
    setChatInput(""); 
    setIsAgentTyping(true);

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

    const promptWithRigor = `You are InsightLens Copilot, an elite academic research assistant. Answer strictly based on the document excerpts provided. Cite exact page numbers in brackets (e.g. [Page ${pageNumber}]) for evidence. Maintain scholarly clarity with concise headers, bold key points, and bulleted takeaways.\n\nUser Question: ${formattedUserMsg}`;

    try {
      const res = await fetch(`${BACKEND_URL}/api/research/swarm`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          query: promptWithRigor, 
          context: contextData,
          image: activeBase64Image || null
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
        const errorMsg = { role: 'assistant', content: "Backend server returned an error." };
        setChatHistory([...newHistory, errorMsg]);
      }
    } catch (err) { 
      setChatHistory([...newHistory, { role: 'assistant', content: "Local AI execution pipeline offline." }]); 
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
      await fetch(`${BACKEND_URL}/api/vault/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: paperData?.title || "InsightLens Document",
          page_number: newNote.page,
          text: newNote.quote || newNote.text || "Insight Note",
          insight: newNote.insight || newNote.text,
          image: newNote.image || null
        })
      });
      fetchVaultNotes();
    } catch (e) {}

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

  // --- READING STREAM & BANGLA TRANSLATION ---
  const handleTranslateCurrentPage = async (targetLangKey = speechLanguage) => {
    const sourceText = paperData?.stateData?.paperMemory?.[pageNumber.toString()];
    if (!sourceText) return;

    setIsTranslating(true);
    const langMap = { 
      "en-US": "English", 
      "bn-BD": "Bengali (বাংলা)", 
      "fr-FR": "French", 
      "es-ES": "Spanish", 
      "de-DE": "German", 
      "ja-JP": "Japanese",
      "zh-CN": "Chinese"
    };
    const targetLangName = langMap[targetLangKey] || targetLangKey;

    try {
      const res = await fetch(`${BACKEND_URL}/api/research/swarm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: `Translate the following academic manuscript excerpt accurately to ${targetLangName}. Preserve technical terminology accurately. Output ONLY the clean translation without any preamble or commentary:\n\n${sourceText.slice(0, 3000)}`, 
          context: sourceText.slice(0, 3000)
        })
      });
      if (res.ok) {
        const data = await res.json();
        setTranslatedStreamText(data.response || "Translation unavailable.");
      }
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
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 animate-fadeIn">
          <div className={`${themeClasses.bgCard} p-10 max-w-2xl shadow-2xl relative rounded-3xl border border-white/10`}>
            <button onClick={() => setShowManual(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white">
              <X size={20} />
            </button>
            <h2 className="text-2xl font-serif text-white tracking-tight mb-6 flex items-center gap-3">
              <BookOpen className={themeClasses.accentText} size={28} /> InsightLens Manual
            </h2>
            <p className="text-sm font-light text-slate-400 mb-6">Each document creates its own isolated ledger in insightlens_workspaces. Marks, highlights, and conversations stay with that document and do not cross over to other PDFs.</p>
          </div>
        </div>
      )}

      <div className="flex h-full w-full bg-transparent overflow-hidden font-sans relative select-none">
        {/* LEFT SIDEBAR */}
        <div className="relative flex h-full z-20">
          <div className={`h-full transition-all duration-300 ease-in-out overflow-hidden border-r ${isLight ? 'border-slate-200 bg-white/50' : 'border-white/10 bg-black/40'} ${isLeftOpen ? 'w-80' : 'w-0'}`}>
            <div className="w-80 h-full flex flex-col overflow-hidden">
              <div className={`p-2 border-b flex justify-center gap-1 flex-shrink-0 ${isLight ? 'border-slate-200 bg-black/5' : 'border-white/10 bg-black/60'}`}>
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

              <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                {leftSidebarTab === 'ledger' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Document Ledgers</span>
                      <button onClick={handleStartFreshDocument} className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 hover:text-emerald-300 uppercase font-bold">
                        <Plus size={12} /> New Session
                      </button>
                    </div>

                    {sessionHistory.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center mt-4">Database ledger empty.</p>
                    ) : (
                      sessionHistory.map(s => (
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
          
          <div className="relative w-0 flex items-center z-30">
            <button 
              onClick={() => setIsLeftOpen(!isLeftOpen)}
              className={`absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border flex items-center justify-center shadow-xl transition-all hover:scale-110 hover:border-cyan-400 ${isLight ? 'bg-white border-slate-300 text-slate-800 hover:text-cyan-600' : 'bg-[#121212] border-white/30 text-cyan-400 hover:bg-cyan-500 hover:text-black'}`}
              title={isLeftOpen ? "Collapse Structure Sidebar" : "Expand Structure Sidebar"}
            >
              {isLeftOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            </button>
          </div>
        </div>

        {/* CENTER VIEWPORT */}
        <div className="flex-grow flex flex-col relative min-w-0 h-full bg-transparent">
          <div className={`h-14 border-b flex items-center justify-between px-6 z-10 flex-shrink-0 backdrop-blur-md ${isLight ? 'border-slate-200 bg-white/50' : 'border-white/10 bg-black/40'}`}>
            <span className="font-serif text-sm uppercase tracking-widest truncate">{paperData?.title || "InsightLens"}</span>
            
            {paperData && (
              <div className="flex items-center gap-4 bg-black/20 rounded-lg p-1 border border-white/5 text-[10px] font-mono uppercase">
                <button onClick={() => setInteractionMode('read')} className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${interactionMode === 'read' ? 'bg-white/10 text-white shadow' : 'text-slate-400 hover:text-white'}`}><BookOpen size={12} /> Read</button>
                <button onClick={() => setInteractionMode('crop')} className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${interactionMode === 'crop' ? 'bg-white/10 text-white shadow' : 'text-slate-400 hover:text-white'}`}><Crop size={12} /> Snip</button>
                <div className="w-px h-4 bg-white/10 mx-1.5 self-center"></div>
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
            
            <div className="flex items-center gap-3">
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
              <button onClick={() => setShowManual(true)} className="text-slate-400 hover:text-white bg-white/5 p-2 rounded-lg transition-colors" title="View Manual">
                <Info size={16} />
              </button>
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

            {!paperData && !isGenerating ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 animate-fadeIn select-none">
                <div className="max-w-xl w-full text-center space-y-8">
                  <div className="relative w-20 h-24 mx-auto flex items-center justify-center">
                    <div className={`absolute inset-0 ${themeClasses.accentBg} bg-opacity-20 blur-3xl rounded-full animate-pulse`}></div>
                    <div className="relative w-16 h-16 bg-[#0a0a0a] border border-white/10 rounded-2xl flex items-center justify-center shadow-xl">
                      <Orbit className={themeClasses.accentText} size={32} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h1 className="text-3xl font-serif text-white tracking-wide font-light">Insight<span className={`${themeClasses.accentText} font-medium`}>Lens</span> Platform</h1>
                    <p className="text-slate-500 text-xs font-light max-w-sm mx-auto leading-relaxed">
                      Mount a PDF to map relational page memory, run localized context queries, and store notes directly into Supabase.
                    </p>
                  </div>

                  <label className={`relative block w-full max-w-sm mx-auto cursor-pointer p-10 border border-dashed rounded-3xl flex flex-col items-center justify-center transition-all ${isLight ? 'border-slate-300 bg-white/50 hover:bg-white' : 'border-white/20 bg-black/20 hover:bg-black/40 hover:border-white/40'}`}>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleDocumentIngestion} accept=".pdf" />
                    <UploadCloud size={32} className={`mb-4 ${themeClasses.accentText}`} />
                    <span className="text-sm font-bold font-mono tracking-widest uppercase mb-1">Mount Matrix PDF</span>
                    <span className="text-[9px] text-slate-600 font-mono tracking-widest uppercase mt-2">Local File or Vault Ingest</span>
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
            <div className="relative w-0 flex items-center z-30">
              <button 
                onClick={() => setIsRightOpen(!isRightOpen)}
                className={`absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border flex items-center justify-center shadow-xl transition-all hover:scale-110 hover:border-cyan-400 ${isLight ? 'bg-white border-slate-300 text-slate-800 hover:text-cyan-600' : 'bg-[#121212] border-white/30 text-cyan-400 hover:bg-cyan-500 hover:text-black'}`}
                title={isRightOpen ? "Collapse Chat Sidebar" : "Expand Chat Sidebar"}
              >
                {isRightOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
              </button>
            </div>

            <div className={`h-full transition-all duration-300 ease-in-out overflow-hidden border-l ${isLight ? 'border-slate-200 bg-white/70' : 'border-white/10 bg-black/40'} ${isRightOpen ? 'w-[360px]' : 'w-0'}`}>
              <div className="w-[360px] h-full flex flex-col overflow-hidden">
                <div className={`p-2 border-b flex flex-shrink-0 ${isLight ? 'border-slate-200 bg-slate-100/80' : 'border-white/10 bg-black/60'}`}>
                  <button onClick={() => setActiveRightTab('copilot')} className={`flex-1 py-1.5 flex justify-center items-center gap-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest transition-all ${activeRightTab==='copilot' ? (isLight ? 'bg-white text-slate-900 font-bold shadow-sm' : 'bg-white/10 text-white font-bold shadow') : (isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-black/5' : 'text-slate-400 hover:text-white hover:bg-white/5')}`}><MessageSquare size={12} /> Copilot</button>
                  <button onClick={() => setActiveRightTab('notebook')} className={`flex-1 py-1.5 flex justify-center items-center gap-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest transition-all ${activeRightTab==='notebook' ? (isLight ? 'bg-white text-slate-900 font-bold shadow-sm' : 'bg-white/10 text-white font-bold shadow') : (isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-black/5' : 'text-slate-400 hover:text-white hover:bg-white/5')}`}>
                    <BookMarked size={12} /> Notes {paperNotes.length > 0 && <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded-full text-[8px] font-bold">{paperNotes.length}</span>}
                  </button>
                  <button onClick={() => setActiveRightTab('audio')} className={`flex-1 py-1.5 flex justify-center items-center gap-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest transition-all ${activeRightTab==='audio' ? (isLight ? 'bg-white text-slate-900 font-bold shadow-sm' : 'bg-white/10 text-white font-bold shadow') : (isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-black/5' : 'text-slate-400 hover:text-white hover:bg-white/5')}`}><Volume2 size={12} /> Stream</button>
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
                              <button onClick={()=>executeContextQuery(activeSelectionText, "Explain this academic excerpt and its core implication.")} className="py-2 bg-white/5 hover:bg-white/10 text-[10px] font-bold font-mono uppercase text-slate-300 rounded-lg border border-white/5 transition-all flex items-center justify-center gap-1">
                                <Sparkles size={11} className="text-cyan-400"/> Explain
                              </button>
                              <button onClick={()=>executeContextQuery(activeSelectionText, "Critique the methodology, validity, and potential bottlenecks.")} className="py-2 bg-white/5 hover:bg-white/10 text-[10px] font-bold font-mono uppercase text-slate-300 rounded-lg border border-white/5 transition-all flex items-center justify-center gap-1">
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
                                    <ReactMarkdown rehypePlugins={[rehypeKatex]} remarkPlugins={[remarkMath]}>
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
                                <ReactMarkdown rehypePlugins={[rehypeKatex]} remarkPlugins={[remarkMath]}>
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
                                        <ReactMarkdown rehypePlugins={[rehypeKatex]} remarkPlugins={[remarkMath]}>
                                          {note.insight}
                                        </ReactMarkdown>
                                      </div>
                                    </div>
                                  )}

                                  {/* User Text */}
                                  {note.text && (
                                    <div className={`text-xs font-light mt-2 leading-relaxed select-text ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                                      <ReactMarkdown rehypePlugins={[rehypeKatex]} remarkPlugins={[remarkMath]}>
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
    </>
  );
}