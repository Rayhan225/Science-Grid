// src/hooks/useMathEvaluator.js
import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { generatePaperSummary, extractRawEquations, analyzeSingleEquation, sanitizeDocument } from '../aiHelper';

pdfjsLib.GlobalWorkerOptions.workerSrc = `[https://unpkg.com/pdfjs-dist@$](https://unpkg.com/pdfjs-dist@$){pdfjsLib.version}/build/pdf.worker.min.mjs`;

const BACKEND_URL = "[http://127.0.0.1:8000](http://127.0.0.1:8000)";

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

  useEffect(() => {
    stateRef.current = { activeEqId, paperData, sliderValues };
  }, [activeEqId, paperData, sliderValues]);

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

  useEffect(() => {
    fetchDatabaseSessions();
  }, [fetchDatabaseSessions]);

  useEffect(() => {
    let interval;
    if (isGenerating && pipelineEta > 0) {
      interval = setInterval(() => {
        setPipelineEta(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isGenerating, pipelineEta]);

  useEffect(() => {
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
    return () => { if (workerRef.current) workerRef.current.terminate(); };
  }, [outputLogs]);

  const extractPagesFromDocument = async (file) => {
    let pages = [];
    if (file.type === "application/pdf" || file.name.endsWith('.pdf')) {
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

  const saveWorkspaceToDB = async (sessionData, currentSliderVals, currentOutputLogs, currentChartData) => {
    if (!sessionData) return;
    try {
      await fetch(`${BACKEND_URL}/api/math-evaluator/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionData.id,
          title: sessionData.title,
          timestamp: sessionData.timestamp,
          lastAccessed: new Date().toISOString(),
          isPinned: sessionData.isPinned || false,
          equations: sessionData.equations || [],
          sliderValues: currentSliderVals || {},
          outputLogs: currentOutputLogs || {},
          chartData: currentChartData || {}
        })
      });
      fetchDatabaseSessions();
    } catch (err) { 
      console.error("Database Sync Failed:", err); 
    }
  };

  const restoreSession = async (sessionRecord) => {
    if (isGenerating) cancelRef.current = true;
    setPaperData(sessionRecord);
    setActiveEqId(sessionRecord.equations?.[0]?.id || null);
    setStatus("Session Restored.");
    setSliderValues(sessionRecord.sliderValues || {});
    setOutputLogs(sessionRecord.outputLogs || {});
    setChartData(sessionRecord.chartData || {});
  };

  const handleCloseWorkspace = () => {
    setPaperData(null); 
    setActiveEqId(null);
    setTelemetry({ totalPages: 0, isolatedPages: 0, rawFormulas: 0, validatedNodes: 0 });
    setStatus("Ready");
    setIsGenerating(false);
    cancelRef.current = false;
  };

  const handleTerminateProcess = () => {
    cancelRef.current = true;
    setIsGenerating(false);
    setStatus("Process Suspended.");
    setPipelineProgress(0);
    setPipelineEta(0);
  };

  const executePipeline = async (allPages, skipRadar = false, workspaceTitle = "Untitled Matrix") => {
    cancelRef.current = false;
    setIsGenerating(true);
    setPipelineProgress(5);
    setStatus(skipRadar ? "Processing Input..." : "Parsing Document...");
    setTelemetry({ totalPages: allPages.length, isolatedPages: 0, rawFormulas: 0, validatedNodes: 0 });

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
        setStatus("Isolating Math Formulations...");
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

      setTelemetry(prev => ({ ...prev, isolatedPages: targetPages.length }));
      setPipelineProgress(35);
      setStatus("Extracting mathematical representations...");
      
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
      setTelemetry(prev => ({ ...prev, rawFormulas: masterTaskQueue.length }));

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

      await summaryPromise;
      if (cancelRef.current) return;

      activeSession = { ...activeSession, equations: [...masterTaskQueue] };
      setPaperData(activeSession);
      setActiveEqId(masterTaskQueue[0].id);

      setPipelineProgress(55);
      const estTimePerFormula = 6; 
      let remainingTasks = masterTaskQueue.length;
      setPipelineEta(remainingTasks * estTimePerFormula);
      setStatus("Compiling Python numerical subroutines...");

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
          setTelemetry(prev => ({ ...prev, validatedNodes: prev.validatedNodes + 1 }));
        }
      }

      if (!cancelRef.current) {
        setStatus("Session Compiled.");
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

  const handleRunSimulation = () => {
    const currentEq = paperData?.equations?.find(e => e.id === activeEqId);
    if (!workerRef.current || !currentEq || currentEq.status !== 'complete') return;
    setIsSimulating(true);
    workerRef.current.postMessage({ type: "RUN", code: currentEq.pythonCode, variables: sliderValues[activeEqId] || {} });
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

  return {
    paperData, activeEqId, setActiveEqId, sliderValues, setSliderValues, outputLogs, chartData,
    status, telemetry, isGenerating, isSimulating, pipelineProgress, pipelineEta,
    sessionHistory, handleCloseWorkspace, handleTerminateProcess, executePipeline,
    handleRunSimulation, restoreSession, deleteSession, renameSession, togglePinSession, 
    extractPagesFromDocument, saveWorkspaceToDB, fetchDatabaseSessions
  };
}