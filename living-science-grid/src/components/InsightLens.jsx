import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  Sparkles, BookOpen, ChevronLeft, ChevronRight, Search, Send, 
  RefreshCw, ListTree, Highlighter, X, Crop, BookMarked, 
  MessageSquare, Trash2, Database, History, LayoutTemplate, 
  Play, Square, Volume2, ScanSearch, PenTool, Save, Undo2, 
  Redo2, Eraser, FileImage, ZoomIn, ZoomOut, UploadCloud, Orbit, 
  CloudDownload, BrainCircuit
} from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useInsightLens } from '../hooks/useInsightLens';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const layoutEngineOverrides = `
  /* Premium Minimalist Scrollbars */
  .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(16, 185, 129, 0.4); }

  /* High-End Document Viewport Layout */
  .pdf-render-canvas-viewport { display: flex; justify-content: center; width: 100%; padding-bottom: 40px; }
  .pdf-render-canvas-viewport .react-pdf__Page { 
    box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.9) !important; 
    border: 1px solid rgba(255, 255, 255, 0.06) !important; 
    background-color: #ffffff;
    position: relative;
  }
  
  /* CRITICAL: UNBLOCKED NATIVE TEXT INTERACTION LAYER */
  .react-pdf__Page__textContent { pointer-events: auto !important; z-index: 10 !important; mix-blend-mode: multiply; }
  .react-pdf__Page__textContent > span { color: transparent !important; cursor: text !important; }
  ::selection { background: rgba(16, 185, 129, 0.35) !important; color: transparent !important; }
  
  .pdf-thumbnail { transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease; cursor: pointer; }
  .pdf-thumbnail:hover { transform: scale(1.04); border-color: #10b981; }
`;

