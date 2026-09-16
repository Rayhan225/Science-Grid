// src/components/Dashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Database, BookOpen, ShieldCheck,
  Sparkles, Terminal, FileText,
  GraduationCap, Microscope, Code2,
  TrendingUp, RefreshCw, ChevronRight, Search, Cpu, CheckSquare,
  BookmarkPlus, ArrowUpRight, CheckCircle2, Layers, Award,
  Clock, FolderOpen, Zap, AlertTriangle, Users, Server, HardDrive, Check, Copy, ExternalLink, X
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { useTheme } from '../context/ThemeContext';

const BACKEND_URL = "http://127.0.0.1:8000";

export default function Dashboard({ setCurrentView, onSelectTool, currentView, currentUser }) {
  const { themeClasses, isLight } = useTheme();
  const navigate = setCurrentView || onSelectTool || (() => {});
  
  // Active Role State (academic researcher, peer reviewer, graduate student, programmer, admin)
  const [activeRole, setActiveRole] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('sg_current_user') || '{}');
      return stored.role || currentUser?.role || 'researcher';
    } catch {
      return currentUser?.role || 'researcher';
    }
  });

  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Telemetry & DB State
  const [telemetry, setTelemetry] = useState({
    totalPagesRead: 32,
    annotationVolumes: 18,
    processingVelocityDays: 6,
    validationCount: 14,
    karmaGrowthScore: 1950,
    vaultFilesCount: 8,
    auditsCount: 12,
    codeImplementations: 6,
    studentFlashcards: 8
  });

  const [quotes, setQuotes] = useState([]);
  const [currentQuoteIdx, setCurrentQuoteIdx] = useState(0);
  const [recentWorkspaces, setRecentWorkspaces] = useState([]);
  const [recentAudits, setRecentAudits] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [flashcardsList, setFlashcardsList] = useState([]);
  const [codeList, setCodeList] = useState([]);
  const [vaultFilesList, setVaultFilesList] = useState([]);
  const [notesList, setNotesList] = useState([]);
  const [roleGraphStats, setRoleGraphStats] = useState(null);
  const [universalSearch, setUniversalSearch] = useState('');
  const [searchCategory, setSearchCategory] = useState('ALL'); // 'ALL' | 'PAPERS' | 'WORKSPACES' | 'AUDITS' | 'NOTES' | 'CODE' | 'SETTINGS'
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [copiedCitationId, setCopiedCitationId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChartTab, setActiveChartTab] = useState('distribution'); // 'distribution' | 'rigor'
  const [loading, setLoading] = useState(true);

  const copyCitation = (id, text) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedCitationId(id);
    showToast("BibTeX citation copied to clipboard.");
    setTimeout(() => setCopiedCitationId(null), 2500);
  };

  // Sync user role across window events
  useEffect(() => {
    const handleRoleUpdate = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('sg_current_user') || '{}');
        if (stored.role) setActiveRole(stored.role);
      } catch {}
    };
    window.addEventListener('storage', handleRoleUpdate);
    window.addEventListener('userRoleUpdated', handleRoleUpdate);
    return () => {
      window.removeEventListener('storage', handleRoleUpdate);
      window.removeEventListener('userRoleUpdated', handleRoleUpdate);
    };
  }, []);

  // Fetch live telemetry, workspaces, audits, vault files, and admin stats from database
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const userId = currentUser?.id || '';
        const uidParam = userId ? `?user_id=${userId}` : '';
        const [statsRes, quotesRes, wsRes, auditsRes, adminRes, cardsRes, codeRes, vaultRes, notesRes, roleStatsRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/telemetry/stats`).catch(() => null),
          fetch(`${BACKEND_URL}/api/quotes`).catch(() => null),
          fetch(`${BACKEND_URL}/api/workspaces${uidParam}`).catch(() => null),
          fetch(`${BACKEND_URL}/api/research/audits${uidParam}`).catch(() => null),
          fetch(`${BACKEND_URL}/api/admin/system-stats`).catch(() => null),
          fetch(`${BACKEND_URL}/api/student/flashcards${uidParam}`).catch(() => null),
          fetch(`${BACKEND_URL}/api/code/implementations${uidParam}`).catch(() => null),
          fetch(`${BACKEND_URL}/api/vault/files${uidParam}`).catch(() => null),
          fetch(`${BACKEND_URL}/api/vault/notes${uidParam}`).catch(() => null),
          fetch(`${BACKEND_URL}/api/telemetry/role-stats?role=${encodeURIComponent(activeRole || 'researcher')}${uidParam}`).catch(() => null)
        ]);

        if (statsRes && statsRes.ok) {
          const sData = await statsRes.json();
          setTelemetry(prev => ({ ...prev, ...sData }));
        }
        if (roleStatsRes && roleStatsRes.ok) {
          const rsData = await roleStatsRes.json();
          setRoleGraphStats(rsData);
        }
        if (quotesRes && quotesRes.ok) {
          const qData = await quotesRes.json();
          if (Array.isArray(qData) && qData.length > 0) setQuotes(qData);
        }
        if (wsRes && wsRes.ok) {
          const wData = await wsRes.json();
          if (Array.isArray(wData)) setRecentWorkspaces(wData);
        }
        if (auditsRes && auditsRes.ok) {
          const aData = await auditsRes.json();
          if (Array.isArray(aData)) setRecentAudits(aData);
        }
        if (adminRes && adminRes.ok) {
          const admData = await adminRes.json();
          setAdminStats(admData);
        }
        if (cardsRes && cardsRes.ok) {
          const cData = await cardsRes.json();
          if (Array.isArray(cData)) setFlashcardsList(cData);
        }
        if (codeRes && codeRes.ok) {
          const cdData = await codeRes.json();
          if (Array.isArray(cdData)) setCodeList(cdData);
        }
        if (vaultRes && vaultRes.ok) {
          const vData = await vaultRes.json();
          if (Array.isArray(vData)) setVaultFilesList(vData);
        }
        if (notesRes && notesRes.ok) {
          const nData = await notesRes.json();
          if (Array.isArray(nData)) setNotesList(nData);
        }
      } catch (err) {
        console.warn("Telemetry fetch fallback used:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser, activeRole]);

  // Quote Rotator
  useEffect(() => {
    if (quotes.length === 0) return;
    const interval = setInterval(() => {
      setCurrentQuoteIdx(prev => (prev + 1) % quotes.length);
    }, 14000);
    return () => clearInterval(interval);
  }, [quotes]);

  const activeQuote = quotes[currentQuoteIdx] || { 
    quote: "Pure mathematics is, in its way, the poetry of logical ideas.",
    author: "Albert Einstein"
  };

  // =========================================================================
  // ROLE-SPECIFIC PROFILES, CHARTS, AND TELEMETRY CONFIGURATION
  // =========================================================================
  const roleConfig = {
    researcher: {
      title: "Academic Researcher",
      badge: "Discovery & Synthesis Mode",
      objective: "Conducts multi-paper comparative synthesis, formulates algorithmic proofs, executes AST formulas, and prepares verifiable manuscripts.",
      chartType: 'area',
      stroke: '#06b6d4',
      gradientId: 'researcherGrad',
      gradientColor: '#06b6d4',
      unit: 'papers/wk',
      metrics: [
        { label: "Indexed Papers", val: telemetry.totalPagesRead || 28, sub: "Global Vault Library", icon: FileText, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
        { label: "Active AST Nodes", val: telemetry.validationCount || 14, sub: "Math Sandbox Engine", icon: Terminal, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
        { label: "Cross-Paper Matrices", val: recentWorkspaces.length || 8, sub: "Domain Synthesis", icon: Activity, color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/20" },
        { label: "Empirical Soundness", val: "94.2%", sub: "Validation Core", icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" }
      ],
      chartTitle: "Literature Pipeline Velocity",
      chartSub: "Throughput across research lifecycle",
      chartData: [
        { phase: 'Ingestion', value: 24 },
        { phase: 'Vault Index', value: 42 },
        { phase: 'AST Sandbox', value: 36 },
        { phase: 'Matrix Map', value: 58 },
        { phase: 'Validation', value: 48 },
        { phase: 'Published', value: 84 }
      ],
      quickActions: [
        { id: 'insight-lens', title: 'InsightLens Reader', desc: 'Layout-aware PDF parsing with vector markup & Copilot.', icon: BookOpen, color: 'text-cyan-400', glow: 'hover:border-cyan-500/40' },
        { id: 'central-vault', title: 'Global Vault & Citations', desc: 'Multi-standard BibTeX, APA, IEEE, and Chicago exports.', icon: Database, color: 'text-emerald-400', glow: 'hover:border-emerald-500/40' },
        { id: 'domain-matrix', title: 'Domain Matrix AI', desc: 'Comparative literature cross-examination and gap analysis.', icon: Activity, color: 'text-rose-400', glow: 'hover:border-rose-500/40' },
        { id: 'math-evaluator', title: 'Math AST Sandbox', desc: 'Drop-in formula evaluation with LaTeX and AST parsing.', icon: Terminal, color: 'text-purple-400', glow: 'hover:border-purple-500/40' }
      ]
    },
    professor: {
      title: "Faculty Professor & PI",
      badge: "Supervision & Advisory Mode",
      objective: "Supervises graduate literature reviews, monitors methodological rigor compliance, curates departmental research papers, and tracks thesis synthesis.",
      chartType: 'area',
      stroke: '#0ea5e9',
      gradientId: 'profGrad',
      gradientColor: '#0ea5e9',
      unit: 'audits/mo',
      metrics: [
        { label: "Supervised Audits", val: recentAudits.length || 6, sub: "Peer Review Suite", icon: ShieldCheck, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20" },
        { label: "Curated Papers", val: vaultFilesList.length || 18, sub: "Vault Curriculum", icon: FileText, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
        { label: "Student Flashcards", val: flashcardsList.length || 24, sub: "Spaced Learning Decks", icon: GraduationCap, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
        { label: "Advisory Rating", val: "97.2%", sub: "Institutional Soundness", icon: CheckCircle2, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" }
      ],
      chartTitle: "Supervised Research Progress & Velocity",
      chartSub: "Departmental literature and audit activity",
      chartData: [
        { phase: 'Ingestion', value: 35 },
        { phase: 'Curriculum', value: 52 },
        { phase: 'Peer Review', value: 68 },
        { phase: 'Validation', value: 84 },
        { phase: 'Defense', value: 95 }
      ],
      quickActions: [
        { id: 'validation-rigor', title: 'ScholarAudit Oversight', desc: 'Conduct multi-paper methodology inspections and export certificates.', icon: ShieldCheck, color: 'text-sky-400', glow: 'hover:border-sky-500/40' },
        { id: 'central-vault', title: 'Curated Vault Library', desc: 'Manage foundational reading lists and student reference papers.', icon: Database, color: 'text-emerald-400', glow: 'hover:border-emerald-500/40' },
        { id: 'domain-matrix', title: 'Comparative Literature Matrix', desc: 'Cross-analyze student thesis domains and gap hypotheses.', icon: Activity, color: 'text-rose-400', glow: 'hover:border-rose-500/40' },
        { id: 'insight-lens', title: 'Paper Reader & Annotations', desc: 'Review manuscript mathematical derivations and margin notes.', icon: BookOpen, color: 'text-cyan-400', glow: 'hover:border-cyan-500/40' }
      ]
    },
    reviewer: {
      title: "Peer Reviewer",
      badge: "Institutional Audit Mode",
      objective: "Evaluates empirical methodology, tests proof boundary limits, flags canonical literature overlap, and compiles certified Reviewer #2 reports.",
      chartType: 'area',
      stroke: '#14b8a6',
      gradientId: 'reviewerGrad',
      gradientColor: '#14b8a6',
      unit: 'pts',
      metrics: [
        { label: "Audited Ledgers", val: recentAudits.length || telemetry.auditsCount || 12, sub: "Sovereign Audit Records", icon: ShieldCheck, color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/20" },
        { label: "Methodology Flags", val: 8, sub: "Vulnerability Scans", icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
        { label: "Canonical Overlap", val: "3.8%", sub: "Vaswani / He Baselines", icon: Award, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
        { label: "Integrity Index", val: "96.4/100", sub: "SHA-256 Validated", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" }
      ],
      chartTitle: "Reviewer Rigor & Audit Distribution",
      chartSub: "Methodology scores across peer-reviewed suites",
      chartData: [
        { phase: 'Baseline Test', value: 88 },
        { phase: 'Ablation Check', value: 72 },
        { phase: 'Overlap Scan', value: 95 },
        { phase: 'LaTeX Guard', value: 92 },
        { phase: 'Bounds Stress', value: 84 },
        { phase: 'Certification', value: 98 }
      ],
      quickActions: [
        { id: 'validation-rigor', title: 'ScholarAudit Rigor Core', desc: 'Launch multi-dimensional automated peer review synthesis.', icon: ShieldCheck, color: 'text-teal-400', glow: 'hover:border-teal-500/40' },
        { id: 'central-vault', title: 'Global Vault Controls', desc: 'Inspect benchmark training sets and unredacted source papers.', icon: Database, color: 'text-purple-400', glow: 'hover:border-purple-500/40' },
        { id: 'domain-matrix', title: 'Cross-Paper Scrutiny', desc: 'Identify prior art claims and contradictory benchmark results.', icon: Activity, color: 'text-rose-400', glow: 'hover:border-rose-500/40' },
        { id: 'math-evaluator', title: 'Formula Bound Verification', desc: 'Stress test asymptotic bounds and tensor dimension mappings.', icon: Terminal, color: 'text-cyan-400', glow: 'hover:border-cyan-500/40' }
      ]
    },
    student: {
      title: "Graduate Student",
      badge: "Interactive Learning Mode",
      objective: "Deconstructs complex research papers, generates step-by-step formula explanations, extracts notes, and reviews multilingual translations.",
      chartType: 'area',
      stroke: '#10b981',
      gradientId: 'studentGrad',
      gradientColor: '#10b981',
      unit: '%',
      metrics: [
        { label: "Cards Mastered", val: flashcardsList.filter(c => c.mastery_level === 2).length || 2, sub: "Active Concept Mastery", icon: Award, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
        { label: "In Review", val: flashcardsList.filter(c => c.mastery_level === 1).length || 1, sub: "Spaced Repetition Deck", icon: GraduationCap, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
        { label: "Pinned Notes", val: 28, sub: "Notebook Citations", icon: BookmarkPlus, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
        { label: "Comprehension", val: "93%", sub: "Topic Mastery Curve", icon: CheckCircle2, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" }
      ],
      chartTitle: "Active Concept Retention & Recall",
      chartSub: "Spaced repetition stability score (%)",
      chartData: [
        { phase: 'Session 1', value: 42 },
        { phase: 'Session 2', value: 58 },
        { phase: 'Session 3', value: 71 },
        { phase: 'Session 4', value: 83 },
        { phase: 'Session 5', value: 92 },
        { phase: 'Session 6', value: 97 }
      ],
      quickActions: [
        { id: 'insight-lens', title: 'Interactive Reading & Snip', desc: 'Select any excerpt or image snip for instant Copilot breakdown.', icon: BookOpen, color: 'text-cyan-400', glow: 'hover:border-cyan-500/40' },
        { id: 'math-evaluator', title: 'Formula Step-Through', desc: 'Inspect equation variables, values, and live execution graphs.', icon: Terminal, color: 'text-purple-400', glow: 'hover:border-purple-500/40' },
        { id: 'domain-matrix', title: 'Literature Comparison', desc: 'Compare foundational papers (e.g. Attention vs Mamba).', icon: Activity, color: 'text-rose-400', glow: 'hover:border-rose-500/40' },
        { id: 'central-vault', title: 'Vault Research Archive', desc: 'Access pre-indexed academic papers with smart search.', icon: Database, color: 'text-emerald-400', glow: 'hover:border-emerald-500/40' }
      ]
    },
    programmer: {
      title: "Research Engineer / Programmer",
      badge: "Algorithm & Systems Mode",
      objective: "Translates mathematical formulations into optimized PyTorch architectures, validates tensor invariants, and executes client-side WASM pipelines.",
      chartType: 'bar',
      barColor: '#818cf8',
      unit: 'ms',
      metrics: [
        { label: "PyTorch Modules", val: codeList.length || telemetry.codeImplementations || 4, sub: "Algorithm Implementations", icon: Code2, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
        { label: "WASM Latency", val: "1.2ms", sub: "Pyodide Sandbox", icon: Cpu, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
        { label: "Active AST Nodes", val: telemetry.validationCount || 14, sub: "Formula Graph Engine", icon: Terminal, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
        { label: "Asymptotic Bound", val: "O(N · d)", sub: "Verified Invariants", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" }
      ],
      chartTitle: "Algorithmic Latency vs. Sequence Length",
      chartSub: "Kernel execution latency under batch=1 (ms)",
      chartData: [
        { phase: '128', value: 0.8 },
        { phase: '256', value: 1.4 },
        { phase: '512', value: 3.2 },
        { phase: '1024', value: 7.1 },
        { phase: '2048', value: 16.5 },
        { phase: '4096', value: 38.2 }
      ],
      quickActions: [
        { id: 'insight-lens', title: 'PyTorch Code Extractor', desc: 'Auto-extract runnable PyTorch modules from paper methodology.', icon: Code2, color: 'text-indigo-400', glow: 'hover:border-indigo-500/40' },
        { id: 'math-evaluator', title: 'WASM Pyodide Sandbox', desc: 'Execute live Python subroutines with interactive parameters.', icon: Terminal, color: 'text-purple-400', glow: 'hover:border-purple-500/40' },
        { id: 'domain-matrix', title: 'Architecture Matrix', desc: 'Benchmark architectural variations (e.g. Mamba vs Attention).', icon: Activity, color: 'text-rose-400', glow: 'hover:border-rose-500/40' },
        { id: 'central-vault', title: 'Vault Code Datasets', desc: 'Access pre-indexed benchmark datasets and paper sources.', icon: Database, color: 'text-cyan-400', glow: 'hover:border-cyan-500/40' }
      ]
    },
    admin: {
      title: "Lab Director / Administrator",
      badge: "Institutional Governance Mode",
      objective: "Oversees lab research members, monitors database health, manages paper library storage quotas, and audits institutional compliance.",
      chartType: 'bar',
      barColor: '#f59e0b',
      unit: 'MB',
      metrics: [
        { label: "Active Researchers", val: adminStats?.governance?.totalUsers || 3, sub: "Multi-User Directory", icon: Users, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
        { label: "DB Latency", val: adminStats?.database?.latencyMs ? `${adminStats.database.latencyMs}ms` : "1.8ms", sub: "Database Sovereign Pool", icon: Cpu, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
        { label: "Library Artifacts", val: adminStats?.storageMetrics?.totalArtifacts || 36, sub: "Papers & Workspaces", icon: Database, color: "text-cyan-400", bg: "bg-cyan-500/20", border: "border-cyan-500/20" },
        { label: "Audit Integrity", val: "98.8%", sub: "Reviewer Compliance", icon: ShieldCheck, color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/20" }
      ],
      chartTitle: "Partition Quotas & Memory Footprint",
      chartSub: "Storage allocation across lab research clusters (MB)",
      chartData: [
        { phase: 'Vault', value: 42 },
        { phase: 'Workspaces', value: 68 },
        { phase: 'Sandboxes', value: 55 },
        { phase: 'Audits', value: 82 },
        { phase: 'Code', value: 60 },
        { phase: 'Flashcards', value: 45 }
      ],
      quickActions: [
        { id: 'dashboard', title: 'Lab Governance Console', desc: 'Inspect database health, active user quotas, and audit trails.', icon: Cpu, color: 'text-amber-400', glow: 'hover:border-amber-500/40' },
        { id: 'validation-rigor', title: 'ScholarAudit Suite', desc: 'Inspect institutional peer review and scientific rigor records.', icon: ShieldCheck, color: 'text-teal-400', glow: 'hover:border-teal-500/40' },
        { id: 'central-vault', title: 'Global Vault Quotas', desc: 'Manage shared research libraries and document access.', icon: Database, color: 'text-purple-400', glow: 'hover:border-purple-500/40' },
        { id: 'domain-matrix', title: 'Lab Synthesis Matrix', desc: 'Inspect cross-domain comparative literature syntheses.', icon: Activity, color: 'text-rose-400', glow: 'hover:border-rose-500/40' }
      ]
    }
  };

  const currentRoleConfig = roleConfig[activeRole] || roleConfig.researcher;

  const SETTINGS_TARGETS = [
    { id: 'settings-themes', title: 'Theme & Aesthetics Settings', category: 'SETTINGS', desc: 'Emerald Solitude, Cyber Monolith, Aurora Borealis themes', view: 'settings' },
    { id: 'settings-persona', title: 'Account Role & Persona Scope', category: 'SETTINGS', desc: 'Researcher, Reviewer, Graduate Student, Programmer, Lab Director', view: 'settings' },
    { id: 'settings-sovereign', title: 'Sovereign Multi-Tenant Quotas', category: 'SETTINGS', desc: 'Database storage limits, cache purging, database diagnostics', view: 'settings' },
    { id: 'settings-sync', title: 'Local AI & Pyodide Settings', category: 'SETTINGS', desc: 'Manage offline WASM computation & PyTorch environment', view: 'settings' }
  ];

  const universalResults = React.useMemo(() => {
    const q = universalSearch.toLowerCase().trim();
    if (!q) return [];

    const results = [];

    // 1. Papers / Workspaces
    if (searchCategory === 'ALL' || searchCategory === 'PAPERS') {
      recentWorkspaces.forEach(ws => {
        if ((ws.title || '').toLowerCase().includes(q)) {
          results.push({
            id: `paper_${ws.id}`,
            category: 'PAPER',
            categoryLabel: 'Research Paper',
            title: ws.title || 'Untitled Paper',
            sub: `${ws.timestamp || 'Active'} • ${ws.totalPages || 1} Pages • ${ws.chatHistory?.length || 0} Chats`,
            raw: ws,
            action: () => {
              const filePayload = {
                id: ws.fileId || ws.id,
                title: ws.title || "Research Document",
                url: `${BACKEND_URL}/api/library/file/${ws.fileId || ws.id}`
              };
              localStorage.setItem('sg_active_vault_file', JSON.stringify(filePayload));
              window.dispatchEvent(new CustomEvent('sg-open-file', { detail: filePayload }));
              navigate('insight-lens');
            }
          });
        }
      });
    }

    // 2. Vault Files & Images
    if (searchCategory === 'ALL' || searchCategory === 'VAULT') {
      vaultFilesList.forEach(file => {
        const name = file.title || file.name || '';
        if (name.toLowerCase().includes(q)) {
          const isImg = /\.(png|jpe?g|webp|gif)$/i.test(name);
          results.push({
            id: `vault_${file.id}`,
            category: isImg ? 'IMAGE' : 'VAULT',
            categoryLabel: isImg ? 'Vault Image' : 'Vault File',
            title: name,
            sub: `${file.date || file.created_at?.substring(0, 10) || 'Active'} • Sovereign Storage`,
            raw: file,
            action: () => {
              const filePayload = {
                id: file.id,
                title: name,
                url: `${BACKEND_URL}/api/library/file/${file.id}`
              };
              localStorage.setItem('sg_active_vault_file', JSON.stringify(filePayload));
              window.dispatchEvent(new CustomEvent('sg-open-file', { detail: filePayload }));
              if (name.toLowerCase().endsWith('.pdf')) {
                navigate('insight-lens');
              } else {
                navigate('central-vault');
              }
            }
          });
        }
      });
    }

    // 3. Ledger Files (ScholarAudit)
    if (searchCategory === 'ALL' || searchCategory === 'LEDGERS') {
      recentAudits.forEach(audit => {
        const title = audit.title || audit.manuscript_title || '';
        if (title.toLowerCase().includes(q)) {
          results.push({
            id: `audit_${audit.audit_id || audit.id}`,
            category: 'LEDGER',
            categoryLabel: 'Audit Ledger',
            title: title || 'Sovereign Audit Ledger',
            sub: `Score: ${audit.overall_score || 88.5}% • Overlap: ${audit.plagiarism_index || 3.8}%`,
            raw: audit,
            action: () => {
              localStorage.setItem('sg_active_audit', JSON.stringify(audit));
              window.dispatchEvent(new CustomEvent('sg-open-audit', { detail: audit }));
              navigate('validation-rigor');
            }
          });
        }
      });
    }

    // 4. Notes
    if (searchCategory === 'ALL' || searchCategory === 'NOTES') {
      notesList.forEach(note => {
        const title = note.title || '';
        const source = note.source || '';
        const text = note.text || '';
        const insight = note.insight || '';
        if (title.toLowerCase().includes(q) || source.toLowerCase().includes(q) || text.toLowerCase().includes(q) || insight.toLowerCase().includes(q)) {
          results.push({
            id: `note_${note.id}`,
            category: 'NOTE',
            categoryLabel: 'Vault Note',
            title: title || `${source} (p. ${note.page_number || 1})`,
            sub: text ? `"${text.substring(0, 60)}..."` : (insight ? insight.substring(0, 60) : source),
            raw: note,
            action: () => {
              const filePayload = {
                id: `note_file_${note.id}`,
                title: note.source || "Research Document",
                pageNumber: note.page_number || 1,
                url: `${BACKEND_URL}/api/library/resolve-file?filename=${encodeURIComponent(note.source || '')}`
              };
              localStorage.setItem('sg_active_vault_file', JSON.stringify(filePayload));
              window.dispatchEvent(new CustomEvent('sg-open-file', { detail: filePayload }));
              navigate('insight-lens');
            }
          });
        }
      });
    }

    // 5. Code Implementations
    if (searchCategory === 'ALL' || searchCategory === 'CODE') {
      codeList.forEach(code => {
        const title = code.title || code.name || '';
        if (title.toLowerCase().includes(q) || (code.desc || '').toLowerCase().includes(q)) {
          results.push({
            id: `code_${code.id}`,
            category: 'CODE',
            categoryLabel: 'PyTorch Code',
            title: title || 'PyTorch Implementation',
            sub: code.framework || 'PyTorch Module • Live Execution',
            raw: code,
            action: () => {
              navigate('insight-lens');
            }
          });
        }
      });
    }

    // 6. Settings
    if (searchCategory === 'ALL' || searchCategory === 'SETTINGS') {
      SETTINGS_TARGETS.forEach(s => {
        if (s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q)) {
          results.push({
            id: s.id,
            category: 'SETTINGS',
            categoryLabel: 'Settings',
            title: s.title,
            sub: s.desc,
            raw: s,
            action: () => navigate('settings')
          });
        }
      });
    }

    return results;
  }, [universalSearch, searchCategory, recentWorkspaces, vaultFilesList, recentAudits, notesList, codeList, navigate]);

  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef(null);

  // Real database-driven chart data
  const realDatabaseDistribution = [
    { name: 'Vault Papers', count: vaultFilesList.length || 0, fill: '#06b6d4' },
    { name: 'Workspaces', count: recentWorkspaces.length || 0, fill: '#10b981' },
    { name: 'Rigor Audits', count: recentAudits.length || 0, fill: '#14b8a6' },
    { name: 'Vault Notes', count: notesList.length || 0, fill: '#8b5cf6' },
    { name: 'Code Modules', count: codeList.length || 0, fill: '#6366f1' }
  ];

  const auditTrendData = recentAudits.length > 0
    ? recentAudits.slice(0, 6).map((a, i) => ({
        phase: (a.title || `Audit ${i + 1}`).slice(0, 10),
        value: Number(a.overall_score || a.rigor_score || 85),
        overlap: Number(a.plagiarism_index || 3.5)
      }))
    : [
        { phase: 'Baseline', value: 88, overlap: 3.2 },
        { phase: 'Empirical', value: 94, overlap: 2.8 },
        { phase: 'Ablation', value: 91, overlap: 2.1 }
      ];

  // Filter workspaces or audits based on search query in the ledger feed
  const filteredWorkspaces = recentWorkspaces.filter(ws => 
    (ws.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAudits = recentAudits.filter(a =>
    (a.title || a.manuscript_title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`flex-1 overflow-y-auto custom-scrollbar min-h-0 p-6 md:p-8 max-w-[1680px] w-full mx-auto flex flex-col select-none ${themeClasses.bgMain}`}>
      
      {/* ========================================================================= */}
      {/* UNIVERSAL ACCOUNT SEARCH BAR (POSITIONED ABOVE HERO SECTION)              */}
      {/* ========================================================================= */}
      <div className="mb-6 relative z-30 shrink-0">
        <div className={`p-2.5 sm:p-3 rounded-2xl border transition-all duration-300 backdrop-blur-xl shadow-lg flex flex-col sm:flex-row items-center gap-3 ${
          isSearchExpanded || universalSearch
            ? (isLight ? 'bg-white border-teal-500 ring-2 ring-teal-500/20 shadow-xl' : 'bg-slate-950/90 border-teal-500/60 ring-2 ring-teal-500/20 shadow-2xl')
            : (isLight ? 'bg-white/80 border-slate-200 hover:border-slate-300' : 'bg-white/[0.04] border-white/10 hover:border-white/20')
        }`}>
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0 shrink-0">
            {['ALL', 'PAPERS', 'WORKSPACES', 'AUDITS', 'NOTES', 'CODE', 'SETTINGS'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSearchCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap ${
                  searchCategory === cat
                    ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="h-5 w-[1px] bg-white/10 hidden sm:block"></div>

          {/* Search Input */}
          <div className="flex-1 flex items-center gap-2.5 w-full">
            <Search size={16} className="text-teal-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={universalSearch}
              onFocus={() => setIsSearchExpanded(true)}
              onChange={(e) => setUniversalSearch(e.target.value)}
              placeholder={`Search ${searchCategory.toLowerCase()} across all modules in your account...`}
              className={`w-full bg-transparent text-xs font-mono outline-none ${
                isLight ? 'text-slate-900 placeholder:text-slate-400' : 'text-white placeholder:text-slate-500'
              }`}
            />
            {universalSearch && (
              <button
                type="button"
                onClick={() => { setUniversalSearch(''); setIsSearchExpanded(false); }}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
            <span className="hidden md:inline-block px-2 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-white/5 border border-white/5 shrink-0">
              Account Repository
            </span>
          </div>
        </div>

        {/* Floating Dropdown Results */}
        {universalSearch.trim() && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsSearchExpanded(false)} />
            <div className={`absolute left-0 right-0 top-full mt-2 z-50 p-3.5 rounded-2xl border shadow-2xl backdrop-blur-2xl max-h-96 overflow-y-auto custom-scrollbar animate-fadeIn ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0b0f17]/95 border-white/15'
            }`}>
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/5 text-[10px] font-mono text-slate-400">
                <span>Account Results for "{universalSearch}" in <strong className="text-teal-400">[{searchCategory}]</strong> ({universalResults.length})</span>
                <span className="text-teal-400 font-bold">1-Click Jump &rarr;</span>
              </div>
              {universalResults.length === 0 ? (
                <div className="p-6 text-center text-slate-500 font-mono text-xs">
                  No records matching "{universalSearch}" in your account repository.
                </div>
              ) : (
                <div className="space-y-1.5 mt-2">
                  {universalResults.map(item => (
                    <div
                      key={item.id}
                      onClick={() => {
                        item.action();
                        setUniversalSearch('');
                        setIsSearchExpanded(false);
                      }}
                      className="p-2.5 rounded-xl border border-white/5 hover:border-teal-500/40 hover:bg-teal-500/10 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30 shrink-0">
                          {item.categoryLabel}
                        </span>
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-white truncate group-hover:text-teal-300 transition-colors">
                            {item.title}
                          </h5>
                          <p className="text-[10px] font-mono text-slate-400 truncate">
                            {item.sub}
                          </p>
                        </div>
                      </div>
                      <ArrowUpRight size={14} className="text-slate-500 group-hover:text-teal-400 transition-colors shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TOP COMMAND HERO WITH STRICT ROLE IDENTITY                                */}
      {/* ========================================================================= */}
      <div className={`relative p-8 md:p-10 rounded-[2.5rem] border shadow-2xl overflow-hidden mb-8 backdrop-blur-2xl shrink-0 min-h-fit w-full ${themeClasses.bgCard}`}>
        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-cyan-500/15 via-teal-500/10 to-transparent blur-3xl pointer-events-none -mr-28 -mt-28" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-purple-500/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">

          {/* Left: Title, Role Badge & Quote */}
          <div className="space-y-4 max-w-2xl">
            
            {/* Account Role Persona Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-teal-500/10 border border-teal-500/30 backdrop-blur-md">
              {activeRole === 'reviewer' ? (
                <ShieldCheck size={16} className="text-teal-400" />
              ) : activeRole === 'student' ? (
                <GraduationCap size={16} className="text-emerald-400" />
              ) : activeRole === 'programmer' ? (
                <Code2 size={16} className="text-indigo-400" />
              ) : activeRole === 'admin' ? (
                <Cpu size={16} className="text-amber-400" />
              ) : (
                <Microscope size={16} className="text-cyan-400" />
              )}
              <span className="text-xs font-mono font-bold text-teal-300 uppercase tracking-wider">
                Active Account: {currentRoleConfig.title}
              </span>
              {/* <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                Sovereign Scope
              </span> */}
            </div>

            {/* Authenticated Sovereign Role Scope Banner */}
            <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
              <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                activeRole === 'admin' ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' :
                activeRole === 'programmer' ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' :
                activeRole === 'student' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' :
                activeRole === 'reviewer' ? 'bg-teal-500/15 border-teal-500/30 text-teal-300' :
                'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
              }`}>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold uppercase tracking-wider">{currentRoleConfig.title}</span>
                <span className="text-[10px] text-slate-400 border-l border-white/10 pl-2">
                  {currentUser?.email || `${activeRole}@scholargrid.io`}
                </span>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                🔒 Sovereign Role Binding Active
              </span>
            </div>

            <h1 className={`text-3xl md:text-5xl font-serif tracking-tight leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              ScholarGrid Research Command.
            </h1>

            <div className="flex items-center gap-3 pt-1">
              <p className="text-xs text-slate-400 font-light italic font-serif leading-relaxed max-w-xl">
                "{activeQuote.quote}" — <span className="not-italic font-mono text-[11px] text-teal-400 font-medium">{activeQuote.author}</span>
              </p>
              <button 
                onClick={() => setCurrentQuoteIdx(quotes.length > 0 ? (currentQuoteIdx + 1) % quotes.length : 0)}
                title="Shuffle Quote"
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
              >
                <RefreshCw size={12}/>
              </button>
            </div>
          </div>

          {/* Right: Role Persona Callout Card */}
          <div className="flex flex-col gap-4 max-w-md w-full">
            <div className={`p-6 rounded-3xl border backdrop-blur-xl w-full ${
              isLight ? 'bg-white/90 border-slate-200' : 'bg-white/[0.03] border-white/10'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-teal-400 font-bold px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20">
                  {currentRoleConfig.badge}
                </span>
                <span className="text-[11px] font-mono text-slate-400">● Sovereign Ready</span>
              </div>
              <h3 className="text-sm font-bold text-white mb-2 font-sans">{currentRoleConfig.title} Mandate</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-serif italic">
                "{currentRoleConfig.objective}"
              </p>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">Primary Workspace:</span>
                <button
                  onClick={() => navigate(currentRoleConfig.quickActions[0].id)}
                  className="text-teal-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Launch {currentRoleConfig.quickActions[0].title}</span>
                  <ArrowUpRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Real-Time Role-Tailored Telemetry Metrics Deck */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          {(currentRoleConfig.metrics || []).map((metric, idx) => {
            const Icon = metric.icon || Database;
            return (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.02] flex items-center gap-3.5 backdrop-blur-md ${
                  metric.bg || 'bg-white/5'
                } ${metric.border || 'border-white/10'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  metric.bg || 'bg-cyan-500/20'
                } ${metric.color || 'text-cyan-400'}`}>
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block truncate">{metric.label}</span>
                  <div className="text-lg font-bold font-mono text-white flex items-center gap-2">
                    <span>{metric.val}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 truncate block">{metric.sub}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DUAL WORKSPACE PANE: RECENT WORKSPACES & ANALYTICS CHART                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8 shrink-0">

        {/* Left Column (Span 7): Active Workspace Ledger Feed */}
        <div className={`lg:col-span-7 p-6 md:p-8 rounded-[2rem] border flex flex-col justify-between ${
          isLight ? 'bg-white border-slate-200' : 'bg-white/[0.03] backdrop-blur-xl border-white/[0.08]'
        }`}>
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-white/5">
              <div>
                <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                  <Layers size={16} className="text-teal-400" />
                  {activeRole === 'reviewer' ? 'Recent Sovereign Audit Ledgers' : 'Active Research Workspaces'}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">Synchronized with sovereign database</p>
              </div>

              {/* Search filter */}
              <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/30 border-white/10'
              }`}>
                <Search size={13} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs font-mono outline-none text-white placeholder:text-slate-500 w-32"
                />
              </div>
            </div>

            {/* List entries */}
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
              {activeRole === 'reviewer' ? (
                filteredAudits.length > 0 ? (
                  filteredAudits.slice(0, 5).map(audit => (
                    <div
                      key={audit.id}
                      onClick={() => navigate('validation-rigor')}
                      className="p-3.5 rounded-xl border border-white/5 bg-black/20 hover:border-teal-500/40 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 flex-shrink-0">
                          <ShieldCheck size={16} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-teal-300 transition-colors">
                            {audit.title || audit.manuscript_title || "Audit Record"}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400">
                            Score: {audit.overall_score || audit.rigor_score || 94}/100 • Overlap: {audit.plagiarism_index || "3.2%"} • {audit.timestamp || "Certified"}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        View Audit &rarr;
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl">
                    <ShieldCheck size={28} className="text-slate-500 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-mono">No audits recorded yet.</p>
                    <button
                      onClick={() => navigate('validation-rigor')}
                      className="mt-3 text-xs font-mono text-teal-400 font-bold hover:underline cursor-pointer"
                    >
                      Execute First Rigor Audit &rarr;
                    </button>
                  </div>
                )
              ) : (
                filteredWorkspaces.length > 0 ? (
                  filteredWorkspaces.slice(0, 5).map(ws => (
                    <div
                      key={ws.id}
                      onClick={() => navigate(ws.fileId ? 'insight-lens' : 'domain-matrix')}
                      className="p-3.5 rounded-xl border border-white/5 bg-black/20 hover:border-cyan-500/40 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 flex-shrink-0">
                          <BookOpen size={16} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                            {ws.title || "Research Workspace"}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400">
                            {ws.timestamp || "Active"} • {ws.totalPages || 1} Pages • {ws.chatHistory?.length || 0} Chats
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        Open Workspace &rarr;
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl">
                    <BookOpen size={28} className="text-slate-500 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-mono">No active workspaces indexed.</p>
                    <button
                      onClick={() => navigate('insight-lens')}
                      className="mt-3 text-xs font-mono text-cyan-400 font-bold hover:underline cursor-pointer"
                    >
                      Ingest New Research Paper &rarr;
                    </button>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Partition: Isolated User Scope</span>
            <button 
              onClick={() => navigate('central-vault')}
              className="text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Explore Central Vault</span>
              <ArrowUpRight size={12} />
            </button>
          </div>
        </div>

        {/* Right Column (Span 5): Live Database Distribution & Rigor Graph */}
        <div className={`lg:col-span-5 p-6 md:p-8 rounded-[2rem] border flex flex-col justify-between ${
          isLight ? 'bg-white border-slate-200' : 'bg-white/[0.03] backdrop-blur-xl border-white/[0.08]'
        }`}>
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-white/5 gap-2">
              <div>
                <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                  <TrendingUp size={16} className="text-teal-400" />
                  {activeChartTab === 'distribution'
                    ? (roleGraphStats?.graphTitle || (
                        activeRole === 'professor' ? 'Faculty Supervision & Peer Review Distribution' :
                        activeRole === 'student' ? 'Curricular Mastery & Study Decks' :
                        activeRole === 'programmer' ? 'Algorithmic Implementation & Model Benchmarks' :
                        activeRole === 'reviewer' ? 'Methodological Verification & Audit Spread' :
                        activeRole === 'admin' ? 'Cluster Infrastructure & Resource Utilization' :
                        'Research Artifact Matrix'
                      ))
                    : 'Audit Rigor Index'}
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  {activeChartTab === 'distribution'
                    ? (roleGraphStats?.graphSub || 'Role-customized parameters queried from the database')
                    : 'Empirical rigor & boundary scores'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveChartTab('distribution')}
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    activeChartTab === 'distribution'
                      ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Role Metrics
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartTab('rigor')}
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    activeChartTab === 'rigor'
                      ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Rigor Scores
                </button>
              </div>
            </div>

            {/* Recharts Adaptive Container: Real Database Data */}
            <div className="h-56 w-full min-w-0" style={{ minHeight: '224px' }}>
              {(typeof currentView === 'undefined' || currentView === 'dashboard') && (
                <ResponsiveContainer width="100%" height={220} minWidth={150} minHeight={180} debounce={50}>
                  {activeChartTab === 'distribution' ? (
                    <BarChart data={roleGraphStats?.chartData || realDatabaseDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                      <XAxis
                        dataKey="name"
                        stroke="rgba(255,255,255,0.2)"
                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'monospace' }}
                      />
                      <YAxis
                        stroke="rgba(255,255,255,0.2)"
                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'monospace' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#090d16',
                          borderColor: 'rgba(45, 212, 191, 0.3)',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          color: '#fff'
                        }}
                        formatter={(val, name, item) => [`${val} Records`, item?.payload?.label || 'Database Rows']}
                      />
                      <Bar
                        dataKey="count"
                        fill={currentRoleConfig.stroke || "#14b8a6"}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  ) : (
                    <AreaChart data={auditTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="auditTrendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                      <XAxis
                        dataKey="phase"
                        stroke="rgba(255,255,255,0.2)"
                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'monospace' }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="rgba(255,255,255,0.2)"
                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'monospace' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#090d16',
                          borderColor: 'rgba(45, 212, 191, 0.3)',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          color: '#fff'
                        }}
                        formatter={(val) => [`${val} / 100`, 'Rigor Index']}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#2dd4bf"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#auditTrendGrad)"
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Supabase Cloud Pool</span>
            <span className="text-teal-400 font-bold">
              {activeChartTab === 'distribution'
                ? `${vaultFilesList.length + recentWorkspaces.length + recentAudits.length + notesList.length} Verified Entries`
                : `${recentAudits.length} Audited Papers`}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* QUICK TOOLCHAIN ACTION CARDS                                              */}
      {/* ========================================================================= */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
            <Zap size={14} className="text-teal-400" />
            Specialized Toolchain Actions ({currentRoleConfig.title})
          </h2>
          <span className="text-[11px] font-mono text-slate-500">1-Click Launch</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {currentRoleConfig.quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <div
                key={action.id}
                onClick={() => navigate(action.id)}
                className={`p-6 rounded-2xl border cursor-pointer transition-all duration-300 hover:scale-[1.02] group ${action.glow} ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/[0.03] backdrop-blur-xl border-white/[0.08] hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-black/30 flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform`}>
                    <Icon size={20} />
                  </div>
                  <ArrowUpRight size={16} className="text-slate-500 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5">{action.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">{action.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROLE-SPECIFIC DEEP EXTENSION PANELS (STRICTLY SCOPED TO AUTHENTICATED ROLE)*/}
      {/* ========================================================================= */}

      {/* 4. RESEARCHER: LITERATURE SYNTHESIS & ACTIVE VAULT CITATIONS */}
      {activeRole === 'researcher' && (
        <div className={`p-6 md:p-8 rounded-[2rem] border shadow-2xl mb-8 backdrop-blur-xl ${
          isLight ? 'bg-white border-cyan-500/20' : 'bg-white/[0.03] border-cyan-500/30'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Microscope size={18} className="text-cyan-400" />
                <h2 className="text-base font-bold text-white font-sans">Active Literature Synthesis & Central Vault Citations</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold">
                  {vaultFilesList.length || 6} Vault Records Indexed
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Pre-indexed academic papers with 1-click citation export (BibTeX, APA, IEEE) and comparative synthesis.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('insight-lens')}
                className="px-3.5 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 font-mono text-xs flex items-center gap-1.5 transition-all font-bold cursor-pointer"
              >
                <BookOpen size={13} />
                <span>Ingest to InsightLens &rarr;</span>
              </button>
              <button
                onClick={() => navigate('central-vault')}
                className="px-3.5 py-2 rounded-xl bg-black/30 border border-white/10 text-slate-300 hover:text-white font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Database size={13} />
                <span>Central Vault Archive</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(vaultFilesList.length > 0 ? vaultFilesList : [
              { id: 1, name: "Attention Is All You Need.pdf", type: "pdf", title: "Attention Is All You Need" },
              { id: 2, name: "Deep Residual Learning for Image Recognition.pdf", type: "pdf", title: "Deep Residual Learning" },
              { id: 3, name: "Mamba: Linear-Time Sequence Modeling.pdf", type: "pdf", title: "Mamba Architecture" }
            ]).slice(0, 6).map((file, idx) => {
              const fileTitle = file.title || file.name || "Research Manuscript";
              const bibtex = `@article{scholargrid_${file.id || idx},\n  title={${fileTitle}},\n  author={ScholarGrid Research Network},\n  year={2026}\n}`;
              const isCopied = copiedCitationId === (file.id || idx);
              return (
                <div key={file.id || idx} className="p-4 rounded-xl border border-white/5 bg-black/20 hover:border-cyan-500/40 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white font-sans truncate">{fileTitle}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10">
                        {file.type || 'PDF'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mb-3">
                      Sovereign pgvector Relational Tree Node
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                    <button
                      onClick={() => copyCitation(file.id || idx, bibtex)}
                      className={`text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer ${
                        isCopied ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {isCopied ? <Check size={12} /> : <Copy size={12} />}
                      <span>{isCopied ? 'Copied' : 'Copy BibTeX'}</span>
                    </button>
                    <button
                      onClick={() => navigate('insight-lens')}
                      className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <span>Analyze &rarr;</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4b. PROFESSOR: FACULTY ADVISORY, CURRICULUM SYLLABI & SUPERVISION */}
      {activeRole === 'professor' && (
        <div className={`p-6 md:p-8 rounded-[2rem] border shadow-2xl mb-8 backdrop-blur-xl ${
          isLight ? 'bg-white border-sky-500/20' : 'bg-white/[0.03] border-sky-500/30'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap size={18} className="text-sky-400" />
                <h2 className="text-base font-bold text-white font-sans">Faculty Research Advisory & Curricular Oversight</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30 font-bold">
                  {vaultFilesList.length || 6} Curated Papers • {flashcardsList.length || 4} Study Decks
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Departmental paper curation, graduate thesis rigor verification, and student study deck supervision.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('validation-rigor')}
                className="px-3.5 py-2 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-300 hover:bg-sky-500/30 font-mono text-xs flex items-center gap-1.5 transition-all font-bold cursor-pointer"
              >
                <ShieldCheck size={13} />
                <span>Supervise Rigor &rarr;</span>
              </button>
              <button
                onClick={() => navigate('central-vault')}
                className="px-3.5 py-2 rounded-xl bg-black/30 border border-white/10 text-slate-300 hover:text-white font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Database size={13} />
                <span>Departmental Vault</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(vaultFilesList.length > 0 ? vaultFilesList : [
              { id: 1, name: "Attention Is All You Need.pdf", type: "pdf", title: "Attention Is All You Need" },
              { id: 2, name: "Deep Residual Learning for Image Recognition.pdf", type: "pdf", title: "Deep Residual Learning" },
              { id: 3, name: "Mamba: Linear-Time Sequence Modeling.pdf", type: "pdf", title: "Mamba Architecture" }
            ]).slice(0, 6).map((file, idx) => {
              const fileTitle = file.title || file.name || "Curated Reading";
              const bibtex = `@article{scholargrid_prof_${file.id || idx},\n  title={${fileTitle}},\n  author={Departmental Reading List},\n  year={2026}\n}`;
              const isCopied = copiedCitationId === (file.id || idx);
              return (
                <div key={file.id || idx} className="p-4 rounded-xl border border-white/5 bg-black/20 hover:border-sky-500/40 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white font-sans truncate">{fileTitle}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                        Curriculum
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mb-3">
                      Supervised Paper • Student Reading Assignment
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                    <button
                      onClick={() => copyCitation(file.id || idx, bibtex)}
                      className={`text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer ${
                        isCopied ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {isCopied ? <Check size={12} /> : <Copy size={12} />}
                      <span>{isCopied ? 'Copied' : 'Syllabus Citation'}</span>
                    </button>
                    <button
                      onClick={() => navigate('insight-lens')}
                      className="text-xs font-mono text-sky-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <span>Review &rarr;</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. REVIEWER: FORENSIC AUDIT CERTIFICATES & RIGOR VERIFICATION */}
      {activeRole === 'reviewer' && (
        <div className={`p-6 md:p-8 rounded-[2rem] border shadow-2xl mb-8 backdrop-blur-xl ${
          isLight ? 'bg-white border-teal-500/20' : 'bg-white/[0.03] border-teal-500/30'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={18} className="text-teal-400" />
                <h2 className="text-base font-bold text-white font-sans">Forensic Audit Certificates & Rigor Verification Ledger</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30 font-bold">
                  {recentAudits.length || 4} Certified Audits
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Automated peer review certifications verifying empirical reproducibility, AI stylometry, and canonical plagiarism boundaries.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('validation-rigor')}
                className="px-3.5 py-2 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 hover:bg-teal-500/30 font-mono text-xs flex items-center gap-1.5 transition-all font-bold cursor-pointer"
              >
                <ShieldCheck size={13} />
                <span>Launch ScholarAudit &rarr;</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(recentAudits.length > 0 ? recentAudits : [
              {
                audit_id: "demo-aud-1",
                title: "Adaptive Sparse Attention Formulation",
                overall_score: 92.4,
                verification_passed: true,
                plagiarism_index: 3.8
              },
              {
                audit_id: "demo-aud-2",
                title: "Empirical Soundness of LayerNorm Variants",
                overall_score: 88.5,
                verification_passed: true,
                plagiarism_index: 4.2
              },
              {
                audit_id: "demo-aud-3",
                title: "Selective State Space Duality Bounds",
                overall_score: 94.0,
                verification_passed: true,
                plagiarism_index: 2.9
              }
            ]).slice(0, 6).map((audit, idx) => (
              <div key={audit.audit_id || idx} className="p-4 rounded-xl border border-white/5 bg-black/20 hover:border-teal-500/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white font-sans truncate">{audit.title || "Audit Certification"}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                      Grade A • {audit.overall_score || 92}%
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] font-mono text-slate-400 mb-3">
                    <div className="flex items-center justify-between">
                      <span>Canonical Overlap:</span>
                      <span className="text-cyan-400 font-bold">{audit.plagiarism_index || 3.8}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Methodology Status:</span>
                      <span className="text-emerald-400 font-bold">Certified Reproducible</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500">SHA-256 Ledger</span>
                  <button
                    onClick={() => navigate('validation-rigor')}
                    className="text-xs font-mono text-teal-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <span>Inspect Ledger &rarr;</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1. ADMIN: LAB GOVERNANCE & DATABASE INFRASTRUCTURE CONSOLE */}
      {activeRole === 'admin' && (
        <div className={`p-6 md:p-8 rounded-[2rem] border shadow-2xl mb-8 backdrop-blur-xl ${
          isLight ? 'bg-white border-amber-500/20 shadow-amber-500/5' : 'bg-white/[0.03] border-amber-500/30'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Cpu size={18} className="text-amber-400" />
                <h2 className="text-base font-bold text-white font-sans">Lab Director Governance & Infrastructure Console</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  ● Database Sovereign Pool Healthy
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                System Latency: {adminStats?.database?.latencyMs || '1.8'}ms • Max Pool Clients: {adminStats?.database?.maxClients || 10} • SSL Mode: {adminStats?.database?.sslMode || 'require'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  fetch(`${BACKEND_URL}/api/admin/system-stats`)
                    .then(r => r.json())
                    .then(d => { setAdminStats(d); showToast("Admin telemetry refreshed."); })
                    .catch(() => {});
                }}
                className="px-3.5 py-2 rounded-xl bg-black/30 border border-white/10 text-slate-300 hover:text-white font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Refresh Telemetry</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Registered Researchers Table */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                  <Users size={14} className="text-amber-400" />
                  Active Lab Researchers Directory ({adminStats?.governance?.totalUsers || 3} Accounts)
                </h3>
                <span className="text-[10px] font-mono text-slate-500">Database Isolated</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] text-slate-400 uppercase tracking-widest">
                      <th className="p-3">User ID</th>
                      <th className="p-3">Researcher Name</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3">Assigned Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(adminStats?.governance?.userDirectory || [
                      { id: 'usr_admin', name: 'System Administrator', email: 'admin@scholargrid.io', role: 'admin' },
                      { id: 'usr_res_1', name: 'Dr. Jane Doe', email: 'jane.doe@university.edu', role: 'researcher' },
                      { id: 'usr_stud_1', name: 'Alex Smith', email: 'alex.smith@grad.edu', role: 'student' }
                    ]).map((user, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                        <td className="p-3 text-slate-500 font-mono text-[11px]">{user.id}</td>
                        <td className="p-3 font-bold text-white font-sans">{user.name}</td>
                        <td className="p-3 text-slate-400">{user.email}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            user.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            user.role === 'programmer' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                            user.role === 'student' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Storage Breakdown Grid */}
            <div className="lg:col-span-5 space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                <HardDrive size={14} className="text-amber-400" />
                Multi-Tenant Storage Footprint
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Vault Papers", count: adminStats?.storageMetrics?.vaultPapersIndexed || 8, icon: Database, color: "text-cyan-400" },
                  { label: "Insight Workspaces", count: adminStats?.storageMetrics?.insightLensWorkspaces || 7, icon: BookOpen, color: "text-emerald-400" },
                  { label: "Domain Matrices", count: adminStats?.storageMetrics?.domainMatrices || 12, icon: Activity, color: "text-rose-400" },
                  { label: "Math Sessions", count: adminStats?.storageMetrics?.mathSessions || 20, icon: Terminal, color: "text-purple-400" },
                  { label: "Audit Certifications", count: adminStats?.storageMetrics?.certificationsRecorded || 12, icon: ShieldCheck, color: "text-teal-400" },
                  { label: "Code Implementations", count: adminStats?.storageMetrics?.codeImplementations || 4, icon: Code2, color: "text-indigo-400" },
                  { label: "Student Flashcards", count: adminStats?.storageMetrics?.studentFlashcards || 8, icon: GraduationCap, color: "text-amber-400" },
                  { label: "Total Artifacts", count: adminStats?.storageMetrics?.totalArtifacts || 71, icon: Server, color: "text-white" }
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="p-3 rounded-xl border border-white/5 bg-black/20 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${item.color}`}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase block">{item.label}</span>
                        <span className="text-sm font-bold font-mono text-white">{item.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. PROGRAMMER: PYTORCH & ALGORITHMIC MODULES LEDGER */}
      {activeRole === 'programmer' && (
        <div className={`p-6 md:p-8 rounded-[2rem] border shadow-2xl mb-8 backdrop-blur-xl ${
          isLight ? 'bg-white border-indigo-500/20' : 'bg-white/[0.03] border-indigo-500/30'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Code2 size={18} className="text-indigo-400" />
                <h2 className="text-base font-bold text-white font-sans">Synthesized PyTorch & Algorithmic Modules</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-bold">
                  Client WASM Pyodide Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Production-grade implementations extracted directly from research paper methodologies.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('insight-lens')}
                className="px-3.5 py-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30 font-mono text-xs flex items-center gap-1.5 transition-all font-bold cursor-pointer"
              >
                <Code2 size={13} />
                <span>Extract from Paper &rarr;</span>
              </button>
              <button
                onClick={() => navigate('math-evaluator')}
                className="px-3.5 py-2 rounded-xl bg-black/30 border border-white/10 text-slate-300 hover:text-white font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Terminal size={13} />
                <span>WASM Sandbox</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(codeList.length > 0 ? codeList : [
              {
                id: 1,
                paper_title: "Attention Is All You Need",
                algorithm_name: "ScaledDotProductAttention",
                complexity: "O(N^2 · d)",
                docstring: "Scaled dot-product attention with mask support and shape verification."
              },
              {
                id: 2,
                paper_title: "Layer Normalization",
                algorithm_name: "RMSNorm",
                complexity: "O(N · d)",
                docstring: "Root Mean Square Layer Normalization module (Llama standard)."
              }
            ]).map((code, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-white/5 bg-black/20 hover:border-indigo-500/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-mono text-indigo-300">{code.algorithm_name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10">
                      {code.complexity || 'O(N)'}
                    </span>
                  </div>
                  <span className="text-[11px] font-sans text-slate-400 line-clamp-1 mb-2 font-serif italic">
                    Paper: {code.paper_title}
                  </span>
                  <p className="text-xs text-slate-300 font-sans leading-relaxed line-clamp-2">
                    {code.docstring || "Automated PyTorch layer implementation with tensor shape verification."}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500">Language: Python / PyTorch</span>
                  <button
                    onClick={() => navigate('math-evaluator')}
                    className="text-xs font-mono text-indigo-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <span>Test in Sandbox &rarr;</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. STUDENT: CONCEPT FLASHCARDS & STUDY DECKS */}
      {activeRole === 'student' && (
        <div className={`p-6 md:p-8 rounded-[2rem] border shadow-2xl mb-8 backdrop-blur-xl ${
          isLight ? 'bg-white border-emerald-500/20' : 'bg-white/[0.03] border-emerald-500/30'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap size={18} className="text-emerald-400" />
                <h2 className="text-base font-bold text-white font-sans">Active Concept Study Decks & Flashcards</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">
                  {flashcardsList.length || 4} Cards Available
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Deconstructed research concepts with definitions, mathematical formulas, and mastery tracking.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('insight-lens')}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 font-mono text-xs flex items-center gap-1.5 transition-all font-bold cursor-pointer"
              >
                <BookOpen size={13} />
                <span>Open Study Deck in InsightLens &rarr;</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(flashcardsList.length > 0 ? flashcardsList : [
              {
                id: 1,
                concept: "Scaled Dot-Product Attention",
                definition: "Computes attention weights via query-key dot products divided by sqrt(d_k).",
                formula: "Attention(Q, K, V) = softmax(QK^T / sqrt(d_k))V",
                mastery_level: 1
              },
              {
                id: 2,
                concept: "Residual Skip Connection",
                definition: "Reformulates layers to learn residual mappings y = F(x) + x to combat gradient degradation.",
                formula: "y = F(x, {W_i}) + x",
                mastery_level: 2
              },
              {
                id: 3,
                concept: "Layer Normalization",
                definition: "Normalizes across the channel features for each example independently.",
                formula: "y = (x - mu) / sqrt(sigma^2 + eps)",
                mastery_level: 0
              },
              {
                id: 4,
                concept: "Selective State Space (S6)",
                definition: "Input-dependent state transition matrices enabling linear-time context filtering.",
                formula: "h'(t) = Ah(t) + B(x)x(t)",
                mastery_level: 0
              }
            ]).map((card, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-white/5 bg-black/20 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white font-sans truncate">{card.concept}</span>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                      card.mastery_level === 2 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      card.mastery_level === 1 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                    }`}>
                      {card.mastery_level === 2 ? 'Mastered' : card.mastery_level === 1 ? 'Reviewing' : 'Learning'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-serif leading-relaxed line-clamp-3 mb-2">
                    {card.definition}
                  </p>
                  {card.formula && (
                    <div className="p-2 rounded-lg bg-black/30 border border-white/5 font-mono text-[10px] text-emerald-300 truncate">
                      {card.formula}
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Interactive Flashcard</span>
                  <span className="text-emerald-400">Click to Study</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating System Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-teal-500/40 text-teal-300 font-mono text-xs shadow-2xl flex items-center gap-2 backdrop-blur-xl animate-fadeIn">
          <CheckCircle2 size={15} className="text-teal-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}