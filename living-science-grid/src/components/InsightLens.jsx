// src/components/InsightLens.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  BookOpen, ChevronLeft, ChevronRight, Search, Send, RefreshCw, 
  Highlighter, X, Crop, BookMarked, MessageSquare, Database, 
  Play, Pause, Square, Volume2, PenTool, Save, Undo2, Redo2, Eraser, 
  ZoomIn, ZoomOut, UploadCloud, BrainCircuit, Info, Orbit, CloudDownload,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, CheckCircle2, Trash2,
  Pin, Edit3, Plus
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

  const saveWorkspaceToDB = async (updatedWorkspace, currentChat, currentAnnotations) => {
    if (!updatedWorkspace) return;
    try {
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
          stateData: updatedWorkspace.stateData || {}
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

      await saveWorkspaceToDB(synthesizedWorkspace, [], {});
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

  const loadPdfFileFromUrl = async (url, filename, targetPage = 1) => {
    try {
      setStatusInternal(`Loading ${filename}...`);
      const res = await fetch(url);
      const data = await res.json();
      const rawContent = data.content || "";

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

      const file = new File([blob], filename, { type: 'application/pdf' });
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
    setPaperData(session);
    setChatHistory(session.chatHistory || []);
    setAnnotations(session.annotations || session.stateData?.annotations || {});
    setPageNumber(1);
    
    const fileId = session.fileId || session.stateData?.fileId;
    if (fileId) {
      loadPdfFileFromUrl(`${BACKEND_URL}/api/library/file/${fileId}`, session.title);
    } else {
      const res = await fetch(`${BACKEND_URL}/api/library/resolve-file?filename=${encodeURIComponent(session.title)}`);
      if (res.ok) {
        const data = await res.json();
        loadPdfFileFromUrl(`${BACKEND_URL}/api/library/file/${data.id}`, session.title);
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

  // --- FIXED QUERY PART ---
  const executeContextQuery = async (text, promptOverride) => {
    setIsAiEvaluating(true); 
    setAiResponseBuffer("");
    try {
      const fullPrompt = promptOverride ? `Direct answer only. No filler text. Query: ${promptOverride}` : "Direct answer only. Explain this context.";
      const res = await fetch(`${BACKEND_URL}/api/research/swarm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: fullPrompt, context: text })
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

  // --- FIXED COPILOT CHATTING PART ---
  const handleChatSubmit = async (e = null, customQuery = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const query = customQuery || chatInput;
    if (!query.trim() || !paperData) return;

    const userMessage = { role: 'user', content: query, image: activeBase64Image };
    const newHistory = [...chatHistory, userMessage];
    setChatHistory(newHistory); 
    setChatInput(""); 
    setIsAgentTyping(true);

    const contextData = paperData.stateData?.paperMemory?.[pageNumber.toString()] || "";
    try {
      const res = await fetch(`${BACKEND_URL}/api/research/swarm`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          query: query, 
          context: contextData.slice(0, 4000),
          image: activeBase64Image || null
        }) 
      });
      if (res.ok) {
        const data = await res.json();
        const assistantMessage = { role: 'assistant', content: data.response || "No response received." };
        const updatedHistory = [...newHistory, assistantMessage];
        setChatHistory(updatedHistory);
        saveWorkspaceToDB(paperData, updatedHistory, annotations);
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
    }
  };

  const saveToGlobalVault = async () => {
    try { 
      await fetch(`${BACKEND_URL}/api/vault/notes`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          source: paperData?.title || "InsightLens", 
          page_number: pageNumber, 
          text: activeSelectionText || "Visual Frame Capture", 
          insight: aiResponseBuffer,
          image: activeBase64Image 
        }) 
      }); 
      fetchVaultNotes();
    } catch(e) {}
    setActiveSelectionText(""); 
    setActiveBase64Image(null); 
    setAiResponseBuffer(""); 
    setActiveRightTab('notebook');
  };

  // --- FIXED AUDIO PART ---
  const stopAudio = () => {
    window.speechSynthesis.cancel();
    setAudioState({ isPlaying: false, isPaused: false, progress: 0, text: "" });
  };

  const toggleAudio = async () => {
    if (audioState.isPlaying) {
      if (audioState.isPaused) {
        window.speechSynthesis.resume();
        setAudioState(prev => ({ ...prev, isPaused: false, text: "Streaming output..." }));
      } else {
        window.speechSynthesis.pause();
        setAudioState(prev => ({ ...prev, isPaused: true, text: "Paused." }));
      }
      return;
    }

    const sourceText = paperData?.stateData?.paperMemory?.[pageNumber.toString()];
    if (!sourceText) return;

    setAudioState({ isPlaying: true, isPaused: false, progress: 0, text: "Processing translation..." });

    try {
      const langMap = { 
        "en-US": "English", 
        "bn-BD": "Bengali", 
        "fr-FR": "French", 
        "es-ES": "Spanish", 
        "de-DE": "German", 
        "ja-JP": "Japanese",
        "zh-CN": "Chinese"
      };

      let finalSpeechText = sourceText.slice(0, 2000);

      if (speechLanguage !== 'en-US') {
        const targetLang = langMap[speechLanguage] || speechLanguage;
        const res = await fetch(`${BACKEND_URL}/api/research/swarm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            query: `Translate the following to ${targetLang} cleanly without preamble. Output ONLY the translated text:\n\n${finalSpeechText}`, 
            context: finalSpeechText 
          })
        });
        const data = await res.json();
        if (data && data.response) {
          finalSpeechText = data.response;
        }
      }

      setAudioState({ isPlaying: true, isPaused: false, progress: 0, text: "Initializing audio stream..." });

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(finalSpeechText);
      utterance.lang = speechLanguage; 
      utterance.rate = 0.95;

      utterance.onboundary = (e) => {
        setAudioState(prev => ({ 
          ...prev, 
          progress: Math.min(100, Math.round((e.charIndex / finalSpeechText.length) * 100)) 
        }));
      };

      utterance.onend = () => {
        setAudioState({ isPlaying: false, isPaused: false, progress: 0, text: "" });
      };

      utterance.onerror = () => {
        setAudioState({ isPlaying: false, isPaused: false, progress: 0, text: "TTS failure." });
      };

      speechUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setAudioState({ isPlaying: true, isPaused: false, progress: 0, text: "Streaming output..." });
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

            <div className={`h-full transition-all duration-300 ease-in-out overflow-hidden border-l ${isLight ? 'border-slate-200 bg-white/50' : 'border-white/10 bg-black/40'} ${isRightOpen ? 'w-[360px]' : 'w-0'}`}>
              <div className="w-[360px] h-full flex flex-col overflow-hidden">
                <div className={`p-2 border-b flex flex-shrink-0 ${isLight ? 'border-slate-200 bg-black/5' : 'border-white/10 bg-black/60'}`}>
                  <button onClick={() => setActiveRightTab('copilot')} className={`flex-1 py-1.5 flex justify-center items-center gap-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest ${activeRightTab==='copilot'?'bg-white/10 text-white font-bold':'text-slate-500 hover:bg-white/5 transition-colors'}`}><MessageSquare size={12} /> Copilot</button>
                  <button onClick={() => setActiveRightTab('notebook')} className={`flex-1 py-1.5 flex justify-center items-center gap-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest ${activeRightTab==='notebook'?'bg-white/10 text-white font-bold':'text-slate-500 hover:bg-white/5 transition-colors'}`}><BookMarked size={12} /> Notes</button>
                  <button onClick={() => setActiveRightTab('audio')} className={`flex-1 py-1.5 flex justify-center items-center gap-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest ${activeRightTab==='audio'?'bg-white/10 text-white font-bold':'text-slate-500 hover:bg-white/5 transition-colors'}`}><Volume2 size={12} /> Stream</button>
                </div>

                <div className="flex-grow overflow-y-auto p-4 custom-scrollbar flex flex-col">
                  {activeRightTab === 'copilot' && (
                    <>
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

                      {(activeSelectionText || activeBase64Image) && (
                        <div className="mb-4 bg-black/40 border border-white/10 p-4 rounded-xl shadow-lg animate-fadeIn select-none">
                          <div className="flex justify-between items-center mb-3">
                            <span className={`text-[10px] font-mono uppercase tracking-widest font-bold ${themeClasses.accentText}`}>Targeted Selection</span>
                            <button onClick={()=>{setActiveSelectionText(""); setActiveBase64Image(null); setAiResponseBuffer("");}} className="bg-white/5 p-1 rounded-full hover:bg-white/10">
                              <X size={11} className="text-slate-400" />
                            </button>
                          </div>
                          
                          {activeBase64Image ? (
                            <img src={`data:image/jpeg;base64,${activeBase64Image}`} alt="Crop Frame" className="w-full rounded-lg border border-white/10 mb-3 shadow-inner"/>
                          ) : (
                            <div className="bg-black/40 p-3 rounded-lg border border-white/5 mb-3 max-h-24 overflow-y-auto custom-scrollbar">
                              <p className={`text-xs font-serif italic text-slate-300 border-l pl-2 select-text ${themeClasses.accentBorder}`}>"{activeSelectionText}"</p>
                            </div>
                          )}

                          {!aiResponseBuffer && !isAiEvaluating ? (
                            <div className="grid grid-cols-2 gap-2">
                              <button onClick={()=>executeContextQuery(activeSelectionText, "Explain this formulation or statement accurately.")} className="py-2 bg-white/5 hover:bg-white/10 text-[10px] font-bold font-mono uppercase text-slate-300 rounded-lg border border-white/5 transition-all">Explain</button>
                              <button onClick={()=>executeContextQuery(activeSelectionText, "Identify potential theoretical bottlenecks or limitations.")} className="py-2 bg-white/5 hover:bg-white/10 text-[10px] font-bold font-mono uppercase text-slate-300 rounded-lg border border-white/5 transition-all">Critique</button>
                            </div>
                          ) : (
                            <div className="bg-black/40 p-3 rounded-lg border border-white/10 mt-1">
                              {isAiEvaluating ? <div className={`text-[10px] font-mono tracking-widest uppercase animate-pulse ${themeClasses.accentText}`}>Running Inferences...</div> : 
                                <>
                                  <p className="text-xs text-slate-300 leading-relaxed select-text">{aiResponseBuffer}</p>
                                  <button onClick={saveToGlobalVault} className="mt-3 w-full py-2 bg-white/5 hover:bg-white/10 text-white text-[10px] uppercase tracking-widest font-bold font-mono rounded-lg flex justify-center items-center gap-1.5 border border-white/10 transition-all"><Save size={12} /> Store Insight</button>
                                </>
                              }
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex-grow space-y-3">
                        {chatHistory.map((msg, i) => (
                          <div key={i} className={`p-4 rounded-xl border ${msg.role === 'user' ? 'bg-black/20 border-white/5 ml-4' : 'bg-black/5 border-white/10 mr-4'}`}>
                            <div className="text-[9px] font-mono uppercase tracking-widest mb-1.5 opacity-50">{msg.role === 'user' ? 'You' : 'RAG Copilot'}</div>
                            {msg.image && <img src={`data:image/jpeg;base64,${msg.image}`} alt="Attachment" className="w-full rounded-lg mb-2.5 border border-white/10 shadow-md"/>}
                            <p className="text-xs font-light whitespace-pre-wrap leading-relaxed select-text">{msg.content}</p>
                          </div>
                        ))}
                        {isAgentTyping && <div className={`text-[10px] font-mono animate-pulse ml-1 ${themeClasses.accentText}`}>Evaluating state data...</div>}
                      </div>
                    </>
                  )}

                  {activeRightTab === 'notebook' && (
                    <div className="space-y-4 select-none">
                      <div className="p-3 bg-black/20 border border-white/5 rounded-xl flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-mono text-[10px] uppercase tracking-widest">Supabase Vault Notes</span>
                        <Database size={13} className="text-cyan-400" />
                      </div>

                      <form onSubmit={handleManualSaveNote} className="space-y-2.5 p-3.5 bg-black/30 border border-white/10 rounded-2xl">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">Add Note to Database</div>
                        {noteSaveStatus && (
                          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono flex items-center gap-1.5">
                            <CheckCircle2 size={13} /> {noteSaveStatus}
                          </div>
                        )}
                        <div>
                          <input 
                            type="text" 
                            value={manualNoteSource} 
                            onChange={(e) => setManualNoteSource(e.target.value)}
                            placeholder="Source Label..."
                            className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white outline-none"
                          />
                        </div>
                        <div>
                          <textarea 
                            rows="2"
                            value={manualNoteText} 
                            onChange={(e) => setManualNoteText(e.target.value)}
                            placeholder="Type observation or commentary..."
                            className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white outline-none resize-none"
                            required
                          />
                        </div>
                        <button 
                          type="submit"
                          className={`w-full py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center justify-center gap-1.5 shadow-md ${themeClasses.accentBg}`}
                        >
                          <Save size={13} /> Commit Note to Cloud DB
                        </button>
                      </form>

                      <div className="space-y-2">
                        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Supabase Archive ({vaultNotesList.length})</div>
                        {vaultNotesList.length === 0 ? (
                          <div className="text-xs text-slate-500 text-center py-6 font-mono">No notes stored in database yet.</div>
                        ) : (
                          vaultNotesList.map(note => (
                            <div key={note.id} className="p-3.5 bg-black/40 border border-white/5 rounded-xl shadow-md relative group">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-bold">{note.source} (p. {note.page_number})</span>
                                <button onClick={() => handleDeleteVaultNote(note.id)} className="text-slate-500 hover:text-rose-400 transition-colors" title="Delete Note">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                              {note.image && <img src={`data:image/jpeg;base64,${note.image}`} alt="Note Attachment" className="w-full my-2 rounded-lg border border-white/10 shadow-sm"/>}
                              {note.text && <p className="text-xs font-serif text-slate-200 leading-relaxed my-1 select-text">{note.text}</p>}
                              {note.insight && <div className="text-[11px] text-slate-400 mt-2 bg-black/60 border border-white/5 p-2 rounded-lg select-text">{note.insight}</div>}
                              <div className="text-[8px] font-mono text-slate-600 mt-1">{note.created_at?.substring(0, 10)}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {activeRightTab === 'audio' && (
                    <div className="flex flex-col h-full items-center justify-center p-4 space-y-6 select-none">
                      <div className="relative w-32 h-32 rounded-full border border-white/5 flex items-center justify-center bg-black/40">
                        {audioState.isPlaying && <div className={`absolute inset-[-2px] rounded-full border-2 border-t-transparent animate-spin ${themeClasses.accentBorder}`}/>}
                        <Volume2 size={40} className={audioState.isPlaying && !audioState.isPaused ? `${themeClasses.accentText} animate-pulse` : 'text-slate-600'} />
                      </div>
                      
                      <div className="text-center w-full bg-black/20 p-5 rounded-2xl border border-white/5 shadow-md">
                        <h3 className="text-xs font-bold text-white tracking-widest uppercase font-mono mb-1">Document Speech Engine</h3>
                        <p className="text-[11px] text-slate-500 mb-4 font-light leading-normal">{audioState.text || "Translates document text directly into speech synthesis streams."}</p>
                        
                        <select value={speechLanguage} onChange={e=>setSpeechLanguage(e.target.value)} className="w-full bg-[#0a0a0a] text-xs text-slate-300 border border-white/10 rounded-xl px-3 py-2.5 outline-none font-mono mb-4 cursor-pointer">
                          <option value="en-US">English</option>
                          <option value="es-ES">Spanish</option>
                          <option value="fr-FR">French</option>
                          <option value="de-DE">German</option>
                          <option value="ja-JP">Japanese</option>
                          <option value="zh-CN">Chinese</option>
                        </select>

                        <div className="w-full bg-black border border-white/5 h-1.5 rounded-full overflow-hidden mb-5">
                          <div className={`h-full transition-all duration-300 ${themeClasses.accentBg}`} style={{width: `${audioState.progress}%`}}/>
                        </div>

                        <div className="flex gap-2">
                          <button onClick={toggleAudio} className={`flex-1 py-3.5 rounded-xl flex items-center justify-center gap-1.5 font-mono uppercase tracking-widest text-[10px] font-bold transition-all border ${audioState.isPlaying ? (audioState.isPaused ? `${themeClasses.accentBg} text-white border-transparent` : 'bg-amber-500/10 text-amber-400 border-amber-500/20') : `${themeClasses.accentBg} text-white border-transparent hover:opacity-90`}`}>
                            {audioState.isPlaying ? (audioState.isPaused ? <><Play size={12} fill="currentColor" /> Resume</> : <><Pause size={12} fill="currentColor" /> Pause</>) : <><Play size={12} fill="currentColor" /> Start Audio</>}
                          </button>
                          {audioState.isPlaying && (
                            <button onClick={stopAudio} className="px-4 py-3.5 rounded-xl flex items-center justify-center gap-1.5 font-mono uppercase tracking-widest text-[10px] font-bold transition-all border bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20">
                              <Square size={12} fill="currentColor" /> Stop
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {activeRightTab === 'copilot' && (
                  <div className={`p-3 border-t flex-shrink-0 ${isLight ? 'border-slate-200 bg-white/50' : 'border-white/10 bg-black/40'}`}>
                    <form onSubmit={handleChatSubmit} className="flex flex-col gap-2">
                      <div className="flex items-center bg-black/20 border border-white/10 rounded-xl p-1 focus-within:border-white/30 transition-colors shadow-inner">
                        <Search size={14} className="text-slate-600 ml-2.5" />
                        <input 
                          type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Query document contents..."
                          className="flex-grow bg-transparent text-xs text-white px-3 py-2 outline-none font-sans" disabled={isAgentTyping}
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