export default function InsightLens() {
  // Collapsible Sidebars System State
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [leftSidebarTab, setLeftSidebarTab] = useState('index'); // index | thumbnails | ledger | vault
  const [activeRightTab, setActiveRightTab] = useState('copilot'); // copilot | notebook | audio
  
  // Document Manipulation Parameters
  const [pdfFile, setPdfFile] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [interactionMode, setInteractionMode] = useState('read'); // read | crop | highlight | draw
  const [activeColor, setActiveColor] = useState('#eab308'); // Default Amber Highlight

  // Extraction Focus Contexts
  const [activeSelectionText, setActiveSelectionText] = useState("");
  const [activeBase64Image, setActiveBase64Image] = useState(null);
  
  // Image Region Snipping Anchors
  const [isDrawingCrop, setIsDrawingCrop] = useState(false);
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });
  const [cropCurrent, setCropCurrent] = useState({ x: 0, y: 0 });

  // Vector Markup State
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState(null);
  
  // Storage & Application States
  const [vaultFiles, setVaultFiles] = useState([]);
  const [notebookEntries, setNotebookEntries] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [aiResponseBuffer, setAiResponseBuffer] = useState("");
  const [isAiEvaluating, setIsAiEvaluating] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState('en-US');
  const [audioState, setAudioState] = useState({ isPlaying: false, progress: 0, text: "" });

  // Native Target Element References
  const annotationCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const pdfWrapperRef = useRef(null);

  const {
    paperData, setPaperData, status, setStatus, isGenerating, pipelineProgress,
    sessionHistory, chatHistory, setChatHistory, executeExtractionPipeline,
    annotations, addAnnotationLine, undoAnnotation, redoAnnotation, eraseAnnotations
  } = useInsightLens();

  useEffect(() => { return () => window.speechSynthesis.cancel(); }, []);

  // --- VAULT INGESTION CONTEXT HOOKS ---
  const loadFromVault = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/vault/files');
      if (res.ok) setVaultFiles(await res.json());
    } catch (err) {
      console.error("Repository sync connection failure:", err);
    }
  };

  const handleVaultFileSelect = async (fileData) => {
    if (fileData.isMock) return alert("System placeholder instance. Mount a local PDF matrix.");
    setStatus(`Streaming ${fileData.title} from Central Vault...`);
    try {
      const res = await fetch(fileData.url);
      const blob = await res.blob();
      const file = new File([blob], fileData.title, { type: 'application/pdf' });
      setPdfFile(file);
      await executeExtractionPipeline(file);
    } catch (err) {
      setStatus("Vault interface failed.");
    }
  };

  const handleDocumentIngestion = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPdfFile(file);
    await executeExtractionPipeline(file);
  };

  // --- NATIVE TEXT CAPTURE (READ MODE) ---
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

  // --- VECTOR CANVAS DRAWING CONTROLLERS ---
  const getCanvasMousePos = (e, canvasElement) => {
    const rect = canvasElement.getBoundingClientRect();
    const scaleX = canvasElement.width / rect.width;
    const scaleY = canvasElement.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const handleCanvasMouseDown = (e) => {
    if (interactionMode === 'read') return;
    
    if (interactionMode === 'crop') {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setCropStart(pos); setCropCurrent(pos); setIsDrawingCrop(true);
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
        x: Math.min(cropStart.x, cropCurrent.x), y: Math.min(cropStart.y, cropCurrent.y),
        w: Math.abs(cropCurrent.x - cropStart.x), h: Math.abs(cropCurrent.y - cropStart.y)
      };
      if (box.w > 20 && box.h > 25) {
        setInteractionMode('read');
        const pdfCanvas = document.querySelector('.react-pdf__Page__canvas');
        if (pdfCanvas) {
          const rect = pdfCanvas.getBoundingClientRect();
          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = box.w * (pdfCanvas.width / rect.width);
          cropCanvas.height = box.h * (pdfCanvas.height / rect.height);
          cropCanvas.getContext('2d').drawImage(pdfCanvas, box.x * (pdfCanvas.width / rect.width), box.y * (pdfCanvas.height / rect.height), cropCanvas.width, cropCanvas.height, 0, 0, cropCanvas.width, cropCanvas.height);
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

  const renderCanvas = useCallback(() => {
    const canvas = annotationCanvasRef.current;
    const pdfCanvas = document.querySelector('.react-pdf__Page__canvas');
    if (!canvas || !pdfCanvas) return;

    canvas.width = pdfCanvas.width; canvas.height = pdfCanvas.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    const pathsToDraw = [...(annotations[pageNumber] || [])];
    if (currentPath) pathsToDraw.push(currentPath);

    pathsToDraw.forEach(path => {
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      if (path.tool === 'highlight') {
        ctx.lineWidth = 18 * scale; ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.3;
      } else {
        ctx.lineWidth = 3 * scale; ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1.0;
      }
      path.points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.stroke();
    });
  }, [annotations, pageNumber, currentPath, scale]);

  useEffect(() => { setTimeout(renderCanvas, 100); }, [pageNumber, renderCanvas, scale]);

  // --- LOCAL OLLAMA INFERENCE CONSTRAINTS ---
  const executeContextQuery = async (text, promptOverride) => {
    setIsAiEvaluating(true); setAiResponseBuffer("");
    try {
      const isImg = activeBase64Image;
      const payload = { 
        model: isImg ? "llava" : "llama3", stream: false,
        prompt: isImg ? `Analyze this structural element: ${promptOverride}` : `Strict RAG Context Validation. Use ONLY the following text matrix to answer. Text: '${text}'. Prompt: ${promptOverride}`
      };
      if (isImg) payload.images = [isImg];
      const res = await fetch("http://localhost:11434/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      setAiResponseBuffer(data.response.trim());
    } catch(err) { setAiResponseBuffer("Error: Local AI core offline."); } 
    finally { setIsAiEvaluating(false); }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !paperData) return;
    const userMessage = { role: 'user', content: chatInput, image: activeBase64Image };
    const newHistory = [...chatHistory, userMessage];
    setChatHistory(newHistory); setChatInput(""); setIsAgentTyping(true);

    const contextData = paperData.stateData.paperMemory[pageNumber.toString()] || "";
    try {
      if (activeBase64Image) {
         const res = await fetch("http://localhost:11434/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "llava", prompt: `Context: ${contextData.slice(0,1000)}\nQuestion: ${chatInput}`, images: [activeBase64Image], stream: false }) });
         setChatHistory([...newHistory, { role: 'assistant', content: (await res.json()).response }]);
      } else {
         const res = await fetch("http://127.0.0.1:8000/api/research/swarm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: chatInput, context: contextData.slice(0, 4000) }) });
         setChatHistory([...newHistory, { role: 'assistant', content: (await res.json()).response }]);
      }
    } catch (err) { setChatHistory([...newHistory, { role: 'assistant', content: "Local execution pipeline offline." }]); } 
    finally { setIsAgentTyping(false); setActiveBase64Image(null); setActiveSelectionText(""); }
  };

  const saveToGlobalVault = async () => {
    const entry = { id: Date.now(), page_number: pageNumber, text: activeSelectionText, image: activeBase64Image, insight: aiResponseBuffer };
    setNotebookEntries(prev => [...prev, entry]);
    try { await fetch('http://localhost:5000/api/vault/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: paperData.title, type: 'insight_lens', data: entry }) }); } catch(e) {}
    setActiveSelectionText(""); setActiveBase64Image(null); setAiResponseBuffer(""); setActiveRightTab('notebook');
  };

  const toggleAudio = async () => {
    if (audioState.isPlaying) {
      window.speechSynthesis.cancel();
      setAudioState({ ...audioState, isPlaying: false, progress: 0 }); return;
    }
    const sourceText = paperData?.stateData.paperMemory[pageNumber.toString()];
    if (!sourceText) return;
    setAudioState({ ...audioState, isPlaying: true, text: "Processing translation..." });
    try {
      const targetLang = { "en-US": "English", "es-ES": "Spanish", "fr-FR": "French", "de-DE": "German", "ja-JP": "Japanese", "zh-CN": "Chinese" }[speechLanguage];
      let finalSpeechText = sourceText.slice(0, 2000);
      if (speechLanguage !== 'en-US') {
        const res = await fetch("http://localhost:11434/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "llama3", prompt: `Translate to ${targetLang}. Output ONLY translation.\n\n${finalSpeechText}`, stream: false }) });
        finalSpeechText = (await res.json()).response;
      }
      setAudioState({ ...audioState, isPlaying: true, text: "Initializing audio stream..." });
      const utterance = new SpeechSynthesisUtterance(finalSpeechText);
      utterance.lang = speechLanguage; utterance.rate = 0.95;
      utterance.onboundary = (e) => setAudioState(prev => ({ ...prev, progress: Math.min(100, Math.round((e.charIndex / finalSpeechText.length) * 100)) }));
      utterance.onend = () => setAudioState({ isPlaying: false, progress: 0, text: "" });
      window.speechSynthesis.speak(utterance);
      setAudioState({ isPlaying: true, progress: 0, text: "Streaming output..." });
    } catch (e) { setAudioState({ isPlaying: false, progress: 0, text: "TTS failure." }); }
  };

  return (
    <>
      <style>{layoutEngineOverrides}</style>
      <div className="flex h-[calc(100vh-65px)] w-full bg-[#050505] text-slate-300 overflow-hidden font-sans relative select-none">
        
        {/* === CONTROL INTERFACE PANEL: LEFT (COLLAPSIBLE) === */}
        <div className={`h-full bg-[#0a0a0a]/90 backdrop-blur-xl border-r border-white/5 flex flex-col z-20 transition-all duration-300 relative ${isLeftPanelOpen ? 'w-72' : 'w-0'}`}>
          <div className="w-full h-full overflow-hidden flex flex-col">
            <div className="p-3 border-b border-white/5 flex justify-center gap-2 flex-shrink-0 bg-[#000000]">
              <button onClick={() => setLeftSidebarTab('index')} className={`flex-1 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest transition-colors ${leftSidebarTab==='index'?'bg-white/10 text-white':'text-slate-500 hover:bg-white/5'}`}>Structure</button>
              <button onClick={() => setLeftSidebarTab('thumbnails')} className={`flex-1 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest transition-colors ${leftSidebarTab==='thumbnails'?'bg-blue-500/10 text-blue-400':'text-slate-500 hover:bg-white/5'}`}>Pages</button>
              <button onClick={() => setLeftSidebarTab('ledger')} className={`flex-1 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest transition-colors ${leftSidebarTab==='ledger'?'bg-cyan-500/10 text-cyan-400':'text-slate-500 hover:bg-white/5'}`}>Sessions</button>
              <button onClick={() => { setLeftSidebarTab('vault'); loadFromVault(); }} className={`flex-1 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest transition-colors ${leftSidebarTab==='vault'?'bg-purple-500/10 text-purple-400':'text-slate-500 hover:bg-white/5'}`}>Vault</button>
            </div>

            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
              {leftSidebarTab === 'thumbnails' && pdfFile && (
                <div className="flex flex-col items-center gap-4">
                  <Document file={pdfFile}>
                    {Array.from(new Array(paperData?.totalPages || 0), (el, index) => (
                      <div key={index} onClick={() => setPageNumber(index + 1)} className={`pdf-thumbnail relative mb-2 p-1 border border-2 rounded-lg ${pageNumber === index + 1 ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-white/5'}`}>
                        <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 font-bold">{index + 1}</span>
                        <Page pageNumber={index + 1} width={115} renderTextLayer={false} renderAnnotationLayer={false} />
                      </div>
                    ))}
                  </Document>
                </div>
              )}

              {leftSidebarTab === 'index' && paperData && (
                <div className="space-y-4">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold block px-1">Extracted Chapters</span>
                  <div className="space-y-1">
                    {paperData.stateData.sections.map((sec, idx) => (
                      <button key={idx} onClick={() => setPageNumber(sec.page)} className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex justify-between transition-all ${pageNumber === sec.page ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:bg-white/5'}`}>
                        <span className="truncate pr-2">{sec.title}</span><span className="opacity-40 font-mono">P.{sec.page}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {leftSidebarTab === 'ledger' && (
                <div className="space-y-2">
                  {sessionHistory.length === 0 ? <p className="text-xs text-slate-500 text-center mt-4">Database trace empty.</p> : 
                    sessionHistory.map(s => (
                      <div key={s.id} onClick={() => { setPaperData(s); setChatHistory(s.chatHistory||[]); }} className={`p-4 bg-white/[0.01] border rounded-xl cursor-pointer transition-all ${paperData?.id === s.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/5 hover:border-white/10'}`}>
                        <h4 className="text-xs font-bold text-white truncate">{s.title}</h4>
                        <p className="text-[9px] font-mono text-slate-500 mt-1">{s.timestamp}</p>
                      </div>
                    ))
                  }
                </div>
              )}

              {leftSidebarTab === 'vault' && (
                <div className="space-y-2">
                   {vaultFiles.map(file => (
                     <div key={file.id} onClick={() => handleVaultFileSelect(file)} className="p-4 bg-white/[0.01] border border-white/5 hover:border-purple-500/30 rounded-xl cursor-pointer transition-all group">
                        <div className="flex items-start gap-3">
                          <CloudDownload size={15} className="text-slate-500 group-hover:text-purple-400 mt-0.5 flex-shrink-0"/>
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
          
          {/* FLOATING TRIGGER: LEFT SIDEBAR */}
          <button onClick={() => setIsLeftPanelOpen(false)} className="absolute -right-4 top-1/2 transform -translate-y-1/2 z-50 bg-[#141414] border border-white/10 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 shadow-2xl transition-all">
             <ChevronLeft size={14}/>
          </button>
        </div>

        {/* === MATRIX CENTER VIEWPORT PLANE === */}
        <div className="flex-grow flex flex-col relative bg-[#0d0d0d] min-w-0 h-full">
          
          {/* Top Panel Infrastructure */}
          <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#0a0a0a] z-10 flex-shrink-0">
            <div className="flex items-center gap-3">
              {!isLeftPanelOpen && <button onClick={() => setIsLeftPanelOpen(true)} className="text-slate-400 hover:text-white bg-white/5 p-2 rounded-lg transition-colors"><LayoutTemplate size={14}/></button>}
              <span className="font-serif text-white text-xs uppercase font-mono tracking-widest truncate max-w-[240px]">{paperData?.title || "InsightLens Portal"}</span>
            </div>

            {paperData && (
              <div className="flex items-center gap-4">
                <div className="flex bg-black/40 rounded-xl p-1 border border-white/5 text-[10px] font-mono uppercase">
                  <button onClick={() => setInteractionMode('read')} className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${interactionMode === 'read' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}><BookOpen size={12}/> Read</button>
                  <button onClick={() => setInteractionMode('crop')} className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${interactionMode === 'crop' ? 'bg-purple-500 text-black shadow-md' : 'text-slate-400 hover:text-white'}`}><Crop size={12}/> Snip</button>
                  <div className="w-px h-4 bg-white/10 mx-1.5 self-center"></div>
                  <button onClick={() => {setInteractionMode('highlight'); setActiveColor('#eab308');}} className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${interactionMode === 'highlight' ? 'bg-yellow-500 text-black shadow-md' : 'text-slate-400 hover:text-white'}`}><Highlighter size={12}/> Mark</button>
                  <button onClick={() => {setInteractionMode('draw'); setActiveColor('#ef4444');}} className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${interactionMode === 'draw' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}><PenTool size={12}/> Draw</button>
                  
                  {(interactionMode === 'draw' || interactionMode === 'highlight') && (
                    <div className="flex items-center gap-1 ml-2 pl-2 border-l border-white/10">
                      <input type="color" value={activeColor} onChange={e=>setActiveColor(e.target.value)} className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"/>
                      <button onClick={()=>undoAnnotation(pageNumber)} className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded"><Undo2 size={12}/></button>
                      <button onClick={()=>redoAnnotation(pageNumber)} className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded"><Redo2 size={12}/></button>
                      <button onClick={()=>eraseAnnotations(pageNumber)} className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"><Eraser size={12}/></button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs font-mono bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                  <button onClick={() => setScale(s => Math.max(0.6, s - 0.1))} className="hover:text-white text-slate-400"><ZoomOut size={13}/></button>
                  <span className="w-10 text-center text-slate-300 text-[11px]">{Math.round(scale * 100)}%</span>
                  <button onClick={() => setScale(s => Math.min(2.5, s + 0.1))} className="hover:text-white text-slate-400"><ZoomIn size={13}/></button>
                  <div className="w-px h-4 bg-white/10 mx-0.5"></div>
                  <button disabled={pageNumber<=1} onClick={()=>setPageNumber(p=>p-1)} className="hover:text-white disabled:opacity-20 text-slate-400"><ChevronLeft size={14}/></button>
                  <span className="text-[11px] text-slate-300">{pageNumber} / {paperData.totalPages}</span>
                  <button disabled={pageNumber>=paperData.totalPages} onClick={()=>setPageNumber(p=>p+1)} className="hover:text-white disabled:opacity-20 text-slate-400"><ChevronRight size={14}/></button>
                </div>
              </div>
            )}
            
            {!isRightPanelOpen && paperData && (
               <button onClick={() => setIsRightPanelOpen(true)} className="text-slate-400 hover:text-white bg-white/5 p-2 rounded-lg transition-colors"><MessageSquare size={14}/></button>
            )}
          </div>

          {/* Core Scroll Viewport Layer */}
          <div 
            className="flex-grow overflow-y-auto p-8 flex flex-col items-center bg-[#050505] custom-scrollbar select-text"
            onMouseUp={handleNativeSelection}
          >
            {isGenerating && (
              <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 bg-black/90 p-8 rounded-3xl border border-emerald-500/20 z-50 shadow-2xl backdrop-blur-md">
                 <RefreshCw size={32} className="text-emerald-400 animate-spin"/>
                 <span className="text-xs font-mono uppercase text-emerald-400 tracking-widest">{status} ({pipelineProgress}%)</span>
              </div>
            )}

            {!paperData && !isGenerating ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 animate-fadeIn select-none">
                <div className="max-w-xl w-full text-center space-y-8">
                  <div className="relative w-20 h-24 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full animate-pulse"></div>
                    <div className="relative w-16 h-16 bg-[#0a0a0a] border border-emerald-500/20 rounded-2xl flex items-center justify-center shadow-xl">
                      <Orbit size={32} className="text-emerald-400" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h1 className="text-3xl font-serif text-white tracking-wide font-light">Insight<span className="text-emerald-400 font-medium">Lens</span> Platform</h1>
                    <p className="text-slate-500 text-xs font-light max-w-sm mx-auto leading-relaxed">
                      Enterprise document intelligence workspace. Mount a PDF structure to map relational metadata strings and run localized context inferences.
                    </p>
                  </div>

                  <label className="relative group block w-full max-w-xs mx-auto cursor-pointer mt-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all opacity-40"></div>
                    <div className="relative w-full bg-[#0a0a0a] border border-white/5 group-hover:border-emerald-500/30 rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-300 shadow-xl">
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleDocumentIngestion} accept=".pdf" />
                      <UploadCloud size={28} className="text-slate-600 group-hover:text-emerald-400 mb-3 transition-colors" />
                      <span className="text-xs font-bold font-mono text-white tracking-widest uppercase mb-1">Mount Matrix</span>
                      <span className="text-[9px] text-slate-600 font-mono tracking-widest uppercase">PDF Formats Verified</span>
                    </div>
                  </label>
                  
                  <div className="flex justify-center gap-4 mt-6 opacity-40">
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><BrainCircuit size={11}/> Chained RAG</span>
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Volume2 size={11}/> Audio TTS</span>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                ref={pdfWrapperRef}
                className="relative"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              >
                <Document file={pdfFile} className="pdf-render-canvas-viewport">
                  <Page pageNumber={pageNumber} scale={scale} renderTextLayer={true} renderAnnotationLayer={false} />
                </Document>
                
                {/* Vector Canvas Engine Layer */}
                <canvas 
                  ref={annotationCanvasRef} 
                  className="absolute top-0 left-0 w-full h-full z-20 mix-blend-normal"
                  style={{ pointerEvents: interactionMode === 'read' ? 'none' : 'auto' }}
                />

                {isDrawingCrop && (
                  <div className="absolute border border-dashed border-purple-500 bg-purple-500/10 z-50 pointer-events-none"
                    style={{ left: Math.min(cropStart.x, cropCurrent.x), top: Math.min(cropStart.y, cropCurrent.y), width: Math.abs(cropCurrent.x - cropStart.x), height: Math.abs(cropCurrent.y - cropStart.y) }}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* === COLLAPSIBLE CONTROL INTERFACE PANEL: RIGHT === */}
        {paperData && (
          <div className={`h-full bg-[#050505] border-l border-white/5 flex flex-col z-20 transition-all duration-300 relative ${isRightPanelOpen ? 'w-[380px]' : 'w-0'}`}>
            
            {/* FLOATING TRIGGER: RIGHT PANEL */}
            <button onClick={() => setIsRightPanelOpen(!isRightPanelOpen)} className="absolute -left-4 top-1/2 transform -translate-y-1/2 z-50 bg-[#141414] border border-white/10 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 shadow-2xl transition-all">
               <ChevronRight size={16}/>
            </button>

            <div className="w-full h-full overflow-hidden flex flex-col">
              <div className="h-14 border-b border-white/5 flex p-2 gap-1 flex-shrink-0 bg-[#000000]">
                <button onClick={() => setActiveRightTab('copilot')} className={`flex-1 py-1.5 flex items-center justify-center gap-1 rounded-full text-[10px] font-mono uppercase tracking-widest transition-colors ${activeRightTab==='copilot'?'bg-white/10 text-white':'text-slate-500 hover:bg-white/5'}`}><MessageSquare size={12}/> Copilot</button>
                <button onClick={() => setActiveRightTab('notebook')} className={`flex-1 py-1.5 flex items-center justify-center gap-1 rounded-full text-[10px] font-mono uppercase tracking-widest transition-colors ${activeRightTab==='notebook'?'bg-white/10 text-white':'text-slate-500 hover:bg-white/5'}`}><BookMarked size={12}/> Notes</button>
                <button onClick={() => setActiveRightTab('audio')} className={`flex-1 py-1.5 flex items-center justify-center gap-1 rounded-full text-[10px] font-mono uppercase tracking-widest transition-colors ${activeRightTab==='audio'?'bg-white/10 text-white':'text-slate-500 hover:bg-white/5'}`}><Volume2 size={12}/> Stream</button>
              </div>

              <div className="flex-grow overflow-y-auto p-4 custom-scrollbar flex flex-col bg-[#080808]">
                
                {/* COPILOT INFERENCE PLANE */}
                {activeRightTab === 'copilot' && (
                  <>
                    {(activeSelectionText || activeBase64Image) && (
                      <div className="mb-4 bg-[#0a0a0a] border border-white/10 p-4 rounded-xl shadow-lg animate-fadeIn select-none">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">Targeted Frame</span>
                          <button onClick={()=>{setActiveSelectionText(""); setActiveBase64Image(null); setAiResponseBuffer("");}} className="bg-white/5 p-1 rounded-full hover:bg-white/10"><X size={11} className="text-slate-400"/></button>
                        </div>
                        
                        {activeBase64Image ? (
                          <img src={`data:image/jpeg;base64,${activeBase64Image}`} alt="Crop Matrix" className="w-full rounded-lg border border-white/10 mb-3 shadow-inner"/>
                        ) : (
                          <div className="bg-black/40 p-3 rounded-lg border border-white/5 mb-3 max-h-24 overflow-y-auto custom-scrollbar">
                             <p className="text-xs font-serif italic text-slate-300 border-l border-emerald-500 pl-2 select-text">"{activeSelectionText}"</p>
                          </div>
                        )}

                        {!aiResponseBuffer && !isAiEvaluating ? (
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={()=>executeContextQuery(activeSelectionText, "Explain this statement precisely.")} className="py-2 bg-white/5 hover:bg-emerald-500/10 text-[10px] font-bold font-mono uppercase text-slate-300 rounded-lg border border-white/5 transition-all">Explain</button>
                            <button onClick={()=>executeContextQuery(activeSelectionText, "Find structural limitations or critical assumptions.")} className="py-2 bg-white/5 hover:bg-cyan-500/10 text-[10px] font-bold font-mono uppercase text-slate-300 rounded-lg border border-white/5 transition-all">Critique</button>
                          </div>
                        ) : (
                          <div className="bg-emerald-950/5 p-3 rounded-lg border border-emerald-500/10 mt-1">
                            {isAiEvaluating ? <div className="text-[10px] font-mono tracking-widest uppercase text-emerald-400 animate-pulse">Running Inferences...</div> : 
                             <>
                               <p className="text-xs text-slate-300 leading-relaxed select-text">{aiResponseBuffer}</p>
                               <button onClick={saveToGlobalVault} className="mt-3 w-full py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[10px] uppercase tracking-widest font-bold font-mono rounded-lg flex justify-center items-center gap-1.5 border border-purple-500/20 transition-all"><Save size={12}/> Store Insight</button>
                             </>
                            }
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex-grow space-y-3">
                      {chatHistory.map((msg, i) => (
                        <div key={i} className={`p-4 rounded-xl border ${msg.role === 'user' ? 'bg-[#0a0a0a] border-white/5 ml-4 shadow-sm' : 'bg-emerald-950/5 border-emerald-500/10 mr-4 shadow-sm'}`}>
                          <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">
                             {msg.role === 'user' ? 'You' : 'Fast RAG Copilot'}
                          </div>
                          {msg.image && <img src={`data:image/jpeg;base64,${msg.image}`} className="w-full rounded-lg mb-2.5 border border-white/10 shadow-md"/>}
                          <p className="text-xs font-light text-slate-200 whitespace-pre-wrap leading-relaxed select-text">{msg.content}</p>
                        </div>
                      ))}
                      {isAgentTyping && <div className="text-[10px] font-mono text-emerald-400 animate-pulse ml-1">Evaluating state data...</div>}
                    </div>
                  </>
                )}

                {/* LITERATURE WORKSPACE LABS */}
                {activeRightTab === 'notebook' && (
                  <div className="space-y-3 select-none">
                    <div className="p-3 bg-purple-950/10 border border-purple-500/10 rounded-xl flex items-center justify-between text-xs">
                      <span className="text-purple-400 font-mono text-[10px] uppercase tracking-widest">Global Matrix Ledger</span>
                      <Database size={13} className="text-purple-400"/>
                    </div>
                    {notebookEntries.map(note => (
                      <div key={note.id} className="p-4 bg-black/40 border border-white/5 rounded-xl shadow-md">
                         <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest font-bold">Landmark P. {note.page_number}</span>
                         {note.image && <img src={`data:image/jpeg;base64,${note.image}`} className="w-full my-2.5 rounded-lg border border-white/10 shadow-sm"/>}
                         {note.text && <p className="text-xs font-serif text-slate-400 italic my-2 border-l border-purple-500/20 pl-2 select-text">"{note.text}"</p>}
                         {note.insight && <div className="text-xs text-slate-300 mt-2 bg-black/80 border border-white/5 p-3 rounded-lg select-text">{note.insight}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {/* SYNTHESIS STREAM PLAYER */}
                {activeRightTab === 'audio' && (
                  <div className="flex flex-col h-full items-center justify-center p-4 space-y-6 select-none">
                    <div className="relative w-32 h-32 rounded-full border border-white/5 flex items-center justify-center bg-black/40">
                      {audioState.isPlaying && <div className="absolute inset-[-2px] rounded-full border-2 border-blue-500 border-t-transparent animate-spin"/>}
                      <Volume2 size={40} className={audioState.isPlaying ? "text-blue-400 animate-pulse" : "text-slate-600"}/>
                    </div>
                    
                    <div className="text-center w-full bg-black/20 p-5 rounded-2xl border border-white/5 shadow-md">
                      <h3 className="text-xs font-bold text-white tracking-widest uppercase font-mono mb-1">Matrix Speech Synthesizer</h3>
                      <p className="text-[11px] text-slate-500 mb-4 font-light leading-normal">Translates target buffer array directly into language pipelines.</p>
                      
                      <select value={speechLanguage} onChange={e=>setSpeechLanguage(e.target.value)} className="w-full bg-[#0a0a0a] text-xs text-slate-300 border border-white/10 rounded-xl px-3 py-2.5 outline-none font-mono mb-4 cursor-pointer">
                        <option value="en-US">English Direct</option>
                        <option value="es-ES">Spanish Pipeline</option>
                        <option value="fr-FR">French Pipeline</option>
                        <option value="de-DE">German Pipeline</option>
                        <option value="ja-JP">Japanese Pipeline</option>
                        <option value="zh-CN">Chinese Pipeline</option>
                      </select>

                      <div className="w-full bg-black border border-white/5 h-1.5 rounded-full overflow-hidden mb-5">
                         <div className="h-full bg-blue-500 transition-all duration-300" style={{width: `${audioState.progress}%`}}/>
                      </div>

                      <button onClick={toggleAudio} className={`w-full py-3.5 rounded-xl flex items-center justify-center gap-1.5 font-mono uppercase tracking-widest text-[10px] font-bold transition-all border ${audioState.isPlaying ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-600/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'}`}>
                        {audioState.isPlaying ? <><Square size={12} fill="currentColor"/> Terminate Stream</> : <><Play size={12} fill="currentColor"/> Connect Audio</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* FLOATING TEXT / GRAPH CONTEXT INPUT INPUT */}
              {activeRightTab === 'copilot' && (
                <div className="p-3 bg-[#050505] border-t border-white/5 flex-shrink-0">
                  <form onSubmit={handleChatSubmit} className="flex flex-col gap-2">
                    {activeBase64Image && (
                       <div className="relative w-12 h-12 rounded-lg border border-white/10 shadow-md animate-fadeIn">
                          <img src={`data:image/jpeg;base64,${activeBase64Image}`} className="w-full h-full object-cover rounded-lg"/>
                          <button type="button" onClick={() => setActiveBase64Image(null)} className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5 text-white shadow"><X size={8}/></button>
                       </div>
                    )}
                    <div className="flex items-center bg-[#0a0a0a] border border-white/10 rounded-xl p-1 focus-within:border-emerald-500/40 transition-colors shadow-inner">
                      <Search size={14} className="text-slate-600 ml-2.5" />
                      <input 
                        type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Query workspace database models..."
                        className="flex-grow bg-transparent text-xs text-white px-3 py-2 outline-none font-sans" disabled={isAgentTyping}
                      />
                      <button type="submit" disabled={!chatInput.trim() && !activeBase64Image} className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-black transition-colors disabled:opacity-20"><Send size={12}/></button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}