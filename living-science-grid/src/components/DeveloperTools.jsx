import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  TerminalSquare, LayoutGrid, GitBranch, FileDiff, BookCheck, 
  ShieldCheck, ScrollText, Settings, Play, Database, CheckCircle2, 
  XCircle, AlertTriangle, RefreshCw, Send, Plus, Trash2, Key, 
  ExternalLink, ArrowUpRight, Copy, Check, Clock, Activity, Cpu
} from 'lucide-react';

export default function DeveloperTools() {
  const { themeClasses, isLight } = useTheme();

  // Active Sub-Navigation Tab
  const [activeTab, setActiveTab] = useState('overview'); // overview | api | git | diff | citation | compliance | logs | settings

  // Global Config & Auth State
  const [demoMode, setDemoMode] = useState(true);
  const [backendUrl, setBackendUrl] = useState("http://127.0.0.1:8000");
  const [token, setToken] = useState(localStorage.getItem('sg_layer7_token') || '');
  const [user, setUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [backendConnected, setBackendConnected] = useState(false);

  // Observability & System Logs State
  const [logs, setLogs] = useState([
    { time: '10:42:01 AM', method: 'GET', endpoint: '/health', status: 200, latency: 18 },
    { time: '10:40:15 AM', method: 'POST', endpoint: '/api/v1/quality/citations/validate', status: 200, latency: 42 }
  ]);
  const [activities, setActivities] = useState([
    { title: 'API Node Generated', detail: 'quadratic-root — POST /api/v1/nodes/quadratic-root/execute', time: '5m ago', color: 'blue' },
    { title: 'Git Link Synced', detail: 'src/models/attention.py · Lines 42–67 mapped', time: '18m ago', color: 'purple' },
    { title: 'Compliance Passed', detail: 'IEEE Manuscript Standard · 94% submission score', time: '1h ago', color: 'green' }
  ]);

  // API Notebook State
  const [nodes, setNodes] = useState([
    { id: '1', name: 'quadratic-root', slug: 'quadratic-root', method: 'POST', path: '/api/v1/nodes/quadratic-root/execute', status: 'Active', updated: 'Today' }
  ]);
  const [nodeName, setNodeName] = useState('quadratic-root');
  const [nodeFormula, setNodeFormula] = useState('x = (-b + sqrt(b^2 - 4*a*c)) / (2*a)');
  const [apiInput, setApiInput] = useState('{\n  "a": 1,\n  "b": -5,\n  "c": 6\n}');
  const [apiOutput, setApiOutput] = useState('Ready for execution call.');
  const [activeSlug, setActiveSlug] = useState('quadratic-root');

  // Git Code Linker State
  const [repoLinks, setRepoLinks] = useState([
    { id: '1', section: '3.2 Attention Score', repo: 'https://github.com/scholargrid/engine', file: 'src/models/attention.py', start: 42, end: 67, type: 'implements' }
  ]);
  const [repoUrl, setRepoUrl] = useState('https://github.com/scholargrid/research-engine');
  const [repoBranch, setRepoBranch] = useState('main');
  const [repoCommit, setRepoCommit] = useState('8f2d91a');
  const [repoFile, setRepoFile] = useState('src/models/attention.py');
  const [lineStart, setLineStart] = useState(42);
  const [lineEnd, setLineEnd] = useState(67);
  const [docSection, setDocSection] = useState('3.2 Attention Score');
  const [docPage, setDocPage] = useState(8);
  const [linkType, setLinkType] = useState('implements');

  // Manuscript Diff State
  const [diffA, setDiffA] = useState("The proposed model improves retrieval accuracy.\nThe algorithm uses a graph representation.\nExperiments were conducted on three datasets.");
  const [diffB, setDiffB] = useState("The proposed model improves retrieval accuracy by 8%.\nThe algorithm uses a graph representation.\nExperiments were conducted on five datasets.\nAblation results are included.");
  const [diffSummary, setDiffSummary] = useState(null);
  const [diffLines, setDiffLines] = useState([]);

  // Citation Validator State
  const [citationInput, setCitationInput] = useState("@smith2024\n@lee2023\n@doe2022\n@missing2025");
  const [bibInput, setBibInput] = useState("@smith2024\n@lee2023\n@doe2022");
  const [citationSummary, setCitationSummary] = useState({ total: 4, valid: 3, missing: 1 });
  const [citationItems, setCitationItems] = useState([]);

  // Compliance Check State
  const [complianceScore, setComplianceScore] = useState(94);
  const [complianceChecks, setComplianceChecks] = useState([
    { name: 'Document Structure & Header Geometry', status: 'Ready' },
    { name: 'Page Margins & Column Bounds', status: 'Ready' },
    { name: 'Citation Format & Cross-Linking', status: 'Ready' },
    { name: 'Figure Resolution & DPI Integrity', status: 'Warning' },
    { name: 'Bibliography & Reference Completeness', status: 'Ready' }
  ]);

  // Execution Chart Canvas Reference
  const chartCanvasRef = useRef(null);

  // --- LOGGING & ACTIVITY DISPATCHERS ---
  const addLog = (method, endpoint, status = 200, latency = 0) => {
    const newLog = {
      time: new Date().toLocaleTimeString(),
      method,
      endpoint,
      status,
      latency: latency || Math.floor(20 + Math.random() * 60)
    };
    setLogs(prev => [newLog, ...prev.slice(0, 49)]);
  };

  const addActivity = (title, detail, color = 'blue') => {
    setActivities(prev => [{ title, detail, time: 'Just now', color }, ...prev.slice(0, 9)]);
  };

  // --- API HELPER INTERFACE ---
  const apiFetch = async (path, options = {}) => {
    const started = performance.now();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      const res = await fetch(`${backendUrl.replace(/\/$/, '')}${path}`, { ...options, headers });
      const latency = Math.round(performance.now() - started);
      addLog(options.method || 'GET', path, res.status, latency);

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP Error ${res.status}`);
      return data;
    } catch (err) {
      const latency = Math.round(performance.now() - started);
      addLog(options.method || 'GET', path, 500, latency);
      throw err;
    }
  };

  // Check Backend Health on Mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${backendUrl.replace(/\/$/, '')}/health`);
        setBackendConnected(res.ok);
      } catch {
        setBackendConnected(false);
      }
    };
    checkHealth();
  }, [backendUrl]);

  // --- EXECUTION VOLUME CHART RENDERER ---
  useEffect(() => {
    if (activeTab !== 'overview' || !chartCanvasRef.current) return;
    const canvas = chartCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const pad = { l: 40, r: 20, t: 20, b: 30 };
    const vals = [28, 34, 30, 42, 38, 48, 44, 59, 55, 62, 58, 70, 66, 76];
    const max = 80;

    // Grid lines
    ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.font = '10px monospace';
    ctx.fillStyle = isLight ? '#94a3b8' : '#64748b';

    for (let i = 0; i < 5; i++) {
      const y = pad.t + ((rect.height - pad.t - pad.b) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(rect.width - pad.r, y);
      ctx.stroke();
      ctx.fillText(String(max - i * 20), 10, y + 3);
    }

    // Plot Line
    const xStep = (rect.width - pad.l - pad.r) / (vals.length - 1);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    vals.forEach((v, i) => {
      const x = pad.l + i * xStep;
      const y = pad.t + (rect.height - pad.t - pad.b) * (1 - v / max);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Data points
    ctx.fillStyle = '#0284c7';
    vals.forEach((v, i) => {
      const x = pad.l + i * xStep;
      const y = pad.t + (rect.height - pad.t - pad.b) * (1 - v / max);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [activeTab, isLight]);

  // --- ACTIONS ---

  // 1. Authentication
  const handleAuth = async (isRegister = false) => {
    if (!loginEmail || !loginPassword) return setAuthMessage("Enter valid credentials");
    try {
      const endpoint = isRegister ? '/api/v1/auth/register' : '/api/v1/auth/login';
      const data = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword, name: loginEmail.split('@')[0] })
      });
      if (isRegister) {
        setAuthMessage("Account registered successfully. Please sign in.");
      } else {
        setToken(data.access_token);
        localStorage.setItem('sg_layer7_token', data.access_token);
        setAuthMessage("Signed in successfully to FastAPI.");
        addActivity('Authenticated', `Session initialized for ${loginEmail}`, 'green');
      }
    } catch (err) {
      setAuthMessage(`Auth fault: ${err.message}`);
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('sg_layer7_token');
    setUser(null);
    setAuthMessage('Logged out.');
  };

  // 2. Node Operations
  const handleSaveNode = async () => {
    if (!demoMode) {
      try {
        const formula = await apiFetch('/api/v1/formulas/', {
          method: 'POST',
          body: JSON.stringify({ manuscript_id: null, name: nodeName, expression: nodeFormula })
        });
        const node = await apiFetch('/api/v1/nodes/', {
          method: 'POST',
          body: JSON.stringify({ name: nodeName, formula_id: formula.id, is_public: false })
        });
        setActiveSlug(node.slug);
        const newNode = { id: node.id, name: node.name, slug: node.slug, method: 'POST', path: `/api/v1/nodes/${node.slug}/execute`, status: 'Active', updated: 'Just now' };
        setNodes(prev => [newNode, ...prev]);
        addActivity('API Node Created', `${nodeName} — PostgreSQL verified`, 'blue');
        setApiOutput(`API Node created & registered in database.\nEndpoint: /api/v1/nodes/${node.slug}/execute`);
      } catch (err) {
        setApiOutput(`Backend Save Failed: ${err.message}`);
      }
      return;
    }

    // Demo Mode Save
    const newNode = { id: Date.now().toString(), name: nodeName, slug: nodeName, method: 'POST', path: `/api/v1/nodes/${nodeName}/execute`, status: 'Active', updated: 'Just now' };
    setNodes(prev => [newNode, ...prev]);
    setActiveSlug(nodeName);
    addActivity('API Node Created', `${nodeName} (Demo Sandbox)`, 'blue');
    addLog('POST', `/api/v1/nodes/${nodeName}`, 201, 15);
    setApiOutput(`API Node saved locally.\nEndpoint: ${newNode.path}`);
  };

  const handleRunNode = async () => {
    let parsedInput;
    try {
      parsedInput = JSON.parse(apiInput);
    } catch (err) {
      setApiOutput(`Invalid JSON Payload: ${err.message}`);
      return;
    }

    if (!demoMode) {
      try {
        const res = await apiFetch(`/api/v1/nodes/${activeSlug}/execute`, {
          method: 'POST',
          body: JSON.stringify({ input: parsedInput })
        });
        setApiOutput(JSON.stringify(res, null, 2));
        addActivity('API Node Executed', `${activeSlug} returned 200 OK`, 'blue');
      } catch (err) {
        setApiOutput(`Execution Fault: ${err.message}`);
      }
      return;
    }

    // Local Demo Execution
    let result = { ok: true, node: activeSlug, input: parsedInput };
    if ('a' in parsedInput && 'b' in parsedInput && 'c' in parsedInput) {
      const d = parsedInput.b * parsedInput.b - 4 * parsedInput.a * parsedInput.c;
      result.discriminant = d;
      result.roots = d >= 0 ? {
        x1: (-parsedInput.b + Math.sqrt(d)) / (2 * parsedInput.a),
        x2: (-parsedInput.b - Math.sqrt(d)) / (2 * parsedInput.a)
      } : 'Complex Roots';
    }
    setApiOutput(JSON.stringify(result, null, 2));
    addLog('POST', `/api/v1/nodes/${activeSlug}/execute`, 200, 24);
    addActivity('API Node Executed', `${activeSlug} processed (Demo Mode)`, 'blue');
  };

  // 3. Git Code Linking
  const handleSaveRepoLink = async () => {
    if (!demoMode) {
      try {
        const repoName = repoUrl.split('/').filter(Boolean).pop()?.replace(/\.git$/, '') || 'repository';
        const repo = await apiFetch('/api/v1/repositories', {
          method: 'POST',
          body: JSON.stringify({ project_id: null, provider: 'github', repository_url: repoUrl, repository_name: repoName, default_branch: repoBranch })
        });
        const link = await apiFetch(`/api/v1/repositories/${repo.id}/links`, {
          method: 'POST',
          body: JSON.stringify({
            manuscript_id: null,
            file_path: repoFile,
            start_line: Number(lineStart) || null,
            end_line: Number(lineEnd) || null,
            commit_hash: repoCommit || null,
            target_type: 'section',
            target_reference: docSection,
            description: linkType
          })
        });
        setRepoLinks(prev => [{ id: link.id, section: docSection, repo: repo.repository_url, file: link.file_path, start: link.start_line, end: link.end_line, type: linkType }, ...prev]);
        addActivity('Git Repository Linked', `${repoFile} lines ${lineStart}–${lineEnd}`, 'purple');
      } catch (err) {
        alert(`Git Link Error: ${err.message}`);
      }
      return;
    }

    setRepoLinks(prev => [{ id: Date.now().toString(), section: docSection, repo: repoUrl, file: repoFile, start: lineStart, end: lineEnd, type: linkType }, ...prev]);
    addActivity('Git Link Saved', `${repoFile} mapped to ${docSection}`, 'purple');
    addLog('POST', '/api/v1/repositories/links', 201, 30);
  };

  // 4. Manuscript Diff
  const handleRunDiff = async () => {
    if (!demoMode) {
      try {
        const res = await apiFetch('/api/v1/quality/diff', {
          method: 'POST',
          body: JSON.stringify({ old: diffA, new: diffB })
        });
        const rawDiff = res.diff || JSON.stringify(res, null, 2);
        const lines = rawDiff.split('\n').map(line => ({
          type: line.startsWith('+') ? 'add' : line.startsWith('-') ? 'remove' : 'same',
          text: line
        }));
        setDiffLines(lines);
        setDiffSummary({ additions: res.insertions || 0, deletions: res.deletions || 0, unchanged: 0 });
        addActivity('Manuscript Diff Processed', 'Unified diff generated by FastAPI', 'blue');
      } catch (err) {
        alert(`Diff failed: ${err.message}`);
      }
      return;
    }

    // Local Diff Algorithm
    const a = diffA.split(/\r?\n/);
    const b = diffB.split(/\r?\n/);
    const bSet = new Set(b);
    const aSet = new Set(a);
    let adds = 0, removes = 0, sames = 0;
    const output = [];

    a.forEach(line => {
      if (bSet.has(line)) {
        sames++;
        output.push({ type: 'same', text: `  ${line}` });
      } else {
        removes++;
        output.push({ type: 'remove', text: `- ${line}` });
      }
    });
    b.forEach(line => {
      if (!aSet.has(line)) {
        adds++;
        output.push({ type: 'add', text: `+ ${line}` });
      }
    });

    setDiffSummary({ additions: adds, deletions: removes, unchanged: sames });
    setDiffLines(output);
    addActivity('Manuscript Version Compared', `${adds} additions, ${removes} deletions`, 'blue');
    addLog('POST', '/api/v1/quality/diff', 200, 15);
  };

  // 5. Citation Validation
  const handleRunCitations = async () => {
    if (!demoMode) {
      try {
        const res = await apiFetch('/api/v1/quality/citations/validate', {
          method: 'POST',
          body: JSON.stringify({ text: citationInput })
        });
        const missing = res.issues || [];
        setCitationSummary({ total: res.count || 0, valid: (res.count || 0) - missing.length, missing: missing.length });
        setCitationItems(res.citations || []);
        addActivity('Citation Validation Run', `${res.count || 0} citations checked via FastAPI`, 'orange');
      } catch (err) {
        alert(`Citation Validation Fault: ${err.message}`);
      }
      return;
    }

    const keys = citationInput.split(/\s+/).filter(Boolean);
    const bib = new Set(bibInput.split(/\s+/).filter(Boolean));
    const missing = keys.filter(k => !bib.has(k));
    const valid = keys.length - missing.length;

    setCitationSummary({ total: keys.length, valid, missing: missing.length });
    setCitationItems(keys.map(k => ({ key: k, valid: !missing.includes(k) })));
    addActivity('Citations Validated', `${keys.length} citations checked · ${missing.length} missing`, 'orange');
    addLog('POST', '/api/v1/quality/citations/validate', 200, 19);
  };

  // 6. Compliance Checks
  const handleRunCompliance = async () => {
    if (!demoMode) {
      try {
        const res = await apiFetch('/api/v1/quality/publisher/check', {
          method: 'POST',
          body: JSON.stringify({ text: diffB, images: [], rules: { max_words: 5000, min_image_dpi: 300, max_pages: 10 } })
        });
        setComplianceScore(res.overall_ok ? 98 : 88);
        addActivity('Compliance Check Complete', 'Verified against IEEE template', 'green');
      } catch (err) {
        alert(`Compliance check failed: ${err.message}`);
      }
      return;
    }

    setComplianceScore(94);
    addActivity('Compliance Standard Run', 'IEEE Manuscript format verified', 'green');
    addLog('POST', '/api/v1/quality/publisher/check', 200, 28);
  };

  return (
    <div className="flex h-full w-full bg-transparent overflow-hidden font-sans relative select-none">
      
      {/* =========================================================================
          LEFT NAVIGATION BAR (Layer 7 Sub-Router)
      ========================================================================= */}
      <div className={`w-72 h-full flex flex-col z-20 border-r backdrop-blur-md ${isLight ? 'border-slate-200 bg-white/60' : 'border-white/10 bg-black/40'}`}>
        
        {/* Brand Header */}
        <div className={`p-6 border-b flex items-center justify-between ${isLight ? 'border-slate-200 bg-black/5' : 'border-white/10 bg-black/40'}`}>
          <div className="flex items-center gap-3">
            <TerminalSquare className={themeClasses.accentText} size={22}/>
            <div>
              <h2 className="font-bold font-mono uppercase tracking-widest text-xs">Layer 7</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Developer Tools</p>
            </div>
          </div>
          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${demoMode ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
            {demoMode ? 'Demo' : 'Live'}
          </span>
        </div>

        {/* Navigation Menu */}
        <div className="flex flex-col p-3 space-y-1 overflow-y-auto custom-scrollbar flex-grow">
          {[
            { id: 'overview', name: 'Overview', icon: LayoutGrid },
            { id: 'api', name: 'API Notebook', icon: Database },
            { id: 'git', name: 'Git Linker', icon: GitBranch },
            { id: 'diff', name: 'Manuscript Diff', icon: FileDiff },
            { id: 'citation', name: 'Citation Validator', icon: BookCheck },
            { id: 'compliance', name: 'Compliance Check', icon: ShieldCheck },
            { id: 'logs', name: 'API Logs', icon: ScrollText },
            { id: 'settings', name: 'Workspace Config', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-mono text-xs uppercase tracking-widest transition-all ${
                  isActive 
                    ? `${themeClasses.bgCard} ${themeClasses.accentText} border border-inherit shadow-md font-bold` 
                    : 'text-slate-500 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon size={16}/> {tab.name}
              </button>
            );
          })}
        </div>

        {/* Footer Connection Pill */}
        <div className={`p-4 border-t ${isLight ? 'border-slate-200 bg-slate-50/50' : 'border-white/10 bg-black/20'}`}>
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
              <span className="opacity-70">{backendConnected ? 'FastAPI Linked' : 'FastAPI Offline'}</span>
            </div>
            <button onClick={() => setDemoMode(!demoMode)} className="text-slate-400 hover:text-white underline">
              Toggle Mode
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          RIGHT WORKSPACE CANVAS (Active Sub-View)
      ========================================================================= */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 relative">
        <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn select-text">

          {/* 1. OVERVIEW DASHBOARD */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className={`p-5 border shadow-xl ${themeClasses.bgCard} ${themeClasses.radius}`}>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block mb-1">Active Nodes</span>
                  <strong className="text-2xl font-mono block">{nodes.length}</strong>
                  <small className="text-[10px] text-emerald-500 font-mono">↑ 3 this week</small>
                </div>
                <div className={`p-5 border shadow-xl ${themeClasses.bgCard} ${themeClasses.radius}`}>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block mb-1">Git Code Links</span>
                  <strong className="text-2xl font-mono block">{repoLinks.length}</strong>
                  <small className="text-[10px] text-purple-500 font-mono">Synced to Main</small>
                </div>
                <div className={`p-5 border shadow-xl ${themeClasses.bgCard} ${themeClasses.radius}`}>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block mb-1">Manuscript Diff</span>
                  <strong className="text-2xl font-mono block">v1.4</strong>
                  <small className="text-[10px] text-cyan-500 font-mono">2 active buffers</small>
                </div>
                <div className={`p-5 border shadow-xl ${themeClasses.bgCard} ${themeClasses.radius}`}>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block mb-1">Citation Faults</span>
                  <strong className="text-2xl font-mono block text-amber-500">{citationSummary.missing}</strong>
                  <small className="text-[10px] text-amber-500/80 font-mono">Unresolved DOIs</small>
                </div>
                <div className={`p-5 border shadow-xl ${themeClasses.bgCard} ${themeClasses.radius}`}>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block mb-1">Compliance</span>
                  <strong className="text-2xl font-mono block text-emerald-500">{complianceScore}%</strong>
                  <small className="text-[10px] text-emerald-500 font-mono">IEEE Verified</small>
                </div>
              </div>

              {/* Execution Chart */}
              <div className={`p-6 border shadow-xl ${themeClasses.bgCard} ${themeClasses.radius}`}>
                <div className="flex items-center justify-between mb-4 border-b border-inherit pb-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase font-mono tracking-wider">API Execution Volume</h3>
                    <p className="text-[11px] text-slate-500 font-mono">Algorithmic execution throughput across all node clusters</p>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest bg-black/20 px-3 py-1 rounded-md border border-white/5">Trailing 14 Days</span>
                </div>
                <div className="w-full h-56 relative">
                  <canvas ref={chartCanvasRef} className="w-full h-full block" />
                </div>
              </div>

              {/* Activity & Quick Workflows */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className={`p-6 border shadow-xl ${themeClasses.bgCard} ${themeClasses.radius}`}>
                  <h3 className="text-sm font-bold uppercase font-mono tracking-wider mb-4 border-b border-inherit pb-3 flex items-center gap-2">
                    <Activity size={16} className={themeClasses.accentText}/> Recent Operations
                  </h3>
                  <div className="space-y-3">
                    {activities.map((act, i) => (
                      <div key={i} className="flex items-start justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                        <div>
                          <strong className="text-xs font-mono block">{act.title}</strong>
                          <p className="text-[11px] text-slate-400 font-sans mt-0.5">{act.detail}</p>
                        </div>
                        <span className="text-[9px] font-mono opacity-50 whitespace-nowrap">{act.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`p-6 border shadow-xl ${themeClasses.bgCard} ${themeClasses.radius}`}>
                  <h3 className="text-sm font-bold uppercase font-mono tracking-wider mb-4 border-b border-inherit pb-3 flex items-center gap-2">
                    <Cpu size={16} className={themeClasses.accentText}/> Quick Workflows
                  </h3>
                  <div className="grid grid-cols-1 gap-2.5 font-mono text-xs">
                    <button onClick={() => setActiveTab('api')} className="p-3 bg-black/20 hover:bg-black/40 border border-white/5 rounded-xl flex items-center justify-between transition-all">
                      <span>Create Algorithm Endpoint Node</span>
                      <ArrowUpRight size={14}/>
                    </button>
                    <button onClick={() => setActiveTab('git')} className="p-3 bg-black/20 hover:bg-black/40 border border-white/5 rounded-xl flex items-center justify-between transition-all">
                      <span>Link Manuscript Section to GitHub</span>
                      <ArrowUpRight size={14}/>
                    </button>
                    <button onClick={() => setActiveTab('diff')} className="p-3 bg-black/20 hover:bg-black/40 border border-white/5 rounded-xl flex items-center justify-between transition-all">
                      <span>Compare Manuscript Text Buffers</span>
                      <ArrowUpRight size={14}/>
                    </button>
                    <button onClick={() => setActiveTab('compliance')} className="p-3 bg-black/20 hover:bg-black/40 border border-white/5 rounded-xl flex items-center justify-between transition-all">
                      <span>Run Pre-Flight Publisher Check</span>
                      <ArrowUpRight size={14}/>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. API ENDPOINT NOTEBOOK */}
          {activeTab === 'api' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Definition Panel */}
                <div className={`lg:col-span-5 p-6 border shadow-xl flex flex-col ${themeClasses.bgCard} ${themeClasses.radius}`}>
                  <h3 className="text-sm font-bold uppercase font-mono tracking-wider mb-4 border-b border-inherit pb-3 flex items-center justify-between">
                    <span>Node Definition</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">POST</span>
                  </h3>
                  <div className="space-y-4 flex-grow font-mono text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Node Name</label>
                      <input type="text" value={nodeName} onChange={e => setNodeName(e.target.value)} className="w-full px-3 py-2.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500"/>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Formula Expression</label>
                      <textarea value={nodeFormula} onChange={e => setNodeFormula(e.target.value)} rows={3} className="w-full px-3 py-2.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 custom-scrollbar"/>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Target Path</label>
                      <input type="text" readOnly value={`/api/v1/nodes/${nodeName}/execute`} className="w-full px-3 py-2.5 bg-black/40 opacity-70 border border-white/10 rounded-xl"/>
                    </div>
                  </div>
                  <button onClick={handleSaveNode} className={`w-full mt-6 py-3 rounded-xl font-bold font-mono text-xs uppercase tracking-widest text-white transition-all shadow-md ${themeClasses.accentBg}`}>
                    Save API Node
                  </button>
                </div>

                {/* Test Execution Panel */}
                <div className={`lg:col-span-7 p-6 border shadow-xl flex flex-col ${themeClasses.bgCard} ${themeClasses.radius}`}>
                  <h3 className="text-sm font-bold uppercase font-mono tracking-wider mb-4 border-b border-inherit pb-3 flex items-center justify-between">
                    <span>Inference Execution Sandbox</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">SANDBOX</span>
                  </h3>
                  <div className="space-y-4 flex-grow font-mono text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">JSON Input Arguments</label>
                      <textarea value={apiInput} onChange={e => setApiInput(e.target.value)} rows={4} className="w-full px-3 py-2.5 bg-[#050505] border border-white/10 rounded-xl text-emerald-400 focus:outline-none custom-scrollbar"/>
                    </div>
                    <button onClick={handleRunNode} className={`w-full py-3 rounded-xl font-bold font-mono text-xs uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2 ${themeClasses.accentBg}`}>
                      <Play size={14} fill="currentColor"/> Execute Endpoint Subroutine
                    </button>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Response Buffer</label>
                      <pre className="w-full bg-[#050505] border border-white/10 rounded-xl p-4 text-xs font-mono text-slate-300 overflow-x-auto min-h-[110px]">{apiOutput}</pre>
                    </div>
                  </div>
                </div>
              </div>

              {/* Saved Nodes Table */}
              <div className={`p-6 border shadow-xl ${themeClasses.bgCard} ${themeClasses.radius}`}>
                <h3 className="text-sm font-bold uppercase font-mono tracking-wider mb-4 border-b border-inherit pb-3">Registered API Nodes</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-white/10 opacity-50 text-[10px] uppercase">
                        <th className="py-2">Identifier</th>
                        <th className="py-2">Method</th>
                        <th className="py-2">Path</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {nodes.map(n => (
                        <tr key={n.id} className="hover:bg-white/5">
                          <td className="py-3 font-bold">{n.name}</td>
                          <td className="py-3 text-blue-400">{n.method}</td>
                          <td className="py-3 opacity-70">{n.path}</td>
                          <td className="py-3"><span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px]">{n.status}</span></td>
                          <td className="py-3 opacity-50">{n.updated}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. GIT CODE LINKER */}
          {activeTab === 'git' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className={`p-6 border shadow-xl ${themeClasses.bgCard} ${themeClasses.radius}`}>
                  <h3 className="text-sm font-bold uppercase font-mono tracking-wider mb-4 border-b border-inherit pb-3">Repository & Source Target</h3>
                  <div className="space-y-3 font-mono text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Repository URL</label>
                      <input type="text" value={repoUrl} onChange={e => setRepoUrl(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500"/>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Branch</label>
                        <input type="text" value={repoBranch} onChange={e => setRepoBranch(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl"/>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Commit</label>
                        <input type="text" value={repoCommit} onChange={e => setRepoCommit(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl"/>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">File Path</label>
                      <input type="text" value={repoFile} onChange={e => setRepoFile(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl"/>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Start Line</label>
                        <input type="number" value={lineStart} onChange={e => setLineStart(Number(e.target.value))} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl"/>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">End Line</label>
                        <input type="number" value={lineEnd} onChange={e => setLineEnd(Number(e.target.value))} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl"/>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`p-6 border shadow-xl flex flex-col justify-between ${themeClasses.bgCard} ${themeClasses.radius}`}>
                  <div>
                    <h3 className="text-sm font-bold uppercase font-mono tracking-wider mb-4 border-b border-inherit pb-3">Manuscript Anchor</h3>
                    <div className="space-y-3 font-mono text-xs">
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Target Section</label>
                        <input type="text" value={docSection} onChange={e => setDocSection(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl"/>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Page Number</label>
                        <input type="number" value={docPage} onChange={e => setDocPage(Number(e.target.value))} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl"/>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Relationship</label>
                        <select value={linkType} onChange={e => setLinkType(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl outline-none">
                          <option value="implements">implements</option>
                          <option value="supports">supports</option>
                          <option value="reproduces">reproduces</option>
                          <option value="tests">tests</option>
                        </select>
                      </div>

                      {/* Trace Preview Box */}
                      <div className="mt-4 p-4 border border-dashed border-white/20 rounded-xl flex items-center justify-between bg-black/20 font-mono text-xs">
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block">Manuscript</span>
                          <strong>{docSection} (P.{docPage})</strong>
                        </div>
                        <span className="text-purple-400 font-bold">→</span>
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block">Source</span>
                          <strong>{repoFile.split('/').pop()} · {lineStart}–{lineEnd}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button onClick={handleSaveRepoLink} className={`w-full mt-6 py-3 rounded-xl font-bold font-mono text-xs uppercase tracking-widest text-white transition-all shadow-md ${themeClasses.accentBg}`}>
                    Save Code Link
                  </button>
                </div>
              </div>

              {/* Code Links Table */}
              <div className={`p-6 border shadow-xl ${themeClasses.bgCard} ${themeClasses.radius}`}>
                <h3 className="text-sm font-bold uppercase font-mono tracking-wider mb-4 border-b border-inherit pb-3">Auditable Code Links</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-white/10 opacity-50 text-[10px] uppercase">
                        <th className="py-2">Section</th>
                        <th className="py-2">Repository</th>
                        <th className="py-2">File</th>
                        <th className="py-2">Lines</th>
                        <th className="py-2">Relationship</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {repoLinks.map(l => (
                        <tr key={l.id} className="hover:bg-white/5">
                          <td className="py-3 font-bold">{l.section}</td>
                          <td className="py-3 opacity-70 truncate max-w-[200px]">{l.repo}</td>
                          <td className="py-3 text-purple-400">{l.file}</td>
                          <td className="py-3">{l.start}–{l.end}</td>
                          <td className="py-3"><span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-full text-[10px]">{l.type}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 4. MANUSCRIPT DIFF */}
          {activeTab === 'diff' && (
            <div className={`p-6 border shadow-xl space-y-6 ${themeClasses.bgCard} ${themeClasses.radius}`}>
              <div className="flex items-center justify-between border-b border-inherit pb-4">
                <div>
                  <h3 className="text-sm font-bold uppercase font-mono tracking-wider">Manuscript Text Diff Engine</h3>
                  <p className="text-[11px] text-slate-500 font-mono">Compare two unstructured versions to isolate additions, deletions, and replacements</p>
                </div>
                <button onClick={handleRunDiff} className={`px-5 py-2.5 rounded-xl font-bold font-mono text-xs uppercase tracking-widest text-white transition-all shadow-md ${themeClasses.accentBg}`}>
                  Compare Buffers
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Version A (Base)</label>
                  <textarea value={diffA} onChange={e => setDiffA(e.target.value)} rows={6} className="w-full p-4 bg-black/20 border border-white/10 rounded-xl focus:outline-none custom-scrollbar"/>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Version B (Revised)</label>
                  <textarea value={diffB} onChange={e => setDiffB(e.target.value)} rows={6} className="w-full p-4 bg-black/20 border border-white/10 rounded-xl focus:outline-none custom-scrollbar"/>
                </div>
              </div>

              {diffSummary && (
                <div className="flex gap-3 font-mono text-xs">
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">{diffSummary.additions} Additions</span>
                  <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg">{diffSummary.deletions} Deletions</span>
                  <span className="px-3 py-1 bg-white/5 text-slate-400 border border-white/10 rounded-lg">{diffSummary.unchanged} Unchanged</span>
                </div>
              )}

              {diffLines.length > 0 && (
                <div className="border border-white/10 rounded-xl overflow-hidden font-mono text-xs divide-y divide-white/5 bg-[#050505]">
                  {diffLines.map((l, idx) => (
                    <div key={idx} className={`p-2.5 px-4 ${l.type === 'add' ? 'bg-emerald-950/20 text-emerald-400' : l.type === 'remove' ? 'bg-red-950/20 text-red-400' : 'text-slate-400'}`}>
                      {l.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. CITATION VALIDATOR */}
          {activeTab === 'citation' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className={`p-6 border shadow-xl ${themeClasses.bgCard} ${themeClasses.radius}`}>
                  <h3 className="text-sm font-bold uppercase font-mono tracking-wider mb-4 border-b border-inherit pb-3">Manuscript Keys & Bibliography</h3>
                  <div className="space-y-4 font-mono text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Citation Keys (In-Text)</label>
                      <textarea value={citationInput} onChange={e => setCitationInput(e.target.value)} rows={4} className="w-full p-3 bg-black/20 border border-white/10 rounded-xl custom-scrollbar"/>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Bibliography Entries (BibTeX / Registry)</label>
                      <textarea value={bibInput} onChange={e => setBibInput(e.target.value)} rows={4} className="w-full p-3 bg-black/20 border border-white/10 rounded-xl custom-scrollbar"/>
                    </div>
                    <button onClick={handleRunCitations} className={`w-full py-3 rounded-xl font-bold font-mono text-xs uppercase tracking-widest text-white transition-all shadow-md ${themeClasses.accentBg}`}>
                      Validate Citations
                    </button>
                  </div>
                </div>

                <div className={`p-6 border shadow-xl flex flex-col justify-between ${themeClasses.bgCard} ${themeClasses.radius}`}>
                  <div>
                    <h3 className="text-sm font-bold uppercase font-mono tracking-wider mb-4 border-b border-inherit pb-3">Validation Breakdown</h3>
                    <div className="grid grid-cols-3 gap-3 mb-6 font-mono text-center">
                      <div className="p-3 bg-black/20 border border-white/5 rounded-xl">
                        <span className="text-[10px] text-slate-500 uppercase block">Total</span>
                        <strong className="text-xl">{citationSummary.total}</strong>
                      </div>
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                        <span className="text-[10px] uppercase block">Resolved</span>
                        <strong className="text-xl">{citationSummary.valid}</strong>
                      </div>
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                        <span className="text-[10px] uppercase block">Missing</span>
                        <strong className="text-xl">{citationSummary.missing}</strong>
                      </div>
                    </div>

                    <div className="space-y-2 font-mono text-xs max-h-56 overflow-y-auto custom-scrollbar">
                      {citationItems.map((item, idx) => (
                        <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between ${item.valid ? 'bg-emerald-950/10 border-emerald-500/20 text-emerald-400' : 'bg-red-950/10 border-red-500/20 text-red-400'}`}>
                          <span>{item.key || item.value}</span>
                          <span className="text-[10px] uppercase">{item.valid ? '✓ Linked' : '✕ Missing'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. COMPLIANCE CHECK */}
          {activeTab === 'compliance' && (
            <div className={`p-6 border shadow-xl space-y-6 ${themeClasses.bgCard} ${themeClasses.radius}`}>
              <div className="flex items-center justify-between border-b border-inherit pb-4">
                <div>
                  <h3 className="text-sm font-bold uppercase font-mono tracking-wider">Publisher Compliance Pre-Flight</h3>
                  <p className="text-[11px] text-slate-500 font-mono">Verify geometry, image DPI, and word bounds against publisher specifications</p>
                </div>
                <button onClick={handleRunCompliance} className={`px-5 py-2.5 rounded-xl font-bold font-mono text-xs uppercase tracking-widest text-white transition-all shadow-md ${themeClasses.accentBg}`}>
                  Run Audit
                </button>
              </div>

              <div className="flex items-center gap-6 p-6 bg-black/20 rounded-2xl border border-white/5">
                <div className="text-4xl font-black font-mono text-emerald-400">{complianceScore}%</div>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span>Submission Readiness Index</span>
                    <span className="text-emerald-400">Pass</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${complianceScore}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 font-mono text-xs">
                {complianceChecks.map((chk, i) => (
                  <div key={i} className="p-3.5 bg-black/20 border border-white/5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={16} className={chk.status === 'Ready' ? 'text-emerald-400' : 'text-amber-400'}/>
                      <span>{chk.name}</span>
                    </div>
                    <span className={`text-[10px] uppercase font-bold ${chk.status === 'Ready' ? 'text-emerald-400' : 'text-amber-400'}`}>{chk.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. OBSERVABILITY & LOGS */}
          {activeTab === 'logs' && (
            <div className={`p-6 border shadow-xl space-y-4 ${themeClasses.bgCard} ${themeClasses.radius}`}>
              <div className="flex items-center justify-between border-b border-inherit pb-4">
                <div>
                  <h3 className="text-sm font-bold uppercase font-mono tracking-wider">FastAPI & Frontend Event Logs</h3>
                  <p className="text-[11px] text-slate-500 font-mono">{logs.length} operations tracked in memory</p>
                </div>
                <button onClick={() => setLogs([])} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl text-xs font-mono uppercase tracking-widest border border-white/10">
                  Clear Log Buffer
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/10 opacity-50 text-[10px] uppercase">
                      <th className="py-2">Timestamp</th>
                      <th className="py-2">Method</th>
                      <th className="py-2">Endpoint</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {logs.map((lg, i) => (
                      <tr key={i} className="hover:bg-white/5">
                        <td className="py-2.5 opacity-50">{lg.time}</td>
                        <td className="py-2.5 font-bold text-blue-400">{lg.method}</td>
                        <td className="py-2.5">{lg.endpoint}</td>
                        <td className="py-2.5"><span className={`px-2 py-0.5 rounded text-[10px] ${lg.status < 300 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{lg.status}</span></td>
                        <td className="py-2.5 opacity-70">{lg.latency} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 8. WORKSPACE CONFIG & AUTH */}
          {activeTab === 'settings' && (
            <div className={`p-8 border shadow-xl space-y-8 ${themeClasses.bgCard} ${themeClasses.radius}`}>
              <div>
                <h3 className="text-sm font-bold uppercase font-mono tracking-wider mb-2">FastAPI Backend Target</h3>
                <p className="text-xs text-slate-500 font-mono mb-4">Set the target endpoint URL to your local Uvicorn process</p>
                <input type="text" value={backendUrl} onChange={e => setBackendUrl(e.target.value)} className="w-full max-w-md px-4 py-3 bg-black/20 border border-white/10 rounded-xl font-mono text-xs focus:outline-none"/>
              </div>

              <div className="border-t border-inherit pt-6">
                <h3 className="text-sm font-bold uppercase font-mono tracking-wider mb-2">FastAPI Researcher Authentication</h3>
                <p className="text-xs text-slate-500 font-mono mb-6">Authorize writing directly to the central PostgreSQL tables</p>

                {token ? (
                  <div className="space-y-4 max-w-md">
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl font-mono text-xs flex items-center gap-3">
                      <CheckCircle2 size={16}/> Authenticated Session Active
                    </div>
                    <button onClick={handleLogout} className="px-6 py-3 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 rounded-xl font-mono text-xs uppercase tracking-widest font-bold transition-all">
                      Revoke Token & Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-md font-mono text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Email</label>
                      <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full px-3 py-2.5 bg-black/20 border border-white/10 rounded-xl"/>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Password</label>
                      <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full px-3 py-2.5 bg-black/20 border border-white/10 rounded-xl"/>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => handleAuth(false)} className={`flex-1 py-3 rounded-xl font-bold font-mono text-xs uppercase tracking-widest text-white ${themeClasses.accentBg}`}>
                        Sign In
                      </button>
                      <button onClick={() => handleAuth(true)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-bold font-mono text-xs uppercase tracking-widest border border-white/10">
                        Create Account
                      </button>
                    </div>
                    {authMessage && <p className="text-[11px] text-cyan-400 font-mono mt-2">{authMessage}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}