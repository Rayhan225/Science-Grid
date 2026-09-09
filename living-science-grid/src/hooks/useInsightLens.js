// src/hooks/useInsightLens.js
import { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `[https://unpkg.com/pdfjs-dist@$](https://unpkg.com/pdfjs-dist@$){pdfjsLib.version}/build/pdf.worker.min.mjs`;

const BACKEND_URL = "[http://127.0.0.1:8000](http://127.0.0.1:8000)";
const MAJOR_SECTIONS = /^(abstract|introduction|background|literature\s+review|methodology|methods|experimental\s+setup|results|discussion|conclusion|references)$/i;

export function useInsightLens() {
  const [paperData, setPaperData] = useState(null);
  const [status, setStatus] = useState("Ready");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [annotations, setAnnotations] = useState({});
  const [redoStack, setRedoStack] = useState({});

  const cancelRef = useRef(false);

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
    fetchSavedSessions();
  }, [fetchSavedSessions]);

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
    setStatus("Ready");
  };

  const executeExtractionPipeline = async (file, existingFileId = null) => {
    cancelRef.current = false;
    resetWorkspaceState();
    setIsGenerating(true); 
    setPipelineProgress(5); 
    setStatus("Parsing document structure...");

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
        setStatus(`Indexing: Page ${i}/${totalPages}`);
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

      await saveWorkspaceToDB(synthesizedWorkspace, [], {});
      setStatus("Ready"); 
      setIsGenerating(false);
    } catch (err) {
      console.error(err);
      setStatus("Pipeline runtime exception."); 
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

  return {
    paperData, setPaperData, status, setStatus, isGenerating, pipelineProgress,
    sessionHistory, chatHistory, setChatHistory, executeExtractionPipeline,
    annotations, setAnnotations, addAnnotationLine, undoAnnotation, redoAnnotation, eraseAnnotations,
    saveWorkspaceToDB, resetWorkspaceState, renameSession, togglePinSession, deleteSession, fetchSavedSessions
  };
}