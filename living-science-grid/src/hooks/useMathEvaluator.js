import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { generatePaperSummary, extractRawEquations, analyzeSingleEquation, sanitizeDocument } from '../aiHelper';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export function useMathEvaluator(isBlindMode) {
  const [paperData, setPaperData] = useState(null);
  const [activeEqId, setActiveEqId] = useState(null);
  const [sliderValues, setSliderValues] = useState({});
  const [outputLogs, setOutputLogs] = useState({});
  const [chartData, setChartData] = useState({});
  const [status, setStatus] = useState("Ready");
  const [telemetry, setTelemetry] = useState({ totalPages: 0, isolatedPages: 0, rawFormulas: 0, validatedNodes: 0 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [pipelineEta, setPipelineEta] = useState(0);
  const [sessionHistory, setSessionHistory] = useState([]);

  const workerRef = useRef(null);
  const cancelRef = useRef(false);
  const stateRef = useRef({ activeEqId, paperData, sliderValues });

  // Sync state for WebWorker closures
  useEffect(() => {
    stateRef.current = { activeEqId, paperData, sliderValues };
  }, [activeEqId, paperData, sliderValues]);

  // Real-time ETA Countdown
  useEffect(() => {
    let interval;
    if (isGenerating && pipelineEta > 0) {
      interval = setInterval(() => {
        setPipelineEta(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isGenerating, pipelineEta]);

  // Persistent WebAssembly Worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('../pyodideWorker.js', import.meta.url), { type: 'module' });
    workerRef.current.onmessage = (event) => {
      const currentActiveId = stateRef.current.activeEqId;
      const currentPaperData = stateRef.current.paperData;
      const currentSliderVals = stateRef.current.sliderValues;

      if (event.data.type === "RESULT") {
        const resultText = event.data.payload.stdout;
        setOutputLogs(prev => ({ ...prev, [currentActiveId]: resultText }));
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
              return { ...prev, [currentActiveId]: newData.sort((a, b) => a.x - b.x) };
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
    return () => { if (workerRef.current) workerRef.current.terminate(); };
  }, []);

  const extractPagesFromDocument = async (file) => {
    let pages = [];
    if (file.type === "application/pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        pages.push({ pageNum: i, text: textContent.items.map(item => item.str).join('\n') });
      }
    } else {
      const text = await file.text();
      const chunks = text.match(/[\s\S]{1,2500}/g) || [];
      chunks.forEach((chunk, i) => pages.push({ pageNum: i + 1, text: chunk }));
    }
    return pages;
  };

  const updateHistoryState = (updatedWorkspace) => {
    setSessionHistory(prev => {
      const idx = prev.findIndex(s => s.id === updatedWorkspace.id);
      if (idx >= 0) {
        const newHist = [...prev];
        newHist[idx] = { ...updatedWorkspace, lastAccessed: new Date().toLocaleTimeString() };
        return newHist;
      }
      return [{ ...updatedWorkspace, isPinned: false, lastAccessed: new Date().toLocaleTimeString() }, ...prev];
    });
  };

  const saveWorkspaceToDB = async (sessionData, currentSliderVals, currentOutputLogs, currentChartData) => {
    try {
      await fetch('http://localhost:5000/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionData.id,
          title: sessionData.title,
          timestamp: sessionData.timestamp,
          lastAccessed: new Date().toISOString(),
          isPinned: sessionData.isPinned || false,
          paperSummary: sessionData.paperSummary,
          chatHistory: sessionData.chatHistory, 
          stateData: { 
            equations: sessionData.equations,
            sliderValues: currentSliderVals || {},
            outputLogs: currentOutputLogs || {},
            chartData: currentChartData || {}
          }
        })
      });
    } catch (err) { console.error("Database Sync Failed:", err); }
  };

  const restoreSession = async (sessionRecord) => {
    if (isGenerating) cancelRef.current = true;
    
    setPaperData(sessionRecord);
    setActiveEqId(sessionRecord.equations?.[0]?.id || null);
    setStatus("Workspace Restored.");
    
    if (sessionRecord.stateData) {
      setSliderValues(sessionRecord.stateData.sliderValues || {});
      setOutputLogs(sessionRecord.stateData.outputLogs || {});
      setChartData(sessionRecord.stateData.chartData || {});
    }

    updateHistoryState(sessionRecord);
  };

  const handleCloseWorkspace = () => {
    setPaperData(null); setActiveEqId(null);
    setTelemetry({ totalPages: 0, isolatedPages: 0, rawFormulas: 0, validatedNodes: 0 });
    setStatus("Ready");
    setIsGenerating(false);
    cancelRef.current = false;
  };

  const handleTerminateProcess = () => {
    cancelRef.current = true;
    setIsGenerating(false);
    setStatus("Process Suspended. Kept in ledger.");
    setPipelineProgress(0);
    setPipelineEta(0);
    
    setPaperData(current => {
      if (!current) return null;
      
      // Stop all currently pending equations and flip them to paused.
      let pausedEqs = current.equations.map(e => e.status !== 'complete' ? { ...e, status: 'paused' } : e);
      
      // If user suspended before any equations were mapped, we create a fallback stub so the session lives on in history
      if (pausedEqs.length === 0) {
        pausedEqs.push({
          id: `stub_${Date.now()}`,
          name: 'Pending Pipeline Sync',
          latex: '\\text{Process interrupted. Click resume to compile.}',
          status: 'paused',
          sourceText: current.rawText || 'Pending document mapping...'
        });
      }

      const updated = { ...current, equations: pausedEqs };
      updateHistoryState(updated);
      return updated;
    });
  };

  const executePipeline = async (allPages, skipRadar = false, workspaceTitle = "Untitled Matrix") => {
    cancelRef.current = false;
    setIsGenerating(true);
    setPipelineProgress(5);
    setStatus(skipRadar ? "Processing Manual Input..." : "Parsing Document...");
    setTelemetry({ totalPages: allPages.length, isolatedPages: 0, rawFormulas: 0, validatedNodes: 0 });

    try {
      const newWorkspaceId = `workspace_${Date.now()}`;
      const introText = (allPages[0]?.text || "") + " " + (allPages[1]?.text || "");
      
      let activeWorkspace = {
        id: newWorkspaceId, title: workspaceTitle, timestamp: new Date().toLocaleDateString(),
        lastAccessed: new Date().toLocaleTimeString(), isPinned: false, paperSummary: "Analyzing document context...", 
        equations: [], rawText: introText
      };
      
      setPaperData(activeWorkspace);
      updateHistoryState(activeWorkspace);

      const summaryPromise = generatePaperSummary(isBlindMode ? sanitizeDocument(introText) : introText);

      let targetPages = allPages;
      if (!skipRadar) {
        setPipelineProgress(15);
        setPipelineEta(5);
        setStatus("Strict Syntactic Radar: Isolating Math Nodes...");
        targetPages = allPages.filter(page => {
          const text = page.text;
          const funcCalls = (text.match(/(softmax|layernorm|tanh|relu|sigmoid|σ|exp|log)\s*\(/gi) || []).length;
          const algebraic = (text.match(/[a-zA-Z0-9_]+\s*=\s*[^=]{1,30}[+\-*\/]/g) || []).length;
          const mathSymbols = (text.match(/[∑∫πθαβγσ∈ℝλμπω]/g) || []).length;
          return ((funcCalls * 3) + (algebraic * 2) + (mathSymbols * 3)) >= 3; 
        });
      }

      if (cancelRef.current) return;
      setTelemetry(prev => ({ ...prev, isolatedPages: targetPages.length }));

      if (targetPages.length === 0) {
        alert("Radar isolated zero mathematical pages.");
        handleTerminateProcess(); return;
      }

      setPipelineProgress(30);
      setStatus(`Manager: Assigning Phase 1 (Sorter Agent)...`);
      let masterTaskQueue = [];
      const sorterPromises = targetPages.map(async (page) => {
        if (cancelRef.current) return;
        let textToProcess = isBlindMode ? sanitizeDocument(page.text) : page.text;
        const rawEquations = await extractRawEquations(textToProcess);
        if (rawEquations?.length > 0 && !cancelRef.current) {
          rawEquations.forEach(rawEq => {
            masterTaskQueue.push({ id: `eq_${page.pageNum}_${Math.random().toString(36).substring(7)}`, latex: rawEq.latex, name: rawEq.name || "Equation", pageNum: page.pageNum, status: 'pending', sourceText: textToProcess });
          });
        }
      });

      await Promise.all(sorterPromises);
      if (cancelRef.current) return;

      setTelemetry(prev => ({ ...prev, rawFormulas: masterTaskQueue.length }));
      if (masterTaskQueue.length === 0) {
        alert("Pipeline failed to extract formulas cleanly.");
        handleTerminateProcess(); return;
      }

      const globalSummary = await summaryPromise;
      if (cancelRef.current) return;

      activeWorkspace = { ...activeWorkspace, paperSummary: globalSummary, equations: [...masterTaskQueue] };
      setPaperData(activeWorkspace);
      updateHistoryState(activeWorkspace);
      setActiveEqId(masterTaskQueue[0].id);

      setPipelineProgress(60);
      const estTimePerFormula = 15; 
      let remainingTasks = masterTaskQueue.length;
      setPipelineEta(remainingTasks * estTimePerFormula);
      setStatus(`Manager: Assigning Phase 2 (Analyst Agent)...`);
      
      const analystPromises = masterTaskQueue.map(async (task) => {
        if (cancelRef.current) return;
        const detailedReview = await analyzeSingleEquation(task, task.sourceText);
        if (cancelRef.current) return;
        
        remainingTasks--;
        setPipelineEta(remainingTasks * estTimePerFormula);
        setPipelineProgress(60 + Math.floor(((masterTaskQueue.length - remainingTasks) / masterTaskQueue.length) * 40));

        if (detailedReview) {
          setPaperData(prev => {
            if (!prev) return prev;
            const updatedEquations = prev.equations.map(eq => {
              if (eq.id === task.id) {
                let logicMapObj = null;
                if (detailedReview.mapSteps) {
                  logicMapObj = {
                    nodes: detailedReview.mapSteps.map((s, idx) => ({ id: `${task.id}-${idx}`, type: 'custom', position: { x: 0, y: idx * 150 }, data: { step: s.title || 'STEP', label: s.description || '' } })),
                    edges: detailedReview.mapSteps.slice(1).map((_, idx) => ({ id: `e-${task.id}-${idx}`, source: `${task.id}-${idx}`, target: `${task.id}-${idx+1}` }))
                  };
                }
                return { ...eq, ...detailedReview, logicMap: logicMapObj, status: 'complete' };
              }
              return eq;
            });
            const updatedWS = { ...prev, equations: updatedEquations };
            updateHistoryState(updatedWS);
            return updatedWS;
          });
          setSliderValues(prev => {
            let newSliders = { ...prev, [task.id]: {} };
            detailedReview.variables?.forEach(v => { newSliders[task.id][v.symbol] = v.default; });
            return newSliders;
          });
          setTelemetry(prev => ({ ...prev, validatedNodes: prev.validatedNodes + 1 }));
        } else {
          setPaperData(prev => {
            if (!prev) return prev;
            const updatedWS = { ...prev, equations: prev.equations.map(eq => eq.id === task.id ? { ...eq, status: 'failed' } : eq) };
            updateHistoryState(updatedWS);
            return updatedWS;
          });
        }
      });

      await Promise.all(analystPromises);
      if (!cancelRef.current) {
        setStatus(`Pipeline Complete.`);
        setPipelineProgress(100);
        setPipelineEta(0);
        setIsGenerating(false);
      }
    } catch (error) {
      if (!cancelRef.current) {
        console.error(error);
        setStatus("Ready");
        setIsGenerating(false);
      }
    }
  };

  const resumePipeline = async () => {
    if (!paperData) return;
    cancelRef.current = false;
    setIsGenerating(true);
    setStatus("Resuming Analyst Agents...");
    
    // Clear the stub if it exists
    setPaperData(curr => {
      let eqs = curr.equations.filter(e => !e.id.startsWith('stub_'));
      let pendingEqs = eqs.map(e => e.status === 'paused' ? { ...e, status: 'pending' } : e);
      return { ...curr, equations: pendingEqs };
    });

    const tasksToRun = paperData.equations.filter(e => e.status === 'paused' || e.status === 'pending' || e.id.startsWith('stub_'));
    let remainingTasks = tasksToRun.length;
    const estTimePerFormula = 15;
    setPipelineEta(remainingTasks * estTimePerFormula);
    setPipelineProgress(60);
    
    const analystPromises = tasksToRun.map(async (task) => {
      if (cancelRef.current || task.id.startsWith('stub_')) return;
      const detailedReview = await analyzeSingleEquation(task, task.sourceText);
      if (cancelRef.current) return;
      
      remainingTasks--;
      setPipelineEta(remainingTasks * estTimePerFormula);
      setPipelineProgress(60 + Math.floor(((tasksToRun.length - remainingTasks) / tasksToRun.length) * 40));
      
      if (detailedReview) {
        setPaperData(prev => {
          if (!prev) return prev;
          const updatedEquations = prev.equations.map(eq => {
            if (eq.id === task.id) {
              let logicMapObj = null;
              if (detailedReview.mapSteps) {
                logicMapObj = { nodes: detailedReview.mapSteps.map((s, idx) => ({ id: `${task.id}-${idx}`, type: 'custom', position: { x: 0, y: idx * 150 }, data: { step: s.title || 'STEP', label: s.description || '' } })), edges: detailedReview.mapSteps.slice(1).map((_, idx) => ({ id: `e-${task.id}-${idx}`, source: `${task.id}-${idx}`, target: `${task.id}-${idx+1}` })) };
              }
              return { ...eq, ...detailedReview, logicMap: logicMapObj, status: 'complete' };
            }
            return eq;
          });
          const updatedWS = { ...prev, equations: updatedEquations };
          updateHistoryState(updatedWS);
          return updatedWS;
        });
        setSliderValues(prev => {
          let newSliders = { ...prev, [task.id]: {} };
          detailedReview.variables?.forEach(v => { newSliders[task.id][v.symbol] = v.default; });
          return newSliders;
        });
        setTelemetry(prev => ({ ...prev, validatedNodes: prev.validatedNodes + 1 }));
      } else {
        setPaperData(prev => {
          if (!prev) return prev;
          const updatedWS = { ...prev, equations: prev.equations.map(eq => eq.id === task.id ? { ...eq, status: 'failed' } : eq) };
          updateHistoryState(updatedWS);
          return updatedWS;
        });
      }
    });

    await Promise.all(analystPromises);
    if (!cancelRef.current) {
      setStatus(`Pipeline Complete.`);
      setIsGenerating(false);
      setPipelineEta(0);
    }
  };

  const handleRunSimulation = () => {
    const currentEq = paperData?.equations?.find(e => e.id === activeEqId);
    if (status.includes("Agent") || status.includes("Manager") || !workerRef.current || !currentEq || currentEq.status !== 'complete') return;
    setIsSimulating(true);
    workerRef.current.postMessage({ type: "RUN", code: currentEq.pythonCode, variables: sliderValues[activeEqId] || {} });
  };

  const deleteSession = (id) => {
    setSessionHistory(prev => prev.filter(session => session.id !== id));
    if (paperData?.id === id) handleCloseWorkspace();
  };

  const togglePinSession = (id) => {
    setSessionHistory(prev => prev.map(session => session.id === id ? { ...session, isPinned: !session.isPinned } : session));
  };

  return {
    paperData, activeEqId, setActiveEqId, sliderValues, setSliderValues, outputLogs, chartData,
    status, telemetry, isGenerating, isSimulating, pipelineProgress, pipelineEta,
    sessionHistory, handleCloseWorkspace, handleTerminateProcess, executePipeline, resumePipeline,
    handleRunSimulation, restoreSession, deleteSession, togglePinSession, extractPagesFromDocument, saveWorkspaceToDB
  };
}