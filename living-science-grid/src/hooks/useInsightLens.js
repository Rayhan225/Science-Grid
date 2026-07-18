import { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

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

  useEffect(() => {
    const fetchSavedSessions = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/workspaces');
        if (res.ok) setSessionHistory(await res.json());
      } catch (err) {
        console.warn("Unable to establish handshake with workspace ledger.");
      }
    };
    fetchSavedSessions();
  }, []);

  const executeExtractionPipeline = async (file) => {
    cancelRef.current = false;
    setIsGenerating(true); 
    setPipelineProgress(5); 
    setStatus("Parsing binary streams...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const totalPages = pdf.numPages;
      const newWorkspaceId = `lens_${Date.now()}`;
      
      let synthesizedWorkspace = {
        id: newWorkspaceId, 
        title: file.name,
        timestamp: new Date().toLocaleDateString(), 
        lastAccessed: new Date().toLocaleTimeString(),
        isPinned: false, 
        paperSummary: "Processing dynamic analysis...", 
        chatHistory: [],
        metadata: { title: file.name, journal: "Extracted Matrix", authors: "Pending Verification", year: new Date().getFullYear().toString() },
        totalPages: totalPages, 
        stateData: { sections: [], paperMemory: {} }
      };

      setPaperData(synthesizedWorkspace);

      for (let i = 1; i <= totalPages; i++) {
        if (cancelRef.current) break;
        setStatus(`Indexing matrices: Page ${i}/${totalPages}`);
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

        // Iterative step fallback matching
        setPaperData({ ...synthesizedWorkspace });
      }

      // Final synchronization block commit to Supabase via Node API backend middleware
      await fetch('http://localhost:5000/api/workspaces', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(synthesizedWorkspace)
      });

      setSessionHistory(prev => [synthesizedWorkspace, ...prev.filter(s => s.id !== newWorkspaceId)]);
      setStatus("Ready"); 
      setIsGenerating(false);
    } catch (err) {
      console.error(err);
      setStatus("Pipeline runtime exception."); 
      setIsGenerating(false);
    }
  };

  const addAnnotationLine = (pageNum, lineObj) => {
    setAnnotations(prev => ({ ...prev, [pageNum]: [...(prev[pageNum] || []), lineObj] }));
    setRedoStack(prev => ({ ...prev, [pageNum]: [] }));
  };

  const undoAnnotation = (pageNum) => {
    setAnnotations(prev => {
      const lines = prev[pageNum] || [];
      if (lines.length === 0) return prev;
      setRedoStack(rs => ({ ...rs, [pageNum]: [...(rs[pageNum] || []), lines[lines.length - 1]] }));
      return { ...prev, [pageNum]: lines.slice(0, -1) };
    });
  };

  const redoAnnotation = (pageNum) => {
    setRedoStack(prev => {
      const redos = prev[pageNum] || [];
      if (redos.length === 0) return prev;
      setAnnotations(an => ({ ...an, [pageNum]: [...(an[pageNum] || []), redos[redos.length - 1]] }));
      return { ...prev, [pageNum]: redos.slice(0, -1) };
    });
  };

  const eraseAnnotations = (pageNum) => {
    setAnnotations(prev => ({ ...prev, [pageNum]: [] }));
    setRedoStack(prev => ({ ...prev, [pageNum]: [] }));
  };

  return {
    paperData, setPaperData, status, setStatus, isGenerating, pipelineProgress,
    sessionHistory, chatHistory, setChatHistory, executeExtractionPipeline,
    annotations, addAnnotationLine, undoAnnotation, redoAnnotation, eraseAnnotations
  };
}