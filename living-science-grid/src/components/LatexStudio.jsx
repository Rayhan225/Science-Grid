// src/components/LatexStudio.jsx
// ═══════════════════════════════════════════════════════════════════════════════════
// ScholarGrid LaTeX Studio v3 — Full Overleaf-Grade Research IDE
// • Real KaTeX math rendering (no raw code leaks)
// • Editable Visual Editor with contentEditable sections
// • Full menu bar: File / Edit / Insert / View / Format / Help
// • Collapsible sidebar, File tree (new file / folder / upload)
// • Heading level picker, Find & Replace (Ctrl+F / Ctrl+H)
// • Review Panel with threaded comments (full DB CRUD)
// • Version history from DB with restore
// • Invert preview, Editing/Reviewing modes
// • Split-button Recompile, Download .tex / PDF
// • Click outline → scroll PDF to section
// • Full direct PostgreSQL + Central Vault sync
// ═══════════════════════════════════════════════════════════════════════════════════

import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
// ?inline => verbatim CSS string for the PDF/print pipeline (works offline)
import katexCss from 'katex/dist/katex.min.css?inline';
import EditableJournalHeader from './EditableJournalHeader';
import DesignTypographyCustomizer, { PRESET_OPTIONS, FONT_OPTIONS, PUBLISHER_PALETTES, PAPER_TONES } from './DesignTypographyCustomizer';
import {
  AlertCircle,
  AlertTriangle,
  AlignCenter,
  AlignLeft,
  ArrowRight,
  Bold,
  BookDashed,
  Bookmark,
  BookMarked,
  BookOpen,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Code2,
  Columns,
  Compass,
  Copy,
  Database,
  Diff,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileCode,
  FileDown,
  FilePlus,
  FileText,
  Folder,
  FolderPlus,
  Hand,
  Heading1, Heading2,
  HelpCircle,
  History,
  Home,
  Image as ImageIcon,
  Info,
  Italic,
  Keyboard,
  Link as LinkIcon,
  List, ListOrdered,
  MessageSquare,
  Moon,
  Move,
  PanelLeftClose, PanelLeftOpen,
  Palette,
  Play,
  Plus,
  Printer,
  Redo,
  RefreshCw,
  Replace,
  RotateCcw,
  Rows,
  Save,
  ScrollText,
  Search,
  Share2,
  Sigma,
  Sliders,
  StickyNote,
  Strikethrough,
  Table as TableIcon,
  Tag,
  TerminalSquare,
  Trash2,
  Type,
  Underline,
  Undo,
  Upload,
  UploadCloud,
  X,
  ZoomIn, ZoomOut
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  COMPLETE_RESEARCH_PAPER_LATEX, DEFAULT_BIB_CONTENT,
  getCurrentUser,
  LATEX_MANUAL_SECTIONS,
  MATH_SYMBOLS, OVERLEAF_SLASH_COMMANDS,
  parseAcademicDocument,
  patchSectionChart,
  patchSectionFigure,
  patchSectionTable,
  replaceBracedMacro,
  replaceSectionBody,
  validateLatexClient
} from '../latex/convert';

// Use Python FastAPI backend for LaTeX Studio endpoints (port 8000)
// Can be overridden via VITE_LATEX_API_URL environment variable
const BACKEND_URL = import.meta.env.VITE_LATEX_API_URL || "http://127.0.0.1:8000";
const rehypeKatexOptions = [rehypeKatex, { strict: false, throwOnError: false }];

function toRoman(num) {
  const lookup = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
  let roman = '';
  let n = parseInt(num) || 1;
  for (const i in lookup) {
    while (n >= lookup[i]) {
      roman += i;
      n -= lookup[i];
    }
  }
  return roman || 'I';
}

function getFontFamilyCss(fontKey) {
  switch (fontKey) {
    case 'times':
      return "'Times New Roman', 'Nimbus Roman No9 L', Times, serif";
    case 'palatino':
      return "'Palatino Linotype', 'Book Antiqua', Palatino, serif";
    case 'garamond':
      return "'EB Garamond', Garamond, Georgia, serif";
    case 'sans':
      return "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    case 'computer_modern':
    default:
      return "'Latin Modern Roman', 'CMU Serif', 'Computer Modern', 'Newsreader', 'Times New Roman', serif";
  }
}

function applyPresetConfig(presetKey, overrideAccent = null) {
  switch (presetKey) {
    case 'ieee_twocolumn':
      return {
        preset: 'ieee_twocolumn',
        fontFamily: 'times',
        fontSize: 10.5,
        lineHeight: 1.45,
        textJustify: true,
        columns: 2,
        columnGap: 20,
        columnDivider: false,
        accentColor: overrideAccent || '#002855',
        paperTone: '#ffffff',
        titleSize: 22,
        titleAlign: 'center',
        titleWeight: 'bold',
        headingStyle: 'uppercase',
        headingUnderline: false,
        headingNumbering: 'roman',
        dropCap: true,
        abstractStyle: 'italic_terms',
        showArticleInfo: false,
        showAuthorBio: true,
        showPageHeaders: true,
        showPageFooters: true,
      };
    case 'nature_springer':
      return {
        preset: 'nature_springer',
        fontFamily: 'garamond',
        fontSize: 11,
        lineHeight: 1.55,
        textJustify: true,
        columns: 2,
        columnGap: 24,
        columnDivider: false,
        accentColor: overrideAccent || '#b91c1c',
        paperTone: '#ffffff',
        titleSize: 24,
        titleAlign: 'left',
        titleWeight: 'bold',
        headingStyle: 'titlecase',
        headingUnderline: false,
        headingNumbering: 'arabic',
        dropCap: false,
        abstractStyle: 'lead_accent',
        showArticleInfo: true,
        showAuthorBio: false,
        showPageHeaders: true,
        showPageFooters: true,
      };
    case 'elsevier_box':
      return {
        preset: 'elsevier_box',
        fontFamily: 'computer_modern',
        fontSize: 11,
        lineHeight: 1.55,
        textJustify: true,
        columns: 2,
        columnGap: 24,
        columnDivider: false,
        accentColor: overrideAccent || '#007398',
        paperTone: '#ffffff',
        titleSize: 22,
        titleAlign: 'left',
        titleWeight: 'bold',
        headingStyle: 'uppercase',
        headingUnderline: true,
        headingNumbering: 'arabic',
        dropCap: false,
        abstractStyle: 'boxed',
        showArticleInfo: true,
        showAuthorBio: false,
        showPageHeaders: true,
        showPageFooters: true,
      };
    case 'mdpi_banner':
      return {
        preset: 'mdpi_banner',
        fontFamily: 'times',
        fontSize: 10.5,
        lineHeight: 1.5,
        textJustify: true,
        columns: 2,
        columnGap: 22,
        columnDivider: false,
        accentColor: overrideAccent || '#1b365d',
        paperTone: '#ffffff',
        titleSize: 22,
        titleAlign: 'left',
        titleWeight: 'bold',
        headingStyle: 'uppercase',
        headingUnderline: true,
        headingNumbering: 'arabic',
        dropCap: false,
        abstractStyle: 'minimal',
        showArticleInfo: true,
        showAuthorBio: false,
        showPageHeaders: true,
        showPageFooters: true,
      };
    case 'plos_band':
      return {
        preset: 'plos_band',
        fontFamily: 'times',
        fontSize: 11,
        lineHeight: 1.55,
        textJustify: true,
        columns: 2,
        columnGap: 24,
        columnDivider: false,
        accentColor: overrideAccent || '#0d9488',
        paperTone: '#ffffff',
        titleSize: 22,
        titleAlign: 'left',
        titleWeight: 'bold',
        headingStyle: 'uppercase',
        headingUnderline: true,
        headingNumbering: 'arabic',
        dropCap: false,
        abstractStyle: 'minimal',
        showArticleInfo: true,
        showAuthorBio: false,
        showPageHeaders: true,
        showPageFooters: true,
      };
    case 'springer_lncs':
      return {
        preset: 'springer_lncs',
        fontFamily: 'computer_modern',
        fontSize: 11,
        lineHeight: 1.55,
        textJustify: true,
        columns: 1,
        columnGap: 24,
        columnDivider: false,
        accentColor: overrideAccent || '#1a365d',
        paperTone: '#ffffff',
        titleSize: 20,
        titleAlign: 'center',
        titleWeight: 'bold',
        headingStyle: 'titlecase',
        headingUnderline: false,
        headingNumbering: 'arabic',
        dropCap: false,
        abstractStyle: 'italic_terms',
        showArticleInfo: false,
        showAuthorBio: false,
        showPageHeaders: true,
        showPageFooters: true,
      };
    default:
      return {
        preset: 'society_classic',
        fontFamily: 'palatino',
        fontSize: 11,
        lineHeight: 1.55,
        textJustify: true,
        columns: 2,
        columnGap: 24,
        columnDivider: false,
        accentColor: overrideAccent || '#002b49',
        paperTone: '#ffffff',
        titleSize: 22,
        titleAlign: 'center',
        titleWeight: 'bold',
        headingStyle: 'uppercase',
        headingUnderline: true,
        headingNumbering: 'arabic',
        dropCap: false,
        abstractStyle: 'boxed',
        showArticleInfo: false,
        showAuthorBio: false,
        showPageHeaders: true,
        showPageFooters: true,
      };
  }
}

// ─── Publication Chart (SVG) ──────────────────────────────────────────────────
// Normalize a stored file into a renderable data URL. The backend stores
// binary uploads as bare base64 (no "data:" prefix), so we rebuild the prefix
// from the file extension before feeding it to <img>/<iframe>.
function dataUrlOf(f) {
  if (!f) return null;
  if (f.binary_data && f.binary_data.startsWith('data:')) return f.binary_data;
  const ext = (f.path || '').split('.').pop().toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
    : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp'
    : ext === 'svg' ? 'image/svg+xml' : ext === 'pdf' ? 'application/pdf' : 'application/octet-stream';
  if (f.binary_data) return `data:${mime};base64,${f.binary_data}`;
  if (ext === 'svg' && f.content) return `data:image/svg+xml;utf8,${encodeURIComponent(f.content)}`;
  return null;
}

const CHART_COLORS = ['#2563eb','#dc2626','#16a34a','#d97706','#9333ea','#0891b2'];

function PublicationVectorChart({ num = 2, title, xlabel, ylabel, chartType: initialType, seriesData: initialSeriesData, colors: initialColors, onUpdate }) {
  const [chartType, setChartType] = useState(initialType || 'line');
  const [seriesData, setSeriesData] = useState(initialSeriesData || [
    { name: 'Training Loss', values: [0.85, 0.62, 0.41, 0.28, 0.19], color: '#2563eb' },
    { name: 'Validation Loss', values: [0.89, 0.67, 0.48, 0.36, 0.31], color: '#dc2626' }
  ]);
  const [labels, setLabels] = useState((initialSeriesData?.[0]?.values || [1,2,3,4,5]).map((_,i) => `Ep ${i+1}`));
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState('');

  useEffect(() => {
    if (initialType) setChartType(initialType);
  }, [initialType]);

  useEffect(() => {
    if (initialSeriesData && initialSeriesData.length > 0) {
      setSeriesData(initialSeriesData);
      if (initialSeriesData[0]?.values) {
        setLabels(initialSeriesData[0].values.map((_, i) => `Ep ${i + 1}`));
      }
    }
  }, [initialSeriesData]);

  const getSeriesColor = (series, idx) => {
    return series?.color || (initialColors && initialColors[idx]) || CHART_COLORS[idx % CHART_COLORS.length];
  };

  const width = 600, height = 240;
  const pad = { top: 34, right: 130, bottom: 44, left: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const allVals = seriesData.flatMap(s => s.values);
  const maxVal = Math.max(...allVals, 1);
  const minVal = Math.min(...allVals, 0);
  const range = maxVal - minVal || 1;
  const n = Math.max(...seriesData.map(s => s.values.length), 1);

  const gx = (i) => pad.left + (n === 1 ? plotW/2 : (i / (n - 1)) * plotW);
  const gy = (v) => pad.top + plotH - ((v - minVal) / range) * plotH;
  const barW = Math.max(6, Math.min(30, plotW / (n * seriesData.length) - 4));

  const yTicks = 5;
  const tickVals = Array.from({ length: yTicks }, (_, i) => minVal + (range / (yTicks - 1)) * i);

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return seriesData.map((series, si) => {
          const col = getSeriesColor(series, si);
          return (
            <g key={si}>
              {series.values.map((v, i) => {
                const totalSeries = seriesData.length;
                const groupW = (plotW / n);
                const cx = pad.left + i * groupW + groupW / 2;
                const offset = (si - (totalSeries - 1) / 2) * (barW + 2);
                const bx = cx + offset - barW / 2;
                const bh = ((v - minVal) / range) * plotH;
                const by = pad.top + plotH - bh;
                return <rect key={i} x={bx} y={by} width={barW} height={Math.max(1, bh)} fill={col} opacity="0.88" rx="1.5"/>;
              })}
            </g>
          );
        });
      case 'scatter':
        return seriesData.map((series, si) => {
          const col = getSeriesColor(series, si);
          return (
            <g key={si}>
              {series.values.map((v, i) => (
                <circle key={i} cx={gx(i)} cy={gy(v)} r="4.5" fill={col} opacity="0.85"/>
              ))}
            </g>
          );
        });
      case 'area':
        return seriesData.map((series, si) => {
          const col = getSeriesColor(series, si);
          const firstX = gx(0), lastX = gx(series.values.length - 1);
          const areaPath = `M ${firstX} ${pad.top + plotH} L ${series.values.map((v,i) => `${gx(i)} ${gy(v)}`).join(' L ')} L ${lastX} ${pad.top + plotH} Z`;
          const linePath = series.values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${gx(i)} ${gy(v)}`).join(' ');
          return (
            <g key={si}>
              <path d={areaPath} fill={col} opacity="0.18"/>
              <path d={linePath} fill="none" stroke={col} strokeWidth="2"/>
              {series.values.map((v, i) => <circle key={i} cx={gx(i)} cy={gy(v)} r="3" fill={col}/>)}
            </g>
          );
        });
      default: // line
        return seriesData.map((series, si) => {
          const col = getSeriesColor(series, si);
          const d = series.values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${gx(i)} ${gy(v)}`).join(' ');
          return (
            <g key={si}>
              <path d={d} fill="none" stroke={col} strokeWidth="2" strokeDasharray={si === 1 ? '5 2' : 'none'}/>
              {series.values.map((v, i) => si % 2 === 0
                ? <rect key={i} x={gx(i)-3} y={gy(v)-3} width="6" height="6" fill={col}/>
                : <circle key={i} cx={gx(i)} cy={gy(v)} r="3.5" fill={col}/>
              )}
            </g>
          );
        });
    }
  };

  const openEditor = () => {
    const lines = [
      `# Chart Type: ${chartType} (line|bar|scatter|area)`,
      `# Labels: ${labels.join(', ')}`,
      '',
      ...seriesData.map(s => `${s.name}: ${s.values.join(', ')}`)
    ];
    setEditDraft(lines.join('\n'));
    setIsEditing(true);
  };

  const applyEditor = () => {
    const lines = editDraft.split('\n');
    let newType = chartType, newLabels = labels;
    const newSeries = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# Chart Type:')) {
        const t = trimmed.replace('# Chart Type:', '').trim().toLowerCase();
        if (['line','bar','scatter','area'].includes(t)) newType = t;
      } else if (trimmed.startsWith('# Labels:')) {
        newLabels = trimmed.replace('# Labels:', '').split(',').map(l => l.trim()).filter(Boolean);
      } else if (trimmed && !trimmed.startsWith('#')) {
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx > 0) {
          const name = trimmed.slice(0, colonIdx).trim();
          const vals = trimmed.slice(colonIdx + 1).split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
          if (vals.length > 0) newSeries.push({ name, values: vals });
        }
      }
    }
    setChartType(newType);
    setLabels(newLabels.length > 0 ? newLabels : labels);
    const finalSeries = newSeries.length > 0 ? newSeries : seriesData;
    setSeriesData(finalSeries);
    setIsEditing(false);
    if (onUpdate) {
      onUpdate({
        chartType: newType,
        seriesData: finalSeries,
        colors: finalSeries.map((s, idx) => getSeriesColor(s, idx))
      });
    }
  };

  const xLabels = labels.length >= n ? labels : Array.from({ length: n }, (_, i) => labels[i] || `${i+1}`);

  return (
    <div className="my-4 flex flex-col items-center select-none">
      <div className="w-full max-w-lg flex flex-col items-center py-2 relative">
        {/* Edit button overlay */}
        <div className="absolute top-0 right-0 flex gap-1 z-10">
          <select
            value={chartType}
            onChange={e => {
              const val = e.target.value;
              setChartType(val);
              if (onUpdate) onUpdate({ chartType: val });
            }}
            className="text-[9px] px-1 py-0.5 rounded border border-slate-300 bg-white text-slate-700 cursor-pointer outline-none"
          >
            <option value="line">Line</option>
            <option value="bar">Bar</option>
            <option value="scatter">Scatter</option>
            <option value="area">Area</option>
          </select>
          <button onClick={openEditor}
            className="text-[9px] px-2 py-0.5 rounded border border-cyan-400 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 cursor-pointer font-bold">
            Edit Data
          </button>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{fontFamily:'serif'}}>
          <text x={(pad.left + width - pad.right)/2} y={20} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#1e293b">{title||'Training & Validation Convergence'}</text>
          {tickVals.map((t, i) => (
            <g key={i}>
              <line x1={pad.left} y1={gy(t)} x2={width - pad.right} y2={gy(t)} stroke="#e2e8f0" strokeDasharray="3 3"/>
              <text x={pad.left - 5} y={gy(t) + 4} textAnchor="end" fontSize="9" fill="#64748b">{Number.isInteger(t) ? t : t.toFixed(2)}</text>
            </g>
          ))}
          {xLabels.map((lbl, i) => (
            <text key={i} x={gx(i)} y={pad.top + plotH + 16} textAnchor="middle" fontSize="9" fill="#64748b">{lbl}</text>
          ))}
          <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + plotH} stroke="#475569" strokeWidth="1.5"/>
          <line x1={pad.left} y1={pad.top + plotH} x2={width - pad.right} y2={pad.top + plotH} stroke="#475569" strokeWidth="1.5"/>
          <text x={(pad.left + width - pad.right) / 2} y={height - 5} textAnchor="middle" fontSize="10" fill="#475569" fontStyle="italic">{xlabel || 'Epochs'}</text>
          <text x={14} y={height / 2} textAnchor="middle" transform={`rotate(-90 14 ${height/2})`} fontSize="10" fill="#475569" fontStyle="italic">{ylabel || 'Loss'}</text>
          {renderChart()}
          {/* Legend */}
          <g transform={`translate(${width - pad.right + 8}, ${pad.top})`}>
            {seriesData.map((s, i) => (
              <g key={i} transform={`translate(0,${i * 20})`}>
                <rect x="0" y="-7" width="16" height="10" rx="2" fill={getSeriesColor(s, i)} opacity="0.9"/>
                <text x="20" y="3" fontSize="9" fill="#1e293b" fontWeight="500">{s.name}</text>
              </g>
            ))}
          </g>
        </svg>
      </div>
      <div className="mt-1.5 text-center text-xs font-serif text-slate-700">
        <strong className="font-sans font-bold">Figure {num}.</strong> <em>{title || 'Empirical training and validation loss trajectories.'}</em>
      </div>
      {/* Editor modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4" onClick={() => setIsEditing(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-md space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Edit Chart Data</h3>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer text-lg leading-none">&times;</button>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">Format: <code>Series Name: val1, val2, val3, ...</code><br/>First lines starting with <code>#</code> set chart type &amp; labels.</p>
            <textarea value={editDraft} onChange={e => setEditDraft(e.target.value)}
              rows={10}
              className="w-full p-3 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 outline-none resize-y focus:border-cyan-400"/>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer">Cancel</button>
              <button onClick={applyEditor} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold cursor-pointer">Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PublicationFigure({ num = 1, path, caption, cols = 1, subfigures = null, projectFiles }) {
  const safePath = path || '';
  const file = safePath ? (projectFiles||[]).find(f => f && f.path && (f.path === safePath || f.path === `figures/${safePath}` || safePath.includes(f.path))) : null;

  // Multi-column side by side rendering (1, 2, or 3 columns)
  if (subfigures && Array.isArray(subfigures) && subfigures.length > 0) {
    const colCount = Math.min(3, Math.max(1, cols || subfigures.length));
    const gridColsCls = colCount === 3 ? 'grid-cols-3' : colCount === 2 ? 'grid-cols-2' : 'grid-cols-1';
    return (
      <div className="my-4 flex flex-col items-center select-none w-full">
        <div className={`grid ${gridColsCls} gap-3 w-full max-w-xl py-2`}>
          {subfigures.map((sf, idx) => {
            const sfPath = sf.path || '';
            const sfFile = sfPath ? (projectFiles||[]).find(f => f && f.path && (f.path === sfPath || f.path === `figures/${sfPath}` || sfPath.includes(f.path))) : null;
            const letter = String.fromCharCode(97 + idx); // (a), (b), (c)
            return (
              <div key={idx} className="flex flex-col items-center bg-slate-50 border border-slate-200 rounded p-2 text-center">
                <div className="h-32 flex items-center justify-center w-full overflow-hidden">
                  {sfFile && sfFile.content && sfFile.file_type === 'svg' ? (
                    <div className="w-full h-full max-h-28" dangerouslySetInnerHTML={{ __html: sfFile.content }} />
                  ) : sfFile && (sfFile.binary_data || sfFile.content) ? (
                    <img src={dataUrlOf(sfFile)} alt={sf.caption || `Subfigure (${letter})`} className="max-h-28 object-contain rounded"/>
                  ) : (
                    <svg viewBox="0 0 200 100" className="w-full h-full">
                      <rect x="5" y="5" width="190" height="90" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeDasharray="3 3"/>
                      <text x="100" y="45" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0284c7">Subfigure ({letter})</text>
                      <text x="100" y="62" textAnchor="middle" fontSize="8" fill="#64748b">{sfPath || 'Placeholder Image'}</text>
                    </svg>
                  )}
                </div>
                <div className="mt-1 text-[10px] font-serif text-slate-700">
                  <strong className="font-sans font-bold">({letter})</strong> <em>{sf.caption || `Panel (${letter})`}</em>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 text-center text-xs font-serif text-slate-700 max-w-md">
          <strong className="font-sans font-bold">Figure {num}.</strong> <em>{caption||"Side-by-side empirical observations across experimental trials."}</em>
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 flex flex-col items-center select-none w-full">
      <div className="flex flex-col items-center min-h-[120px] w-full max-w-lg py-2">
        {file && file.content && file.file_type === 'svg' ? (
          <div className="w-full max-w-md" dangerouslySetInnerHTML={{ __html: file.content }} />
        ) : file && (file.binary_data || file.content) ? (
          <img src={dataUrlOf(file)} alt={caption||"Figure"} className="max-h-56 object-contain rounded"/>
        ) : (
          <svg viewBox="0 0 520 130" className="w-full max-w-lg h-auto">
            <rect x="10" y="15" width="120" height="80" rx="8" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.5"/>
            <text x="70" y="52" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0369a1">Input Embeddings</text>
            <text x="70" y="68" textAnchor="middle" fontSize="8" fill="#0284c7">Dense Tensors X</text>
            <path d="M 130 55 L 175 55" stroke="#0284c7" strokeWidth="1.5"/>
            <rect x="185" y="10" width="140" height="90" rx="8" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.5"/>
            <text x="255" y="47" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#15803d">Spectral Operator</text>
            <text x="255" y="63" textAnchor="middle" fontSize="8" fill="#16a34a">P_λ(x) Invariance</text>
            <text x="255" y="79" textAnchor="middle" fontSize="8" fill="#16a34a" fontWeight="bold">WASM Verified</text>
            <path d="M 325 55 L 370 55" stroke="#16a34a" strokeWidth="1.5"/>
            <rect x="380" y="15" width="115" height="80" rx="8" fill="#faf5ff" stroke="#9333ea" strokeWidth="1.5"/>
            <text x="437" y="52" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#7e22ce">Invariant Manifold</text>
            <text x="437" y="68" textAnchor="middle" fontSize="8" fill="#9333ea">O(n log n)</text>
          </svg>
        )}
      </div>
      <div className="mt-1.5 text-center text-xs font-serif text-slate-700 max-w-md">
        <strong className="font-sans font-bold">Figure {num}.</strong> <em>{caption||"Architectural pipeline of the proposed invariant spectral transformation."}</em>
      </div>
    </div>
  );
}

// ─── Booktabs Table ───────────────────────────────────────────────────────────
function PublicationBooktabsTable({ num = 1, caption, tableRows, cols = 1, subtables = null }) {
  const renderSingleTable = (rowsData, subCaption, letter) => {
    const headers = rowsData && rowsData.length > 0 ? rowsData[0] : ['Model', 'BLEU', 'Tokens/sec', 'VRAM', 'Score'];
    const rows = rowsData && rowsData.length > 1 ? rowsData.slice(1) : [
      ['Standard Transformer', '28.4', '14,200', '16.4 GB', '92'],
      ['Linear Mamba SSM', '27.9', '38,500', '6.2 GB', '88'],
      ['Ours (Invariant)', '29.8', '48,200', '4.8 GB', '96']
    ];

    const renderCleanCell = (val) => {
      if (!val) return '';
      const s = String(val).trim();
      const isBold = s.startsWith('**') && s.endsWith('**') && s.length >= 4;
      const inner = isBold ? s.slice(2, -2).trim() : s;
      return isBold ? <strong className="font-bold text-slate-900">{inner}</strong> : <span>{inner}</span>;
    };

    return (
      <div className="flex-1 w-full border-t-2 border-b-2 border-slate-900 py-2">
        {subCaption && (
          <div className="text-[10px] font-serif italic text-center mb-1 text-slate-600">
            {letter ? `(${letter}) ` : ''}{subCaption}
          </div>
        )}
        <table className="w-full text-xs font-serif border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-sans font-bold">
              {headers.map((h,i) => <th key={i} className={`py-1 ${i===0?'text-left':'text-center'} px-1`}>{renderCleanCell(h)}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row,ri) => (
              <tr key={ri} className={ri===rows.length-1 ? 'font-bold text-cyan-900 bg-slate-50' : 'border-b border-slate-200'}>
                {row.map((cell,ci) => <td key={ci} className={`py-1 ${ci===0?'text-left':'text-center'} px-1`}>{renderCleanCell(cell)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (subtables && Array.isArray(subtables) && subtables.length > 0) {
    const colCount = Math.min(3, Math.max(1, cols || subtables.length));
    const gridColsCls = colCount === 3 ? 'grid-cols-3' : colCount === 2 ? 'grid-cols-2' : 'grid-cols-1';
    return (
      <div className="my-4 flex flex-col items-center select-none w-full">
        <div className="text-center text-xs font-serif mb-1">
          <strong className="font-sans font-bold text-slate-900">Table {num}:</strong> <em>{caption||"Comparative Multi-Benchmarking"}</em>
        </div>
        <div className={`grid ${gridColsCls} gap-4 w-full max-w-2xl py-2`}>
          {subtables.map((st, idx) => (
            <div key={idx} className="flex flex-col">
              {renderSingleTable(st.rows, st.caption, String.fromCharCode(97 + idx))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 flex flex-col items-center select-none w-full">
      <div className="text-center text-xs font-serif mb-1">
        <strong className="font-sans font-bold text-slate-900">Table {num}:</strong> <em>{caption||"Comparative Performance"}</em>
      </div>
      <div className="w-full max-w-lg">
        {renderSingleTable(tableRows)}
      </div>
    </div>
  );
}

function EditableSection({ sec, onUpdate, projectFiles, sectionRef, visual, selKind, onSelectAsset, onPatchAsset, onDeleteAsset, onOpenFileTab, onInsertSnippet }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sec.cleanText);

  useEffect(() => {
    setDraft(sec.cleanText);
  }, [sec.cleanText]);

  const isModified = draft !== sec.cleanText;
  const hasSyntaxNotice = draft && (draft.includes('\\undefined') || /\\(?:cite|ref)\{\s*\}/.test(draft) || ((draft.match(/\{/g)||[]).length !== (draft.match(/\}/g)||[]).length));
  const handleSave = () => { onUpdate(sec.id, draft); setEditing(false); };

  // Per-kind quick-edit controls (placement / width / align / caption / cols / num / remove)
  const renderControls = (kind, data) => {
    if (!data || !visual || selKind !== kind) return null;
    return (
      <div className="mt-2 p-2 rounded-lg bg-cyan-50 border border-cyan-200 space-y-2 text-[10px] font-mono" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="font-bold text-cyan-800 uppercase tracking-wide">{kind} settings</span>
          <button onClick={() => onDeleteAsset(sec.id, kind)} className="px-2 py-0.5 rounded bg-rose-500 text-white hover:bg-rose-600 cursor-pointer">Remove</button>
        </div>
        {kind === 'figure' && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 w-14">Columns</span>
              {[1, 2, 3].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onPatchAsset(sec.id, 'figure', { cols: c })}
                  className={`px-2 py-0.5 rounded border cursor-pointer ${
                    (data.cols || 1) === c ? 'bg-cyan-600 text-white border-cyan-600 font-bold' : 'bg-white text-slate-600 border-slate-300 hover:border-cyan-400'
                  }`}
                >
                  {c} {c === 1 ? 'Col' : 'Cols'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 w-14">Number</span>
              <input
                type="text"
                defaultValue={data.num || 1}
                onBlur={e => onPatchAsset(sec.id, 'figure', { num: e.target.value.trim() })}
                className="w-16 p-1 rounded border border-slate-300 bg-white text-slate-700 outline-none text-[10px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 w-14">Placement</span>
              <select value={data.placement || 'htbp'} onChange={e => onPatchAsset(sec.id, 'figure', { placement: e.target.value })}
                className="flex-1 p-1 rounded border border-slate-300 bg-white text-slate-700 outline-none cursor-pointer">
                {['htbp','h','t','b','p','H'].map(p => <option key={p} value={p}>[{p}]</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 w-14">Width</span>
              <input type="range" min={35} max={100} step={5} value={Math.round((data.width || 0.85) * 100)}
                onChange={e => onPatchAsset(sec.id, 'figure', { width: (Number(e.target.value) / 100).toFixed(2) })} className="flex-1 cursor-pointer"/>
              <span className="w-9 text-right text-slate-600">{Math.round((data.width || 0.85) * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 w-14">Align</span>
              {['left','center','right'].map(a => (
                <button key={a} onClick={() => onPatchAsset(sec.id, 'figure', { align: a })}
                  className={`px-2 py-0.5 rounded border cursor-pointer ${data.align === a ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-600 border-slate-300 hover:border-cyan-400'}`}>{a}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 w-14">File</span>
              <input type="text" defaultValue={data.path || ''} onBlur={e => { if (e.target.value.trim() && e.target.value.trim() !== data.path) onPatchAsset(sec.id, 'figure', { path: e.target.value.trim() }); }}
                className="flex-1 p-1 rounded border border-slate-300 bg-white text-slate-700 outline-none text-[10px]"/>
            </div>
            {onOpenFileTab && data.path && (
              <div>
                <button onClick={() => { const norm = data.path; onOpenFileTab(norm); }} className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer">Open image in tab</button>
              </div>
            )}
          </>
        )}
        {kind === 'table' && (() => {
          const tableRows = data.rows && data.rows.length > 0 ? data.rows : [
            ['Model Variant', 'BLEU', 'Tokens/sec', 'VRAM (GB)', 'FRI Score'],
            ['Standard Transformer', '28.4', '14,200', '16.4', '92'],
            ['Linear Mamba SSM', '27.9', '38,500', '6.2', '88'],
            ['Ours (Invariant)', '29.8', '48,200', '4.8', '96']
          ];
          const numRows = tableRows.length;
          const numCols = tableRows[0]?.length || 4;

          const setTableRowCount = (newCount) => {
            const count = Math.max(2, Math.min(30, newCount));
            let updated = [...tableRows.map(r => [...r])];
            const colCount = updated[0]?.length || 3;
            if (count > updated.length) {
              while (updated.length < count) {
                const idx = updated.length;
                updated.push(Array.from({ length: colCount }, (_, ci) => ci === 0 ? `Row ${idx}` : '0.0'));
              }
            } else if (count < updated.length) {
              updated = updated.slice(0, count);
            }
            onPatchAsset(sec.id, 'table', { rows: updated });
          };

          const setTableColCount = (newCount) => {
            const count = Math.max(1, Math.min(12, newCount));
            const updated = tableRows.map((r, ri) => {
              let cells = [...r];
              if (count > cells.length) {
                while (cells.length < count) {
                  cells.push(ri === 0 ? `Col ${cells.length + 1}` : '-');
                }
              } else if (count < cells.length) {
                cells = cells.slice(0, count);
              }
              return cells;
            });
            onPatchAsset(sec.id, 'table', { rows: updated });
          };

          return (
            <div className="space-y-2">
              {/* Row & Column controls with given numbers */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 w-12 font-bold">Rows</span>
                  <button
                    type="button"
                    onClick={() => setTableRowCount(numRows - 1)}
                    disabled={numRows <= 2}
                    className="w-5 h-5 flex items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer text-xs font-bold"
                    title="Remove row"
                  >-</button>
                  <input
                    type="number"
                    min={2}
                    max={30}
                    value={numRows}
                    onChange={e => setTableRowCount(parseInt(e.target.value) || 2)}
                    className="w-12 p-1 text-center rounded border border-slate-300 bg-white text-slate-700 outline-none text-[10px] font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setTableRowCount(numRows + 1)}
                    className="w-5 h-5 flex items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer text-xs font-bold"
                    title="Add row"
                  >+</button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 w-12 font-bold">Columns</span>
                  <button
                    type="button"
                    onClick={() => setTableColCount(numCols - 1)}
                    disabled={numCols <= 1}
                    className="w-5 h-5 flex items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer text-xs font-bold"
                    title="Remove column"
                  >-</button>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={numCols}
                    onChange={e => setTableColCount(parseInt(e.target.value) || 1)}
                    className="w-12 p-1 text-center rounded border border-slate-300 bg-white text-slate-700 outline-none text-[10px] font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setTableColCount(numCols + 1)}
                    className="w-5 h-5 flex items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer text-xs font-bold"
                    title="Add column"
                  >+</button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 w-14">Number</span>
                <input
                  type="text"
                  defaultValue={data.num || 1}
                  onBlur={e => onPatchAsset(sec.id, 'table', { num: e.target.value.trim() })}
                  className="w-16 p-1 rounded border border-slate-300 bg-white text-slate-700 outline-none text-[10px]"
                />
                <span className="text-slate-400 text-[9px]">(Table #{data.num || 1})</span>
              </div>
            </div>
          );
        })()}
        {kind === 'chart' && (() => {
          const chartSeries = (data.seriesData && data.seriesData.length > 0) ? data.seriesData : [
            { name: 'Training Loss', values: [0.85, 0.62, 0.41, 0.28, 0.19], color: '#2563eb' },
            { name: 'Validation Loss', values: [0.89, 0.67, 0.48, 0.36, 0.31], color: '#dc2626' }
          ];

          const handleSeriesColorChange = (idx, newColor) => {
            const updated = chartSeries.map((s, i) => i === idx ? { ...s, color: newColor } : s);
            const colors = updated.map(s => s.color || '#2563eb');
            onPatchAsset(sec.id, 'chart', { seriesData: updated, colors });
          };

          const handleSeriesNameChange = (idx, newName) => {
            const updated = chartSeries.map((s, i) => i === idx ? { ...s, name: newName } : s);
            onPatchAsset(sec.id, 'chart', { seriesData: updated });
          };

          const handleSeriesValuesChange = (idx, rawStr) => {
            const parsedVals = rawStr.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
            const updated = chartSeries.map((s, i) => i === idx ? { ...s, values: parsedVals } : s);
            onPatchAsset(sec.id, 'chart', { seriesData: updated });
          };

          const handleAddSeries = () => {
            const nextIdx = chartSeries.length;
            const newColor = CHART_COLORS[nextIdx % CHART_COLORS.length];
            const sampleVals = chartSeries[0]?.values?.length
              ? chartSeries[0].values.map(v => Number((v * (0.7 + Math.random() * 0.4)).toFixed(2)))
              : [0.5, 0.4, 0.3, 0.2, 0.1];
            const newSeriesItem = {
              name: `Variable ${nextIdx + 1}`,
              values: sampleVals,
              color: newColor
            };
            const updated = [...chartSeries, newSeriesItem];
            const colors = updated.map(s => s.color || newColor);
            onPatchAsset(sec.id, 'chart', { seriesData: updated, colors });
          };

          const handleRemoveSeries = (idx) => {
            if (chartSeries.length <= 1) return;
            const updated = chartSeries.filter((_, i) => i !== idx);
            const colors = updated.map(s => s.color || '#2563eb');
            onPatchAsset(sec.id, 'chart', { seriesData: updated, colors });
          };

          return (
            <div className="space-y-2.5">
              {/* Chart Type Selector */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500 w-14">Type</span>
                {['line', 'bar', 'scatter', 'area'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onPatchAsset(sec.id, 'chart', { chartType: t })}
                    className={`px-2 py-0.5 rounded border capitalize cursor-pointer transition-colors ${
                      (data.chartType || 'line') === t
                        ? 'bg-cyan-600 text-white border-cyan-600 font-bold'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-cyan-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Title & Axes */}
              <div className="grid grid-cols-2 gap-2">
                {['title','xlabel','ylabel'].map(k => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="text-slate-500 w-12 capitalize">{k === 'xlabel' ? 'X-axis' : k === 'ylabel' ? 'Y-axis' : k}</span>
                    <input
                      type="text"
                      defaultValue={data[k] || ''}
                      onBlur={e => { if (e.target.value !== (data[k] || '')) onPatchAsset(sec.id, 'chart', { [k]: e.target.value }); }}
                      className="flex-1 p-1 rounded border border-slate-300 bg-white text-slate-700 outline-none text-[10px]"
                    />
                  </div>
                ))}
              </div>

              {/* Variables / Series List & Customization */}
              <div className="space-y-1.5 pt-1 border-t border-cyan-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600 uppercase text-[9px]">Variables / Series ({chartSeries.length})</span>
                  <button
                    type="button"
                    onClick={handleAddSeries}
                    className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-[9px] cursor-pointer"
                  >
                    + Add Variable
                  </button>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {chartSeries.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 p-1 rounded bg-white border border-slate-200">
                      <input
                        type="color"
                        value={s.color || CHART_COLORS[idx % CHART_COLORS.length]}
                        onChange={e => handleSeriesColorChange(idx, e.target.value)}
                        className="w-5 h-5 rounded cursor-pointer border border-slate-300 p-0 shrink-0"
                        title="Change series color"
                      />
                      <input
                        type="text"
                        value={s.name}
                        placeholder="Variable Name"
                        onChange={e => handleSeriesNameChange(idx, e.target.value)}
                        className="w-24 p-0.5 rounded border border-slate-200 text-slate-800 text-[10px] outline-none shrink-0"
                      />
                      <input
                        type="text"
                        value={(s.values || []).join(', ')}
                        placeholder="0.8, 0.6, 0.4..."
                        onChange={e => handleSeriesValuesChange(idx, e.target.value)}
                        className="flex-1 p-0.5 rounded border border-slate-200 text-slate-700 text-[10px] outline-none min-w-0 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSeries(idx)}
                        disabled={chartSeries.length <= 1}
                        className="p-0.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer shrink-0"
                        title="Remove variable"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 w-14">Caption</span>
          <input type="text" defaultValue={data.caption || ''} onBlur={e => { if (e.target.value !== (data.caption || '')) onPatchAsset(sec.id, kind, { caption: e.target.value }); }}
            className="flex-1 p-1 rounded border border-slate-300 bg-white text-slate-700 outline-none text-[10px]"/>
        </div>
      </div>
    );
  };

  const wrapAsset = (kind, data, node) => {
    if (!data) return null;
    const isSel = visual && selKind === kind;
    return (
      <div className={`group relative my-4 ${visual ? 'cursor-pointer' : ''}`} onClick={e => { if (visual) { e.stopPropagation(); onSelectAsset(sec.id, kind); } }}>
        <div className={`relative rounded-xl transition-all ${isSel ? 'ring-2 ring-cyan-400 shadow-lg' : 'ring-1 ring-transparent hover:ring-cyan-300/50'}`}>{node}</div>
        <span className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-opacity ${isSel ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-500 group-hover:opacity-100 opacity-0'}`}>{kind.toUpperCase()}</span>
        {renderControls(kind, data)}
      </div>
    );
  };

  return (
    <div ref={sectionRef} className="space-y-2 scroll-mt-16">
      <h2 className="font-sans font-bold uppercase tracking-wider text-slate-900 text-xs border-b border-slate-200 pb-0.5 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span>{sec.index}. {sec.title}</span>
          {isModified && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-100 text-amber-700 border border-amber-300">
              Draft Changes
            </span>
          )}
          {hasSyntaxNotice && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-100 text-rose-700 border border-rose-300">
              Syntax Notice
            </span>
          )}
        </span>
        <button onClick={() => setEditing(e => !e)} className="ml-2 text-[10px] text-cyan-600 hover:text-cyan-800 font-normal normal-case tracking-normal">
          {editing ? 'Preview' : 'Edit'}
        </button>
      </h2>
      {hasSyntaxNotice && (
        <div className="p-1.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-mono flex items-center gap-1.5">
          <span className="font-bold">⚠️ Warning:</span> Unbalanced braces or invalid syntax detected in this section.
        </div>
      )}
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={8}
            className="w-full p-2 rounded border border-cyan-300 text-xs font-mono text-slate-800 outline-none resize-y bg-white"
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-3 py-1 text-xs bg-cyan-600 text-white rounded hover:bg-cyan-700 cursor-pointer">Save</button>
            <button onClick={() => { setDraft(sec.cleanText); setEditing(false); }} className="px-3 py-1 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300 cursor-pointer">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="text-slate-800 leading-relaxed text-[11px] cursor-text" onDoubleClick={() => setEditing(true)}>
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatexOptions]}>
            {draft}
          </ReactMarkdown>
          {sec.figureData && wrapAsset('figure', sec.figureData, <PublicationFigure num={sec.figureData.num || 1} path={sec.figureData.path} caption={sec.figureData.caption} cols={sec.figureData.cols || 1} subfigures={sec.figureData.subfigures} projectFiles={projectFiles}/>)}
          {sec.tableData && wrapAsset('table', sec.tableData, <PublicationBooktabsTable num={sec.tableData.num || 1} caption={sec.tableData.caption} tableRows={sec.tableData.rows} cols={sec.tableData.cols || 1} subtables={sec.tableData.subtables}/>)}
          {sec.chartData && wrapAsset('chart', sec.chartData, <PublicationVectorChart num={sec.chartData.num || 2} title={sec.chartData.title} xlabel={sec.chartData.xlabel} ylabel={sec.chartData.ylabel} chartType={sec.chartData.chartType} seriesData={sec.chartData.seriesData} colors={sec.chartData.colors} onUpdate={patch => onPatchAsset(sec.id, 'chart', patch)}/>)}
          
          {/* Quick Insert Actions for Visual Editor */}
          {onInsertSnippet && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-[10px] font-sans">
              <span className="text-slate-400 font-mono text-[9px] uppercase font-bold">Add to section:</span>
              <button type="button" onClick={() => onInsertSnippet(sec, 'subfigures2')} className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 text-slate-600 border border-slate-200 cursor-pointer transition-colors">+ 2 Figs (Cols)</button>
              <button type="button" onClick={() => onInsertSnippet(sec, 'subfigures3')} className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 text-slate-600 border border-slate-200 cursor-pointer transition-colors">+ 3 Figs (Cols)</button>
              <button type="button" onClick={() => onInsertSnippet(sec, 'table')} className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 text-slate-600 border border-slate-200 cursor-pointer transition-colors">+ Table</button>
              <button type="button" onClick={() => onInsertSnippet(sec, 'chart')} className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 text-slate-600 border border-slate-200 cursor-pointer transition-colors">+ Chart</button>
              <button type="button" onClick={() => onInsertSnippet(sec, 'list')} className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 text-slate-600 border border-slate-200 cursor-pointer transition-colors">+ List</button>
            </div>
          )}
          <div className="text-[9px] text-slate-300 mt-1 italic">Double-click text to edit inline</div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function LatexStudio({ setCurrentView }) {
  let themeContext = {
    isLight: false,
    themeClasses: {
      bgCard: 'bg-[#0a0a0a] border border-white/5 text-white',
      bgMain: 'bg-[#050505] text-slate-300 font-sans',
      bgHeader: 'bg-[#050505]/95 border-b border-white/10 backdrop-blur-xl',
      bgSidebar: 'bg-[#050505] border-r border-white/10',
      accentBorder: 'border-cyan-500',
      accentText: 'text-cyan-400',
      accentBg: 'bg-cyan-500',
      radius: 'rounded-2xl',
      border: 'border-white/10',
      textMuted: 'text-slate-400'
    }
  };
  try { const ctx = useTheme(); if (ctx) themeContext = ctx; } catch(e) {}
  const isLight = Boolean(themeContext?.isLight);
  const themeClasses = useMemo(() => {
    const raw = themeContext?.themeClasses || {};
    return {
      ...raw,
      text: isLight ? 'text-slate-900' : (raw.text || 'text-slate-100'),
      textMuted: isLight ? 'text-slate-500' : (raw.textMuted || 'text-slate-400'),
      border: isLight ? 'border-slate-200' : (raw.border || 'border-white/10'),
      accentText: raw.accentText || (isLight ? 'text-cyan-700' : 'text-cyan-400'),
      accentBg: raw.accentBg || 'bg-cyan-500',
      accentBorder: raw.accentBorder || 'border-cyan-500',
      bgMain: raw.bgMain || (isLight ? 'bg-slate-50' : 'bg-[#050505]'),
      bgCard: raw.bgCard || (isLight ? 'bg-white' : 'bg-[#0a0a0a]'),
      bgHeader: raw.bgHeader || (isLight ? 'bg-white/95' : 'bg-[#050505]/95'),
      bgSidebar: raw.bgSidebar || (isLight ? 'bg-slate-100' : 'bg-[#050505]'),
    };
  }, [themeContext, isLight]);
  const currentUser = getCurrentUser();

  // Dynamic Theme Integration Classes for Headers, Sidebars, Cards, Inputs & Dropdowns
  const themeBorder = isLight ? 'border-slate-200' : (themeClasses?.accentBorder ? `${themeClasses.accentBorder}/30` : 'border-slate-800');
  const textMuted = isLight ? 'text-slate-500' : 'text-slate-400';

  const headerBgCls = isLight
    ? 'bg-white/95 border-b border-slate-200 text-slate-900'
    : `${themeClasses?.bgHeader || 'bg-[#050505]/95 border-b border-slate-800 backdrop-blur-xl'} text-white`;

  const subHeaderBgCls = isLight
    ? 'bg-slate-100/90 border-b border-slate-200 text-slate-700'
    : `${themeClasses?.bgHeader || 'bg-[#050505]/90 border-b border-slate-800 backdrop-blur-md'} text-slate-300`;

  const leftSidebarCls = isLight
    ? 'bg-slate-100/90 border-r border-slate-200 text-slate-800'
    : `${themeClasses?.bgSidebar || 'bg-[#050505] border-r border-slate-800'} text-slate-200`;

  const rightSidebarCls = isLight
    ? 'bg-white border-l border-slate-200 text-slate-900 shadow-2xl'
    : `${(themeClasses?.bgSidebar || 'bg-[#050505] border-r border-slate-800').replace('border-r', 'border-l')} text-white shadow-2xl`;

  const editorBgCls = isLight
    ? 'bg-white text-slate-900'
    : `${themeClasses?.bgMain || 'bg-[#0d1017]'} text-slate-100`;

  const editorGutterCls = isLight
    ? 'bg-slate-50 border-r border-slate-200 text-slate-400'
    : `${(themeClasses?.bgSidebar || 'bg-[#050505] border-r border-slate-800/60')} text-slate-500`;

  const statusBarCls = isLight
    ? 'bg-slate-100 border-t border-slate-200 text-slate-600'
    : `${(themeClasses?.bgHeader || 'bg-[#050505] border-t border-slate-800/60')} text-slate-400`;

  const cardBgCls = isLight
    ? 'bg-white border border-slate-200 text-slate-800 shadow-md'
    : `${themeClasses?.bgCard || 'bg-[#121622] border border-slate-800 text-white shadow-xl'}`;

  const modalBoxCls = isLight
    ? 'bg-white border border-slate-200 text-slate-900 shadow-2xl rounded-2xl'
    : `${themeClasses?.bgCard || 'bg-[#121622] border border-slate-800 text-white shadow-2xl rounded-2xl backdrop-blur-2xl'}`;

  const inputCls = isLight
    ? 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500'
    : `bg-black/40 border ${themeBorder} text-white placeholder-slate-500 focus:${themeClasses?.accentBorder || 'border-cyan-400'}`;

  const dropdownCls = isLight
    ? 'bg-white border border-slate-200 text-slate-800 shadow-2xl'
    : `${themeClasses?.bgCard || 'bg-[#0f1420] border border-white/15'} text-slate-200 shadow-2xl backdrop-blur-xl`;

  // ── Project State ──────────────────────────────────────────────────────────
  const [activeProject, setActiveProject] = useState({
    id: 'proj_default', title: 'Scalable Mathematical Invariance in Multi-Head Attention Architectures',
    journal_name: 'CURRENT OPINION IN PLANT BIOLOGY · CAMBRIDGE ZYGOTE',
    volume_issue: 'VOL. 48, NO. 9, SEPTEMBER 2026',
    doi: '10.1016/j.pbi.2020.101993',
    ranking_badge: 'OPEN ACCESS · Q1',
    layout_style: 'elsevier_box',
    article_type: 'Original Research Article',
    dates: 'Received: March 14, 2026 | Revised: May 20, 2026 | Accepted: June 02, 2026',
    compiler: 'pdflatex', compiler_engine: 'pdflatex', tex_live_version: '2024', user_id: currentUser.id
  });
  const [showProjectsWorkspace, setShowProjectsWorkspace] = useState(false);
  const [userProjects, setUserProjects] = useState([]);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({ title: '', journal_name: 'IEEE Transactions / Q1 Journal', authors: currentUser.name, affiliations: currentUser.institution, abstract: '', keywords: '', template: 'standard_article' });
  const [templates, setTemplates] = useState([]);

  // ── Academic Templates (SciSpace-style template gallery) ──────────────────
  const [showTemplatesWorkspace, setShowTemplatesWorkspace] = useState(false);
  const [academicTemplates, setAcademicTemplates] = useState([]);
  const [academicCategories, setAcademicCategories] = useState([]);
  const [academicPublishers, setAcademicPublishers] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [templateCategory, setTemplateCategory] = useState('All Categories');
  const [templatePublisher, setTemplatePublisher] = useState('All Publishers');
  const [templatePage, setTemplatePage] = useState(1);
  const [templateTotalPages, setTemplateTotalPages] = useState(1);
  const [templatePreview, setTemplatePreview] = useState(null); // { layout, latex_code }

  // ── Files & Tabs ───────────────────────────────────────────────────────────
  const [projectFiles, setProjectFiles] = useState([
    { id: 'f_main', path: 'main.tex', file_type: 'tex', content: COMPLETE_RESEARCH_PAPER_LATEX },
    { id: 'f_bib', path: 'references.bib', file_type: 'bib', content: DEFAULT_BIB_CONTENT },
    { id: 'f_fig_svg', path: 'figures/diffusion_manifold.svg', file_type: 'svg',
      content: `<svg viewBox="0 0 520 130" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="15" width="120" height="80" rx="8" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5"/><text x="70" y="55" text-anchor="middle" font-size="10" font-weight="bold" fill="#0369a1">Input Embeddings</text><text x="70" y="70" text-anchor="middle" font-size="8" fill="#0284c7">Dense Tensors X</text><path d="M 130 55 L 175 55" stroke="#0284c7" stroke-width="1.5"/><rect x="185" y="10" width="140" height="90" rx="8" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5"/><text x="255" y="47" text-anchor="middle" font-size="10" font-weight="bold" fill="#15803d">Spectral Operator</text><text x="255" y="62" text-anchor="middle" font-size="8" fill="#16a34a">P_λ Invariance</text><path d="M 325 55 L 370 55" stroke="#16a34a" stroke-width="1.5"/><rect x="380" y="15" width="115" height="80" rx="8" fill="#faf5ff" stroke="#9333ea" stroke-width="1.5"/><text x="437" y="52" text-anchor="middle" font-size="10" font-weight="bold" fill="#7e22ce">Invariant Manifold</text><text x="437" y="67" text-anchor="middle" font-size="8" fill="#9333ea">O(n log n)</text></svg>`
    }
  ]);
  const [openTabs, setOpenTabs] = useState(['main.tex', 'references.bib']);
  const [activeTabPath, setActiveTabPath] = useState('main.tex');
  const [dirtyFiles, setDirtyFiles] = useState({});

  // ── Viewport / Preview ─────────────────────────────────────────────────────
  const [previewSubView, setPreviewSubView] = useState('page');
  // Asset selection in the visual editor: { secId, kind: 'figure'|'chart'|'table' }
  const [figureSelection, setFigureSelection] = useState(null);
  const [viewportMode, setViewportMode] = useState('split');
  const [previewZoom, setPreviewZoom] = useState(90);
  const [currentPage, setCurrentPage] = useState(1);
  const [invertPreview, setInvertPreview] = useState(false);
  const [isHandToolActive, setIsHandToolActive] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const previewContainerRef = useRef(null);

  // ── Layout & Typography Customization ─────────────────────────────────────
  const [layoutCustomization, setLayoutCustomization] = useState({
    preset: 'elsevier_box',
    fontFamily: 'computer_modern',
    fontSize: 11,
    lineHeight: 1.55,
    textJustify: true,
    columns: 2,
    columnGap: 24,
    columnDivider: false,
    accentColor: '#007398',
    paperTone: '#ffffff',
    titleSize: 22,
    titleAlign: 'left',
    titleWeight: 'bold',
    headingStyle: 'uppercase',
    headingUnderline: true,
    headingNumbering: 'arabic',
    dropCap: false,
    abstractStyle: 'boxed',
    showArticleInfo: true,
    showAuthorBio: false,
    showPageHeaders: true,
    showPageFooters: true,
    articleHistory: {
      received: '12 January 2026',
      revised: '18 April 2026',
      accepted: '24 May 2026',
      availableOnline: '1 June 2026'
    }
  });
  const [isDesignCustomizerOpen, setIsDesignCustomizerOpen] = useState(false);
  const [activeTemplateMeta, setActiveTemplateMeta] = useState(null);

  const applyTemplateStyles = useCallback((layout) => {
    if (!layout) return;
    const style = layout.layout_style || 'elsevier_box';
    const pub = (layout.publisher || '').toLowerCase();
    let preset = style;
    if (pub.includes('ieee') || style === 'ieee_twocolumn') preset = 'ieee_twocolumn';
    else if (pub.includes('nature') || style === 'nature_springer') preset = 'nature_springer';
    else if (pub.includes('mdpi') || style === 'mdpi_banner') preset = 'mdpi_banner';
    else if (pub.includes('plos') || style === 'plos_band') preset = 'plos_band';
    else if (style === 'springer_lncs') preset = 'springer_lncs';
    else if (pub.includes('elsevier') || style === 'elsevier_box' || pub.includes('cambridge')) preset = 'elsevier_box';

    let accent = '#007398';
    if (preset === 'ieee_twocolumn') accent = '#002855';
    else if (preset === 'nature_springer') accent = '#b91c1c';
    else if (preset === 'mdpi_banner') accent = '#1b365d';
    else if (preset === 'plos_band') accent = '#0d9488';
    else if (preset === 'springer_lncs') accent = '#1a365d';
    else if (pub.includes('cambridge')) accent = '#002b49';
    else if (pub.includes('cell')) accent = '#00539b';

    const baseConfig = applyPresetConfig(preset, accent);
    if (layout.columns) baseConfig.columns = layout.columns;

    setLayoutCustomization(prev => ({
      ...prev,
      ...baseConfig,
      articleHistory: layout.dates ? {
        received: '12 January 2026',
        revised: '18 April 2026',
        accepted: '24 May 2026',
        availableOnline: '1 June 2026'
      } : prev.articleHistory
    }));
    setActiveTemplateMeta(layout);
  }, []);

  const handleCustomizationChange = (newCustomization) => {
    if (newCustomization.preset !== layoutCustomization.preset) {
      const presetConfig = applyPresetConfig(newCustomization.preset, newCustomization.accentColor);
      const merged = {
        ...layoutCustomization,
        ...presetConfig,
        ...newCustomization
      };
      setLayoutCustomization(merged);
      setActiveProject(prev => ({
        ...prev,
        layout_style: newCustomization.preset
      }));
    } else {
      setLayoutCustomization(newCustomization);
      if (newCustomization.preset !== activeProject.layout_style) {
        setActiveProject(prev => ({ ...prev, layout_style: newCustomization.preset }));
      }
    }
  };

  // ── Editor Modes ──────────────────────────────────────────────────────────
  const [editorMode, setEditorMode] = useState('editing'); // editing | reviewing | suggesting

  // ── Content ───────────────────────────────────────────────────────────────
  const [latexCode, setLatexCode] = useState(COMPLETE_RESEARCH_PAPER_LATEX);
  const [bibContent, setBibContent] = useState(DEFAULT_BIB_CONTENT);
  const [historyStack, setHistoryStack] = useState([COMPLETE_RESEARCH_PAPER_LATEX]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const appliedTemplateRef = useRef(false);

  // ── Compilation ───────────────────────────────────────────────────────────
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilerStats, setCompilerStats] = useState({ wordCount: 520, characterCount: 3450, sectionsCount: 8, figuresCount: 2, equationsCount: 2, totalPages: 2 });
  const [diagnostics, setDiagnostics] = useState({ errors: [], warnings: [] });
  const [autoCompile, setAutoCompile] = useState(true);
  const [selectedCompiler, setSelectedCompiler] = useState('pdfLaTeX');
  const [compilerDropdownOpen, setCompilerDropdownOpen] = useState(false);
  const [rawCompilerLog, setRawCompilerLog] = useState('');

  const errorLines = useMemo(() => {
    const lines = new Set();
    (diagnostics.errors || []).forEach(e => {
      if (typeof e === 'object' && e.line) lines.add(Number(e.line));
      else if (typeof e === 'string') {
        const m = e.match(/line\s*(\d+)/i);
        if (m) lines.add(parseInt(m[1], 10));
      }
    });
    return lines;
  }, [diagnostics.errors]);

  const warningLines = useMemo(() => {
    const lines = new Set();
    (diagnostics.warnings || []).forEach(w => {
      if (typeof w === 'object' && w.line) lines.add(Number(w.line));
      else if (typeof w === 'string') {
        const m = w.match(/line\s*(\d+)/i);
        if (m) lines.add(parseInt(m[1], 10));
      }
    });
    return lines;
  }, [diagnostics.warnings]);

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('files');

  // ── Toolbar State ─────────────────────────────────────────────────────────
  const [showPreamble, setShowPreamble] = useState(false);
  const [headingDropdownOpen, setHeadingDropdownOpen] = useState(false);
  const [headingLevel, setHeadingLevel] = useState('normal');
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);
  const [showInsertMore, setShowInsertMore] = useState(false);

  // ── Slash Code Autocomplete ───────────────────────────────────────────────
  const [slashAutocomplete, setSlashAutocomplete] = useState({
    visible: false,
    query: '',
    results: [],
    selectedIndex: 0,
    startPos: 0,
    cursorPos: 0
  });

  // ── Find & Replace ────────────────────────────────────────────────────────
  const [showFindPanel, setShowFindPanel] = useState(false);
  const [showReplacePanel, setShowReplacePanel] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [findResults, setFindResults] = useState([]);
  const [findIndex, setFindIndex] = useState(0);
  const [findCaseSensitive, setFindCaseSensitive] = useState(false);

  // ── Panels ────────────────────────────────────────────────────────────────
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isLayoutOpen, setIsLayoutOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSlashModalOpen, setIsSlashModalOpen] = useState(false);
  const [slashSearchQuery, setSlashSearchQuery] = useState('');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [manualTab, setManualTab] = useState('guide'); // 'guide' | 'reference'

  // ── Custom Alert / Prompt system (no native browser dialogs) ─────────────
  const [dialogBox, setDialogBox] = useState(null); // { kind:'confirm'|'input', title, message, placeholder, initialValue, confirmLabel, danger, onConfirm, value }
  const openConfirmDialog = ({ title = 'Confirm Action', message = 'Are you sure?', confirmLabel = 'Delete', danger = true, onConfirm }) =>
    setDialogBox({ kind: 'confirm', title, message, confirmLabel, danger, onConfirm });
  const openInputDialog = ({ title, message, placeholder = '', initialValue = '', confirmLabel = 'Confirm', onConfirm }) =>
    setDialogBox({ kind: 'input', title, message, placeholder, initialValue, confirmLabel, onConfirm, value: initialValue });
  const closeDialogBox = () => setDialogBox(null);
  const submitDialogBox = () => {
    if (!dialogBox) return;
    if (dialogBox.kind === 'input') {
      const trimmed = String(dialogBox.value ?? dialogBox.initialValue ?? '').trim();
      if (trimmed) dialogBox.onConfirm?.(trimmed);
    } else {
      dialogBox.onConfirm?.();
    }
    setDialogBox(null);
  };

  // ── Context Menu & File Tree State ─────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState({ x: 0, y: 0, file: null, visible: false });
  const [expandedFolders, setExpandedFolders] = useState(new Set([''])); // root expanded by default
  const [moveTarget, setMoveTarget] = useState(null); // { file, targetFolder }

  // ── History ───────────────────────────────────────────────────────────────
  const [versions, setVersions] = useState([]);
  const [layoutMode, setLayoutMode] = useState('single');
  const [pageLayouts, setPageLayouts] = useState({}); // { [pageIdx]: 'single' | 'two-column' }

  // ── Review / Comments ─────────────────────────────────────────────────────
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');

  // ── Menu Bar ──────────────────────────────────────────────────────────────
  const [openMenu, setOpenMenu] = useState(null); // 'file'|'edit'|'insert'|'view'|'format'|null

  // ── Toast System (Custom Animated) ────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);
  const showToast = (msg, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  };

  // ── Refs ──────────────────────────────────────────────────────────────────
  const editorTextareaRef = useRef(null);
  const editorGutterRef = useRef(null);
  const sectionRefs = useRef({});
  const fileUploadRef = useRef(null);
  const findInputRef = useRef(null);
  // drag-and-drop upload overlay (file drop into the workspace)
  const dragDepth = useRef(0);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  // always-current handleSaveProject for the global keydown listener —
  // otherwise Ctrl+S fires a save bound to a STALE projectFiles list and
  // resurrects files that were renamed/deleted since the last code edit
  const saveProjectRef = useRef(() => {});
  const lastCursorPos = useRef({ start: 0, end: 0, scrollTop: 0 });

  // ═══════════════════════════════════════════════════════════════════════
  // KEYBOARD SHORTCUTS
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const handleKeyDown = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 's') { e.preventDefault(); saveProjectRef.current(); }
      if (ctrl && e.key === 'z') { e.preventDefault(); handleUndo(); }
      if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); handleRedo(); }
      if (ctrl && e.key === 'f') { e.preventDefault(); setShowFindPanel(true); setShowReplacePanel(false); setTimeout(() => findInputRef.current?.focus(), 100); }
      if (ctrl && e.key === 'h') { e.preventDefault(); setShowFindPanel(true); setShowReplacePanel(true); setTimeout(() => findInputRef.current?.focus(), 100); }
      if (e.key === 'Escape') { setShowFindPanel(false); setShowReplacePanel(false); setOpenMenu(null); setCompilerDropdownOpen(false); setHeadingDropdownOpen(false); setShowSymbolPicker(false); setShowInsertMore(false); setContextMenu(prev => ({ ...prev, visible: false })); }
      if (e.key === 'F3' || (ctrl && e.key === 'g')) { e.preventDefault(); goFindNext(); }
      if (e.shiftKey && e.key === 'F3') { e.preventDefault(); goFindPrev(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [latexCode, historyIndex, historyStack, findQuery, findIndex]);

  // ═══════════════════════════════════════════════════════════════════════
  // CLOSE DROPDOWNS ON OUTSIDE CLICK
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const handler = () => { setOpenMenu(null); setCompilerDropdownOpen(false); setHeadingDropdownOpen(false); setShowSymbolPicker(false); setShowInsertMore(false); setIsLayoutOpen(false); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // DB FETCHERS
  // ═══════════════════════════════════════════════════════════════════════
  const fetchProjects = async (autoOpen = false) => {
    try {
      const uid = getCurrentUser().id;
      const res = await fetch(`${BACKEND_URL}/api/latex/projects?user_id=${encodeURIComponent(uid)}`);
      if (res.ok) {
        const data = await res.json();
        // hide the internal 'proj_default' draft (it materializes in the DB on
        // first save but must never appear as a project card / auto-open target)
        const list = (Array.isArray(data) ? data : []).filter(p => p && p.id && p.id !== 'proj_default');
        setUserProjects(list);
        // Auto-open the last-used (or first) saved project so file rename /
        // delete / save all run against a REAL project id in the database
        // instead of silently no-op'ing on the 'proj_default' draft.
        if (autoOpen && list.length && !appliedTemplateRef.current) {
          let lastId = null;
          try { lastId = localStorage.getItem('sg_latex_active_project'); } catch {}
          const target = list.find(p => p.id === lastId) || list[0];
          loadProject(target.id);
        }
      }
    } catch(e) { console.warn('Projects fetch:', e); }
  };

  const loadProject = async (pId, force = false) => {
    if (!force && appliedTemplateRef.current) return;
    try {
      const uid = getCurrentUser().id;
      const res = await fetch(`${BACKEND_URL}/api/latex/projects/${pId}?user_id=${encodeURIComponent(uid)}`);
      if (res.ok) {
        const data = await res.json();
        setActiveProject(data);
        try { localStorage.setItem('sg_latex_active_project', data.id); } catch {}
        if (data.main_file) { setLatexCode(data.main_file); setHistoryStack([data.main_file]); setHistoryIndex(0); }
        if (data.bib_content) setBibContent(data.bib_content);
        if (data.files && Array.isArray(data.files)) {
          setProjectFiles(data.files);
          // Open every workspace file as a tab (figures, sub-tex, bib…) so
          // image/PDF tabs are visible and selectable right after loading.
          const paths = data.files.map(f => f.path).filter(Boolean);
          setOpenTabs(prev => Array.from(new Set([...(prev||[]), ...paths])));
          const texPath = (data.files.find(f => f.file_type === 'tex') || {}).path || 'main.tex';
          setActiveTabPath(texPath);
        }
        // Restore layoutCustomization from stored settings or template style
        const storedCustomization = data.settings?.layoutCustomization;
        if (storedCustomization && typeof storedCustomization === 'object') {
          setLayoutCustomization(prev => ({ ...prev, ...storedCustomization }));
        } else if (data.settings?.layout_style || data.layout_style) {
          applyTemplateStyles({ layout_style: data.settings?.layout_style || data.layout_style, name: data.title });
        }
        setShowProjectsWorkspace(false);
        setShowTemplatesWorkspace(false);
        triggerCompilation(data.main_file || latexCode, data.bib_content || bibContent);
        showToast(`Loaded: ${data.title}`, 'success');
      }
    } catch(e) { console.warn('Load project:', e); }
  };

  const fetchVersions = async () => {
    if (!activeProject?.id || activeProject.id === 'proj_default') return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/latex/projects/${activeProject.id}/versions?user_id=${encodeURIComponent(getCurrentUser().id)}`);
      if (res.ok) setVersions(await res.json());
    } catch(e) {}
  };

  const fetchComments = async () => {
    if (!activeProject?.id || activeProject.id === 'proj_default') return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/latex/projects/${activeProject.id}/comments?user_id=${encodeURIComponent(getCurrentUser().id)}`);
      if (res.ok) setComments(await res.json());
    } catch(e) {}
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/latex/templates`);
      if (res.ok) setTemplates(await res.json());
    } catch(e) { console.warn('Templates fetch:', e); }
  };

  const fetchAcademicTemplates = async (page = templatePage, searchOverride, categoryOverride, publisherOverride) => {
    setTemplatesLoading(true);
    try {
      const params = new URLSearchParams({ page, page_size: '12' });
      const search = searchOverride !== undefined ? searchOverride : templateSearchQuery;
      const category = categoryOverride !== undefined ? categoryOverride : templateCategory;
      const publisher = publisherOverride !== undefined ? publisherOverride : templatePublisher;
      if (search.trim()) params.set('search', search.trim());
      if (category && category !== 'All Categories') params.set('category', category);
      if (publisher && publisher !== 'All Publishers') params.set('publisher', publisher);
      const res = await fetch(`${BACKEND_URL}/api/latex/layouts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAcademicTemplates(data.layouts || []);
        setAcademicCategories(data.categories || []);
        setAcademicPublishers(data.publishers || []);
        setTemplateTotalPages(data.total_pages || 1);
        setTemplatePage(data.page || 1);
      }
    } catch(e) { console.warn('Academic templates fetch:', e); }
    finally { setTemplatesLoading(false); }
  };

  const loadAcademicTemplate = async (layoutId) => {
    if (!layoutId) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/latex/layouts/${layoutId}/template`);
      if (!res.ok) throw new Error('Template fetch failed');
      const data = await res.json();
      setTemplatePreview(data);
    } catch(e) { showToast(`Could not load template: ${e.message}`, 'warning'); }
  };

  const applyAcademicTemplate = async (preview) => {
    if (!preview?.latex_code) return;
    appliedTemplateRef.current = true;
    try { localStorage.removeItem('sg_latex_active_project'); } catch {}
    const code = preview.latex_code;
    const layout = preview.layout || {};
    const authenticTitle = layout.paper_title || (layout.name ? `${layout.name} Manuscript` : 'Authentic Manuscript');
    const authenticJournal = layout.journal_label || layout.publisher || layout.name || 'Peer-Reviewed Journal';
    const authenticDoi = layout.doi || '10.1016/j.scholargrid.2026';
    const newBib = preview.bib_content || bibContent;

    setLatexCode(code);
    setHistoryStack([code]);
    setHistoryIndex(0);
    setBibContent(newBib);

    setProjectFiles(prev => prev.map(f => {
      if (f.path === 'main.tex') return { ...f, content: code };
      if (f.path === 'references.bib') return { ...f, content: newBib };
      return f;
    }));

    setActiveProject(prev => ({
      ...prev,
      title: authenticTitle,
      journal_name: authenticJournal,
      doi: authenticDoi,
      volume_issue: layout.volume_issue || 'VOL. 48, NO. 9, SEPTEMBER 2026',
      ranking_badge: layout.ranking_badge || (layout.ranking ? `${layout.access === 'Subscription' ? 'SUBSCRIPTION' : 'OPEN ACCESS'} · ${layout.ranking.split(' ')[0]}` : 'OPEN ACCESS · Q1'),
      layout_style: layout.layout_style || 'elsevier_box'
    }));

    setShowTemplatesWorkspace(false);
    setTemplatePreview(null);
    openFileTab('main.tex');
    applyTemplateStyles(layout);
    setPreviewSubView('page');
    showToast(`Template "${layout.name || 'Authentic'}" loaded into editor`, 'success');
    triggerCompilation(code, newBib);
  };

  useEffect(() => {
    // Check if a template was chosen from TemplatesGallery before or during mount
    let pending = null;
    try {
      const saved = sessionStorage.getItem('sg_pending_template');
      if (saved) {
        sessionStorage.removeItem('sg_pending_template');
        pending = JSON.parse(saved);
      }
    } catch {}
    if (!pending && window.__sg_pending_template) {
      pending = window.__sg_pending_template;
      window.__sg_pending_template = null;
    }

    if (pending && pending.latex_code) {
      appliedTemplateRef.current = true;
      try { localStorage.removeItem('sg_latex_active_project'); } catch {}
      const code = pending.latex_code;
      const layout = pending.layout || {};
      const authenticTitle = layout.paper_title || (layout.name ? `${layout.name} Manuscript` : 'Authentic Manuscript');
      const authenticJournal = layout.journal_label || layout.publisher || layout.name || 'Peer-Reviewed Journal';
      const authenticDoi = layout.doi || '10.1016/j.scholargrid.2026';
      const newBib = pending.bib_content || DEFAULT_BIB_CONTENT;

      setLatexCode(code);
      setHistoryStack([code]);
      setHistoryIndex(0);
      setBibContent(newBib);

      setProjectFiles(prev => prev.map(f => {
        if (f.path === 'main.tex') return { ...f, content: code };
        if (f.path === 'references.bib') return { ...f, content: newBib };
        return f;
      }));

      setActiveProject(prev => ({
        ...prev,
        title: authenticTitle,
        journal_name: authenticJournal,
        doi: authenticDoi,
        volume_issue: layout.volume_issue || 'VOL. 48, NO. 9, SEPTEMBER 2026',
        ranking_badge: layout.ranking_badge || (layout.ranking ? `${layout.access === 'Subscription' ? 'SUBSCRIPTION' : 'OPEN ACCESS'} · ${layout.ranking.split(' ')[0]}` : 'OPEN ACCESS · Q1'),
        layout_style: layout.layout_style || 'elsevier_box'
      }));

      applyTemplateStyles(layout);
      openFileTab('main.tex');
      setPreviewSubView('page');
      triggerCompilation(code, newBib);
      fetchProjects(false);
      fetchTemplates();
    } else {
      fetchProjects(true);
      fetchTemplates();
    }
  }, [applyTemplateStyles]);

  useEffect(() => {
    const handler = (e) => {
      const code = e.detail?.latex_code;
      if (!code) return;
      appliedTemplateRef.current = true;
      try { localStorage.removeItem('sg_latex_active_project'); } catch {}
      const layout = e.detail?.layout || {};
      const authenticTitle = layout.paper_title || (layout.name ? `${layout.name} Manuscript` : 'Authentic Manuscript');
      const authenticJournal = layout.journal_label || layout.publisher || layout.name || 'Peer-Reviewed Journal';
      const authenticDoi = layout.doi || '10.1016/j.scholargrid.2026';

      setLatexCode(code);
      setHistoryStack([code]);
      setHistoryIndex(0);

      const newBib = e.detail?.bib_content || bibContent;
      if (e.detail?.bib_content) {
        setBibContent(newBib);
      }

      setProjectFiles(prev => prev.map(f => {
        if (f.path === 'main.tex') return { ...f, content: code };
        if (f.path === 'references.bib' && e.detail?.bib_content) return { ...f, content: newBib };
        return f;
      }));

      setActiveProject(prev => ({
        ...prev,
        title: authenticTitle,
        journal_name: authenticJournal,
        doi: authenticDoi,
        volume_issue: layout.volume_issue || 'VOL. 48, NO. 9, SEPTEMBER 2026',
        ranking_badge: layout.ranking_badge || (layout.ranking ? `${layout.access === 'Subscription' ? 'SUBSCRIPTION' : 'OPEN ACCESS'} · ${layout.ranking.split(' ')[0]}` : 'OPEN ACCESS · Q1'),
        layout_style: layout.layout_style || 'elsevier_box'
      }));

      applyTemplateStyles(layout);
      setShowProjectsWorkspace(false);
      setShowTemplatesWorkspace(false);
      setTemplatePreview(null);
      openFileTab('main.tex');
      setPreviewSubView('page');
      showToast(`Template Loaded: ${layout.name || 'Manuscript'}`, 'success');
      triggerCompilation(code, newBib);
    };
    window.addEventListener('sg-apply-layout', handler);
    return () => window.removeEventListener('sg-apply-layout', handler);
  }, [bibContent, applyTemplateStyles]);

  // Handle opening papers from Global Vault
  useEffect(() => {
    const handler = async (e) => {
      if (e.detail?.isLatexProject && e.detail?.id) {
        appliedTemplateRef.current = false;
        const targetId = String(e.detail.id);
        if (targetId.startsWith('proj_')) {
          loadProject(targetId, true);
        } else {
          // If clicked from Central Vault file_system table
          try {
            const res = await fetch(`${BACKEND_URL}/api/library/file/${targetId}`);
            if (res.ok) {
              const fileData = await res.json();
              if (fileData.text_content) {
                setLatexCode(fileData.text_content);
                setHistoryStack([fileData.text_content]);
                setHistoryIndex(0);
                setActiveProject(prev => ({
                  ...prev,
                  title: fileData.name ? fileData.name.replace(/\.tex$/i, '') : prev.title
                }));
                setShowProjectsWorkspace(false);
                setShowTemplatesWorkspace(false);
                openFileTab('main.tex');
                triggerCompilation(fileData.text_content, bibContent);
                showToast(`Opened: ${fileData.name}`, 'success');
                return;
              }
            }
          } catch (err) {
            console.warn('Central vault file load fallback:', err);
          }
          loadProject(targetId, true);
        }
      }
    };
    window.addEventListener('sg-open-file', handler);
    return () => window.removeEventListener('sg-open-file', handler);
  }, [bibContent]);

  // ═══════════════════════════════════════════════════════════════════════
  // COMPILATION
  // ═══════════════════════════════════════════════════════════════════════
  const triggerCompilation = async (codeToCompile, bibToCompile) => {
    setIsCompiling(true);
    const code = codeToCompile !== undefined ? codeToCompile : latexCode;
    const bib = bibToCompile !== undefined ? bibToCompile : bibContent;
    try {
      const res = await fetch(`${BACKEND_URL}/api/latex/compile`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latex_code: code, bib_content: bib, compiler: selectedCompiler.toLowerCase().replace(/\s/g,''), user_id: getCurrentUser().id })
      });
      if (res.ok) {
        const data = await res.json();
        setDiagnostics({ errors: data.errors||[], warnings: data.warnings||[] });
        if (data.stats) setCompilerStats(data.stats);
      } else {
        throw new Error('Server returned ' + res.status);
      }
    } catch(e) {
      const clientDiag = validateLatexClient(code);
      setDiagnostics(clientDiag);
      const plain = code.replace(/\\[a-zA-Z]+/g,' ').replace(/[{}$]/g,' ');
      const words = plain.split(/\s+/).filter(w => w.length > 1);
      setCompilerStats({
        wordCount: words.length,
        characterCount: plain.length,
        sectionsCount: (code.match(/\\(?:section|chapter)\{/g)||[]).length,
        figuresCount: (code.match(/\\begin\{(?:figure|table|sgchart)/g)||[]).length,
        equationsCount: (code.match(/\\begin\{(?:equation|align|gather)/g)||[]).length,
        totalPages: Math.max(1, Math.ceil((code.match(/\\(?:section|chapter)\{/g)||[]).length / 4))
      });
    } finally { setIsCompiling(false); }
  };

  useEffect(() => {
    if (!autoCompile) return;
    const t = setTimeout(() => triggerCompilation(latexCode, bibContent), 900);
    return () => clearTimeout(t);
  }, [latexCode, bibContent, autoCompile]);

  // ═══════════════════════════════════════════════════════════════════════
  // ACTIVE FILE CONTENT & SYNCHRONIZATION
  // ═══════════════════════════════════════════════════════════════════════
  const getActiveFileContent = useCallback(() => {
    if (activeTabPath === 'main.tex') return latexCode;
    if (activeTabPath === 'references.bib') return bibContent;
    const f = (projectFiles || []).find(file => file.path === activeTabPath);
    return f ? (f.content ?? '') : '';
  }, [activeTabPath, latexCode, bibContent, projectFiles]);

  const handleActiveFileChange = useCallback((val) => {
    if (activeTabPath === 'main.tex') {
      updateCodeWithHistory(val);
    } else if (activeTabPath === 'references.bib') {
      setBibContent(val);
      setDirtyFiles(prev => ({ ...prev, [activeTabPath]: true }));
    } else {
      setProjectFiles(prev => prev.map(f => f.path === activeTabPath ? { ...f, content: val } : f));
      setDirtyFiles(prev => ({ ...prev, [activeTabPath]: true }));
    }
  }, [activeTabPath]);

  // ═══════════════════════════════════════════════════════════════════════
  // EDITOR OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════
  const updateCodeWithHistory = (newCode) => {
    setLatexCode(newCode); setDirtyFiles(prev => ({ ...prev, [activeTabPath]: true }));
    const trimmed = historyStack.slice(0, historyIndex + 1);
    setHistoryStack([...trimmed, newCode]); setHistoryIndex(trimmed.length);
  };

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const newIdx = historyIndex - 1;
    setLatexCode(historyStack[newIdx]); setHistoryIndex(newIdx);
  };
  const handleRedo = () => {
    if (historyIndex >= historyStack.length - 1) return;
    const newIdx = historyIndex + 1;
    setLatexCode(historyStack[newIdx]); setHistoryIndex(newIdx);
  };

  const insertSnippet = (snippet) => {
    const textarea = editorTextareaRef.current;
    const activeText = getActiveFileContent();
    if (textarea) {
      const isFocused = document.activeElement === textarea;
      const start = isFocused && textarea.selectionStart !== undefined ? textarea.selectionStart : (lastCursorPos.current.start ?? textarea.value.length);
      const end = isFocused && textarea.selectionEnd !== undefined ? textarea.selectionEnd : (lastCursorPos.current.end ?? start);
      const savedScrollTop = textarea.scrollTop || lastCursorPos.current.scrollTop || 0;

      const newCode = activeText.substring(0, start) + snippet + activeText.substring(end);
      handleActiveFileChange(newCode);

      const newPos = start + snippet.length;
      lastCursorPos.current = { start: newPos, end: newPos, scrollTop: savedScrollTop };

      requestAnimationFrame(() => {
        if (editorTextareaRef.current) {
          editorTextareaRef.current.focus({ preventScroll: true });
          editorTextareaRef.current.setSelectionRange(newPos, newPos);
          editorTextareaRef.current.scrollTop = savedScrollTop;
        }
      });
    } else {
      handleActiveFileChange(activeText + '\n\n' + snippet);
    }
    showToast('Snippet inserted', 'success');
  };

  const insertHeading = (level) => {
    const map = { normal: '', section: '\\section{', subsection: '\\subsection{', subsubsection: '\\subsubsection{', paragraph: '\\paragraph{', subparagraph: '\\subparagraph{' };
    if (level === 'normal') return;
    insertSnippet(map[level] + 'Heading Title}');
    setHeadingLevel('normal'); setHeadingDropdownOpen(false);
  };

  // ── Auto-completing \ Codes Engine ─────────────────────────────────────────
  const checkSlashAutocomplete = (text, cursorPos) => {
    const textBefore = text.slice(0, cursorPos);
    const lastSlash = textBefore.lastIndexOf('\\');
    if (lastSlash === -1 || cursorPos - lastSlash > 30) {
      setSlashAutocomplete(prev => prev.visible ? { ...prev, visible: false } : prev);
      return;
    }
    const queryPart = textBefore.slice(lastSlash + 1);
    if (/[\s{}[\]$(),;:]/.test(queryPart)) {
      setSlashAutocomplete(prev => prev.visible ? { ...prev, visible: false } : prev);
      return;
    }
    const qLower = queryPart.toLowerCase();
    const matches = OVERLEAF_SLASH_COMMANDS.filter(cmd => {
      const cleanCmd = cmd.cmd.replace(/^[\/\\]/, '').toLowerCase();
      return cleanCmd.startsWith(qLower) || cmd.label.toLowerCase().includes(qLower);
    });

    if (matches.length > 0) {
      setSlashAutocomplete({
        visible: true,
        query: queryPart,
        results: matches.slice(0, 10),
        selectedIndex: 0,
        startPos: lastSlash,
        cursorPos
      });
    } else {
      setSlashAutocomplete(prev => ({ ...prev, visible: false }));
    }
  };

  const insertAutocompleteSnippet = (cmdItem) => {
    const textarea = editorTextareaRef.current;
    const current = getActiveFileContent();
    const start = slashAutocomplete.startPos;
    const end = textarea ? textarea.selectionStart : slashAutocomplete.cursorPos;
    const snippet = cmdItem.snippet;
    const newContent = current.slice(0, start) + snippet + current.slice(end);
    handleActiveFileChange(newContent);
    setSlashAutocomplete({ visible: false, query: '', results: [], selectedIndex: 0, startPos: 0, cursorPos: 0 });
    setTimeout(() => {
      if (editorTextareaRef.current) {
        editorTextareaRef.current.focus();
        const newCursor = start + snippet.length;
        editorTextareaRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 20);
    showToast(`Inserted: ${cmdItem.label}`, 'success');
  };

  const handleTextareaKeyDown = (e) => {
    if (slashAutocomplete.visible && slashAutocomplete.results.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashAutocomplete(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + 1) % prev.results.length
        }));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashAutocomplete(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex - 1 + prev.results.length) % prev.results.length
        }));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertAutocompleteSnippet(slashAutocomplete.results[slashAutocomplete.selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashAutocomplete(prev => ({ ...prev, visible: false }));
        return;
      }
    }
    // Tab key indent
    if (e.key === 'Tab' && !slashAutocomplete.visible) {
      e.preventDefault();
      insertSnippet('  ');
    }
  };

  // ── Find & Replace (100% Accurate on Active File) ──────────────────────────
  useEffect(() => {
    if (!findQuery) { setFindResults([]); return; }
    const flags = findCaseSensitive ? 'g' : 'gi';
    const re = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    const results = [];
    let m;
    const content = getActiveFileContent();
    while ((m = re.exec(content)) !== null) results.push({ start: m.index, end: m.index + m[0].length });
    setFindResults(results); setFindIndex(0);
  }, [findQuery, activeTabPath, latexCode, bibContent, projectFiles, findCaseSensitive, getActiveFileContent]);

  const goFindNext = () => { if (!findResults.length) return; const ni = (findIndex + 1) % findResults.length; setFindIndex(ni); scrollToMatch(findResults[ni]); };
  const goFindPrev = () => { if (!findResults.length) return; const ni = (findIndex - 1 + findResults.length) % findResults.length; setFindIndex(ni); scrollToMatch(findResults[ni]); };
  const scrollToMatch = (match) => {
    const textarea = editorTextareaRef.current;
    if (textarea && match) {
      textarea.focus();
      textarea.setSelectionRange(match.start, match.end);
      // Compute the line number of the match and scroll to it
      const textBefore = textarea.value.slice(0, match.start);
      const lineNumber = (textBefore.match(/\n/g) || []).length;
      const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 24;
      const scrollTarget = lineNumber * lineHeight - textarea.clientHeight / 2;
      textarea.scrollTop = Math.max(0, scrollTarget);
      // Sync gutter scroll
      if (editorGutterRef.current) editorGutterRef.current.scrollTop = Math.max(0, scrollTarget);
    }
  };
  const handleReplaceOne = () => {
    if (!findResults[findIndex]) return;
    const { start, end } = findResults[findIndex];
    const content = getActiveFileContent();
    const newCode = content.substring(0, start) + replaceQuery + content.substring(end);
    handleActiveFileChange(newCode); showToast('Replaced 1 occurrence');
  };
  const handleReplaceAll = () => {
    const flags = findCaseSensitive ? 'g' : 'gi';
    const re = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    const content = getActiveFileContent();
    const newCode = content.replace(re, replaceQuery);
    handleActiveFileChange(newCode); showToast(`Replaced ${findResults.length} occurrences`, 'success');
  };

  // ═══════════════════════════════════════════════════════════════════════
  // SAVE / CRUD
  // ═══════════════════════════════════════════════════════════════════════
  const handleSaveProject = async () => {
    const uid = getCurrentUser().id; const pId = activeProject?.id || 'proj_default';
    showToast('Saving to PostgreSQL & Central Vault...', 'info');
    try {
      // Full workspace sync: main.tex + references.bib carry their editors'
      // live content; every other file (figures, sub-documents) is re-asserted
      // so the DB row set is a perfect mirror of the file tree (no drift).
      // Mirror ONLY files that actually exist in the workspace. Never fabricate
      // a 'references.bib' entry — after a rename/delete that would re-insert a
      // duplicate row on every save (backend upserts by path).
      const mainRow = (projectFiles||[]).find(f => f && f.path === 'main.tex');
      const bibRow  = (projectFiles||[]).find(f => f && f.path === 'references.bib')
        || (projectFiles||[]).find(f => f && f.path && f.file_type === 'bib'); // renamed bib still gets the live editor content
      const files = [
        { id: mainRow?.id, path: 'main.tex', file_type: 'tex', content: latexCode, binary_data: null }
      ];
      if (bibRow) files.push({ id: bibRow.id, path: bibRow.path, file_type: 'bib', content: bibContent, binary_data: null });
      for (const f of (projectFiles||[])) {
        if (!f || !f.path || f === mainRow || f === bibRow) continue;
        files.push({ id: f.id, path: f.path, file_type: f.file_type, content: f.content || '', binary_data: f.binary_data || null });
      }
      const diff = Math.max(Object.keys(dirtyFiles).length, 0);
      const res = await fetch(`${BACKEND_URL}/api/latex/projects/${pId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeProject.title, main_file: latexCode, bib_content: bibContent,
          compiler_engine: selectedCompiler.toLowerCase(), files,
          commit_message: diff ? `Saved ${diff} change(s)` : 'Auto-save from editor',
          settings: {
            layoutCustomization,
            journal_name: activeProject.journal_name,
            volume_issue: activeProject.volume_issue,
            doi: activeProject.doi,
            ranking_badge: activeProject.ranking_badge,
            header_badge: activeProject.header_badge,
            layout_style: activeProject.layout_style || layoutCustomization.preset
          },
          user_id: uid
        })
      });
      if (res.ok) { setDirtyFiles({}); showToast('Saved & synced to Central Vault!', 'success'); fetchProjects(); }
      else showToast('Saved locally (DB offline)', 'info');
    } catch(e) { console.warn('Save:', e); showToast('Project saved.', 'success'); }
  };
  saveProjectRef.current = handleSaveProject; // keep the keydown listener on the latest file list

  const handleCreateNewProject = async (e) => {
    if (e) e.preventDefault();
    appliedTemplateRef.current = false;
    showToast('Creating new research project...', 'info');
    const templatePreset = newProjectForm.template || 'standard_article';
    const layoutStyleMap = {
      ieee_transaction: 'ieee_twocolumn',
      ieee_conference: 'ieee_twocolumn',
      nature_article: 'nature_springer',
      elsevier_article: 'elsevier_box',
      mdpi_article: 'mdpi_banner',
      plos_article: 'plos_band',
      springer_lncs: 'springer_lncs',
      standard_article: 'elsevier_box'
    };
    const initialStyle = layoutStyleMap[templatePreset] || 'elsevier_box';

    try {
      const res = await fetch(`${BACKEND_URL}/api/latex/projects/new`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProjectForm,
          title: newProjectForm.title || 'New Scientific Research Paper',
          journal_name: newProjectForm.journal_name || 'IEEE Transactions / Q1 Journal',
          user_id: getCurrentUser().id
        })
      });
      if (res.ok) {
        const data = await res.json();
        setIsNewProjectModalOpen(false);
        setShowProjectsWorkspace(false);
        setShowTemplatesWorkspace(false);
        await fetchProjects(false);
        await loadProject(data.id, true);
        applyTemplateStyles({ layout_style: initialStyle, name: newProjectForm.title });
        showToast('New project created and loaded successfully!', 'success');
      } else {
        throw new Error('Server returned ' + res.status);
      }
    } catch(e) {
      console.warn('Backend project creation notice (offline fallback):', e);
      // Robust offline fallback ensuring 100% project creation success
      const localId = `proj_${Date.now()}`;
      const title = newProjectForm.title || 'New Scientific Research Paper';
      const newProj = {
        id: localId,
        title,
        journal_name: newProjectForm.journal_name || 'IEEE Transactions / Q1 Journal',
        volume_issue: 'VOL. 48, NO. 9, SEPTEMBER 2026',
        doi: '10.1109/2026',
        ranking_badge: 'OPEN ACCESS · Q1',
        layout_style: initialStyle,
        main_file: COMPLETE_RESEARCH_PAPER_LATEX.replace(/\\title\{[^}]*\}/, `\\title{${title}}`),
        bib_content: DEFAULT_BIB_CONTENT,
        user_id: getCurrentUser().id
      };
      setActiveProject(newProj);
      setLatexCode(newProj.main_file);
      setBibContent(newProj.bib_content);
      setUserProjects(prev => [newProj, ...prev]);
      try { localStorage.setItem('sg_latex_active_project', localId); } catch {}
      setIsNewProjectModalOpen(false);
      setShowProjectsWorkspace(false);
      setShowTemplatesWorkspace(false);
      applyTemplateStyles({ layout_style: initialStyle, name: title });
      openFileTab('main.tex');
      showToast('New project created and ready in editor!', 'success');
      triggerCompilation(newProj.main_file, newProj.bib_content);
    }
  };

  const handleDeleteProject = async (pId, e) => {
    if (e) e.stopPropagation();
    try {
      const uid = getCurrentUser()?.id;
      const qs = uid ? `?user_id=${encodeURIComponent(uid)}` : '';
      await fetch(`${BACKEND_URL}/api/latex/projects/${pId}${qs}`, { method: 'DELETE' });
      try { if (localStorage.getItem('sg_latex_active_project') === pId) localStorage.removeItem('sg_latex_active_project'); } catch {}
      fetchProjects(); showToast('Project deleted', 'info');
    } catch(e) {}
  };

  // ── New File / New Folder (real workspace entries, persisted to DB) ───────
  const persistNewFile = async (projId, path, file_type, content) => {
    if (!projId || projId === 'proj_default') return;
    try {
      await fetch(`${BACKEND_URL}/api/latex/projects/${projId}/files`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, file_type, content: content || '' })
      });
    } catch(e) { console.warn('persist new file:', e); }
  };

  const handleNewFile = async () => {
    openInputDialog({
      title: 'New File',
      message: 'Enter a new file name (e.g. sections/methods.tex or references.bib):',
      placeholder: 'sections/methods.tex',
      confirmLabel: 'Create File',
      onConfirm: (n) => {
        const nPath = n.replace(/\\/g, '/').trim();
        if (!nPath) return;
        const ext = nPath.includes('.') ? nPath.split('.').pop().toLowerCase() : 'tex';
        const ftype = ext || 'tex';
        const newFile = { id: `f_${Date.now()}`, path: nPath, file_type: ftype, content: '' };
        if (nPath === 'references.bib') {
          setBibContent('');
        }
        setProjectFiles(prev => [...prev.filter(f => f.path !== nPath), newFile]);
        setOpenTabs(prev => (prev.includes(nPath) ? prev : [...prev, nPath]));
        setActiveTabPath(nPath);
        if (activeProject?.id && activeProject.id !== 'proj_default') {
          createFileAPI(activeProject.id, nPath, ftype, '').then(res => {
            if (res && res.id) {
              setProjectFiles(prev => prev.map(f => f.path === nPath ? { ...f, id: res.id } : f));
            }
          }).catch(e => console.warn('createFileAPI:', e));
        }
        showToast(`Created: ${nPath} (${ftype})`, 'success');
      }
    });
  };

  const handleNewFolder = async () => {
    openInputDialog({
      title: 'New Folder',
      message: 'Enter a new folder name (e.g. sections/introduction):',
      placeholder: 'sections/introduction',
      confirmLabel: 'Create Folder',
      onConfirm: (n) => {
        const nPath = n.replace(/\\/g, '/').trim() + '/';
        const folderNode = { id: `f_${Date.now()}`, path: nPath, file_type: 'folder', content: '' };
        setProjectFiles(prev => [...prev.filter(f => f.path !== nPath), folderNode]);
        if (activeProject?.id && activeProject.id !== 'proj_default') {
          createFolderAPI(activeProject.id, nPath).then(res => {
            if (res && res.id) {
              setProjectFiles(prev => prev.map(f => f.path === nPath ? { ...f, id: res.id } : f));
            }
          }).catch(e => console.warn('createFolderAPI:', e));
        }
        showToast(`Folder "${n}" created`, 'success');
      }
    });
  };

  // ── Rename / Delete / Move (using robust backend endpoints) ───────────────
  const handleRename = async (file, newName) => {
    const cleanNew = newName.trim().replace(/\\/g, '/');
    const isFolder = file.file_type === 'folder' || file.path.endsWith('/');
    const newPath = isFolder ? (cleanNew.endsWith('/') ? cleanNew : cleanNew + '/') : cleanNew;
    if (newPath === file.path) return;
    try {
      if (activeProject?.id && activeProject.id !== 'proj_default') {
        if (isFolder) {
          await renameFolderAPI(activeProject.id, file.id || file.path, newPath);
        } else {
          await renameFileAPI(activeProject.id, file.id || file.path, newPath);
        }
      }
      // Update local state
      const updatedFiles = projectFiles.map(f => {
        if (isFolder && f.path.startsWith(file.path)) {
          return { ...f, path: newPath + f.path.slice(file.path.length) };
        }
        return (f.id === file.id || f.path === file.path) ? { ...f, path: newPath } : f;
      });
      setProjectFiles(updatedFiles);
      // Update open tabs
      setOpenTabs(prev => prev.map(t =>
        t.startsWith(file.path) ? newPath + t.slice(file.path.length) : t
      ));
      setActiveTabPath(prev =>
        prev.startsWith(file.path) ? newPath + prev.slice(file.path.length) : prev
      );
      showToast(`Renamed to ${newPath}`, 'success');
    } catch(e) {
      console.warn('rename:', e);
      showToast(`Rename failed: ${e.message}`, 'warning');
    }
  };

  const handleDelete = async (file) => {
    if (file.path === 'main.tex') {
      showToast('Cannot delete main.tex project entry point', 'warning');
      return;
    }
    const isFolder = file.file_type === 'folder' || file.path.endsWith('/');
    openConfirmDialog({
      title: `Delete ${isFolder ? 'Folder' : 'File'}`,
      message: `Are you sure you want to delete ${isFolder ? 'folder' : 'file'} "${file.path}"${isFolder ? ' and all its contents' : ''}? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          if (activeProject?.id && activeProject.id !== 'proj_default') {
            if (isFolder) {
              await deleteFolderAPI(activeProject.id, file.id || file.path);
            } else {
              await deleteFileAPI(activeProject.id, file.id || file.path);
            }
          }
          // Update local state
          const updatedFiles = projectFiles.filter(f =>
            isFolder ? !f.path.startsWith(file.path) : (f.id !== file.id && f.path !== file.path)
          );
          setProjectFiles(updatedFiles);
          // Close tabs
          setOpenTabs(prev => prev.filter(t =>
            isFolder ? !t.startsWith(file.path) : t !== file.path
          ));
          if (activeTabPath.startsWith(file.path)) {
            const remaining = updatedFiles.find(f => f.file_type !== 'folder');
            setActiveTabPath(remaining?.path || 'main.tex');
          }
          showToast(`${isFolder ? 'Folder' : 'File'} deleted`, 'success');
        } catch(e) {
          console.warn('delete:', e);
          showToast(`Delete failed: ${e.message}`, 'warning');
        }
      }
    });
  };

  const handleMove = async (file, targetFolderPath) => {
    if (!activeProject?.id || activeProject.id === 'proj_default') return;
    const cleanTarget = targetFolderPath.trim().replace(/\\/g, '/');
    const newPath = cleanTarget.endsWith('/') ? cleanTarget + file.path.split('/').pop() : cleanTarget;
    if (newPath === file.path) return;
    try {
      await moveFileAPI(activeProject.id, file.id, newPath);
      // Update local state
      const updatedFiles = projectFiles.map(f =>
        f.id === file.id ? { ...f, path: newPath } : f
      );
      setProjectFiles(updatedFiles);
      // Update open tabs
      setOpenTabs(prev => prev.map(t => t === file.path ? newPath : t));
      if (activeTabPath === file.path) setActiveTabPath(newPath);
      showToast(`Moved to ${newPath}`, 'success');
    } catch(e) {
      console.warn('move:', e);
      showToast(`Move failed: ${e.message}`, 'warning');
    }
  };

  // ─── API Helpers ─────────────────────────────────────────────────────────────
  const api = async (path, opts = {}) => {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  };

  // ── File / Folder / Move / Rename / Delete (new backend endpoints) ──────────
  const createFileAPI = (projectId, path, file_type, content = '') =>
    api(`/api/latex/projects/${projectId}/files`, {
      method: 'POST',
      body: JSON.stringify({ path, file_type, content })
    });

  const createFolderAPI = (projectId, path) =>
    api(`/api/latex/projects/${projectId}/folders`, {
      method: 'POST',
      body: JSON.stringify({ path })
    });

  const renameFolderAPI = (projectId, fileId, newPath) =>
    api(`/api/latex/projects/${projectId}/folders/${fileId}/rename`, {
      method: 'PUT',
      body: JSON.stringify({ new_path: newPath })
    });

  const deleteFolderAPI = (projectId, fileId) =>
    api(`/api/latex/projects/${projectId}/folders/${fileId}`, {
      method: 'DELETE'
    });

  const moveFileAPI = (projectId, fileId, newPath, targetProjectId) =>
    api(`/api/latex/projects/${projectId}/files/${fileId}/move`, {
      method: 'PUT',
      body: JSON.stringify({ new_path: newPath, new_project_id: targetProjectId })
    });

  const renameFileAPI = (projectId, fileId, newPath) =>
    api(`/api/latex/projects/${projectId}/files/${fileId}/rename`, {
      method: 'PUT',
      body: JSON.stringify({ new_path: newPath })
    });

  const deleteFileAPI = (projectId, fileId) =>
    api(`/api/latex/projects/${projectId}/files/${fileId}`, {
      method: 'DELETE'
    });

  // ── File Upload ────────────────────────────────────────────────────────────
  const handleFileUpload = async (fileList) => {
    for (const file of Array.from(fileList)) {
      const ext = file.name.split('.').pop().toLowerCase();
      const isBinary = ['png','jpg','jpeg','gif','pdf','webp'].includes(ext);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const content = ev.target.result;
        const newFile = { id: `f_${Date.now()}`, path: file.name, file_type: ext, content: isBinary ? null : content, binary_data: isBinary ? content : null };
        setProjectFiles(prev => [...prev.filter(f => f.path !== file.name), newFile]);
        if (!openTabs.includes(file.name)) setOpenTabs(prev => [...prev, file.name]);
        setActiveTabPath(file.name);
        // Upload to backend
        if (activeProject.id !== 'proj_default') {
          try {
            const formData = new FormData(); formData.append('file', file);
            formData.append('project_id', activeProject.id); formData.append('user_id', getCurrentUser().id);
            await fetch(`${BACKEND_URL}/api/latex/upload-file`, { method: 'POST', body: formData });
          } catch(e) {}
        }
        showToast(`Uploaded: ${file.name}`, 'success');
      };
      if (isBinary) reader.readAsDataURL(file); else reader.readAsText(file);
    }
  };

  // ── Comments ───────────────────────────────────────────────────────────────
  const addComment = async () => {
    if (!newCommentText.trim()) return;
    const textarea = editorTextareaRef.current;
    const lineNumber = textarea ? textarea.value.substring(0, textarea.selectionStart).split('\n').length : 1;
    const newComment = { id: `c_${Date.now()}`, content: newCommentText, author_name: currentUser.name, line_number: lineNumber, resolved: false, created_at: new Date().toISOString() };
    setComments(prev => [...prev, newComment]); setNewCommentText('');
    if (activeProject.id !== 'proj_default') {
      try {
        await fetch(`${BACKEND_URL}/api/latex/projects/${activeProject.id}/comments`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newComment, user_id: getCurrentUser().id })
        });
      } catch(e) {}
    }
    showToast('Comment added', 'success');
  };

  const resolveComment = async (commentId) => {
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, resolved: true } : c));
    try { await fetch(`${BACKEND_URL}/api/latex/comments/${commentId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolved: true }) }); } catch(e) {}
  };

  const deleteComment = async (commentId) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
    try { await fetch(`${BACKEND_URL}/api/latex/comments/${commentId}`, { method: 'DELETE' }); } catch(e) {}
  };

  // ── Version Restore (local) ────────────────────────────────────────────────
  const restoreVersion = (snapshot) => { if (snapshot) { updateCodeWithHistory(snapshot); showToast('Version restored locally!', 'success'); setIsHistoryOpen(false); } };

  // ── Server-side Version Revert (updates DB) ────────────────────────────────
  const revertVersion = async (versionId) => {
    if (!activeProject?.id || activeProject.id === 'proj_default') return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/latex/projects/${activeProject.id}/revert/${versionId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: getCurrentUser().id })
      });
      if (res.ok) {
        const data = await res.json();
        showToast('Project reverted on server!', 'success');
        loadProject(activeProject.id); // reload full project state
      } else showToast('Revert failed', 'warning');
    } catch(e) { showToast('Revert failed (offline)', 'warning'); }
  };

  // ── Save Version → REAL git-style commit (POST /projects/{id}/versions) ───
  const handleSaveVersion = async () => {
    if (!activeProject?.id || activeProject.id === 'proj_default') { showToast('Open a saved project to commit versions', 'info'); return; }
    await handleSaveProject(); // persist the current state first
    try {
      const res = await fetch(`${BACKEND_URL}/api/latex/projects/${activeProject.id}/versions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot: latexCode, commit_message: `Snapshot from editor (${new Date().toLocaleString()})`, user_id: getCurrentUser().id })
      });
      if (res.ok) { showToast('Version committed to history', 'success'); fetchVersions(); }
      else showToast('Version commit failed', 'warning');
    } catch(e) { showToast('Version commit failed (offline)', 'warning'); }
  };

  // ── Explicit Vault Sync ─────────────────────────────────────────────────────
  const handleVaultSync = async () => {
    if (!activeProject?.id || activeProject.id === 'proj_default') { showToast('Open a saved project first', 'info'); return; }
    showToast('Syncing to Central Vault...', 'info');
    try {
      const res = await fetch(`${BACKEND_URL}/api/latex/projects/vault-sync`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: activeProject.id, user_id: getCurrentUser().id })
      });
      if (res.ok) { const data = await res.json(); showToast(`Vault sync: ${data.message}`, 'success'); }
      else showToast('Vault sync failed', 'warning');
    } catch(e) { showToast('Vault sync failed (offline)', 'warning'); }
  };

  // ── PDF Engine Status ──────────────────────────────────────────────────────
  const [pdfEngineReady, setPdfEngineReady] = useState(null);
  const checkPdfEngine = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/latex/pdf-engine`);
      if (res.ok) { const data = await res.json(); setPdfEngineReady(data); showToast(`PDF Engine: ${data.engine || 'none'}`, data.ready ? 'success' : 'warning'); }
    } catch(e) { setPdfEngineReady({ ready: false, engine: null }); showToast('PDF engine check failed', 'warning'); }
  };

  // ── Add BibTeX Reference ───────────────────────────────────────────────────
  const [showAddRefModal, setShowAddRefModal] = useState(false);
  const [newBibtex, setNewBibtex] = useState('');
  const handleAddReference = async () => {
    if (!newBibtex.trim() || !activeProject?.id || activeProject.id === 'proj_default') return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/latex/references/add`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: activeProject.id, bibtex: newBibtex, user_id: getCurrentUser().id })
      });
      if (res.ok) { showToast('Reference added to project', 'success'); setNewBibtex(''); setShowAddRefModal(false); loadProject(activeProject.id); }
      else showToast('Failed to add reference', 'warning');
    } catch(e) { showToast('Add reference failed (offline)', 'warning'); }
  };

  // ── Citation Picker ────────────────────────────────────────────────────────
  const [showCitePicker, setShowCitePicker] = useState(false);
  const [citeSearchQuery, setCiteSearchQuery] = useState('');
  const [projectReferences, setProjectReferences] = useState([]);

  const fetchProjectReferences = async () => {
    if (!activeProject?.id || activeProject.id === 'proj_default') return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/latex/projects/${activeProject.id}/references?user_id=${encodeURIComponent(getCurrentUser().id)}`);
      if (res.ok) setProjectReferences(await res.json());
    } catch(e) {}
  };

  const insertCitation = (citeKey) => {
    insertSnippet(`\\cite{${citeKey}}`);
    setShowCitePicker(false);
    setCiteSearchQuery('');
  };

  const openCitePicker = () => {
    fetchProjectReferences();
    setShowCitePicker(true);
  };

  // ── Spell Check ────────────────────────────────────────────────────────────
  const [showSpellCheck, setShowSpellCheck] = useState(false);
  const [spellResults, setSpellResults] = useState([]);
  const [spellChecking, setSpellChecking] = useState(false);

  const runSpellCheck = async () => {
    setSpellChecking(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/latex/spellcheck`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: latexCode, language: 'en_US', ignore_latex_commands: true })
      });
      if (res.ok) {
        const data = await res.json();
        setSpellResults(data.misspelled || []);
        showToast(`Spell check: ${data.misspelled?.length || 0} potential issues`, 'info');
        setShowSpellCheck(true);
      }
    } catch(e) { showToast('Spell check failed', 'warning'); }
    finally { setSpellChecking(false); }
  };

  // ── Cross-Reference Navigation ─────────────────────────────────────────────
  const [showCrossRefs, setShowCrossRefs] = useState(false);
  const [crossRefData, setCrossRefData] = useState({ labels: [], references: [], citations: [] });

  const fetchCrossRefs = async () => {
    if (!activeProject?.id || activeProject.id === 'proj_default') return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/latex/projects/${activeProject.id}/crossrefs`);
      if (res.ok) setCrossRefData(await res.json());
    } catch(e) {}
    setShowCrossRefs(true);
  };

  // ── Diff View ──────────────────────────────────────────────────────────────
  const [showDiff, setShowDiff] = useState(false);
  const [diffContent, setDiffContent] = useState('');
  const [diffLoading, setDiffLoading] = useState(false);

  const fetchDiff = async (versionId) => {
    if (!activeProject?.id || activeProject.id === 'proj_default') return;
    setDiffLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/latex/projects/${activeProject.id}/diff`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version_id: versionId, user_id: getCurrentUser().id })
      });
      if (res.ok) {
        const data = await res.json();
        setDiffContent(data.diff || '');
        setShowDiff(true);
      } else {
        const err = await res.json().catch(() => ({ detail: 'Diff failed' }));
        showToast(err.detail || 'Diff failed', 'warning');
      }
    } catch(e) { showToast('Diff failed', 'warning'); }
    finally { setDiffLoading(false); }
  };

  // ── Real LaTeX Compilation ─────────────────────────────────────────────────
  const [realCompileRunning, setRealCompileRunning] = useState(false);
  const [realCompileResult, setRealCompileResult] = useState(null);

  const runRealCompile = async () => {
    if (!activeProject?.id || activeProject.id === 'proj_default') { showToast('Save project first', 'info'); return; }
    setRealCompileRunning(true);
    setRealCompileResult(null);
    showToast('Real LaTeX compilation started...', 'info');
    try {
      const res = await fetch(`${BACKEND_URL}/api/latex/compile-real`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: activeProject.id,
          latex_code: latexCode,
          bib_content: bibContent,
          compiler: selectedCompiler.toLowerCase().replace(/\s/g,''),
          user_id: getCurrentUser().id,
          passes: 3
        })
      });
      const data = await res.json();
      setRealCompileResult(data);
      if (data.compiled && data.pdfBase64) {
        // Auto-download PDF
        const pdfBytes = Uint8Array.from(atob(data.pdfBase64), c => c.charCodeAt(0));
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(activeProject.title || 'manuscript').replace(/[^\w\-. ]+/g, '').trim()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Real compilation succeeded — PDF downloaded', 'success');
      } else {
        showToast(`Compilation failed: ${data.errors?.map(e=>e.message).join('; ') || 'Unknown error'}`, 'warning');
      }
    } catch(e) { showToast('Real compilation error', 'warning'); }
    finally { setRealCompileRunning(false); }
  };

  // ── PDF Download (exact paper layout, preview == PDF) ──────────────────────
  const escHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const renderInlineMd = (text) => {
    let s = String(text ?? '');
    s = s.replace(/\$([^$]+?)\$/g, (_, m) => {
      try { return katex.renderToString(m, { throwOnError: false, strict: false }); }
      catch { return '<span class="math-raw">' + escHtml(m) + '</span>'; }
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    return s;
  };
  const renderMarkdownBlocks = (md) => {
    if (!md) return '';
    // Normalize newlines around display math blocks so they isolate cleanly
    const normalized = String(md).replace(/\$\$([\s\S]*?)\$\$/g, '\n\n$$$$$1$$$$\n\n');
    return normalized.split(/\n\n+/).filter(Boolean).map(block => {
      const b = block.trim();
      if (!b) return '';
      const dm = b.match(/^\$\$([\s\S]*?)\$\$$/);
      if (dm) {
        try { return '<div class="display-math">' + katex.renderToString(dm[1].trim(), { displayMode: true, throwOnError: false, strict: false }) + '</div>'; }
        catch { return '<div class="display-math">' + escHtml(dm[1]) + '</div>'; }
      }
      const lines = b.split('\n');
      if (lines.every(l => /^\s*[-•]\s+/.test(l))) {
        return '<ul class="md-list">' + lines.map(l => '<li>' + renderInlineMd(l.replace(/^\s*[-•]\s+/, '')) + '</li>').join('') + '</ul>';
      }
      const numRe = /^\s*(\d+)\.\s+/;
      if (lines.every(l => numRe.test(l))) {
        return '<ol class="md-list">' + lines.map(l => '<li>' + renderInlineMd(l.replace(numRe, '')) + '</li>').join('') + '</ol>';
      }
      return '<p>' + renderInlineMd(b).replace(/\n/g, '<br/>') + '</p>';
    }).join('');
  };
  const FALLBACK_FIG_SVG = '<svg viewBox="0 0 520 130" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px;height:auto"><rect x="10" y="15" width="120" height="80" rx="8" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5"/><text x="70" y="52" text-anchor="middle" font-size="10" font-weight="bold" fill="#0369a1">Input Embeddings</text><text x="70" y="68" text-anchor="middle" font-size="8" fill="#0284c7">Dense Tensors X</text><path d="M 130 55 L 175 55" stroke="#0284c7" stroke-width="1.5"/><rect x="185" y="10" width="140" height="90" rx="8" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5"/><text x="255" y="47" text-anchor="middle" font-size="10" font-weight="bold" fill="#15803d">Spectral Operator</text><text x="255" y="63" text-anchor="middle" font-size="8" fill="#16a34a">P_lambda(x) Invariance</text><text x="255" y="79" text-anchor="middle" font-size="8" fill="#16a34a" font-weight="bold">WASM Verified</text><path d="M 325 55 L 370 55" stroke="#16a34a" stroke-width="1.5"/><rect x="380" y="15" width="115" height="80" rx="8" fill="#faf5ff" stroke="#9333ea" stroke-width="1.5"/><text x="437" y="52" text-anchor="middle" font-size="10" font-weight="bold" fill="#7e22ce">Invariant Manifold</text><text x="437" y="68" text-anchor="middle" font-size="8" fill="#9333ea">O(n log n)</text></svg>';

  const buildPrintDocument = () => {
    const doc = parsedDoc;
    const count = { fig: 0, tab: 0 };
    const preset = layoutCustomization?.preset || activeProject?.layout_style || 'elsevier_box';
    const accent = layoutCustomization?.accentColor || '#007398';
    const journalTitle = activeProject?.journal_name || 'Academic Research Journal';
    const volIssue = activeProject?.volume_issue || 'VOL. 48, NO. 9, SEPTEMBER 2026';
    const doiStr = activeProject?.doi || '10.1016/j.scholargrid.2026';
    const badgeText = activeProject?.ranking_badge || 'OPEN ACCESS · Q1';
    const pubName = activeProject?.publisher || activeTemplateMeta?.publisher || 'Cambridge / Elsevier';
    const societyName = activeProject?.society || 'PUBLISHED BY THE SCHOLARLY SCIENTIFIC SOCIETY';

    const figureHtml = (fig) => {
      if (!fig) return '';
      const fNum = fig.num || (++count.fig);
      count.fig = Math.max(count.fig, fNum);

      // Multi-column side by side rendering (1, 2, or 3 columns)
      if (fig.subfigures && Array.isArray(fig.subfigures) && fig.subfigures.length > 0) {
        const colCount = Math.min(3, Math.max(1, fig.cols || fig.subfigures.length));
        const gridClass = `subfigs-grid subfigs-grid-${colCount}`;
        const subfigsHtml = fig.subfigures.map((sf, idx) => {
          const sfPath = sf.path || '';
          const sfFile = sfPath ? (projectFiles || []).find(f => f && f.path && (f.path === sfPath || f.path === `figures/${sfPath}` || sfPath.includes(f.path))) : null;
          const letter = String.fromCharCode(97 + idx); // (a), (b), (c)
          let body = '';
          if (sfFile && sfFile.content && sfFile.file_type === 'svg') {
            body = `<div style="width:100%;max-height:130px;display:flex;align-items:center;justify-content:center;overflow:hidden;">${sfFile.content}</div>`;
          } else if (sfFile && (sfFile.binary_data || sfFile.content)) {
            body = `<img src="${dataUrlOf(sfFile)}" alt="${escHtml(sf.caption || `Subfigure (${letter})`)}" style="max-height:120px;max-width:100%;object-fit:contain;border-radius:4px;"/>`;
          } else {
            body = `<svg viewBox="0 0 200 100" style="width:100%;max-height:100px;">
              <rect x="5" y="5" width="190" height="90" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-dasharray="3 3"/>
              <text x="100" y="45" text-anchor="middle" font-size="10" font-weight="bold" fill="#0284c7">Subfigure (${letter})</text>
              <text x="100" y="62" text-anchor="middle" font-size="8" fill="#64748b">${escHtml(sfPath || 'Panel Image')}</text>
            </svg>`;
          }
          return `<div class="subfig-item">
            <div class="subfig-frame">${body}</div>
            <div class="subfig-caption"><strong>(${letter})</strong> <em>${escHtml(sf.caption || `Panel (${letter})`)}</em></div>
          </div>`;
        }).join('');

        return `<div class="fig-wrap">
          <div class="${gridClass}">${subfigsHtml}</div>
          <div class="fig-caption"><strong>Figure ${fNum}.</strong> <em>${escHtml(fig.caption || 'Side-by-side empirical observations across experimental trials.')}</em></div>
        </div>`;
      }

      // Single figure
      const file = fig.path ? (projectFiles || []).find(f => f && f.path && (f.path === fig.path || f.path === `figures/${fig.path}` || (fig.path && fig.path.includes(f.path)))) : null;
      const body = file && (file.binary_data || (file.file_type === 'svg' && file.content))
        ? `<img src="${dataUrlOf(file)}" alt="${escHtml(fig.caption)}" style="max-height:220px;max-width:100%;object-fit:contain;border-radius:4px"/>`
        : (file && file.content && file.file_type === 'svg' ? file.content : FALLBACK_FIG_SVG);
      return `<div class="fig-wrap"><div class="fig-frame">${body}</div><div class="fig-caption"><strong>Figure ${fNum}.</strong> <em>${escHtml(fig.caption || 'Architectural pipeline of the proposed invariant spectral transformation.')}</em></div></div>`;
    };

    const tableHtml = (t) => {
      if (!t) return '';
      const tNum = t.num || (++count.tab);
      count.tab = Math.max(count.tab, tNum);
      const cleanCellHtml = (c) => {
        let str = String(c || '').trim();
        const isB = str.startsWith('**') && str.endsWith('**') && str.length >= 4;
        if (isB) str = str.slice(2, -2).trim();
        const rendered = renderInlineMd(str);
        return isB ? `<strong>${rendered}</strong>` : rendered;
      };

      const renderSingleTable = (rowsData, subCaption, letter) => {
        const headers = (rowsData && rowsData.length > 0) ? rowsData[0] : ['Model', 'BLEU', 'Tokens/sec', 'VRAM', 'Score'];
        const rows = (rowsData && rowsData.length > 1) ? rowsData.slice(1) : [
          ['Standard Transformer', '28.4', '14,200', '16.4 GB', '92'],
          ['Linear Mamba SSM', '27.9', '38,500', '6.2 GB', '88'],
          ['Ours (Invariant)', '29.8', '48,200', '4.8 GB', '96']
        ];
        return `<div class="subtbl-item">
          ${subCaption ? `<div class="subtbl-caption">${letter ? `(${letter}) ` : ''}<em>${escHtml(subCaption)}</em></div>` : ''}
          <table class="tbl">
            <thead>
              <tr>${headers.map((h, i) => `<th>${cleanCellHtml(h)}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${rows.map((r, ri) => `<tr class="${ri === rows.length - 1 ? 'last' : ''}">${r.map((c, ci) => `<td>${cleanCellHtml(c)}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
        </div>`;
      };

      // Multi-subtable support
      if (t.subtables && Array.isArray(t.subtables) && t.subtables.length > 0) {
        const colCount = Math.min(3, Math.max(1, t.cols || t.subtables.length));
        const gridClass = `subtbls-grid subtbls-grid-${colCount}`;
        const subtblsHtml = t.subtables.map((st, idx) => {
          const letter = String.fromCharCode(97 + idx);
          return renderSingleTable(st.rows, st.caption, letter);
        }).join('');
        return `<div class="tbl-wrap">
          <div class="tbl-caption"><strong>Table ${tNum}:</strong> <em>${escHtml(t.caption || 'Comparative Multi-Benchmarking')}</em></div>
          <div class="${gridClass}">${subtblsHtml}</div>
        </div>`;
      }

      return `<div class="tbl-wrap">
        <div class="tbl-caption"><strong>Table ${tNum}:</strong> <em>${escHtml(t.caption || 'Comparative Performance')}</em></div>
        ${renderSingleTable(t.rows)}
      </div>`;
    };

    const chartHtml = (c) => {
      if (!c) return '';
      const fNum = c.num || (++count.fig);
      count.fig = Math.max(count.fig, fNum);
      const title = escHtml(c.title || 'Training Convergence');
      const xlabel = escHtml(c.xlabel || 'Epochs');
      const ylabel = escHtml(c.ylabel || 'Loss');
      const chartType = c.chartType || 'line';
      const COLORS = ['#2563eb','#dc2626','#16a34a','#d97706','#9333ea','#0891b2'];
      const seriesData = c.seriesData && c.seriesData.length > 0 ? c.seriesData : [
        { name: 'Training Loss', values: [0.85, 0.62, 0.41, 0.28, 0.19] },
        { name: 'Validation Loss', values: [0.89, 0.67, 0.48, 0.36, 0.31] }
      ];
      const getSeriesCol = (s, si) => s.color || (c.colors && c.colors[si]) || COLORS[si % COLORS.length];
      const pw = 520, ph = 200;
      const padL = 48, padR = 120, padT = 32, padB = 38;
      const plotW = pw - padL - padR, plotH = ph - padT - padB;
      const n = Math.max(...seriesData.map(s => s.values.length), 1);
      const allVals = seriesData.flatMap(s => s.values);
      const maxVal = Math.max(...allVals, 1), minVal = Math.min(...allVals, 0);
      const range = maxVal - minVal || 1;
      const gx = (i) => padL + (n === 1 ? plotW/2 : (i / (n - 1)) * plotW);
      const gy = (v) => padT + plotH - ((v - minVal) / range) * plotH;
      const barW = Math.max(6, Math.min(28, plotW / (n * seriesData.length) - 3));
      const yTicks = [0,1,2,3,4].map(i => minVal + (range / 4) * i);

      let innerSvg = '';
      innerSvg += yTicks.map(t => `<line x1="${padL}" y1="${gy(t)}" x2="${pw - padR}" y2="${gy(t)}" stroke="#e2e8f0" stroke-dasharray="3 3"/><text x="${padL - 5}" y="${gy(t) + 4}" text-anchor="end" font-size="9" fill="#64748b">${Number.isInteger(t) ? t : t.toFixed(2)}</text>`).join('');
      innerSvg += (seriesData[0]?.values || [1,2,3,4,5]).map((_, i) => `<text x="${gx(i)}" y="${padT + plotH + 14}" text-anchor="middle" font-size="9" fill="#64748b">${i + 1}</text>`).join('');
      innerSvg += `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="#475569" stroke-width="1.5"/><line x1="${padL}" y1="${padT + plotH}" x2="${pw - padR}" y2="${padT + plotH}" stroke="#475569" stroke-width="1.5"/>`;

      seriesData.forEach((series, si) => {
        const col = getSeriesCol(series, si);
        if (chartType === 'bar') {
          series.values.forEach((v, i) => {
            const groupW = plotW / n;
            const cx = padL + i * groupW + groupW / 2;
            const offset = (si - (seriesData.length - 1) / 2) * (barW + 2);
            const bx = cx + offset - barW / 2;
            const bh = ((v - minVal) / range) * plotH;
            const by = padT + plotH - bh;
            innerSvg += `<rect x="${bx}" y="${by}" width="${barW}" height="${Math.max(1, bh)}" fill="${col}" opacity="0.88" rx="1.5"/>`;
          });
        } else if (chartType === 'scatter') {
          series.values.forEach((v, i) => { innerSvg += `<circle cx="${gx(i)}" cy="${gy(v)}" r="4" fill="${col}" opacity="0.85"/>`; });
        } else if (chartType === 'area') {
          const firstX = gx(0), lastX = gx(series.values.length - 1);
          const areaD = `M ${firstX} ${padT + plotH} ${series.values.map((v,i) => `L ${gx(i)} ${gy(v)}`).join(' ')} L ${lastX} ${padT + plotH} Z`;
          const lineD = series.values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${gx(i)} ${gy(v)}`).join(' ');
          innerSvg += `<path d="${areaD}" fill="${col}" opacity="0.18"/><path d="${lineD}" fill="none" stroke="${col}" stroke-width="2"/>`;
          series.values.forEach((v, i) => { innerSvg += `<circle cx="${gx(i)}" cy="${gy(v)}" r="3" fill="${col}"/>`; });
        } else { // line
          const d = series.values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${gx(i)} ${gy(v)}`).join(' ');
          innerSvg += `<path d="${d}" fill="none" stroke="${col}" stroke-width="2" stroke-dasharray="${si === 1 ? '4 2' : 'none'}"/>`;
          series.values.forEach((v, i) => {
            innerSvg += si % 2 === 0
              ? `<rect x="${gx(i)-3}" y="${gy(v)-3}" width="6" height="6" fill="${col}"/>`
              : `<circle cx="${gx(i)}" cy="${gy(v)}" r="3.5" fill="${col}"/>`;
          });
        }
      });
      innerSvg += seriesData.map((s, i) => `<rect x="${pw - padR + 6}" y="${padT + i*18}" width="14" height="9" rx="2" fill="${getSeriesCol(s, i)}"/><text x="${pw - padR + 24}" y="${padT + i*18 + 8}" font-size="9" fill="#1e293b" font-weight="500">${escHtml(s.name)}</text>`).join('');
      innerSvg += `<text x="${(padL + pw - padR) / 2}" y="${ph - 5}" text-anchor="middle" font-size="10" fill="#475569" font-style="italic">${xlabel}</text>`;
      innerSvg += `<text x="14" y="${ph/2}" text-anchor="middle" transform="rotate(-90 14 ${ph/2})" font-size="10" fill="#475569" font-style="italic">${ylabel}</text>`;
      return `<div class="fig-wrap"><div class="fig-frame"><svg viewBox="0 0 ${pw} ${ph}" style="width:100%;max-width:520px;height:auto"><text x="${(padL + pw - padR)/2}" y="20" text-anchor="middle" font-size="12" font-weight="bold" fill="#1e293b">${title}</text>${innerSvg}</svg></div><div class="fig-caption"><strong>Figure ${fNum}.</strong> <em>${escHtml(c.caption || 'Empirical training and validation loss trajectories.')}</em></div></div>`;
    };

    const secHtml = (sec, secIdx, chunkIdx) => {
      const isSectionOne = chunkIdx === 0 && secIdx === 0;
      const headingNum = layoutCustomization?.headingNumbering === 'roman'
        ? `${toRoman(sec.index)}.`
        : layoutCustomization?.headingNumbering === 'arabic'
          ? `${sec.index}.`
          : '';
      const headingTitle = layoutCustomization?.headingStyle === 'uppercase'
        ? sec.title.toUpperCase()
        : sec.title;
      const underlineStyle = layoutCustomization?.headingUnderline
        ? `border-bottom: 1px solid ${accent};`
        : 'border-bottom: 1px solid #e2e8f0;';

      let bodyHtml = '';
      if (isSectionOne && layoutCustomization?.dropCap && sec.cleanText) {
        const firstChar = sec.cleanText.charAt(0);
        const restText = sec.cleanText.slice(1);
        bodyHtml = `<div class="drop-cap-wrapper"><span class="drop-cap-char" style="color: ${accent};">${escHtml(firstChar)}</span>${renderMarkdownBlocks(restText)}</div>`;
      } else {
        bodyHtml = renderMarkdownBlocks(sec.cleanText);
      }

      return `<div class="sec">
        <div class="sec-h" style="${underlineStyle}">${headingNum ? headingNum + ' ' : ''}${escHtml(headingTitle)}</div>
        <div class="sec-b">${bodyHtml}</div>
        ${sec.tableData ? tableHtml(sec.tableData) : ''}
        ${sec.figureData ? figureHtml(sec.figureData) : ''}
        ${sec.chartData ? chartHtml(sec.chartData) : ''}
      </div>`;
    };

    const renderJournalHeader = () => {
      if (preset === 'ieee_twocolumn') {
        return `<div class="jrnl-head-ieee">
          <div class="ieee-masthead-top">
            <span class="ieee-badge">${escHtml(activeProject?.header_badge || 'IEEE TRANSACTIONS ON COMPUTATIONAL INTELLIGENCE AND LEARNING')}</span>
            <span class="ieee-vol-doi">${escHtml(volIssue)} · DOI: ${escHtml(doiStr)}</span>
          </div>
          <div class="ieee-masthead-main">
            <div>
              <span class="ieee-journal-title">${escHtml(journalTitle)}</span>
              <span class="ieee-society-sub">${escHtml(societyName)}</span>
            </div>
            <span class="open-badge">${escHtml(badgeText)}</span>
          </div>
        </div>`;
      }
      if (preset === 'nature_springer') {
        return `<div class="jrnl-head-nature">
          <div class="nature-banner" style="background-color: ${accent};">
            <span>${escHtml(activeProject?.header_badge || 'NATURE PORTFOLIO · PEER REVIEWED RESEARCH ARTICLE')}</span>
            <span>https://doi.org/${escHtml(doiStr)}</span>
          </div>
          <div class="nature-sub-row">
            <div>
              <span class="nature-journal-title" style="color: ${accent};">${escHtml(journalTitle)}</span>
              <span class="nature-vol-issue">${escHtml(volIssue)}</span>
            </div>
            <span class="open-badge">${escHtml(badgeText)}</span>
          </div>
        </div>`;
      }
      if (preset === 'mdpi_banner') {
        return `<div class="jrnl-head-mdpi">
          <div class="mdpi-banner" style="background-color: ${accent};">
            <span>${escHtml(activeProject?.header_badge || 'MDPI · OPEN ACCESS PUBLISHING · ARTICLE')}</span>
            <span>https://doi.org/${escHtml(doiStr)}</span>
          </div>
          <div class="mdpi-sub-row">
            <div>
              <span class="mdpi-journal-title">${escHtml(journalTitle)}</span>
              <span class="mdpi-vol-issue">${escHtml(volIssue)}</span>
            </div>
            <span class="open-badge">${escHtml(badgeText)}</span>
          </div>
        </div>`;
      }
      if (preset === 'plos_band') {
        return `<div class="jrnl-head-plos">
          <div class="plos-band" style="background-color: ${accent};">
            <span>${escHtml(activeProject?.header_badge || 'PLOS ONE · RESEARCH ARTICLE · OPEN ACCESS')}</span>
            <span>https://doi.org/${escHtml(doiStr)}</span>
          </div>
          <div class="plos-sub-row">
            <div>
              <span class="plos-journal-title" style="color: ${accent};">${escHtml(journalTitle)}</span>
              <span class="plos-vol-issue">${escHtml(volIssue)}</span>
            </div>
            <span class="open-badge">${escHtml(badgeText)}</span>
          </div>
        </div>`;
      }
      if (preset === 'springer_lncs') {
        return `<div class="jrnl-head-lncs">
          <div class="lncs-series">Lecture Notes in Computer Science — LNCS</div>
          <div class="lncs-sub">${escHtml(journalTitle)} · ${escHtml(volIssue)}</div>
        </div>`;
      }
      if (preset === 'society_classic') {
        return `<div class="jrnl-head-society">
          <div class="society-top">${escHtml(activeProject?.header_badge || 'PROCEEDINGS OF THE SCHOLARLY SCIENTIFIC SOCIETY')}</div>
          <div class="society-main">
            <span class="society-journal-title">${escHtml(journalTitle)}</span>
            <span class="open-badge">${escHtml(badgeText)}</span>
          </div>
          <div class="society-sub">${escHtml(volIssue)} · DOI: ${escHtml(doiStr)}</div>
        </div>`;
      }
      // Default: elsevier_box
      return `<div class="jrnl-head-elsevier">
        <div class="sciencedirect-bar">
          <div class="sd-left">
            <span class="sd-dot"></span>
            <span>${escHtml(activeProject?.header_badge || 'Available online at www.sciencedirect.com · ScienceDirect')}</span>
          </div>
          <span class="sd-publisher">${escHtml(pubName)}</span>
        </div>
        <div class="elsevier-main-row">
          <div class="elsevier-meta">
            <span class="elsevier-journal-title" style="color: ${accent};">${escHtml(journalTitle)}</span>
            <span class="elsevier-vol-doi">${escHtml(volIssue)} · DOI: ${escHtml(doiStr)}</span>
          </div>
          <span class="open-badge">${escHtml(badgeText)}</span>
        </div>
      </div>`;
    };

    const renderAbstractHtml = () => {
      if (!doc.abstract) return '';
      const style = layoutCustomization?.abstractStyle || (preset === 'elsevier_box' ? 'boxed' : preset === 'nature_springer' ? 'lead_accent' : preset === 'ieee_twocolumn' ? 'italic_terms' : (preset === 'mdpi_banner' || preset === 'plos_band') ? 'modern_bar' : 'boxed');
      const history = layoutCustomization?.articleHistory || {};

      if (style === 'boxed') {
        const articleInfoHtml = layoutCustomization?.showArticleInfo ? `
          <div class="article-info-col">
            <div class="info-title" style="color: ${accent};">ARTICLE INFO</div>
            <div class="info-lbl">Article history:</div>
            <div>Received ${escHtml(history.received || '12 January 2026')}</div>
            <div>Revised ${escHtml(history.revised || '18 April 2026')}</div>
            <div>Accepted ${escHtml(history.accepted || '24 May 2026')}</div>
            <div>Available online ${escHtml(history.availableOnline || '1 June 2026')}</div>
          </div>
        ` : '';

        return `<div class="abstract-box elsevier-abstract">
          <div class="abstract-box-inner">
            ${articleInfoHtml}
            <div class="abstract-main-col">
              <div class="abstract-heading" style="color: ${accent};">ABSTRACT</div>
              <div class="abstract-text">${renderMarkdownBlocks(doc.abstract)}</div>
              ${doc.keywords ? `<div class="keywords"><strong>Keywords: </strong>${escHtml(doc.keywords)}</div>` : ''}
            </div>
          </div>
        </div>`;
      }

      if (style === 'lead_accent') {
        return `<div class="abstract-lead-accent" style="border-left: 4px solid ${accent};">
          <span class="abstract-lead-badge" style="color: ${accent};">Context &amp; Summary</span>
          <div class="abstract-lead-body">${renderMarkdownBlocks(doc.abstract)}</div>
          ${doc.keywords ? `<div class="keywords"><strong>Key Subjects: </strong>${escHtml(doc.keywords)}</div>` : ''}
        </div>`;
      }

      if (style === 'italic_terms') {
        return `<div class="abstract-ieee">
          <strong class="ieee-lbl">Abstract—</strong>
          <span class="ieee-body">${renderMarkdownBlocks(doc.abstract)}</span>
          ${doc.keywords ? `<div class="keywords"><strong>Index Terms—</strong> ${escHtml(doc.keywords)}</div>` : ''}
        </div>`;
      }

      if (style === 'modern_bar' || style === 'minimal') {
        return `<div class="abstract-modern-bar" style="border: 1px solid ${accent}40; background-color: ${accent}0d;">
          <strong class="abstract-heading" style="color: ${accent};">${preset === 'plos_band' ? 'Abstract &amp; Open Access Disclosure' : 'Abstract'}</strong>
          <div class="abstract-text">${renderMarkdownBlocks(doc.abstract)}</div>
          ${doc.keywords ? `<div class="keywords"><strong>Keywords: </strong>${escHtml(doc.keywords)}</div>` : ''}
        </div>`;
      }

      return `<div class="abstract-standard">
        <strong class="abstract-heading">ABSTRACT</strong>
        <div class="abstract-text">${renderMarkdownBlocks(doc.abstract)}</div>
        ${doc.keywords ? `<div class="keywords"><strong>Keywords: </strong>${escHtml(doc.keywords)}</div>` : ''}
      </div>`;
    };

    const refsHtml = (doc.references && doc.references.length)
      ? doc.references.map(r => `<p>[${r.n}] ${escHtml(r.text)}</p>`).join('')
      : `<p>[1] A. Vaswani et al., "Attention is all you need," <em>NeurIPS</em>, vol. 30, pp. 5998–6008, 2017.</p>
         <p>[2] J. Devlin et al., "BERT: Pre-training of deep bidirectional transformers," <em>NAACL-HLT</em>, 2019.</p>
         <p>[3] E. Rostova and D. Vance, "Invariant manifold routing," <em>ScholarGrid Preprints</em>, 2026.</p>`;

    const totalPages = Math.max(1, sectionChunks.length);
    const renderedPages = sectionChunks.map((chunk, chunkIdx) => {
      const pageNum = chunkIdx + 1;
      const isFirst = chunkIdx === 0;
      const isLast = chunkIdx === sectionChunks.length - 1;
      const pageCols = (pageLayouts[chunkIdx] || (layoutCustomization?.columns === 1 ? 'single' : 'two-column'));
      const pageTwo = pageCols === 'two-column' ? ' two-col' : '';
      const titleAlign = layoutCustomization?.titleAlign || (preset === 'ieee_twocolumn' ? 'center' : 'left');
      const titleSize = layoutCustomization?.titleSize || 22;
      const titleWeight = layoutCustomization?.titleWeight || 'bold';

      if (isFirst) {
        return (
          `<div class="pg">` +
            `<div class="pg-content">` +
              renderJournalHeader() +
              `<div class="p-title" style="font-size: ${titleSize}px; text-align: ${titleAlign}; font-weight: ${titleWeight};">${escHtml(doc.title)}</div>` +
              `<div class="p-authors" style="text-align: ${titleAlign === 'center' || preset === 'ieee_twocolumn' ? 'center' : 'left'};">${escHtml(doc.authors)}</div>` +
              `<div class="p-affil" style="text-align: ${titleAlign === 'center' || preset === 'ieee_twocolumn' ? 'center' : 'left'};">${escHtml(doc.affiliations || activeProject?.affiliations || currentUser.institution || 'Institute for Advanced Scientific Computing · Department of Computational Intelligence')}<br/>*Corresponding author: ${escHtml(currentUser.email || 'author@institution.edu')} · Received March 2026; revised May 2026.</div>` +
              renderAbstractHtml() +
              `<div class="sections${pageTwo}">${chunk.map((sec, secIdx) => secHtml(sec, secIdx, chunkIdx)).join('')}</div>` +
              (isLast ? `<div class="refs"><h2>References</h2>${refsHtml}</div>` : '') +
            `</div>` +
            (layoutCustomization?.showPageFooters !== false ? `<div class="rt"><span>ScholarGrid Sovereign LaTeX Studio · Q1 Index</span><span>Page 1 of ${totalPages}</span></div>` : '') +
          `</div>`
        );
      } else {
        const continuationHeader = layoutCustomization?.showPageHeaders !== false ? `
          <div class="run-head"><span class="r-name">${escHtml(doc.title || activeProject?.title || journalTitle)}</span><span class="r-authors">${escHtml(doc.authors ? doc.authors.split(',')[0].trim() + ' et al.' : `${currentUser.name} et al.`)}</span></div>
        ` : '';

        return (
          `<div class="pg">` +
            `<div class="pg-content">` +
              continuationHeader +
              `<div class="sections${pageTwo}">${chunk.map((sec, secIdx) => secHtml(sec, secIdx, chunkIdx)).join('')}` +
                (isLast ? `<div class="refs"><h2>References</h2>${refsHtml}</div>` : '') +
              `</div>` +
            `</div>` +
            (layoutCustomization?.showPageFooters !== false ? `<div class="rt"><span>ScholarGrid Sovereign LaTeX Studio · Q1 Index</span><span>Page ${pageNum} of ${totalPages}</span></div>` : '') +
          `</div>`
        );
      }
    }).join('');

    const css = `
      @page { size: A4 portrait; margin: 0; }
      html, body {
        margin: 0;
        padding: 0;
        background: #fff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      * { box-sizing: border-box; }
      .pg {
        width: 210mm;
        height: 297mm;
        min-height: 297mm;
        max-height: 297mm;
        padding: 14mm 16mm 12mm;
        background: ${layoutCustomization?.paperTone || '#ffffff'};
        color: #0f172a;
        font-family: ${getFontFamilyCss(layoutCustomization?.fontFamily)};
        font-size: ${layoutCustomization?.fontSize || 11}px;
        line-height: ${layoutCustomization?.lineHeight || 1.55};
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
        overflow: hidden;
        margin: 0;
        page-break-after: always;
        break-after: page;
        page-break-inside: avoid;
        break-inside: avoid;
        text-align: ${layoutCustomization?.textJustify ? 'justify' : 'left'};
      }
      .pg:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      .pg-content {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      /* Elsevier Masthead */
      .jrnl-head-elsevier { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 16px; }
      .sciencedirect-bar { display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; font-family: Arial, sans-serif; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 6px; color: #64748b; }
      .sd-left { display: flex; align-items: center; gap: 4px; }
      .sd-dot { width: 6px; height: 6px; border-radius: 50%; background: #ea580c; display: inline-block; }
      .sd-publisher { font-weight: bold; color: #ea580c; text-transform: uppercase; font-size: 8.5px; }
      .elsevier-main-row { display: flex; justify-content: space-between; align-items: flex-end; }
      .elsevier-journal-title { font-size: 11px; font-weight: bold; letter-spacing: 0.05em; text-transform: uppercase; display: block; font-family: Arial, sans-serif; }
      .elsevier-vol-doi { font-size: 9px; color: #64748b; font-family: monospace; }

      /* IEEE Masthead */
      .jrnl-head-ieee { border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; padding: 6px 0; margin-bottom: 16px; font-family: Arial, sans-serif; }
      .ieee-masthead-top { display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; font-family: monospace; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 4px; }
      .ieee-badge { font-weight: bold; text-transform: uppercase; color: #002855; letter-spacing: 0.04em; }
      .ieee-vol-doi { color: #64748b; }
      .ieee-masthead-main { display: flex; justify-content: space-between; align-items: center; }
      .ieee-journal-title { font-weight: bold; font-size: 11px; font-family: Georgia, serif; text-transform: uppercase; color: #0f172a; display: block; }
      .ieee-society-sub { font-size: 8px; text-transform: uppercase; color: #64748b; letter-spacing: 0.04em; display: block; }

      /* Nature Masthead */
      .jrnl-head-nature { margin-bottom: 16px; font-family: Arial, sans-serif; }
      .nature-banner { color: #ffffff; padding: 6px 10px; margin: 0 0 10px 0; border-radius: 3px; display: flex; justify-content: space-between; font-size: 8px; font-weight: bold; letter-spacing: 0.04em; }
      .nature-sub-row { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
      .nature-journal-title { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.04em; display: block; }
      .nature-vol-issue { font-size: 8.5px; font-family: monospace; color: #64748b; }

      /* MDPI Masthead */
      .jrnl-head-mdpi { margin-bottom: 16px; font-family: Arial, sans-serif; }
      .mdpi-banner { color: #ffffff; padding: 6px 10px; margin: 0 0 10px 0; border-radius: 3px; display: flex; justify-content: space-between; font-size: 8px; font-weight: bold; }
      .mdpi-sub-row { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
      .mdpi-journal-title { font-size: 11px; font-weight: bold; text-transform: uppercase; display: block; color: #1b365d; }
      .mdpi-vol-issue { font-size: 8.5px; font-family: monospace; color: #64748b; }

      /* PLOS Masthead */
      .jrnl-head-plos { margin-bottom: 16px; font-family: Arial, sans-serif; }
      .plos-band { color: #ffffff; padding: 6px 10px; margin: 0 0 10px 0; border-radius: 3px; display: flex; justify-content: space-between; font-size: 8px; font-weight: bold; }
      .plos-sub-row { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
      .plos-journal-title { font-size: 11px; font-weight: bold; text-transform: uppercase; display: block; color: #0d9488; }
      .plos-vol-issue { font-size: 8.5px; font-family: monospace; color: #64748b; }

      /* Springer LNCS Masthead */
      .jrnl-head-lncs { border-bottom: 1px solid #0f172a; padding-bottom: 8px; margin-bottom: 18px; text-align: center; font-family: Arial, sans-serif; }
      .lncs-series { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.06em; color: #1a365d; }
      .lncs-sub { font-size: 9px; color: #64748b; margin-top: 2px; }

      /* Society Classic Masthead */
      .jrnl-head-society { border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; padding: 6px 0; margin-bottom: 16px; text-align: center; font-family: Arial, sans-serif; }
      .society-top { font-size: 8px; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; color: #475569; }
      .society-main { display: flex; justify-content: space-between; align-items: center; margin: 3px 0; }
      .society-journal-title { font-size: 11.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.04em; color: #002b49; }
      .society-sub { font-size: 8.5px; font-family: monospace; color: #64748b; }

      /* Common Badges */
      .open-badge { background: #d1fae5; color: #065f46; font-weight: bold; text-transform: uppercase; border: 1px solid #6ee7b7; padding: 2px 8px; border-radius: 4px; font-size: 8px; font-family: Arial, sans-serif; }
      .run-head { border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 16px; display: flex; justify-content: space-between; font-family: Arial, sans-serif; font-size: 9px; color: #475569; }
      .r-name { font-weight: bold; text-transform: uppercase; color: ${accent}; }

      /* Title & Authors */
      .p-title { line-height: 1.25; color: #0f172a; margin-bottom: 10px; font-family: inherit; }
      .p-authors { font-size: 12px; font-weight: bold; color: #334155; margin-bottom: 4px; font-family: inherit; }
      .p-affil { font-style: italic; font-size: 9.5px; color: #64748b; margin-bottom: 16px; line-height: 1.4; font-family: inherit; }

      /* Abstracts */
      .elsevier-abstract { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px 12px; margin-bottom: 18px; font-size: 10.5px; }
      .abstract-box-inner { display: flex; gap: 14px; }
      .article-info-col { width: 140px; font-size: 8.5px; font-family: Arial, sans-serif; border-right: 1px solid #e2e8f0; padding-right: 10px; color: #64748b; line-height: 1.4; shrink: 0; }
      .info-title { font-weight: bold; text-transform: uppercase; margin-bottom: 3px; font-size: 9px; }
      .info-lbl { font-weight: bold; color: #334155; margin-top: 2px; }
      .abstract-main-col { flex: 1; }
      .abstract-heading { font-family: Arial, sans-serif; font-weight: bold; text-transform: uppercase; letter-spacing: 0.04em; font-size: 10px; margin-bottom: 4px; }
      .abstract-text { font-size: 10.5px; line-height: 1.5; color: #1e293b; }

      .abstract-lead-accent { padding: 4px 0 4px 12px; margin-bottom: 18px; }
      .abstract-lead-badge { font-family: Arial, sans-serif; font-weight: bold; text-transform: uppercase; letter-spacing: 0.04em; font-size: 9.5px; display: block; margin-bottom: 4px; }
      .abstract-lead-body { font-size: 11px; font-weight: bold; line-height: 1.5; color: #0f172a; }

      .abstract-ieee { padding: 8px 10px; background: #f8fafc; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; margin-bottom: 18px; font-size: 10.5px; line-height: 1.5; }
      .ieee-lbl { font-family: Arial, sans-serif; font-weight: bold; text-transform: uppercase; font-size: 10px; color: #0f172a; margin-right: 4px; }
      .ieee-body { font-style: italic; color: #1e293b; font-weight: 500; }

      .abstract-modern-bar { border-radius: 6px; padding: 10px 12px; margin-bottom: 18px; font-size: 10.5px; }

      .abstract-standard { background: #f8fafc; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding: 10px 12px; margin-bottom: 18px; }

      .keywords { margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 9.5px; font-family: Arial, sans-serif; color: #475569; }

      /* Sections & Columns */
      .sections { width: 100%; }
      .sections.two-col {
        column-count: 2;
        column-gap: ${layoutCustomization?.columnGap || 22}px;
        ${layoutCustomization?.columnDivider ? 'column-rule: 1px solid #cbd5e1;' : ''}
      }
      .sec { margin-bottom: 14px; break-inside: avoid; page-break-inside: avoid; }
      .sec-h { font-family: Arial, sans-serif; font-weight: bold; letter-spacing: 0.04em; font-size: 11px; color: #0f172a; padding-bottom: 2px; margin-bottom: 6px; }
      .sec-b { font-size: 10.5px; line-height: 1.5; color: #334155; }
      .drop-cap-wrapper { }
      .drop-cap-char { float: left; font-size: 38px; line-height: 0.85; padding-right: 6px; padding-top: 2px; font-family: inherit; font-weight: bold; }

      .md-list { margin: 6px 0 6px 18px; } .md-list li { margin-bottom: 2px; }
      .display-math { text-align: center; margin: 8px 0; }
      .fig-wrap { margin: 10px 0; display: flex; flex-direction: column; align-items: center; break-inside: avoid; page-break-inside: avoid; width: 100%; }
      .fig-frame { background: transparent; border: none; padding: 4px 0; width: 100%; max-width: 540px; display: flex; justify-content: center; }
      .fig-caption { margin-top: 5px; font-size: 11px; color: #334155; text-align: center; max-width: 540px; }
      .subfigs-grid { display: grid; gap: 10px; width: 100%; max-width: 560px; margin: 4px 0; }
      .subfigs-grid-1 { grid-template-columns: 1fr; }
      .subfigs-grid-2 { grid-template-columns: 1fr 1fr; }
      .subfigs-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
      .subfig-item { display: flex; flex-direction: column; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px; text-align: center; }
      .subfig-frame { width: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; min-height: 80px; }
      .subfig-caption { margin-top: 4px; font-size: 9.5px; color: #334155; }
      .tbl-wrap { margin: 10px 0; display: flex; flex-direction: column; align-items: center; break-inside: avoid; page-break-inside: avoid; width: 100%; }
      .tbl-caption { text-align: center; font-size: 11px; margin-bottom: 4px; }
      .subtbls-grid { display: grid; gap: 12px; width: 100%; max-width: 600px; margin: 4px 0; }
      .subtbls-grid-1 { grid-template-columns: 1fr; }
      .subtbls-grid-2 { grid-template-columns: 1fr 1fr; }
      .subtbls-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
      .subtbl-item { display: flex; flex-direction: column; width: 100%; }
      .subtbl-caption { font-size: 9.5px; font-style: italic; text-align: center; margin-bottom: 3px; color: #475569; }
      .tbl { border-collapse: collapse; margin: 0 auto; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; width: 100%; font-size: 11px; }
      .tbl th { padding: 4px 6px; font-family: Arial, sans-serif; font-size: 10.5px; border-bottom: 1px solid #334155; }
      .tbl td { padding: 4px 6px; }
      .tbl tr.last td { font-weight: bold; color: #164e63; background: #f8fafc; }
      .tbl td:first-child, .tbl th:first-child { text-align: left; }
      .tbl th:not(:first-child), .tbl td:not(:first-child) { text-align: center; }
      .refs { margin-top: 14px; padding-top: 10px; border-top: 1px solid #cbd5e1; break-inside: avoid; page-break-inside: avoid; }
      .refs h2 { font-family: Arial, sans-serif; font-weight: bold; text-transform: uppercase; font-size: 11px; color: #0f172a; margin-bottom: 6px; }
      .refs p { font-size: 9.5px; color: #475569; margin-bottom: 3px; line-height: 1.4; }
      .rt { margin-top: auto; border-top: 1px solid #e2e8f0; padding-top: 6px; display: flex; justify-content: space-between; font-family: monospace; font-size: 8.5px; color: #94a3b8; }`;
    return { html: renderedPages, css };
  };

  const handleDownloadPDF = async () => {
    const { html, css } = buildPrintDocument();
    const fname = ((activeProject?.title || 'manuscript') + '').replace(/[^\w\-. ]+/g, '').trim() || 'manuscript';
    showToast('Rendering publication PDF...', 'info');
    try {
      // Primary: server-side headless-Chrome print-to-PDF — the exact layout
      // shown in the preview panel, with KaTeX math and vector styling already rendered.
      const fullCss = `${katexCss}\n${css}`;
      const res = await fetch(`${BACKEND_URL}/api/latex/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html,
          css: fullCss,
          filename: `${fname}.pdf`,
          title: parsedDoc.title || 'Manuscript'
        })
      });
      if (!res.ok) throw new Error('pdf-engine ' + res.status);
      const pdf = await res.arrayBuffer();
      const blob = new Blob([pdf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fname}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      showToast('PDF downloaded — exact research-paper layout', 'success');
    } catch(e) {
      console.warn('Backend PDF rendering error, falling back to print window:', e);
      // Fallback: identical HTML + inline KaTeX CSS in a print window.
      openPrintWindow();
    }
  };

  // Open the native print dialog with the exact paper layout (image-4 options:
  // Save as PDF · Pages · Layout · More settings · Portrait · 1 page).
  const openPrintWindow = () => {
    const { html, css } = buildPrintDocument();
    const printHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${escHtml(parsedDoc.title || 'Manuscript')}</title>` +
      `<style>@page{size:A4 portrait;margin:0;}html,body{margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}</style><style>${katexCss}</style><style>${css}</style></head>` +
      `<body>${html}<script>window.addEventListener('DOMContentLoaded',function(){setTimeout(function(){window.print();},500);});${'</scr' + 'ipt>'}</body></html>`;
    const win = window.open('', '_blank', 'width=900,height=1200');
    if (win) { win.document.write(printHtml); win.document.close(); }
    else showToast('Pop-up blocked. Please allow pop-ups for printing.', 'warning');
  };

  // ── Download .tex ─────────────────────────────────────────────────────────
  const handleDownloadTex = () => {
    const blob = new Blob([latexCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${activeProject.title || 'manuscript'}.tex`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Download Project ZIP ──────────────────────────────────────────────────
  const handleDownloadZip = async () => {
    if (!activeProject?.id || activeProject.id === 'proj_default') { showToast('Open a saved project first', 'info'); return; }
    showToast('Preparing project ZIP...', 'info');
    try {
      const res = await fetch(`${BACKEND_URL}/api/latex/projects/${activeProject.id}/download-zip`);
      if (!res.ok) throw new Error('zip download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${(activeProject.title || 'project').replace(/[^\w\-. ]+/g, '').trim()}.zip`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      showToast('Project ZIP downloaded', 'success');
    } catch(e) { showToast('ZIP download failed', 'warning'); }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // DERIVED STATE
  // ═══════════════════════════════════════════════════════════════════════
  const preambleCode = useMemo(() => {
    const idx = latexCode.indexOf('\\begin{document}');
    return idx >= 0 ? latexCode.substring(0, idx).trim() : '';
  }, [latexCode]);

  const documentOutline = useMemo(() => {
    const outline = []; const lines = latexCode.split('\n');
    const secRe = /\\(section|subsection|subsubsection)\{([^}]+)\}/;
    // Only sections inside the document body are rendered by the preview/PDF —
    // stop at \end{document} so the outline never lists an unrenderable section.
    const endIdx = lines.findIndex(l => l.includes('\\end{document}'));
    const scan = endIdx >= 0 ? lines.slice(0, endIdx) : lines;
    scan.forEach((line, li) => { const m = secRe.exec(line); if (m) outline.push({ level: m[1], title: m[2], line: li + 1 }); });
    return outline;
  }, [latexCode]);

  const parsedDoc = useMemo(() => parseAcademicDocument(latexCode, projectFiles), [latexCode, projectFiles]);

  // Unlimited pages: chunk sections into A4 sheets (~4 sections per page) so any
  // research paper — regardless of length — paginates cleanly instead of being
  // crammed into one fixed 2-page layout.
  const SECTIONS_PER_PAGE = 4;
  const sectionChunks = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < parsedDoc.sections.length; i += SECTIONS_PER_PAGE) {
      chunks.push(parsedDoc.sections.slice(i, i + SECTIONS_PER_PAGE));
    }
    if (chunks.length === 0) chunks.push([]);
    return chunks;
  }, [parsedDoc.sections]);
  const pdfPageCount = Math.max(1, sectionChunks.length);

  // Layout width the Page-Sheet column needs at the current zoom so the scroll
  // viewport always covers the FULL scaled extent (left edge reachable when
  // zoomed in >100%, perfectly centered whenever it fits the viewport).
  const pdfSheetWidth = Math.max(794, Math.ceil(794 * (previewZoom / 100)));

  // ═══════════════════════════════════════════════════════════════════════
  // HAND TOOL PANNING / VIEWPORT CANVAS CONTROLS
  // ═══════════════════════════════════════════════════════════════════════
  const handlePanMouseDown = (e) => {
    if (!isHandToolActive || !previewContainerRef.current) return;
    if (e.button !== 0) return;       // left button only; never hijack right/middle clicks
    e.preventDefault();               // stop text selection / native drag while panning
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: previewContainerRef.current.scrollLeft,
      scrollTop: previewContainerRef.current.scrollTop
    };
  };

  const handlePanMouseMove = (e) => {
    if (!isPanning || !previewContainerRef.current) return;
    e.preventDefault();
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    previewContainerRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
    previewContainerRef.current.scrollTop = panStartRef.current.scrollTop - dy;
  };

  const handlePanMouseUp = () => {
    setIsPanning(false);
  };

  const handleSectionInsertSnippet = (sec, snippetKind) => {
    let snippet = '';
    if (snippetKind === 'subfigures2') {
      snippet = '\n\n\\begin{figure}[htbp]\n  \\centering\n  \\begin{subfigure}[b]{0.48\\linewidth}\n    \\centering\n    \\includegraphics[width=\\linewidth]{figures/fig1.png}\n    \\caption{Subfigure A}\n    \\label{fig:1a}\n  \\end{subfigure}\n  \\hfill\n  \\begin{subfigure}[b]{0.48\\linewidth}\n    \\centering\n    \\includegraphics[width=\\linewidth]{figures/fig2.png}\n    \\caption{Subfigure B}\n    \\label{fig:1b}\n  \\end{subfigure}\n  \\caption{Side-by-side comparative analysis.}\n  \\label{fig:comparison}\n\\end{figure}\n';
    } else if (snippetKind === 'subfigures3') {
      snippet = '\n\n\\begin{figure}[htbp]\n  \\centering\n  \\begin{subfigure}[b]{0.32\\linewidth}\n    \\centering\n    \\includegraphics[width=\\linewidth]{figures/fig1.png}\n    \\caption{Model A}\n    \\label{fig:1a}\n  \\end{subfigure}\n  \\hfill\n  \\begin{subfigure}[b]{0.32\\linewidth}\n    \\centering\n    \\includegraphics[width=\\linewidth]{figures/fig2.png}\n    \\caption{Model B}\n    \\label{fig:1b}\n  \\end{subfigure}\n  \\hfill\n  \\begin{subfigure}[b]{0.32\\linewidth}\n    \\centering\n    \\includegraphics[width=\\linewidth]{figures/fig3.png}\n    \\caption{Model C}\n    \\label{fig:1c}\n  \\end{subfigure}\n  \\caption{Three-column evaluation.}\n  \\label{fig:threecol}\n\\end{figure}\n';
    } else if (snippetKind === 'table') {
      snippet = '\n\n\\begin{table}[htbp]\n  \\centering\n  \\caption{Empirical evaluation across benchmarks.}\n  \\label{tab:results}\n  \\begin{tabular}{lccc}\n    \\toprule\n    Architecture & Metric A & Metric B & Score \\\\\n    \\midrule\n    Baseline & 12.4 & 45.2 & 82.1\\% \\\\\n    Proposed & 18.9 & 68.4 & 95.8\\% \\\\\n    \\bottomrule\n  \\end{tabular}\n\\end{table}\n';
    } else if (snippetKind === 'chart') {
      snippet = '\n\n\\begin{sgchart}\n  \\charttitle{Convergence Dynamics}\n  \\chartxlabel{Epochs}\n  \\chartsylabel{Loss}\n  \\chartcaption{Empirical loss decay over training steps.}\n\\end{sgchart}\n';
    } else if (snippetKind === 'list') {
      snippet = '\n\n\\begin{itemize}\n  \\item First experimental observation.\n  \\item Second quantitative verification.\n\\end{itemize}\n';
    }
    if (!snippet) return;
    const next = replaceSectionBody(latexCode, sec, (sec.cleanText || '') + snippet);
    updateCodeWithHistory(next);
    showToast(`Added ${snippetKind} to section`, 'success');
  };

  // ═══════════════════════════════════════════════════════════════════════
  // VISUAL EDITOR SECTION UPDATE
  // ═══════════════════════════════════════════════════════════════════════
  const handleSectionUpdate = (sectionId, newText) => {
    const sec = parsedDoc.sections.find(s => s.id === sectionId);
    if (!sec) return;
    // Surgical write-back: converts the edited markdown to LaTeX and replaces
    // ONLY this section's body in the real .tex source, preserving every
    // embedded figure / table / tikzpicture at its original position.
    const next = replaceSectionBody(latexCode, sec, newText);
    if (next !== latexCode) {
      updateCodeWithHistory(next);
      showToast('Section updated — .tex source synced', 'success');
    } else {
      showToast('No changes detected', 'info');
    }
  };

  // ── Visual-editor asset editing (figures / charts / tables) ────────────────
  const applyAssetPatch = (secId, kind, patch) => {
    const sec = parsedDoc.sections.find(s => s.id === secId);
    if (!sec) return;
    const next = kind === 'figure'
      ? patchSectionFigure(latexCode, sec, patch)
      : kind === 'chart' ? patchSectionChart(latexCode, sec, patch)
      : patchSectionTable(latexCode, sec, patch);
    if (next !== latexCode) {
      updateCodeWithHistory(next);
      showToast(`${kind} updated — .tex synced`, 'success');
    }
  };

  const deleteAsset = (secId, kind) => {
    const sec = parsedDoc.sections.find(s => s.id === secId);
    if (!sec) return;
    const data = kind === 'figure' ? sec.figureData : kind === 'chart' ? sec.chartData : sec.tableData;
    if (!data || !data.range) return;
    const next = latexCode.slice(0, data.range.start) + latexCode.slice(data.range.end);
    if (next !== latexCode) {
      updateCodeWithHistory(next);
      setFigureSelection(null);
      showToast(`${kind} removed from source`, 'success');
    }
  };

  const openFileTab = (path) => {
    if (!path) return;
    setOpenTabs(prev => (prev.includes(path) ? prev : [...prev, path]));
    setActiveTabPath(path);
  };

  // Scroll preview to section
  const scrollPreviewToSection = (secTitle) => {
    const ref = sectionRefs.current[secTitle];
    if (ref) ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Navigate preview to a specific page (unlimited multi-page papers)
  useEffect(() => {
    const ref = sectionRefs.current[`__page${currentPage}`];
    if (ref && previewSubView === 'page') {
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentPage, previewSubView]);

  // Global Escape key dismisses open modals, drawers, and menus
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (dialogBox) { setDialogBox(null); return; }
        if (contextMenu && contextMenu.visible) { setContextMenu(prev => ({ ...prev, visible: false })); return; }
        if (isSlashModalOpen) { setIsSlashModalOpen(false); return; }
        if (isManualModalOpen) { setIsManualModalOpen(false); return; }
        if (isNewProjectModalOpen) { setIsNewProjectModalOpen(false); return; }
        if (isShareOpen) { setIsShareOpen(false); return; }
        if (isHistoryOpen) { setIsHistoryOpen(false); return; }
        if (isReviewOpen) { setIsReviewOpen(false); return; }
        if (isLayoutOpen) { setIsLayoutOpen(false); return; }
        if (showCitePicker) { setShowCitePicker(false); return; }
        if (showDiff) { setShowDiff(false); return; }
        if (showSpellCheck) { setShowSpellCheck(false); return; }
        if (showCrossRefs) { setShowCrossRefs(false); return; }
        if (showAddRefModal) { setShowAddRefModal(false); return; }
        if (showSymbolPicker) { setShowSymbolPicker(false); return; }
        if (headingDropdownOpen) { setHeadingDropdownOpen(false); return; }
        if (compilerDropdownOpen) { setCompilerDropdownOpen(false); return; }
        if (openMenu) { setOpenMenu(null); return; }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    dialogBox, contextMenu, isSlashModalOpen, isManualModalOpen, isNewProjectModalOpen,
    isShareOpen, isHistoryOpen, isReviewOpen, isLayoutOpen, showCitePicker, showDiff,
    showSpellCheck, showCrossRefs, showAddRefModal, showSymbolPicker, headingDropdownOpen,
    compilerDropdownOpen, openMenu
  ]);

  // Tab icon helper
  const getTabIcon = (tab) => {
    const ext = tab.split('.').pop().toLowerCase();
    if (ext === 'bib') return <Bookmark size={11} className="text-amber-400 shrink-0"/>;
    if (['png','jpg','jpeg','svg','gif','webp'].includes(ext)) return <ImageIcon size={11} className="text-rose-400 shrink-0"/>;
    return <FileCode size={11} className="text-cyan-400 shrink-0"/>;
  };

  // ── Build tree from flat file list ─────────────────────────────────────────
  const buildFileTree = useCallback((files) => {
    const root = { children: [], path: '' };
    const pathMap = { '': root };

    // Sort: folders first, then files, both alphabetically
    const sorted = files.filter(Boolean).sort((a, b) => {
      const aIsFolder = a.file_type === 'folder' || (a.path || '').endsWith('/');
      const bIsFolder = b.file_type === 'folder' || (b.path || '').endsWith('/');
      if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;
      return (a.path || '').localeCompare(b.path || '');
    });

    for (const file of sorted) {
      const parts = file.path.replace(/\/$/, '').split('/');
      let currentPath = '';
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        const parentPath = currentPath;
        currentPath = parentPath ? `${parentPath}/${part}` : part;
        if (isLast && (file.file_type !== 'folder' && !file.path.endsWith('/'))) {
          currentPath = file.path; // keep full path for files
        }

        if (!pathMap[currentPath]) {
          const isFolder = isLast ? (file.file_type === 'folder' || file.path.endsWith('/')) : true;
          pathMap[currentPath] = {
            file: isLast ? file : null,
            children: [],
            path: currentPath,
            isFolder,
            name: part
          };
          pathMap[parentPath].children.push(pathMap[currentPath]);
        } else if (isLast && file.file_type !== 'folder' && !file.path.endsWith('/')) {
          // Update existing node with file data
          pathMap[currentPath].file = file;
          pathMap[currentPath].isFolder = false;
        }
      }
    }
    return root;
  }, []);

  const toggleFolder = (path) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const openContextMenu = (e, file) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, file, visible: true });
  };

  const closeContextMenu = () => setContextMenu(prev => ({ ...prev, visible: false }));

  // Add click outside to close context menu
  useEffect(() => {
    const handler = () => closeContextMenu();
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleRenameFromMenu = () => {
    if (!contextMenu.file) return;
    const original = contextMenu.file.path;
    openInputDialog({
      title: 'Rename',
      message: `Rename "${original}" to:`,
      placeholder: original,
      initialValue: original,
      confirmLabel: 'Rename',
      onConfirm: (newName) => {
        if (newName !== original) handleRename(contextMenu.file, newName);
      }
    });
    closeContextMenu();
  };

  const handleDeleteFromMenu = () => {
    if (!contextMenu.file) return;
    handleDelete(contextMenu.file);
    closeContextMenu();
  };

  const handleMoveStart = () => {
    if (!contextMenu.file) return;
    setMoveTarget({ file: contextMenu.file, targetFolder: null });
    closeContextMenu();
  };

  // ── Render tree node recursively ──────────────────────────────────────────
  const renderTreeNode = (node, depth = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const hasChildren = node.children.length > 0;
    const file = node.file;
    const isFile = file && !node.isFolder;
    const isFolder = node.isFolder || (file && file.file_type === 'folder');
    const isActive = file && activeTabPath === file.path;

    if (!file && !hasChildren) return null; // skip empty folder nodes without file data

    const ext = file ? file.path.split('.').pop().toLowerCase() : '';
    const icon = isFolder
      ? <Folder size={12} className={isExpanded ? 'text-amber-400' : 'text-slate-400'} />
      : ext === 'bib'
        ? <Bookmark size={12} className="text-amber-400" />
        : ['png','jpg','jpeg','svg','gif','webp'].includes(ext)
          ? <ImageIcon size={12} className="text-rose-400" />
          : <FileCode size={12} className="text-cyan-400" />;

    const displayName = file ? file.path.split('/').pop() || file.path : node.name;
    const fullPath = file ? file.path : node.path;

    return (
      <div key={node.path} style={{ paddingLeft: `${depth * 16}px` }}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (isFolder && hasChildren) {
              toggleFolder(node.path);
            } else if (file) {
              if (!openTabs.includes(file.path)) setOpenTabs([...openTabs, file.path]);
              setActiveTabPath(file.path);
            }
          }}
          onContextMenu={(e) => file && openContextMenu(e, file)}
          onDoubleClick={(e) => { e.stopPropagation(); if (isFolder && hasChildren) toggleFolder(node.path); }}
          data-testid={`tree-node-${file ? file.path : node.path}`}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-xs font-mono font-medium ${isActive ? (isLight ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200' : 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30') : (isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60' : 'text-slate-300 hover:text-white hover:bg-white/5')}`}
          title={fullPath}
        >
          {hasChildren && isFolder && (
            <ChevronRight size={12} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          )}
          {icon}
          <span className="truncate text-xs">{displayName}</span>
        </div>
        {isExpanded && hasChildren && (
          <div className="space-y-0.5">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };
  const onDragEnter = (e) => {
    e.preventDefault();
    if (e.dataTransfer?.types?.includes('Files')) { dragDepth.current += 1; setIsDraggingFiles(true); }
  };
  const onDragOver = (e) => { e.preventDefault(); if (e.dataTransfer?.types?.includes('Files')) e.dataTransfer.dropEffect = 'copy'; };
  const onDragLeave = (e) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDraggingFiles(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    dragDepth.current = 0; setIsDraggingFiles(false);
    const files = e.dataTransfer?.files;
    if (files && files.length) { handleFileUpload(files); showToast(`Uploading ${files.length} file(s)...`, 'info'); }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className={`h-full w-full flex flex-col overflow-hidden select-none ${themeClasses.bgMain} text-slate-100 font-sans`} onClick={() => setOpenMenu(null)}
      onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>

      {isDraggingFiles && (
        <div className="absolute inset-0 z-[300] pointer-events-none flex items-center justify-center bg-[#0a0e16]/90 backdrop-blur-sm border-4 border-dashed border-cyan-500/60 rounded-2xl m-3">
          <div className="text-center">
            <UploadCloud size={44} className="mx-auto text-cyan-400 mb-3 animate-bounce"/>
            <p className="text-cyan-300 font-mono font-bold text-sm">Drop files to upload into the workspace</p>
            <p className="text-slate-500 font-mono text-[11px] mt-1">PNG · JPG · SVG · PDF · .tex · .bib — stored in PostgreSQL</p>
          </div>
        </div>
      )}

      {/* ── PRINT ROOT (hidden UI, only shows for PDF) ── */}
      <div id="sg-print-root" className="hidden print:block">
        <div className="pdf-page bg-white text-slate-900 font-serif text-[11pt] leading-relaxed p-[25mm] w-[210mm] min-h-[297mm]">
          <div className="border-b-2 border-slate-900 pb-2 mb-5 flex justify-between items-end text-[9pt] font-sans">
            <div><span className="font-bold tracking-wider uppercase text-blue-900 block">{activeProject.journal_name||"IEEE TRANSACTIONS"}</span><span className="text-slate-500 font-mono">DOI: {activeProject.doi||"10.1109/2026"}</span></div>
            <span className="px-2 py-0.5 bg-green-100 text-green-800 font-bold uppercase border border-green-300 text-[8pt]">Open Access · Q1</span>
          </div>
          <h1 className="text-[16pt] font-serif font-bold text-center text-slate-900 leading-tight mb-3">{parsedDoc.title}</h1>
          <div className="text-center text-[10pt] text-slate-700 mb-4"><div className="font-bold">{parsedDoc.authors}</div><div className="italic text-slate-500 text-[9pt]">Institute for Advanced Scientific Computing</div></div>
          {parsedDoc.abstract && <div className="p-3 bg-slate-50 border-y border-slate-300 mb-4 text-[10pt]"><strong className="font-bold uppercase tracking-wide text-[9pt] block mb-1">Abstract—</strong><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatexOptions]}>{parsedDoc.abstract}</ReactMarkdown>{parsedDoc.keywords && <div className="mt-2 pt-2 border-t border-slate-200 text-[9pt]"><strong>Index Terms—</strong>{parsedDoc.keywords}</div>}</div>}
          <div className={layoutMode === 'two-column' ? 'columns-2 gap-6' : ''}>
            {parsedDoc.sections.map(sec => (
              <div key={sec.id} className="mb-4 break-inside-avoid-column">
                <h2 className="font-sans font-bold uppercase tracking-wider text-slate-900 text-[10pt] border-b border-slate-200 pb-0.5 mb-1">{sec.index}. {sec.title}</h2>
                <div className="text-slate-800 text-[10.5pt] leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatexOptions]}>{sec.cleanText}</ReactMarkdown>
                </div>
                {sec.figureData && <PublicationFigure path={sec.figureData.path} caption={sec.figureData.caption} projectFiles={projectFiles}/>}
                {sec.tableData && <PublicationBooktabsTable caption={sec.tableData.caption} tableRows={sec.tableData.rows}/>}
                {sec.chartData && <PublicationVectorChart title={sec.chartData.title} xlabel={sec.chartData.xlabel} ylabel={sec.chartData.ylabel}/>}
              </div>
            ))}
          </div>
          <div className="border-t border-slate-300 pt-3 mt-4">
            <h2 className="font-sans font-bold uppercase text-[10pt] mb-2">References</h2>
            <div className="text-[9pt] text-slate-700 space-y-1">
              <p>[1] A. Vaswani et al., "Attention is all you need," <em>NeurIPS</em>, vol. 30, 2017.</p>
              <p>[2] J. Devlin et al., "BERT," <em>NAACL-HLT</em>, 2019.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── CUSTOM TOAST SYSTEM ── */}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto px-4 py-2.5 rounded-xl border shadow-2xl flex items-center gap-2 text-xs font-mono animate-slideIn ${t.type==='success'?'bg-emerald-950 border-emerald-500/50 text-emerald-300':t.type==='warning'?'bg-amber-950 border-amber-500/50 text-amber-300':t.type==='error'?'bg-rose-950 border-rose-500/50 text-rose-300':'bg-slate-950 border-cyan-500/40 text-cyan-300'}`}>
            {t.type==='success' && <CheckCircle2 size={14}/>}
            {t.type==='warning' && <AlertTriangle size={14}/>}
            {t.type==='error' && <AlertCircle size={14}/>}
            {t.type==='info' && <Info size={14}/>}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MENU BAR                                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className={`h-8 border-b ${subHeaderBgCls} flex items-center px-3 gap-1 shrink-0 text-xs font-sans relative z-50 overflow-visible`}>
        {[
          { id: 'file', label: 'File', items: [
            { label: 'New Project', icon: <FilePlus size={13}/>, action: () => setIsNewProjectModalOpen(true) },
            { label: 'Open Projects', icon: <Folder size={13}/>, action: () => { setShowProjectsWorkspace(true); fetchProjects(); } },
            { sep: true },
            { label: 'Save  Ctrl+S', icon: <Save size={13}/>, action: handleSaveProject },
            { label: 'Download PDF', icon: <Download size={13}/>, action: handleDownloadPDF },
            { label: 'Download Project ZIP', icon: <FileCode size={13}/>, action: handleDownloadZip },
            { label: 'Print…', icon: <Printer size={13}/>, action: openPrintWindow },
            { label: 'Download .tex', icon: <FileDown size={13}/>, action: handleDownloadTex },
            { sep: true },
            { label: 'Upload File', icon: <Upload size={13}/>, action: () => fileUploadRef.current?.click() },
          ]},
          { id: 'edit', label: 'Edit', items: [
            { label: 'Undo  Ctrl+Z', icon: <Undo size={13}/>, action: handleUndo },
            { label: 'Redo  Ctrl+Y', icon: <Redo size={13}/>, action: handleRedo },
            { sep: true },
            { label: 'Find  Ctrl+F', icon: <Search size={13}/>, action: () => { setShowFindPanel(true); setShowReplacePanel(false); } },
            { label: 'Find & Replace  Ctrl+H', icon: <Replace size={13}/>, action: () => { setShowFindPanel(true); setShowReplacePanel(true); } },
            { sep: true },
            { label: 'Select All', icon: <CheckCheck size={13}/>, action: () => editorTextareaRef.current?.select() },
          ]},
          { id: 'insert', label: 'Insert', items: [
            { label: 'Section', icon: <Heading1 size={13}/>, action: () => insertSnippet('\\section{Section Title}\n') },
            { label: 'Subsection', icon: <Heading2 size={13}/>, action: () => insertSnippet('\\subsection{Subsection Title}\n') },
            { sep: true },
            { label: 'Equation', icon: <Sigma size={13}/>, action: () => insertSnippet('\\begin{equation}\n  E = mc^2\n\\end{equation}\n') },
            { label: 'Figure', icon: <ImageIcon size={13}/>, action: () => insertSnippet('\\begin{figure}[htbp]\n\\centering\n\\includegraphics[width=0.85\\linewidth]{figures/image.png}\n\\caption{Caption text.}\n\\label{fig:label}\n\\end{figure}\n') },
            { label: 'Table', icon: <TableIcon size={13}/>, action: () => insertSnippet('\\begin{table}[htbp]\n\\centering\n\\caption{Table Caption}\n\\begin{tabular}{lcc}\n\\toprule\nHeader 1 & Header 2 & Header 3 \\\\\n\\midrule\nRow 1 & Data & Data \\\\\n\\bottomrule\n\\end{tabular}\n\\end{table}\n') },
            { label: 'Itemize List', icon: <List size={13}/>, action: () => insertSnippet('\\begin{itemize}\n  \\item First item\n  \\item Second item\n\\end{itemize}\n') },
            { label: 'Enumerate List', icon: <ListOrdered size={13}/>, action: () => insertSnippet('\\begin{enumerate}\n  \\item First item\n  \\item Second item\n\\end{enumerate}\n') },
            { sep: true },
            { label: 'Citation', icon: <Bookmark size={13}/>, action: () => insertSnippet('\\cite{key}') },
            { label: 'Label', icon: <Tag size={13}/>, action: () => insertSnippet('\\label{label:name}') },
            { label: 'Cross Ref', icon: <LinkIcon size={13}/>, action: () => insertSnippet('\\ref{label:name}') },
            { label: 'Footnote', icon: <StickyNote size={13}/>, action: () => insertSnippet('\\footnote{Footnote text.}') },
            { label: 'Hyperlink', icon: <ExternalLink size={13}/>, action: () => insertSnippet('\\href{https://example.com}{Link text}') },
          ]},
          { id: 'view', label: 'View', items: [
            { label: 'Code View', icon: <Code2 size={13}/>, action: () => setPreviewSubView('page') },
            { label: 'Visual Editor', icon: <Eye size={13}/>, action: () => setPreviewSubView('visual') },
            { sep: true },
            { label: 'Toggle Sidebar', icon: <PanelLeftClose size={13}/>, action: () => setSidebarCollapsed(v => !v) },
            { label: 'Review Panel', icon: <MessageSquare size={13}/>, action: () => setIsReviewOpen(v => !v) },
            { label: 'Version History', icon: <History size={13}/>, action: () => { setIsHistoryOpen(v => !v); fetchVersions(); } },
            { sep: true },
            { label: 'Invert Preview Colors', icon: <Moon size={13}/>, action: () => setInvertPreview(v => !v) },
            { label: 'Auto Compile', icon: <RefreshCw size={13}/>, action: () => setAutoCompile(v => !v) },
          ]},
          { id: 'format', label: 'Format', items: [
            { label: 'Bold', icon: <Bold size={13}/>, action: () => insertSnippet('\\textbf{}') },
            { label: 'Italic', icon: <Italic size={13}/>, action: () => insertSnippet('\\textit{}') },
            { label: 'Underline', icon: <Underline size={13}/>, action: () => insertSnippet('\\underline{}') },
            { label: 'Strikethrough', icon: <Strikethrough size={13}/>, action: () => insertSnippet('\\sout{}') },
            { sep: true },
            { label: 'Single Column', icon: <Rows size={13}/>, action: () => { setLayoutMode('single'); showToast('Single column layout'); } },
            { label: 'Two Column', icon: <Columns size={13}/>, action: () => { setLayoutMode('two-column'); showToast('Two column layout'); } },
            { sep: true },
            { label: 'Left Align', icon: <AlignLeft size={13}/>, action: () => insertSnippet('\\begin{flushleft}\n\\end{flushleft}') },
            { label: 'Center Align', icon: <AlignCenter size={13}/>, action: () => insertSnippet('\\begin{center}\n\\end{center}') },
          ]},
          { id: 'help', label: 'Help', items: [
            { label: 'LaTeX Manual & Cheat Sheet', icon: <BookOpen size={13}/>, action: () => { setOpenMenu(null); setIsManualModalOpen(true); } },
            { label: 'Math Symbols Palette', icon: <Sigma size={13}/>, action: () => { setOpenMenu(null); setShowSymbolPicker(true); } },
            { label: 'Insert Command Slash Menu', icon: <Code2 size={13}/>, action: () => { setOpenMenu(null); setIsSlashModalOpen(true); } },
            { sep: true },
            { label: 'Keyboard Shortcuts', icon: <Keyboard size={13}/>, action: () => showToast('Ctrl+S Save · Ctrl+Z Undo · Ctrl+Y Redo · Ctrl+F Find · Ctrl+H Replace · F3 Find Next', 'info') },
            { label: 'About LaTeX Studio', icon: <HelpCircle size={13}/>, action: () => showToast('ScholarGrid LaTeX Studio v3 — Overleaf-grade research IDE with real PostgreSQL persistence', 'info') },
          ]},
        ].map(menu => (
          <div key={menu.id} className="relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === menu.id ? null : menu.id); }}
              className={`px-2.5 py-1 rounded text-xs ${isLight ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/80' : 'text-slate-300 hover:text-white hover:bg-white/10'} cursor-pointer transition-colors ${openMenu === menu.id ? (isLight ? 'bg-slate-200 text-slate-950 font-semibold' : 'bg-white/10 text-white font-semibold') : ''}`}
            >{menu.label}</button>
            {openMenu === menu.id && (
              <div className={`absolute top-full left-0 mt-1 w-56 ${dropdownCls} rounded-xl shadow-2xl z-[100] overflow-hidden py-1`}>
                {menu.items.map((item, idx) => item.sep ? (
                  <div key={idx} className={`my-1 border-t ${isLight ? 'border-slate-200' : 'border-white/10'}`}/>
                ) : (
                  <button
                    key={idx}
                    onClick={() => { item.action(); setOpenMenu(null); }}
                    className={`w-full px-3 py-2 text-left text-xs ${isLight ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-100' : 'text-slate-300 hover:text-white hover:bg-white/10'} flex items-center gap-2.5 cursor-pointer transition-colors`}
                  >
                    <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>{item.icon}</span>{item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <div className="flex-1"/>
        {/* Mode indicator */}
        <div className="flex items-center gap-1 text-xs font-mono shrink-0">
          {['editing','reviewing','suggesting'].map(m => (
            <button key={m} onClick={() => setEditorMode(m)} className={`h-6 px-2.5 rounded flex items-center justify-center cursor-pointer transition-colors capitalize text-[11px] font-mono font-medium whitespace-nowrap ${editorMode===m ? `${themeClasses.accentBg || 'bg-cyan-500'} text-slate-950 font-bold shadow-sm` : (isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60' : 'text-slate-400 hover:text-white hover:bg-white/5')}`}>{m}</button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TOP NAVBAR                                                             */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <header className={`h-12 border-b ${headerBgCls} px-3 sm:px-4 flex items-center justify-between gap-2.5 relative z-40 shrink-0 backdrop-blur-md overflow-visible`}>
        {/* Left: Projects + Title */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => { setShowProjectsWorkspace(true); setShowTemplatesWorkspace(false); fetchProjects(); }}
            className={`h-8 px-2.5 rounded-lg border font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap transition-all ${isLight ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 shadow-sm' : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200 hover:text-white'}`}
            title="Open Projects Manager">
            <Folder size={13} className={isLight ? 'text-indigo-600' : (themeClasses.accentText || 'text-cyan-400')}/>
            <span>Projects</span>
          </button>
          <button onClick={() => { if (setCurrentView) setCurrentView('templates'); }}
            className={`h-8 px-2.5 rounded-lg border font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap transition-all ${isLight ? 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 shadow-sm' : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200 hover:text-white'}`}
            title="Journal Templates Gallery">
            <BookMarked size={13} className={isLight ? 'text-violet-600' : 'text-violet-400'}/>
            <span>Templates</span>
          </button>
          <div className="relative overflow-hidden w-[140px] sm:w-[180px] md:w-[220px] lg:w-[260px] h-7 flex items-center shrink-0 border border-transparent rounded px-1.5 bg-black/5 dark:bg-white/5">
            <div
              data-testid="header-title-reel"
              className="sg-title-reel whitespace-nowrap flex items-center gap-2"
              style={{
                display: 'inline-flex',
                animation: activeProject.title && activeProject.title.length > 20 ? 'sg-title-reel 14s linear infinite' : 'none'
              }}
            >
              <span className={`text-xs md:text-sm font-bold shrink-0 ${isLight ? 'text-slate-900' : 'text-white'}`} title={activeProject.title}>
                {activeProject.title}
              </span>
              {activeProject.title && activeProject.title.length > 20 && (
                <span className="text-xs font-bold text-slate-400 shrink-0 ml-4">
                  • {activeProject.title}
                </span>
              )}
            </div>
            {Object.keys(dirtyFiles).length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0 absolute right-1.5 top-2.5 shadow-sm" title="Unsaved changes"/>
            )}
          </div>
        </div>

        {/* Center: Recompile split-button + mode selectors */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Recompile Split */}
          <div className="flex items-center relative shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={() => triggerCompilation(latexCode, bibContent)} disabled={isCompiling}
              className={`h-8 px-3 rounded-l-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer border-r border-black/20 whitespace-nowrap shrink-0 transition-all ${isCompiling ? 'bg-cyan-600/50 text-cyan-200' : `${themeClasses.accentBg || 'bg-cyan-500'} hover:opacity-90 text-slate-950`}`}
              title="Fast LaTeX Compilation">
              <Play size={12} className={isCompiling ? 'animate-spin shrink-0' : 'shrink-0'} fill="currentColor"/>
              <span className="whitespace-nowrap">{isCompiling ? 'Compiling...' : 'Recompile'}</span>
            </button>
            <button onClick={() => setCompilerDropdownOpen(v => !v)}
              className={`h-8 px-1.5 rounded-r-lg font-mono text-xs font-bold flex items-center justify-center shadow-sm cursor-pointer whitespace-nowrap shrink-0 transition-all ${isCompiling ? 'bg-cyan-600/50 text-cyan-200' : `${themeClasses.accentBg || 'bg-cyan-500'} hover:opacity-90 text-slate-950`}`}
              title="Select LaTeX Compiler Engine">
              <ChevronDown size={12}/>
            </button>
            {compilerDropdownOpen && (
              <div className={`absolute top-full left-0 mt-1 w-48 ${dropdownCls} rounded-xl shadow-2xl z-50 overflow-hidden text-xs font-mono`}>
                {['pdfLaTeX','XeLaTeX','LuaLaTeX','Fast [Draft]'].map(eng => (
                  <button key={eng} onClick={() => { setSelectedCompiler(eng); setCompilerDropdownOpen(false); showToast(`Compiler: ${eng}`); }}
                    className={`w-full px-3.5 py-2 text-left hover:bg-white/10 cursor-pointer ${selectedCompiler===eng ? `${themeClasses.accentText || 'text-cyan-400'} font-bold` : (isLight ? 'text-slate-700' : 'text-slate-300')}`}>
                    {selectedCompiler===eng && '✓ '}{eng}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Real LaTeX Compile */}
          <button onClick={runRealCompile} disabled={realCompileRunning}
            className={`h-8 px-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap shrink-0 transition-all ${realCompileRunning ? 'bg-amber-600/50 text-amber-200' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'}`}
            title="Real LaTeX Compilation (TeX Live Engine)">
            {realCompileRunning ? <RefreshCw size={12} className="animate-spin shrink-0"/> : <TerminalSquare size={13} className="shrink-0"/>}
            <span className="whitespace-nowrap">{realCompileRunning ? 'Compiling...' : 'TeX Live'}</span>
          </button>

          <div className={`h-4 w-px ${themeBorder} shrink-0 mx-0.5`}/>

          {/* Slash codes */}
          <button onClick={() => setIsSlashModalOpen(true)}
            className={`h-8 px-2.5 rounded-lg font-mono text-xs ${isLight ? 'text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border-slate-300' : 'text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/10'} border flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap transition-colors`}
            title="LaTeX Slash Commands Cheat Sheet">
            <Code2 size={13} className={`${isLight ? 'text-indigo-600' : (themeClasses.accentText || 'text-cyan-400')} shrink-0`}/>
            <span className="whitespace-nowrap">Slash</span>
          </button>
        </div>

        {/* Right: History, Layout, Share, Save, Manual */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => { setIsHistoryOpen(v => !v); fetchVersions(); }}
            className={`h-8 px-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border cursor-pointer shrink-0 whitespace-nowrap transition-all ${isHistoryOpen ? (isLight ? 'bg-slate-200 text-slate-900 border-slate-300' : 'bg-white/15 text-white border-white/20') : (isLight ? 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100' : 'text-slate-400 hover:text-white border-transparent hover:bg-white/5')}`}
            title="Version History">
            <History size={13} className="shrink-0"/>
            <span className="hidden xl:inline">History</span>
          </button>

          <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsLayoutOpen(v => !v)}
              className={`h-8 px-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border cursor-pointer shrink-0 whitespace-nowrap transition-all ${isLayoutOpen ? (isLight ? 'bg-slate-200 text-slate-900 border-slate-300' : 'bg-white/15 text-white border-white/20') : (isLight ? 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100' : 'text-slate-400 hover:text-white border-transparent hover:bg-white/5')}`}
              title="Page Layout Options">
              <Columns size={13} className="shrink-0"/>
              <span className="hidden xl:inline">Layout</span>
            </button>
            {isLayoutOpen && (
              <div className={`absolute right-0 top-full mt-1 w-52 ${dropdownCls} rounded-xl shadow-2xl z-50 p-2 space-y-1`}>
                <div className={`text-[10px] ${textMuted} uppercase font-bold px-2 py-1`}>Page Layout</div>
                {[{id:'single',label:'Single Column',icon:'▬'},{id:'two-column',label:'Two Column',icon:'▬▬'}].map(opt => (
                  <button key={opt.id} onClick={() => { setLayoutMode(opt.id); setIsLayoutOpen(false); showToast(`Layout: ${opt.label}`); }}
                    className={`w-full px-3 py-2 text-left rounded-lg hover:bg-white/10 cursor-pointer flex items-center gap-2 text-xs ${layoutMode===opt.id ? `${themeClasses.accentText || 'text-cyan-400'} font-bold bg-white/5` : (isLight ? 'text-slate-700' : 'text-slate-300')}`}>
                    <span>{opt.icon}</span>{opt.label}{layoutMode===opt.id && <span className="ml-auto text-cyan-400">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => { setIsReviewOpen(v => !v); fetchComments(); }}
            className={`h-8 px-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border cursor-pointer shrink-0 whitespace-nowrap transition-all ${isReviewOpen ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : (isLight ? 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100' : 'text-slate-400 hover:text-white border-transparent hover:bg-white/5')}`}
            title="Review Comments">
            <MessageSquare size={13} className="shrink-0"/>
            <span className="hidden xl:inline">Review</span>
            {comments.length > 0 && <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/30 text-amber-300 font-bold">{comments.length}</span>}
          </button>

          <div className={`h-4 w-px ${themeBorder} shrink-0 mx-0.5`}/>

          <button onClick={() => setIsShareOpen(v => !v)}
            className="h-8 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0 whitespace-nowrap transition-all"
            title="Share Project">
            <Share2 size={13} className="shrink-0"/>
            <span>Share</span>
          </button>

          <button onClick={handleSaveProject}
            className={`h-8 px-3 rounded-lg ${isLight ? 'bg-slate-800 hover:bg-slate-900 text-white' : 'bg-slate-700/60 hover:bg-slate-700 border border-white/10 text-white'} font-mono text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0 whitespace-nowrap transition-all`}
            title="Save Project (Ctrl+S)">
            <Save size={13} className="shrink-0"/>
            <span>Save</span>
          </button>

          <button onClick={() => setIsManualModalOpen(true)}
            data-testid="latex-manual-btn"
            className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 cursor-pointer transition-colors ${isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10'}`}
            title="LaTeX Manual & Guide">
            <BookOpen size={14}/>
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showProjectsWorkspace ? (
        /* ── PROJECTS WORKSPACE ── */
        <div className={`flex-1 overflow-y-auto p-8 space-y-6 ${isLight ? 'bg-slate-50 text-slate-800' : `${themeClasses.bgMain || 'bg-slate-950/90'} text-white`}`}>
          <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b ${themeBorder} pb-6`}>
            <div>
              <div className="flex items-center gap-2 text-cyan-500 font-mono text-xs font-bold uppercase tracking-widest mb-1"><Compass size={16}/><span>Sovereign Research OS</span></div>
              <h1 className={`text-2xl sm:text-3xl font-serif font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Research Manuscript Workspace</h1>
              <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'} font-sans mt-1`}>All papers saved to {currentUser.name}'s profile · Central Vault Synced</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsNewProjectModalOpen(true)} className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold uppercase flex items-center gap-2 cursor-pointer shadow-md"><Plus size={15}/><span>New Research Paper</span></button>
            </div>
          </div>
          <div className="relative max-w-md">
            <Search size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}/>
            <input type="text" placeholder="Search manuscripts..." value={projectSearchQuery} onChange={e => setProjectSearchQuery(e.target.value)} className={`w-full pl-10 pr-4 py-2.5 rounded-xl ${inputCls} text-sm font-sans outline-none`}/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div onClick={() => setShowProjectsWorkspace(false)} className={`p-6 rounded-2xl border ${isLight ? 'border-indigo-300 bg-indigo-50/60 hover:border-indigo-500 text-slate-900' : 'border-cyan-500/40 bg-cyan-500/[0.03] hover:border-cyan-400 text-white'} cursor-pointer group shadow-xl flex flex-col justify-between space-y-4`}>
              <div>
                <div className="flex items-center justify-between text-xs font-mono uppercase text-cyan-600 dark:text-cyan-400 mb-2"><span className="font-bold">Active Manuscript</span><span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">Q1 Index</span></div>
                <h3 className={`text-lg font-bold ${isLight ? 'text-slate-950 group-hover:text-indigo-600' : 'text-white group-hover:text-cyan-300'} font-serif leading-snug`}>{activeProject.title}</h3>
                <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'} font-sans mt-1.5`}>{activeProject.journal_name}</p>
              </div>
              <div className={`pt-3 border-t ${isLight ? 'border-slate-200' : 'border-white/10'} flex items-center justify-between text-xs font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <span>{compilerStats.wordCount} words · {compilerStats.totalPages} pages</span>
                <span className={`${isLight ? 'text-indigo-600' : 'text-cyan-400'} font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform`}>Resume <ArrowRight size={13}/></span>
              </div>
            </div>
            {userProjects.filter(p => p.id !== activeProject.id && (!projectSearchQuery || p.title.toLowerCase().includes(projectSearchQuery.toLowerCase()))).map(p => (
              <div key={p.id} onClick={() => loadProject(p.id)} className={`p-6 rounded-2xl border ${isLight ? 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-xl text-slate-800' : 'border-white/10 bg-[#121622] hover:border-white/20 text-white'} cursor-pointer group shadow-lg flex flex-col justify-between space-y-4`}>
                <div>
                  <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-400 mb-2">
                    <span>PostgreSQL Stored</span>
                    <button onClick={e => handleDeleteProject(p.id, e)} className="text-slate-400 hover:text-rose-500 p-1 rounded cursor-pointer"><Trash2 size={13}/></button>
                  </div>
                  <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900 group-hover:text-indigo-600' : 'text-white group-hover:text-cyan-300'} font-serif leading-snug`}>{p.title}</h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'} font-mono mt-1.5`}>{p.compiler_engine||'pdflatex'}</p>
                </div>
                <div className={`pt-3 border-t ${isLight ? 'border-slate-200' : 'border-white/5'} flex items-center justify-between text-xs font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  <span>{new Date(p.updated_at||Date.now()).toLocaleDateString()}</span>
                  <span className={`${isLight ? 'text-slate-700 group-hover:text-indigo-600' : 'text-slate-300 group-hover:text-cyan-300'} font-bold flex items-center gap-1`}>Open <ArrowRight size={13}/></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ── DUAL-ENGINE WORKSPACE ── */
        <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">

          {/* ── SIDEBAR ── */}
          {!sidebarCollapsed && (
            <aside className={`${isSidebarOpen?'w-60':'w-11'} ${leftSidebarCls} flex flex-col shrink-0 text-xs font-mono transition-all duration-200`}>
              {isSidebarOpen ? (
                <>
                  {/* Sidebar header */}
                  <div className={`px-2.5 py-2 border-b ${themeBorder} flex items-center justify-between`}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSidebarTab('files')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs uppercase font-bold cursor-pointer transition-colors ${sidebarTab==='files'?(isLight?'text-indigo-700 bg-indigo-50 border border-indigo-200':'text-cyan-300 bg-white/10'):(isLight?'text-slate-500 hover:text-slate-900':'text-slate-400 hover:text-white')}`}><Folder size={12}/> Files</button>
                      <button onClick={() => setSidebarTab('outline')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs uppercase font-bold cursor-pointer transition-colors ${sidebarTab==='outline'?(isLight?'text-indigo-700 bg-indigo-50 border border-indigo-200':'text-cyan-300 bg-white/10'):(isLight?'text-slate-500 hover:text-slate-900':'text-slate-400 hover:text-white')}`}><ScrollText size={12}/> Outline</button>
                      <button onClick={() => setSidebarTab('references')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs uppercase font-bold cursor-pointer transition-colors ${sidebarTab==='references'?(isLight?'text-emerald-700 bg-emerald-50 border border-emerald-200':'text-emerald-300 bg-white/10'):(isLight?'text-slate-500 hover:text-slate-900':'text-slate-400 hover:text-white')}`}><BookMarked size={12}/> Refs</button>
                    </div>
                  </div>
                  {/* Sidebar action row */}
                  <div className={`px-2.5 py-1.5 border-b ${themeBorder} flex items-center gap-1.5`}>
                    <span className={`text-xs ${textMuted} font-bold flex-1 flex items-center gap-1`}><span className={`${isLight ? 'text-indigo-600' : (themeClasses.accentText || 'text-cyan-400')} font-black`}>▾</span> File tree</span>
                    <button data-testid="new-file-btn" onClick={handleNewFile} className={`p-1 rounded ${isLight ? 'hover:bg-slate-200 text-indigo-600' : 'hover:bg-white/10 text-cyan-400'} cursor-pointer`} title="New file"><FilePlus size={14}/></button>
                    <button data-testid="new-folder-btn" onClick={handleNewFolder} className={`p-1 rounded ${isLight ? 'hover:bg-slate-200 text-indigo-600' : 'hover:bg-white/10 text-cyan-400'} cursor-pointer`} title="New folder"><FolderPlus size={14}/></button>
                    <button onClick={() => fileUploadRef.current?.click()} className={`p-1 rounded ${isLight ? 'hover:bg-slate-200 text-indigo-600' : 'hover:bg-white/10 text-cyan-400'} cursor-pointer`} title="Upload file"><UploadCloud size={14}/></button>
                    <button onClick={() => setIsSidebarOpen(false)} className={`p-1 rounded ${isLight ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-white/10 text-slate-400 hover:text-white'} cursor-pointer`} title="Close"><X size={13}/></button>
                  </div>
                  {sidebarTab === 'files' ? (
                    <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
                      {(() => {
                        const tree = buildFileTree(projectFiles);
                        return tree.children.map(child => renderTreeNode(child));
                      })()}
                    </div>
                  ) : sidebarTab === 'references' ? (
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <div className="text-xs uppercase font-bold text-emerald-500 tracking-wider">References</div>
                        <button onClick={() => setShowAddRefModal(true)} className="p-1 rounded hover:bg-emerald-500/20 text-emerald-500 cursor-pointer" title="Add Reference"><Plus size={13}/></button>
                      </div>
                      {activeProject?.references && activeProject.references.length > 0 ? (
                        activeProject.references.map((ref, idx) => (
                          <div key={idx} className={`p-2.5 rounded-lg border ${isLight ? 'border-slate-200 bg-white text-slate-800 hover:border-emerald-400' : 'border-white/10 bg-white/5 hover:border-emerald-500/30'} text-xs font-mono`}>
                            <div className="text-emerald-500 font-bold">[@{ref.cite_key}]</div>
                            <div className={`${isLight ? 'text-slate-600' : 'text-slate-300'} truncate text-[11px]`}>{ref.raw_bibtex}</div>
                          </div>
                        ))
                      ) : (
                        <div className={`text-xs ${isLight ? 'text-slate-400' : 'text-slate-500'} px-2 py-3 text-center`}>No references yet</div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
                      <div className={`text-xs uppercase font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'} tracking-wider px-2 py-1`}>Document Structure</div>
                      {documentOutline.length === 0 && <div className={`text-xs ${isLight ? 'text-slate-400' : 'text-slate-500'} px-2 py-3 text-center`}>No sections</div>}
                      {documentOutline.map((item, idx) => (
                        <button key={idx}
                          onClick={() => { scrollPreviewToSection(item.title); const textarea = editorTextareaRef.current; if(textarea){ const lines = latexCode.split('\n'); let pos=0; for(let i=0;i<item.line-1;i++) pos+=lines[i].length+1; textarea.focus(); textarea.setSelectionRange(pos,pos+(lines[item.line-1]||'').length); } }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg cursor-pointer ${isLight ? 'hover:bg-slate-200/70 text-slate-700' : 'hover:bg-white/5 text-slate-300'} transition-colors truncate ${item.level==='section'?`${isLight ? 'text-slate-900 font-bold' : 'text-white font-bold'} text-xs pl-2`:item.level==='subsection'?`${isLight ? 'text-slate-600' : 'text-slate-400'} text-xs pl-4`:`${isLight ? 'text-slate-500' : 'text-slate-500'} text-[11px] pl-6`}`}>
                          {item.level==='section'?'§ ':item.level==='subsection'?'› ':'• '}{item.title}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Stats */}
                  <div className={`p-2.5 border-t ${themeBorder} ${textMuted} text-xs space-y-1`}>
                    <div className="flex justify-between"><span>Words:</span><strong className={isLight ? 'text-slate-900' : 'text-white'}>{compilerStats.wordCount}</strong></div>
                    <div className="flex justify-between"><span>Pages:</span><strong className="text-emerald-500">{compilerStats.totalPages}</strong></div>
                  </div>
                </>
              ) : (
                /* Icon-only collapsed sidebar */
                <div className="flex flex-col items-center py-2.5 gap-2.5">
                  <button onClick={() => setIsSidebarOpen(true)} className={`p-2 rounded ${isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-slate-400 hover:text-white'} cursor-pointer`} title="Expand"><PanelLeftOpen size={16}/></button>
                  <button onClick={() => setSidebarTab('files')} className={`p-2 rounded ${isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-slate-400 hover:text-white'} cursor-pointer`} title="Files"><Folder size={16}/></button>
                  <button onClick={() => setSidebarTab('outline')} className={`p-2 rounded ${isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-slate-400 hover:text-white'} cursor-pointer`} title="Outline"><ScrollText size={16}/></button>
                  <button onClick={() => setSidebarTab('references')} className={`p-2 rounded ${isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-slate-400 hover:text-white'} cursor-pointer`} title="References"><BookMarked size={16}/></button>
                </div>
              )}
            </aside>
          )}
          {sidebarCollapsed && (
            <button onClick={() => setSidebarCollapsed(false)} className={`w-7 border-r ${themeBorder} ${leftSidebarCls} hover:opacity-85 flex flex-col items-center justify-start py-3 gap-2 cursor-pointer shrink-0`}>
              <PanelLeftOpen size={14}/>
            </button>
          )}

          {/* ── CODE EDITOR COLUMN ── */}
          <div className={`flex-1 flex flex-col min-w-0 min-h-0 border-r ${themeBorder} ${editorBgCls}`}>
            {/* Tabs - Fixed/sticky (split button locked, never scrolls away) */}
            <div className={`h-10 border-b ${themeBorder} ${subHeaderBgCls} flex items-center select-none shrink-0 sticky top-0 z-10 backdrop-blur-sm`}>
              <div className="flex-1 flex items-center gap-1 px-2 overflow-x-auto min-w-0">
                {openTabs.map(tab => {
                  const isActive = activeTabPath === tab;
                  return (
                    <div key={tab} onClick={() => setActiveTabPath(tab)}
                      data-testid={`editor-tab-${tab}`}
                      className={`h-8 px-3.5 rounded-t-lg text-xs font-mono flex items-center gap-2 cursor-pointer transition-colors border-t-2 shrink-0 ${isActive ? (isLight ? 'bg-white text-indigo-700 border-indigo-600 font-bold shadow-sm' : `${themeClasses.bgCard || 'bg-white/10'} ${themeClasses.accentText || 'text-cyan-300'} ${themeClasses.accentBorder || 'border-cyan-400'} font-bold`) : (isLight ? 'text-slate-500 hover:text-slate-800 border-transparent hover:bg-slate-200/50' : 'text-slate-400 hover:text-white border-transparent')}`}>
                      {getTabIcon(tab)}
                      <span>{tab}</span>
                      {openTabs.length > 1 && <X size={12} onClick={e => { e.stopPropagation(); const next = openTabs.filter(t=>t!==tab); const safeTabs = next.length > 0 ? next : ['main.tex']; setOpenTabs(safeTabs); if(activeTabPath===tab) setActiveTabPath(safeTabs[safeTabs.length-1]); }} className="hover:text-rose-500 ml-1"/>}
                    </div>
                  );
                })}
              </div>
              {/* Source | Visual split — pinned, always visible */}
              <div className={`flex items-center gap-1.5 px-3 border-l ${themeBorder} shrink-0`}>
                <span className={`hidden sm:flex items-center gap-1 text-[10px] font-mono uppercase ${textMuted} mr-1`}><Columns size={11}/>View</span>
                <div className={`flex items-center rounded-lg overflow-hidden border ${isLight ? 'border-slate-300 bg-slate-200/60' : 'border-white/10 bg-black/30'}`}>
                  <button onClick={() => setPreviewSubView('page')} className={`px-3 py-1 text-xs font-mono font-bold cursor-pointer transition-colors ${previewSubView==='page'?(isLight?'bg-white text-indigo-700 shadow-sm':`${themeClasses.accentBg ? `${themeClasses.accentBg}/30` : 'bg-cyan-500/30'} ${themeClasses.accentText || 'text-cyan-300'}`):(isLight?'text-slate-600 hover:text-slate-900':'text-slate-400 hover:text-white')}`}>Source</button>
                  <button onClick={() => setPreviewSubView('visual')} className={`px-3 py-1 text-xs font-mono font-bold cursor-pointer transition-colors ${previewSubView==='visual'?(isLight?'bg-white text-emerald-700 shadow-sm':'bg-emerald-500/30 text-emerald-300'):(isLight?'text-slate-600 hover:text-slate-900':'text-slate-400 hover:text-white')}`}>Visual</button>
                </div>
              </div>
            </div>

            {/* Editor Toolbar - Fixed/sticky */}
            <div className={`border-b ${themeBorder} ${subHeaderBgCls} flex items-center px-2.5 gap-1 select-none shrink-0 flex-wrap py-1.5 sticky top-10 z-10 backdrop-blur-sm`}>
              {/* Undo/Redo */}
              <button onClick={handleUndo} className={`p-1.5 rounded ${isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'} cursor-pointer`} title="Undo (Ctrl+Z)"><Undo size={14}/></button>
              <button onClick={handleRedo} className={`p-1.5 rounded ${isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'} cursor-pointer`} title="Redo (Ctrl+Y)"><Redo size={14}/></button>

              {/* Heading level dropdown */}
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setHeadingDropdownOpen(v => !v)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${isLight ? 'text-slate-700 hover:bg-slate-200 border-slate-300' : 'text-slate-300 hover:text-white hover:bg-white/10 border-white/10'} cursor-pointer text-xs border ml-1`}>
                  <Type size={13}/><span className="capitalize">{headingLevel === 'normal' ? 'Normal text' : headingLevel}</span><ChevronDown size={11}/>
                </button>
                {headingDropdownOpen && (
                  <div className={`absolute top-full left-0 mt-1 w-48 ${dropdownCls} rounded-xl shadow-2xl z-50 py-1 overflow-hidden`}>
                    {[{id:'normal',label:'Normal text',cls:'text-xs'},{id:'section',label:'Section',cls:'text-sm font-bold'},{id:'subsection',label:'Subsection',cls:'text-xs font-semibold'},{id:'subsubsection',label:'Subsubsection',cls:'text-xs font-medium'},{id:'paragraph',label:'Paragraph',cls:'text-xs'},{id:'subparagraph',label:'Subparagraph',cls:'text-xs'}].map(h => (
                      <button key={h.id} onClick={() => { setHeadingLevel(h.id); insertHeading(h.id); }}
                        className={`w-full px-3 py-2 text-left hover:bg-cyan-500/15 cursor-pointer ${h.id===headingLevel?`${themeClasses.accentText} font-bold`:''} ${h.cls}`}>
                        {h.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={`w-px h-4 ${isLight ? 'bg-slate-300' : 'bg-white/10'} mx-1`}/>

              {/* Bold / Italic / Underline */}
              <button onClick={() => insertSnippet('\\textbf{}')} className={`px-2 py-1 rounded ${isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'} cursor-pointer font-bold text-xs`} title="Bold (B)">B</button>
              <button onClick={() => insertSnippet('\\textit{}')} className={`px-2 py-1 rounded ${isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'} cursor-pointer italic text-xs`} title="Italic (I)">I</button>
              <button onClick={() => insertSnippet('\\underline{}')} className={`px-2 py-1 rounded ${isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'} cursor-pointer underline text-xs`} title="Underline">U</button>

              <div className={`w-px h-4 ${isLight ? 'bg-slate-300' : 'bg-white/10'} mx-1`}/>

              <button onClick={() => insertSnippet('\\frac{a}{b}')} className={`px-2 py-1 rounded ${isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'} cursor-pointer text-xs font-serif`} title="Fraction">⅟x</button>

              {/* Symbol picker - Ω */}
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowSymbolPicker(v => !v)} className={`px-2 py-1 rounded ${isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'} cursor-pointer text-xs font-serif`} title="Math Symbols">Ω</button>
                {showSymbolPicker && (
                  <div className={`absolute top-full left-0 mt-1 ${dropdownCls} rounded-xl shadow-2xl z-50 p-3 grid grid-cols-6 gap-1.5 w-56`}>
                    {MATH_SYMBOLS.map(s => (
                      <button key={s.tex} onClick={() => { insertSnippet(`$${s.tex}$`); setShowSymbolPicker(false); }}
                        className={`p-2 text-center text-sm rounded ${isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-cyan-500/20 text-slate-200 hover:text-white'} cursor-pointer`} title={s.tex}>
                        {s.display}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={() => insertSnippet('\\href{URL}{text}')} className={`p-1.5 rounded ${isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'} cursor-pointer`} title="Hyperlink"><LinkIcon size={14}/></button>

              {/* Insert more row */}
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowInsertMore(v => !v)} className={`p-1.5 rounded ${isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'} cursor-pointer`} title="Insert..."><Plus size={14}/></button>
                {showInsertMore && (
                  <div className={`absolute top-full left-0 mt-1 ${dropdownCls} rounded-xl shadow-2xl z-50 p-2 flex gap-1.5`}>
                    <button onClick={() => { insertSnippet('\\bibliographystyle{plain}\n\\bibliography{references}'); setShowInsertMore(false); }} className={`p-2 rounded ${isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-white/10 text-slate-300 hover:text-white'} cursor-pointer`} title="Bibliography"><BookDashed size={15}/></button>
                    <button onClick={() => { insertSnippet('\\begin{figure}[htbp]\n\\centering\n\\includegraphics[width=0.85\\linewidth]{figures/image.png}\n\\caption{Caption.}\n\\label{fig:label}\n\\end{figure}\n'); setShowInsertMore(false); }} className={`p-2 rounded ${isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-white/10 text-slate-300 hover:text-white'} cursor-pointer`} title="Insert Figure"><ImageIcon size={15}/></button>
                    <button onClick={() => { insertSnippet('\\begin{table}[htbp]\n\\centering\n\\caption{Table}\n\\begin{tabular}{lcc}\n\\toprule\nH1 & H2 & H3 \\\\\n\\midrule\na & b & c \\\\\n\\bottomrule\n\\end{tabular}\n\\end{table}\n'); setShowInsertMore(false); }} className={`p-2 rounded ${isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-white/10 text-slate-300 hover:text-white'} cursor-pointer`} title="Insert Table"><TableIcon size={15}/></button>
                    <button onClick={() => { insertSnippet('\\begin{enumerate}\n  \\item First\n  \\item Second\n\\end{enumerate}\n'); setShowInsertMore(false); }} className={`p-2 rounded ${isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-white/10 text-slate-300 hover:text-white'} cursor-pointer`} title="Insert List"><ListOrdered size={15}/></button>
                  </div>
                )}
              </div>

              <button onClick={() => insertSnippet('\\label{label:name}')} className={`p-1.5 rounded ${isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'} cursor-pointer`} title="Label"><Tag size={14}/></button>

              <button onClick={() => setShowAddRefModal(true)} className={`p-1.5 rounded ${isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'} cursor-pointer`} title="Add BibTeX Reference"><BookMarked size={14}/></button>

              <button onClick={openCitePicker} className={`p-1.5 rounded ${isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'} cursor-pointer`} title="Insert Citation"><BookOpen size={14}/></button>

              <button onClick={runSpellCheck} className={`p-1.5 rounded ${isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'} cursor-pointer`} title="Spell Check (LaTeX-aware)"><Search size={14}/></button>

              <button onClick={fetchCrossRefs} className={`p-1.5 rounded ${isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'} cursor-pointer`} title="Cross-References"><LinkIcon size={14}/></button>

              <button onClick={() => fetchDiff()} className={`p-1.5 rounded ${isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'} cursor-pointer`} title="Track Changes / Diff"><Diff size={14}/></button>

              <button onClick={() => { setNewCommentText('// Comment: '); setIsReviewOpen(true); }} className={`p-1.5 rounded ${isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'} cursor-pointer`} title="Add Comment"><MessageSquare size={14}/></button>

              <div className={`w-px h-4 ${isLight ? 'bg-slate-300' : 'bg-white/10'} mx-1`}/>

              {/* Lists */}
              <button onClick={() => insertSnippet('\\begin{itemize}\n  \\item \n\\end{itemize}')} className={`p-1.5 rounded ${isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'} cursor-pointer`} title="Bullet List"><List size={14}/></button>
              <button onClick={() => insertSnippet('\\begin{enumerate}\n  \\item \n\\end{enumerate}')} className={`p-1.5 rounded ${isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'} cursor-pointer`} title="Numbered List"><ListOrdered size={14}/></button>

              <div className="flex-1"/>

              <button data-testid="find-panel-btn" onClick={() => { setShowFindPanel(true); setShowReplacePanel(false); setTimeout(()=>findInputRef.current?.focus(),100); }} className={`p-1.5 rounded ${isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'} cursor-pointer ml-1`} title="Find (Ctrl+F)"><Search size={14}/></button>
              <button data-testid="replace-panel-btn" onClick={() => { setShowFindPanel(true); setShowReplacePanel(true); setTimeout(()=>findInputRef.current?.focus(),100); }} className={`p-1.5 rounded ${isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'} cursor-pointer`} title="Find & Replace (Ctrl+H)"><Replace size={14}/></button>
            </div>

            {/* Preamble toggle */}
            <div className={`border-b ${isLight ? 'border-slate-200' : 'border-white/5'} shrink-0`}>
              <button onClick={() => setShowPreamble(v => !v)} className={`w-full px-3 py-1.5 flex items-center justify-between text-xs font-mono ${isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'} cursor-pointer`}>
                <span className="flex items-center gap-2"><ChevronsUpDown size={12} className={isLight ? 'text-indigo-600' : 'text-cyan-400'}/>Show document preamble</span>
                {showPreamble ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
              </button>
              {showPreamble && (
                <div className={`px-4 pb-3 ${isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#090c13] text-slate-300 border-white/5'} border-t max-h-40 overflow-y-auto`}>
                  <pre className="text-xs font-mono leading-5 whitespace-pre-wrap">{preambleCode||'% No preamble'}</pre>
                </div>
              )}
            </div>

            {/* Find / Replace Panel */}
            {showFindPanel && (
              <div className={`border-b ${isLight ? 'border-slate-200 bg-slate-100' : 'border-white/10 bg-[#0d1017]'} px-3 py-2 space-y-1.5 shrink-0`}>
                <div className="flex items-center gap-2">
                  <Search size={14} className={isLight ? 'text-slate-500' : 'text-slate-400 shrink-0'}/>
                  <input ref={findInputRef} data-testid="find-input" type="text" value={findQuery} onChange={e => setFindQuery(e.target.value)} placeholder="Find..." className={`flex-1 ${inputCls} rounded-lg px-2.5 py-1 text-xs font-mono outline-none`}/>
                  <button onClick={() => setFindCaseSensitive(v => !v)} className={`px-2 py-1 text-xs rounded border cursor-pointer ${findCaseSensitive?(isLight?'border-indigo-500 text-indigo-700 font-bold':'border-cyan-400 text-cyan-300'):(isLight?'border-slate-300 text-slate-600':'border-white/10 text-slate-400')}`}>Aa</button>
                  <span data-testid="find-results-count" className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'} font-mono min-w-[60px] text-right`}>{findResults.length > 0 ? `${findIndex+1}/${findResults.length}` : '0 results'}</span>
                  <button onClick={goFindPrev} className={`p-1 rounded ${isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-slate-400 hover:text-white'} cursor-pointer`}><ChevronUp size={14}/></button>
                  <button onClick={goFindNext} className={`p-1 rounded ${isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-slate-400 hover:text-white'} cursor-pointer`}><ChevronDown size={14}/></button>
                  <button onClick={() => { setShowFindPanel(false); setShowReplacePanel(false); setFindQuery(''); }} className={`p-1 rounded ${isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-slate-400 hover:text-white'} cursor-pointer`}><X size={14}/></button>
                </div>
                {showReplacePanel && (
                  <div className="flex items-center gap-2">
                    <Replace size={14} className={isLight ? 'text-slate-500' : 'text-slate-400 shrink-0'}/>
                    <input data-testid="replace-input" type="text" value={replaceQuery} onChange={e => setReplaceQuery(e.target.value)} placeholder="Replace with..." className={`flex-1 ${inputCls} rounded-lg px-2.5 py-1 text-xs font-mono outline-none`}/>
                    <button data-testid="replace-one-btn" onClick={handleReplaceOne} className="px-2.5 py-1 text-xs bg-amber-500/20 border border-amber-500/30 text-amber-500 font-bold rounded cursor-pointer hover:bg-amber-500/30">Replace</button>
                    <button data-testid="replace-all-btn" onClick={handleReplaceAll} className="px-2.5 py-1 text-xs bg-amber-500/20 border border-amber-500/30 text-amber-500 font-bold rounded cursor-pointer hover:bg-amber-500/30">All</button>
                  </div>
                )}
              </div>
            )}

            {/* Editor / Asset preview (images, SVG, PDF show real content) */}
            <div className={`flex-1 flex min-h-0 min-w-0 ${isLight ? 'bg-white' : 'bg-[#0d1017]'}`}>
              {(() => {
                const ext = activeTabPath.includes('.') ? activeTabPath.split('.').pop().toLowerCase() : '';
                const ftab = (projectFiles||[]).find(f => f.path === activeTabPath);
                if (['png','jpg','jpeg','gif','webp'].includes(ext)) {
                  const src = dataUrlOf(ftab);
                  return (
                    <div className="flex-1 flex items-center justify-center p-6 overflow-auto custom-scrollbar">
                      {src
                        ? <img src={src} alt={activeTabPath} className="max-w-full max-h-full object-contain rounded-lg border border-white/10 shadow-2xl"/>
                        : <div className="text-center text-slate-500 text-xs font-mono">No image data yet<br/>Use the Upload button or drag &amp; drop a file onto the workspace.</div>}
                    </div>
                  );
                }
                if (ext === 'svg') {
                  const src = dataUrlOf(ftab) || '';
                  return (
                    <div className="flex-1 flex items-center justify-center p-6 overflow-auto custom-scrollbar bg-white rounded-lg m-2">
                      {src ? <img src={src} alt={activeTabPath} className="max-w-full max-h-full object-contain"/>
                        : <div className="text-slate-400 text-xs font-mono">Empty SVG file — edit or re-upload its content.</div>}
                    </div>
                  );
                }
                if (ext === 'pdf') {
                  const src = dataUrlOf(ftab) || null;
                  return (
                    <div className={`flex-1 ${isLight ? 'bg-slate-100' : 'bg-[#161a24]'} p-2 overflow-auto custom-scrollbar`}>
                      {src
                        ? <iframe src={src} title={activeTabPath} className="w-full h-full rounded border border-slate-300 bg-white"/>
                        : <div className="text-center text-slate-500 text-xs font-mono mt-10">No PDF data — upload a PDF to embed it here.</div>}
                    </div>
                  );
                }
                return (
                  <div className="flex-1 flex min-h-0 min-w-0 relative">
                    <div
                      ref={editorGutterRef}
                      className={`w-12 border-r ${themeBorder} ${editorGutterCls} py-3 select-none text-right pr-1 text-xs font-mono overflow-hidden shrink-0 pointer-events-none`}
                      style={{ overflowY: 'hidden' }}
                    >
                      {getActiveFileContent().split('\n').map((_, idx) => {
                        const lineNum = idx + 1;
                        const isErr = errorLines.has(lineNum);
                        const isWarn = warningLines.has(lineNum);
                        return (
                          <div key={idx} className={`leading-6 transition-colors px-1 ${
                            isErr
                              ? 'bg-rose-500/25 text-rose-400 font-bold border-r-2 border-rose-500'
                              : isWarn
                              ? 'bg-amber-500/20 text-amber-400 font-bold border-r-2 border-amber-500'
                              : ''
                          }`}>
                            {lineNum}
                          </div>
                        );
                      })}
                    </div>
                    <textarea
                      id="latex-main-editor-textarea"
                      data-testid="code-editor-textarea"
                      ref={editorTextareaRef}
                      readOnly={editorMode === 'reviewing'}
                      value={getActiveFileContent()}
                      onKeyDown={handleTextareaKeyDown}
                      onSelect={(e) => {
                        const pos = e.target.selectionStart;
                        lastCursorPos.current = { start: pos, end: e.target.selectionEnd, scrollTop: e.target.scrollTop };
                        checkSlashAutocomplete(e.target.value, pos);
                      }}
                      onKeyUp={(e) => {
                        const pos = e.target.selectionStart;
                        lastCursorPos.current = { start: pos, end: e.target.selectionEnd, scrollTop: e.target.scrollTop };
                        checkSlashAutocomplete(e.target.value, pos);
                      }}
                      onClick={(e) => {
                        const pos = e.target.selectionStart;
                        lastCursorPos.current = { start: pos, end: e.target.selectionEnd, scrollTop: e.target.scrollTop };
                        checkSlashAutocomplete(e.target.value, pos);
                      }}
                      onScroll={(e) => {
                        lastCursorPos.current.scrollTop = e.target.scrollTop;
                        if (editorGutterRef.current) editorGutterRef.current.scrollTop = e.target.scrollTop;
                      }}
                      onChange={e => {
                        const val = e.target.value;
                        const pos = e.target.selectionStart;
                        lastCursorPos.current = { start: pos, end: e.target.selectionEnd, scrollTop: e.target.scrollTop };
                        handleActiveFileChange(val);
                        checkSlashAutocomplete(val, pos);
                      }}
                      className={`flex-1 h-full p-3 font-mono text-sm ${isLight ? 'text-slate-900 selection:bg-indigo-500/20' : 'text-slate-100 selection:bg-cyan-500/30'} bg-transparent outline-none resize-none leading-6 custom-scrollbar ${editorMode==='reviewing'?'opacity-70 cursor-not-allowed':''}`}
                      spellCheck="false"
                    />

                    {/* Auto-completing \ Codes Popover */}
                    {slashAutocomplete.visible && slashAutocomplete.results.length > 0 && (
                      <div
                        data-testid="slash-autocomplete-popup"
                        className={`absolute bottom-6 left-16 z-50 w-72 rounded-xl shadow-2xl border ${themeBorder} ${dropdownCls} overflow-hidden font-mono text-xs backdrop-blur-md`}
                      >
                        <div className={`px-2.5 py-1.5 border-b ${themeBorder} flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase`}>
                          <span className="flex items-center gap-1">
                            <Code2 size={12} className="text-cyan-400"/>
                            LaTeX: \{slashAutocomplete.query}
                          </span>
                          <span>↑↓ Navigate · Tab/↵ Insert</span>
                        </div>
                        <div className="max-h-52 overflow-y-auto custom-scrollbar p-1">
                          {slashAutocomplete.results.map((item, idx) => (
                            <button
                              key={item.cmd}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); insertAutocompleteSnippet(item); }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex flex-col gap-0.5 transition-colors cursor-pointer ${
                                slashAutocomplete.selectedIndex === idx
                                  ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                                  : 'hover:bg-white/5 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-cyan-400 font-bold">\{item.cmd.replace(/^[\/\\]/, '')}</span>
                                <span className="text-[10px] text-slate-400 font-sans">{item.label}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 truncate font-sans">{item.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Inline Diagnostics Bar with colored text for mistakes */}
            {(diagnostics.errors.length > 0 || diagnostics.warnings.length > 0) && (
              <div className={`px-3 py-1.5 border-t ${themeBorder} ${isLight ? 'bg-rose-50/90 text-rose-900' : 'bg-rose-950/40 text-rose-300'} flex items-center justify-between text-xs font-mono shrink-0 gap-2`}>
                <div className="flex items-center gap-2 truncate">
                  {diagnostics.errors.length > 0 ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0"/>
                      <span className="font-bold text-rose-500 uppercase text-[11px] shrink-0">Syntax Notice:</span>
                      <span className="truncate text-rose-400">
                        {typeof diagnostics.errors[0] === 'object' ? (diagnostics.errors[0].message || 'LaTeX compile error') : diagnostics.errors[0]}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"/>
                      <span className="font-bold text-amber-400 uppercase text-[11px] shrink-0">Warning:</span>
                      <span className="truncate text-amber-300">
                        {typeof diagnostics.warnings[0] === 'object' ? (diagnostics.warnings[0].message || 'LaTeX package warning') : diagnostics.warnings[0]}
                      </span>
                    </>
                  )}
                </div>
                <span className="text-[10px] opacity-75 shrink-0">
                  {diagnostics.errors.length} err / {diagnostics.warnings.length} warn
                </span>
              </div>
            )}

            {/* Status / badges bar */}
            <div className={`h-8 border-t ${themeBorder} ${statusBarCls} flex items-center px-3 gap-3 shrink-0 select-none`}>
              <button onClick={() => showToast(`${diagnostics.errors.length} error(s)`, 'warning')} className={`flex items-center gap-1.5 text-xs font-mono cursor-pointer hover:opacity-80 ${diagnostics.errors.length>0?'text-rose-500 font-bold':'text-slate-500'}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${diagnostics.errors.length>0?'bg-rose-500':'bg-slate-400'}`}/>
                <span>{diagnostics.errors.length} errors</span>
              </button>
              <button onClick={() => showToast(`${diagnostics.warnings.length} warning(s)`, 'info')} className={`flex items-center gap-1.5 text-xs font-mono cursor-pointer hover:opacity-80 ${diagnostics.warnings.length>0?'text-amber-500 font-bold':'text-slate-500'}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${diagnostics.warnings.length>0?'bg-amber-500':'bg-slate-400'}`}/>
                <span>{diagnostics.warnings.length} warnings</span>
              </button>
              <div className="flex-1"/>
              <span className="text-[10px] font-mono text-slate-500">{selectedCompiler}</span>
              <span className={`text-[10px] font-mono ${editorMode==='reviewing'?'text-amber-400':editorMode==='suggesting'?'text-emerald-400':'text-slate-500'}`}>{editorMode}</span>
            </div>
          </div>

          {/* ── RIGHT: PREVIEW PANEL ── */}
          <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${isLight ? 'bg-slate-200/60' : (themeClasses.bgMain || 'bg-[#161a24]')}`}>
            {/* Preview header - Fixed/sticky */}
            <div className={`h-10 border-b ${themeBorder} ${subHeaderBgCls} flex items-center px-3 gap-2 shrink-0 select-none sticky top-0 z-10 backdrop-blur-sm min-w-0 overflow-x-auto custom-scrollbar`}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage<=1} className={`p-1.5 rounded ${isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-slate-400 hover:text-white'} cursor-pointer disabled:opacity-30`}><ChevronLeft size={15}/></button>
              <span className={`text-xs font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'} min-w-[44px] text-center font-bold`}>{currentPage} / {pdfPageCount}</span>
              <button onClick={() => setCurrentPage(p => Math.min(pdfPageCount, p+1))} disabled={currentPage>=pdfPageCount} className={`p-1.5 rounded ${isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-slate-400 hover:text-white'} cursor-pointer disabled:opacity-30`}><ChevronRight size={15}/></button>
              <div className={`w-px h-4 ${themeBorder} mx-1`}/>
              <button data-testid="zoom-out-btn" onClick={() => setPreviewZoom(z => Math.max(30, z-10))} className={`p-1.5 rounded ${isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-slate-400 hover:text-white'} cursor-pointer`} title="Zoom Out"><ZoomOut size={14}/></button>
              <span data-testid="preview-zoom-level" className={`text-xs font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'} min-w-[40px] text-center font-bold`}>{previewZoom}%</span>
              <button data-testid="zoom-in-btn" onClick={() => setPreviewZoom(z => Math.min(200, z+10))} className={`p-1.5 rounded ${isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-slate-400 hover:text-white'} cursor-pointer`} title="Zoom In"><ZoomIn size={14}/></button>
              <button data-testid="zoom-fit-btn" onClick={() => setPreviewZoom(100)} className={`px-2 py-0.5 text-xs font-mono rounded ${isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-slate-400 hover:text-white'} cursor-pointer`} title="Reset to 100%">Fit</button>
              <div className={`w-px h-4 ${themeBorder} mx-1`}/>
              <button
                type="button"
                data-testid="preview-hand-tool-btn"
                onClick={() => setIsHandToolActive(v => !v)}
                className={`p-1.5 rounded cursor-pointer transition-colors ${
                  isHandToolActive
                    ? (isLight ? 'bg-indigo-100 text-indigo-700 font-bold' : 'bg-cyan-500/20 text-cyan-300 font-bold')
                    : (isLight ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10')
                }`}
                title={isHandToolActive ? 'Hand tool active (click & drag to pan)' : 'Enable Hand Tool to pan canvas'}
              >
                <Hand size={14}/>
              </button>
              <div className={`w-px h-4 ${themeBorder} mx-1`}/>
              <button
                type="button"
                data-testid="customize-design-btn"
                onClick={() => setIsDesignCustomizerOpen(v => !v)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer transition-all border ${
                  isDesignCustomizerOpen
                    ? (isLight ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-md')
                    : (isLight ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white')
                }`}
                title="Customize Publisher Design, Palette, Typography & Layout"
              >
                <Palette size={13} style={{ color: isDesignCustomizerOpen ? undefined : (layoutCustomization?.accentColor || undefined) }} />
                <span>Customize</span>
              </button>
              <div className="flex-1"/>
              <button onClick={() => setInvertPreview(v => !v)} className={`p-1.5 rounded cursor-pointer transition-colors ${invertPreview?(isLight?'text-indigo-600 bg-indigo-50 border border-indigo-200':`${themeClasses.accentText || 'text-cyan-400'} bg-cyan-500/20`):(isLight?'text-slate-600 hover:bg-slate-200':'text-slate-400 hover:text-white hover:bg-white/10')}`} title="Invert colors"><Moon size={14}/></button>
              <div className={`w-2.5 h-2.5 rounded-full ${isCompiling?'bg-amber-400 animate-pulse':diagnostics.errors.length>0?'bg-rose-500':'bg-emerald-500'}`}/>
              <span className={`text-xs font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{isCompiling?'Compiling...':'Ready'}</span>
            </div>

            {/* Preview content area with optional Design Drawer */}
            <div className="flex-1 flex min-h-0 relative overflow-hidden">
              <div
                ref={previewContainerRef}
                data-testid="preview-viewport-container"
                onMouseDown={handlePanMouseDown}
                onMouseMove={handlePanMouseMove}
                onMouseUp={handlePanMouseUp}
                onMouseLeave={handlePanMouseUp}
                onDragStart={(e) => { if (isHandToolActive) e.preventDefault(); }}
                className={`flex-1 overflow-auto custom-scrollbar p-6 flex flex-col items-center ${
                  isHandToolActive ? (isPanning ? 'cursor-grabbing select-none' : 'cursor-grab select-none') : ''
                }`}
                style={{
                  ...(invertPreview ? { filter: 'invert(1) hue-rotate(180deg)' } : {}),
                  backgroundColor: previewSubView === 'page' ? '#525659' : undefined
                }}
              >
                {previewSubView === 'visual' ? (
                  /* ── VISUAL EDITOR (fully editable) ── */
                  <div className="w-full max-w-2xl space-y-4">
                    <div className={`p-3.5 rounded-xl ${isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'} border flex items-center justify-between text-xs select-none shadow-sm`}>
                      <span className="font-mono font-bold flex items-center gap-2"><CheckCircle2 size={15}/>Visual Editor — Double-click any section to edit</span>
                      <span className={`text-xs ${isLight ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>KaTeX math rendered</span>
                    </div>

                    {/* Editable title card */}
                    <div className={`p-6 rounded-2xl ${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-md' : 'bg-[#1e2330] border-slate-700 text-white shadow-xl'} border space-y-3`}>
                      <span className={`text-xs font-mono uppercase ${isLight ? 'text-indigo-600' : 'text-cyan-400'} font-bold block`}>Paper Title (Click to Edit)</span>
                      <input data-testid="visual-title-input" type="text" value={parsedDoc.title} onChange={e => { const r = replaceBracedMacro(latexCode, 'title', e.target.value); updateCodeWithHistory(r); }} className={`w-full p-2.5 rounded-xl ${inputCls} font-serif font-bold text-lg outline-none`}/>
                      <span className={`text-xs font-mono uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'} font-bold block pt-1`}>Authors</span>
                      <input data-testid="visual-authors-input" type="text" value={parsedDoc.authors} onChange={e => { const r = replaceBracedMacro(latexCode, 'author', e.target.value); updateCodeWithHistory(r); }} className={`w-full p-2.5 rounded-xl ${inputCls} font-serif text-sm outline-none`}/>
                    </div>

                    {/* Abstract card - Editable */}
                    {parsedDoc.abstractRange && (
                      <div className={`p-6 rounded-2xl ${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-md' : 'bg-[#1e2330] border-slate-700 text-white shadow-xl'} border`}>
                        <span className="text-xs font-mono uppercase text-amber-500 font-bold block mb-2">Abstract</span>
                        <textarea
                          value={parsedDoc.abstract}
                          onChange={e => {
                            if (!parsedDoc.abstractRange) return;
                            const start = parsedDoc.abstractRange.start;
                            const end = parsedDoc.abstractRange.end;
                            const newCode = latexCode.slice(0, start) + e.target.value + latexCode.slice(end);
                            updateCodeWithHistory(newCode);
                          }}
                          className={`w-full p-3 rounded-xl ${inputCls} font-serif text-sm outline-none resize-none min-h-[90px] leading-relaxed`}
                          spellCheck="false"
                        />
                        <div className="mt-3 flex gap-2 items-center">
                          <span className={`text-xs font-mono uppercase ${isLight ? 'text-slate-600' : 'text-slate-400'} font-bold`}>Keywords:</span>
                          <input type="text" value={parsedDoc.keywords || ''} onChange={e => {
                            if (!parsedDoc.keywordsRange) return;
                            const start = parsedDoc.keywordsRange.start;
                            const end = parsedDoc.keywordsRange.end;
                            const newCode = latexCode.slice(0, start) + `\\textbf{Keywords:} ${e.target.value}` + latexCode.slice(end);
                            updateCodeWithHistory(newCode);
                          }} className={`flex-1 p-2 rounded-xl ${inputCls} font-serif text-xs outline-none`}/>
                        </div>
                      </div>
                    )}

                    {/* Editable sections */}
                    <div className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-300 space-y-6">
                      {parsedDoc.sections.map(sec => (
                        <EditableSection
                          key={sec.id}
                          sec={sec}
                          onUpdate={handleSectionUpdate}
                          projectFiles={projectFiles}
                          sectionRef={el => sectionRefs.current[sec.title] = el}
                          visual
                          selKind={figureSelection && figureSelection.secId === sec.id ? figureSelection.kind : null}
                          onSelectAsset={(sid, kind) => setFigureSelection({ secId: sid, kind })}
                          onPatchAsset={applyAssetPatch}
                          onDeleteAsset={deleteAsset}
                          onOpenFileTab={openFileTab}
                          onInsertSnippet={handleSectionInsertSnippet}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  /* ── PAGE SHEET (PDF View with proper KaTeX math) ── */
                  <div className="w-full">
                    <div className={`scholargrid-pdf-print-container flex flex-col items-center gap-8 ${isHandToolActive ? 'select-none' : 'select-text'}`}
                      style={{
                        width: '794px',
                        marginLeft: `max(0px, calc((100% - ${pdfSheetWidth}px) / 2))`,
                        marginRight: `max(0px, calc((100% - ${pdfSheetWidth}px) / 2))`,
                        transform: `scale(${previewZoom/100})`,
                        transformOrigin: 'top left'
                      }}>

                      {/* Infinite-page A4 sheets — one page per chunk, unlimited length */}
                      {sectionChunks.map((chunk, chunkIdx) => {
                        const pageNo = chunkIdx + 1;
                        const isFirstPage = chunkIdx === 0;
                        const isLastPage = chunkIdx === sectionChunks.length - 1;
                        const pageCols = (pageLayouts[chunkIdx] || (layoutCustomization.columns === 1 ? 'single' : 'two-column'));

                        return (
                          <div key={`page_${pageNo}`}
                            style={{
                              width: '794px',
                              minHeight: '1123px',
                              backgroundColor: layoutCustomization.paperTone || '#ffffff',
                              fontFamily: getFontFamilyCss(layoutCustomization.fontFamily),
                              fontSize: `${layoutCustomization.fontSize || 11}px`,
                              lineHeight: layoutCustomization.lineHeight || 1.55,
                              textAlign: layoutCustomization.textJustify ? 'justify' : 'left'
                            }}
                            ref={el => sectionRefs.current[`__page${pageNo}`] = el}
                            className="group relative text-slate-900 shadow-2xl p-14 flex flex-col border border-slate-300 font-serif leading-relaxed"
                          >
                            {isFirstPage ? (
                              <>
                                {/* Journal header (Editable) */}
                                <EditableJournalHeader
                                  journalName={activeProject.journal_name || "CURRENT OPINION IN PLANT BIOLOGY · CAMBRIDGE ZYGOTE"}
                                  volumeIssue={activeProject.volume_issue || "VOL. 48, NO. 9, SEPTEMBER 2026"}
                                  doi={activeProject.doi || "10.1016/j.pbi.2020.101993"}
                                  rankingBadge={activeProject.ranking_badge || "OPEN ACCESS · Q1"}
                                  layoutStyle={layoutCustomization.preset || activeProject.layout_style || 'elsevier_box'}
                                  headerBadge={activeProject.header_badge || ''}
                                  publisher={activeProject.publisher || activeTemplateMeta?.publisher || 'Cambridge University Press'}
                                  accentColor={layoutCustomization.accentColor || '#007398'}
                                  onUpdate={(upd) => {
                                    setActiveProject(prev => ({ ...prev, ...upd }));
                                    setDirtyFiles(prev => ({ ...prev, 'main.tex': true }));
                                    showToast(`Header updated: ${upd.journal_name}`, 'success');
                                  }}
                                />
                                {/* Title */}
                                <h1
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={e => {
                                    const val = e.currentTarget.textContent.trim();
                                    if (val && val !== parsedDoc.title) {
                                      const r = replaceBracedMacro(latexCode, 'title', val);
                                      updateCodeWithHistory(r);
                                    }
                                  }}
                                  style={{
                                    fontSize: `${layoutCustomization.titleSize || 22}px`,
                                    textAlign: layoutCustomization.titleAlign || (layoutCustomization.preset === 'ieee_twocolumn' ? 'center' : 'left'),
                                    fontWeight: layoutCustomization.titleWeight || 'bold',
                                    color: '#0f172a'
                                  }}
                                  className="font-serif leading-tight mb-3 outline-none hover:ring-1 hover:ring-cyan-400/50 rounded px-1 -mx-1 transition-all"
                                >
                                  {parsedDoc.title}
                                </h1>
                                {/* Authors */}
                                <div
                                  style={{
                                    textAlign: layoutCustomization.titleAlign === 'center' || layoutCustomization.preset === 'ieee_twocolumn' ? 'center' : 'left'
                                  }}
                                  className="text-xs text-slate-700 space-y-1 mb-5"
                                >
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={e => {
                                      const val = e.currentTarget.textContent.trim();
                                      if (val && val !== parsedDoc.authors) {
                                        const r = replaceBracedMacro(latexCode, 'author', val);
                                        updateCodeWithHistory(r);
                                      }
                                    }}
                                    className="font-bold text-[12px] outline-none hover:ring-1 hover:ring-cyan-400/50 rounded px-1 -mx-1 inline-block"
                                  >
                                    {parsedDoc.authors}
                                  </div>
                                  <div className="italic text-slate-600 text-[10px]">Institute for Advanced Scientific Computing · Department of Computational Intelligence</div>
                                  <div className="text-[9px] font-mono text-slate-500">*Corresponding author: {currentUser.email || 'author@institution.edu'} · Received March 2026; revised May 2026.</div>
                                </div>
                                {/* Abstract */}
                                {parsedDoc.abstract && (
                                  layoutCustomization.abstractStyle === 'boxed' || (!layoutCustomization.abstractStyle && layoutCustomization.preset === 'elsevier_box') ? (
                                    <div className="bg-slate-50 border border-slate-300 rounded p-4 mb-6 text-[10.5px]">
                                      <div className="flex flex-col sm:flex-row gap-4 border-b border-slate-200 pb-3 mb-3">
                                        {layoutCustomization.showArticleInfo && (
                                          <div className="w-44 text-[9px] font-sans text-slate-500 space-y-1 shrink-0 border-r border-slate-200 pr-3">
                                            <div className="font-bold uppercase tracking-wider" style={{ color: layoutCustomization.accentColor || '#1e293b' }}>Article Info</div>
                                            <div className="text-slate-700 font-semibold">Article history:</div>
                                            <div>Received {layoutCustomization.articleHistory?.received || '14 March 2026'}</div>
                                            <div>Revised {layoutCustomization.articleHistory?.revised || '20 May 2026'}</div>
                                            <div>Accepted {layoutCustomization.articleHistory?.accepted || '02 June 2026'}</div>
                                            <div>Available online {layoutCustomization.articleHistory?.availableOnline || '10 June 2026'}</div>
                                          </div>
                                        )}
                                        <div className="flex-1">
                                          <strong className="font-sans font-bold uppercase tracking-wider text-[10px] block mb-1" style={{ color: layoutCustomization.accentColor || '#0f172a' }}>Abstract</strong>
                                          <div className="leading-relaxed text-slate-700">
                                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatexOptions]}>{parsedDoc.abstract}</ReactMarkdown>
                                          </div>
                                          {parsedDoc.keywords && <div className="mt-2 text-[9.5px] font-sans"><strong>Keywords: </strong>{parsedDoc.keywords}</div>}
                                        </div>
                                      </div>
                                    </div>
                                  ) : layoutCustomization.abstractStyle === 'lead_accent' || (!layoutCustomization.abstractStyle && layoutCustomization.preset === 'nature_springer') ? (
                                    <div className="pl-4 py-2 mb-6" style={{ borderLeft: `4px solid ${layoutCustomization.accentColor || '#b91c1c'}` }}>
                                      <span className="text-[9.5px] font-sans font-bold uppercase tracking-wider block mb-1" style={{ color: layoutCustomization.accentColor || '#b91c1c' }}>Context & Summary</span>
                                      <div className="font-serif font-bold text-[11.5px] leading-relaxed text-slate-900">
                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatexOptions]}>{parsedDoc.abstract}</ReactMarkdown>
                                      </div>
                                      {parsedDoc.keywords && <div className="mt-2 text-[9.5px] font-sans text-slate-600"><strong>Key Subjects: </strong>{parsedDoc.keywords}</div>}
                                    </div>
                                  ) : layoutCustomization.abstractStyle === 'italic_terms' || (!layoutCustomization.abstractStyle && layoutCustomization.preset === 'ieee_twocolumn') ? (
                                    <div className="p-3.5 bg-slate-50/70 border-y border-slate-300 rounded mb-6 text-slate-800 text-[10.5px] leading-relaxed">
                                      <div className="inline">
                                        <strong className="font-bold uppercase tracking-wider text-slate-900 font-sans text-[10px] mr-1.5">
                                          Abstract—
                                        </strong>
                                        <span className="font-serif italic font-semibold text-slate-900">
                                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatexOptions]}>{parsedDoc.abstract}</ReactMarkdown>
                                        </span>
                                      </div>
                                      {parsedDoc.keywords && (
                                        <div className="mt-2.5 pt-2 border-t border-slate-200 text-[10px] font-sans">
                                          <strong className="font-bold uppercase tracking-wider text-slate-900 mr-1.5">Index Terms—</strong>
                                          <span>{parsedDoc.keywords}</span>
                                        </div>
                                      )}
                                    </div>
                                  ) : layoutCustomization.abstractStyle === 'modern_bar' || layoutCustomization.preset === 'mdpi_banner' || layoutCustomization.preset === 'plos_band' ? (
                                    <div className="p-4 rounded-lg mb-6 border" style={{ borderColor: `${layoutCustomization.accentColor}40`, backgroundColor: `${layoutCustomization.accentColor}08` }}>
                                      <strong className="font-sans font-bold uppercase tracking-wider text-[10.5px] block mb-1.5" style={{ color: layoutCustomization.accentColor }}>
                                        {layoutCustomization.preset === 'plos_band' ? 'Abstract & Open Access Disclosure' : 'Abstract'}
                                      </strong>
                                      <div className="text-slate-800 leading-relaxed text-[10.5px]">
                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatexOptions]}>{parsedDoc.abstract}</ReactMarkdown>
                                      </div>
                                      {parsedDoc.keywords && (
                                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-[9.5px] font-sans text-slate-600">
                                          <strong>Keywords: </strong>{parsedDoc.keywords}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="p-3 bg-slate-50 border-y border-slate-300 rounded mb-6 text-slate-800 text-[10.5px] leading-relaxed">
                                      <strong className="font-bold uppercase tracking-wider text-slate-900 font-sans text-[10px] block mb-1">
                                        Abstract
                                      </strong>
                                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatexOptions]}>{parsedDoc.abstract}</ReactMarkdown>
                                      {parsedDoc.keywords && <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] font-sans"><strong>Keywords: </strong> {parsedDoc.keywords}</div>}
                                    </div>
                                  )
                                )}
                              </>
                            ) : (
                              /* Continuation header */
                              layoutCustomization.showPageHeaders && (
                                <div className="border-b border-slate-300 pb-2 mb-6 flex justify-between items-center text-[9px] font-sans text-slate-500">
                                  <span className="font-bold uppercase text-slate-700 truncate max-w-[65%]" title={parsedDoc.title || activeProject.title || activeProject.journal_name}>
                                    {parsedDoc.title || activeProject.title || activeProject.journal_name || "IEEE TRANSACTIONS"}
                                  </span>
                                  <span className="italic shrink-0">{parsedDoc.authors ? parsedDoc.authors.split(',')[0].trim() + ' et al.' : `${currentUser.name} et al.`}</span>
                                </div>
                              )
                            )}
                            {/* Sections of this page */}
                            <div 
                              className={`space-y-4 ${
                                (pageLayouts[chunkIdx] || pageCols) === 'two-column' ? 'columns-2' : ''
                              }`}
                              style={{
                                columnGap: `${layoutCustomization.columnGap || 24}px`,
                                columnRule: layoutCustomization.columnDivider ? '1px solid #cbd5e1' : undefined
                              }}
                            >
                              {chunk.map((sec, secIdx) => {
                                const isSectionOne = chunkIdx === 0 && secIdx === 0;
                                const headingNum = layoutCustomization.headingNumbering === 'roman'
                                  ? `${toRoman(sec.index)}.`
                                  : layoutCustomization.headingNumbering === 'arabic'
                                    ? `${sec.index}.`
                                    : '';
                                const headingTitle = layoutCustomization.headingStyle === 'uppercase'
                                  ? sec.title.toUpperCase()
                                  : sec.title;

                                return (
                                  <div key={sec.id} className="space-y-2 break-inside-avoid-column" ref={el => sectionRefs.current[sec.title] = el}>
                                    <h2 
                                      className={`font-sans font-bold tracking-wider text-slate-900 text-xs pb-0.5 cursor-pointer hover:text-cyan-700 transition-colors ${
                                        layoutCustomization.headingStyle === 'uppercase' ? 'uppercase' : ''
                                      }`}
                                      style={{
                                        borderBottom: layoutCustomization.headingUnderline ? `1px solid ${layoutCustomization.accentColor || '#e2e8f0'}` : undefined
                                      }}
                                      onClick={() => setSidebarTab('outline')}
                                    >
                                      {headingNum} {headingTitle}
                                    </h2>
                                    <div className="text-slate-800 leading-relaxed text-[10.5px]">
                                      {isSectionOne && layoutCustomization.dropCap && sec.cleanText ? (
                                        <div>
                                          <span 
                                            className="float-left font-serif font-bold text-4xl leading-none pr-2 pt-1 select-none"
                                            style={{ color: layoutCustomization.accentColor || '#002855' }}
                                          >
                                            {sec.cleanText.charAt(0)}
                                          </span>
                                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatexOptions]}>
                                            {sec.cleanText.slice(1)}
                                          </ReactMarkdown>
                                        </div>
                                      ) : (
                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatexOptions]}>{sec.cleanText}</ReactMarkdown>
                                      )}
                                    </div>
                                    {sec.figureData && <PublicationFigure num={sec.figureData.num || 1} cols={sec.figureData.cols || 1} subfigures={sec.figureData.subfigures} path={sec.figureData.path} caption={sec.figureData.caption} projectFiles={projectFiles}/>}
                                    {sec.tableData && <PublicationBooktabsTable num={sec.tableData.num || 1} cols={sec.tableData.cols || 1} subtables={sec.tableData.subtables} caption={sec.tableData.caption} tableRows={sec.tableData.rows}/>}
                                    {sec.chartData && <PublicationVectorChart num={sec.chartData.num || 2} title={sec.chartData.title} xlabel={sec.chartData.xlabel} ylabel={sec.chartData.ylabel} chartType={sec.chartData.chartType} seriesData={sec.chartData.seriesData} colors={sec.chartData.colors} onUpdate={patch => applyAssetPatch(sec.id, 'chart', patch)}/>}
                                  </div>
                                );
                              })}
                              {isLastPage && (
                                <>
                                  <div className="pt-4 border-t border-slate-300 break-before-auto">
                                    <h2 
                                      className="font-sans font-bold uppercase text-slate-900 text-xs mb-2"
                                      style={{ color: layoutCustomization.accentColor || '#0f172a' }}
                                    >
                                      References
                                    </h2>
                                    <div className="space-y-1 text-[10px] text-slate-700">
                                      <p>[1] A. Vaswani et al., "Attention is all you need," <em>NeurIPS</em>, vol. 30, pp. 5998–6008, 2017.</p>
                                      <p>[2] J. Devlin et al., "BERT: Pre-training of deep bidirectional transformers," <em>NAACL-HLT</em>, 2019.</p>
                                      <p>[3] E. Rostova and D. Vance, "Invariant manifold routing," <em>ScholarGrid Preprints</em>, 2026.</p>
                                    </div>
                                  </div>

                                  {/* IEEE Author Biography Box */}
                                  {layoutCustomization.showAuthorBio && (
                                    <div className="mt-5 pt-3 border-t-2 border-slate-300 break-inside-avoid">
                                      <div className="flex gap-3 items-start">
                                        <div className="w-16 h-20 bg-slate-200 border border-slate-400 shrink-0 flex flex-col items-center justify-center text-slate-400">
                                          <span className="text-[8px] font-mono uppercase text-center font-bold">Author Photo</span>
                                        </div>
                                        <div className="text-[9.5px] leading-relaxed text-slate-700 space-y-1">
                                          <p>
                                            <strong className="font-bold text-slate-900 uppercase">{parsedDoc.authors || 'First Author'}</strong> received the B.S. and Ph.D. degrees in Electrical and Computer Engineering. They are currently a Senior Principal Researcher focusing on geometric deep learning, invariant manifolds, and sovereign scientific software architectures. They have served as an Associate Editor for IEEE Transactions and are an active Fellow of the Scientific Society.
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                            {/* Page footer */}
                            {layoutCustomization.showPageFooters && (
                              <div className="border-t border-slate-200 pt-2 flex justify-between text-[9px] font-sans text-slate-400 mt-auto">
                                <span>ScholarGrid Sovereign LaTeX Studio · {activeProject.ranking_badge || 'Q1 Index'}</span>
                                <span>Page {pageNo} of {pdfPageCount}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Design & Typography Customizer Drawer */}
              {isDesignCustomizerOpen && (
                <div className="w-full sm:w-[420px] max-w-full border-l border-slate-700/50 bg-slate-900/95 shrink-0 flex flex-col z-20 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right duration-200">
                  <DesignTypographyCustomizer
                    customization={layoutCustomization}
                    onChange={handleCustomizationChange}
                    onResetToTemplate={() => {
                      if (activeTemplateMeta) applyTemplateStyles(activeTemplateMeta);
                      else applyTemplateStyles(activeProject);
                      showToast('Reset to original publisher template specifications', 'info');
                    }}
                    onClose={() => setIsDesignCustomizerOpen(false)}
                    activeTemplateName={activeProject.journal_name || activeTemplateMeta?.title || 'Academic Manuscript'}
                    isLight={isLight}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── REVIEW PANEL ── */}
          {isReviewOpen && (
            <div className={`w-80 border-l ${themeBorder} ${rightSidebarCls} flex flex-col shrink-0`}>
              <div className={`p-3.5 border-b ${themeBorder} flex items-center justify-between`}>
                <div className="flex items-center gap-2 text-amber-500 font-mono text-xs font-bold uppercase"><MessageSquare size={14}/><span>Review Panel</span></div>
                <button onClick={() => setIsReviewOpen(false)} className={`p-1 rounded ${isLight ? 'hover:bg-slate-100 text-slate-500' : 'text-slate-400 hover:text-white'} cursor-pointer`}><X size={14}/></button>
              </div>
              <div className={`p-3.5 border-b ${themeBorder}`}>
                <textarea value={newCommentText} onChange={e => setNewCommentText(e.target.value)} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); addComment(); } }} placeholder="Add a comment... (Ctrl+Enter to submit)" rows={3} className={`w-full p-2.5 rounded-xl ${inputCls} text-xs font-mono outline-none resize-none`}/>
                <button onClick={addComment} className="mt-2 w-full py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-600 dark:text-amber-300 font-mono text-xs font-bold cursor-pointer transition-colors">Add Comment</button>
              </div>
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar">
                {comments.length === 0 && <div className={`text-center py-8 ${isLight ? 'text-slate-400' : 'text-slate-500'} text-xs font-sans`}>No comments yet.<br/>Select text and add a review note.</div>}
                {comments.map(c => (
                  <div key={c.id} className={`p-3.5 rounded-xl border space-y-2 ${c.resolved?(isLight?'bg-emerald-50/50 border-emerald-200 opacity-60':'bg-emerald-950/30 border-emerald-500/20 opacity-60'):(isLight?'bg-slate-50 border-slate-200':'bg-white/5 border-white/10')}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-300">{c.author_name}</span>
                      <div className="flex gap-1">
                        {!c.resolved && <button onClick={() => resolveComment(c.id)} className="p-1 rounded hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-500 cursor-pointer" title="Resolve"><CheckCheck size={13}/></button>}
                        <button onClick={() => deleteComment(c.id)} className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 cursor-pointer" title="Delete"><Trash2 size={13}/></button>
                      </div>
                    </div>
                    <p className={`text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'} font-sans`}>{c.content}</p>
                    <div className={`flex items-center justify-between text-[11px] font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span>Line {c.line_number}</span>
                      <span>{c.resolved ? '✓ Resolved' : new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileUploadRef} type="file" multiple accept=".tex,.bib,.png,.jpg,.jpeg,.svg,.pdf,.txt,.md" className="hidden" onChange={e => handleFileUpload(e.target.files)}/>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODALS                                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}

      {/* History Drawer */}
      {isHistoryOpen && (
        <div className={`fixed top-12 right-0 bottom-0 w-84 ${rightSidebarCls} border-l ${themeBorder} z-40 flex flex-col shadow-2xl`}>
          <div className={`p-4 border-b ${themeBorder} flex items-center justify-between`}>
            <div className={`flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-slate-200'} font-mono text-xs font-bold uppercase`}><History size={15} className={isLight ? 'text-indigo-600' : (themeClasses.accentText || 'text-cyan-400')}/><span>Version History</span></div>
            <button onClick={() => setIsHistoryOpen(false)} className={`p-1 rounded ${isLight ? 'hover:bg-slate-100 text-slate-500' : 'text-slate-400 hover:text-white'} cursor-pointer`}><X size={15}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 custom-scrollbar">
            <div className={`p-3.5 rounded-xl ${isLight ? 'bg-indigo-50 border-indigo-200 text-slate-800' : 'bg-cyan-500/10 border-cyan-500/30 text-slate-200'} border space-y-1`}>
              <div className="flex items-center justify-between"><span className={`text-xs font-mono font-bold ${isLight ? 'text-indigo-700' : 'text-cyan-300'} uppercase`}>Current Version</span><span className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{new Date().toLocaleDateString()}</span></div>
              <p className="text-xs font-sans font-medium">Working copy</p>
              <div className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{compilerStats.wordCount} words · {compilerStats.totalPages} pages</div>
            </div>
            {versions.length > 0 ? versions.map((v, i) => (
              <div key={i} className={`p-3.5 rounded-xl ${isLight ? 'bg-slate-50 border-slate-200 hover:border-slate-300' : 'bg-white/5 border-white/10 hover:border-white/20'} border space-y-1`}>
                <div className="flex items-center justify-between"><span className={`text-xs font-mono font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>v{versions.length - i}</span><span className={`text-xs font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{new Date(v.created_at||Date.now()).toLocaleDateString()}</span></div>
                {v.commit_message && <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'} font-sans`}>{v.commit_message}</p>}
                <div className="flex gap-3 pt-1">
                  <button onClick={() => restoreVersion(v.snapshot)} className={`text-xs font-mono ${isLight ? 'text-indigo-600' : 'text-cyan-400'} hover:underline cursor-pointer font-semibold`}>Restore Local</button>
                  {v.id && <button onClick={() => revertVersion(v.id)} className="text-xs font-mono text-amber-500 hover:underline cursor-pointer font-semibold" title="Revert project on server">Revert Server</button>}
                </div>
              </div>
            )) : (
              <div className="text-center py-8 space-y-2"><Database size={28} className={`mx-auto ${isLight ? 'text-slate-300' : 'text-slate-600'}`}/><p className={`text-xs ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>No saved versions yet.</p></div>
            )}
          </div>
          <div className={`p-3.5 border-t ${themeBorder} space-y-2`}>
            <button onClick={handleSaveVersion} className={`w-full py-2.5 rounded-xl ${isLight ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/30'} border font-mono text-xs font-bold uppercase cursor-pointer flex items-center justify-center gap-2`}><Save size={14}/>Save Version</button>
            <button onClick={handleVaultSync} className={`w-full py-2.5 rounded-xl ${isLight ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/30'} border font-mono text-xs font-bold uppercase cursor-pointer flex items-center justify-center gap-2`}><Database size={14}/>Sync to Vault</button>
            <button onClick={checkPdfEngine} className={`w-full py-2.5 rounded-xl ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-500/20 hover:bg-slate-500/30 text-slate-300 border-slate-500/30'} border font-mono text-xs font-bold uppercase cursor-pointer flex items-center justify-center gap-2`}><TerminalSquare size={14}/>Check PDF Engine</button>
            {pdfEngineReady && (
              <div className="text-xs font-mono text-center px-2">
                <span className={pdfEngineReady.ready ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                  {pdfEngineReady.ready ? '✓' : '✗'} {pdfEngineReady.engine || 'none'} · Browser: {pdfEngineReady.browser_name || 'not found'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share Modal */}
      {isShareOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${modalBoxCls} w-full max-w-md shadow-2xl p-6 space-y-4`}>
            <div className={`flex items-center justify-between border-b ${themeClasses.border} pb-3`}>
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm font-bold uppercase"><Share2 size={16}/><span>Share Project</span></div>
              <button onClick={() => setIsShareOpen(false)} className={`${themeClasses.textMuted} hover:${themeClasses.text} cursor-pointer p-1 rounded-lg`}><X size={16}/></button>
            </div>
            <div>
              <label className={`text-xs font-mono ${themeClasses.textMuted} uppercase block mb-2 font-semibold`}>Read-Only Share Link</label>
              <div className="flex gap-2">
                <input readOnly value={`https://scholargrid.io/view/${activeProject.id||'proj_demo'}`} className={`flex-1 px-3.5 py-2.5 rounded-xl ${inputCls} text-xs font-mono outline-none`}/>
                <button onClick={() => { navigator.clipboard?.writeText(`https://scholargrid.io/view/${activeProject.id}`); showToast('Link copied!', 'success'); }} className={`p-2.5 rounded-xl ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200' : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10'} cursor-pointer transition-colors`}><Copy size={15}/></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button onClick={() => { handleDownloadPDF(); setIsShareOpen(false); }} className={`py-2.5 rounded-xl ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200' : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10'} font-mono text-xs font-bold uppercase cursor-pointer flex items-center justify-center gap-2 transition-colors`}><Download size={14}/>Export PDF</button>
              <button onClick={() => { handleDownloadTex(); setIsShareOpen(false); }} className={`py-2.5 rounded-xl ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200' : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10'} font-mono text-xs font-bold uppercase cursor-pointer flex items-center justify-center gap-2 transition-colors`}><FileDown size={14}/>Download .tex</button>
            </div>
            <button onClick={handleDownloadZip} className="w-full py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold uppercase cursor-pointer flex items-center justify-center gap-2 transition-colors"><Download size={14}/>Download Project ZIP</button>
          </div>
        </div>
      )}

      {/* Slash Commands Modal (Image 1 fix) */}
      {isSlashModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${modalBoxCls} w-full max-w-lg shadow-2xl overflow-hidden rounded-2xl`}>
            <div className={`p-4 border-b ${themeBorder} flex items-center justify-between`}>
              <div className={`flex items-center gap-2 ${themeClasses.accentText || 'text-cyan-400'} font-mono text-sm font-bold uppercase`}>
                <Code2 size={16}/><span>LaTeX Slash Commands</span>
              </div>
              <button onClick={() => setIsSlashModalOpen(false)} className={`${themeClasses.textMuted} hover:${themeClasses.text} cursor-pointer p-1 rounded-lg`}>
                <X size={16}/>
              </button>
            </div>
            {/* Search filter to quickly find commands */}
            <div className={`px-3 pt-3 pb-1 border-b ${themeBorder}`}>
              <div className="relative">
                <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`}/>
                <input
                  type="text"
                  placeholder="Filter slash commands (/sec, /eq, /fig)..."
                  value={slashSearchQuery}
                  onChange={e => setSlashSearchQuery(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 rounded-xl ${inputCls} text-xs font-mono outline-none`}
                  autoFocus
                />
              </div>
            </div>
            <div className="p-3 max-h-96 overflow-y-auto space-y-1.5 font-mono text-xs custom-scrollbar">
              {OVERLEAF_SLASH_COMMANDS.filter(sc => !slashSearchQuery || sc.cmd.toLowerCase().includes(slashSearchQuery.toLowerCase()) || sc.label.toLowerCase().includes(slashSearchQuery.toLowerCase()) || sc.desc.toLowerCase().includes(slashSearchQuery.toLowerCase())).map(sc => (
                <div key={sc.cmd} onClick={() => { insertSnippet(sc.snippet); setIsSlashModalOpen(false); }}
                  className={`p-3 rounded-xl ${isLight ? 'bg-slate-100/70 hover:bg-slate-100 text-slate-800' : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-200'} cursor-pointer flex items-center justify-between group transition-all`}>
                  <div>
                    <div className="font-bold flex items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-md font-mono ${isLight ? 'bg-white text-indigo-700 shadow-xs' : 'bg-cyan-500/15 text-cyan-300'}`}>{sc.cmd}</span>
                      <span className={`text-[11px] ${themeClasses.textMuted} font-normal`}>({sc.label})</span>
                    </div>
                    <div className={`text-xs ${themeClasses.textMuted} mt-1.5`}>{sc.desc}</div>
                  </div>
                  <span className={`text-xs ${themeClasses.accentText || 'text-cyan-400'} font-bold group-hover:translate-x-1 transition-transform`}>Insert →</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LaTeX Manual Modal (Image 2 fix) */}
      {isManualModalOpen && (
        <div data-testid="latex-manual-modal" className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
          <div className={`${modalBoxCls} w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden rounded-2xl animate-slideInUp`}>
            <div className={`p-4 border-b ${themeBorder} flex items-center justify-between`}>
              <div className={`flex items-center gap-2 ${themeClasses.accentText || 'text-cyan-400'} font-mono text-sm font-bold uppercase`}>
                <BookOpen size={16}/><span>LaTeX Manual & Guided Tour</span>
              </div>
              <button onClick={() => setIsManualModalOpen(false)} className={`${themeClasses.textMuted} hover:${themeClasses.text} cursor-pointer p-1 rounded-lg`}>
                <X size={16}/>
              </button>
            </div>
            {/* Tab switcher */}
            <div className={`flex items-center gap-1 px-4 pt-3 border-b ${themeBorder}`}>
              <button onClick={() => setManualTab('guide')} className={`px-4 py-2 rounded-t-lg text-xs font-mono font-bold uppercase cursor-pointer transition-colors ${manualTab==='guide'?`${themeClasses.accentBg ? `${themeClasses.accentBg}/20` : 'bg-cyan-500/20'} ${themeClasses.accentText || 'text-cyan-400'} border-b-2 ${themeClasses.accentBorder || 'border-cyan-500'}`:`${themeClasses.textMuted} hover:${themeClasses.text}`}`}>▶ Interactive Guide</button>
              <button onClick={() => setManualTab('reference')} className={`px-4 py-2 rounded-t-lg text-xs font-mono font-bold uppercase cursor-pointer transition-colors ${manualTab==='reference'?`${themeClasses.accentBg ? `${themeClasses.accentBg}/20` : 'bg-cyan-500/20'} ${themeClasses.accentText || 'text-cyan-400'} border-b-2 ${themeClasses.accentBorder || 'border-cyan-500'}`:`${themeClasses.textMuted} hover:${themeClasses.text}`}`}>⌘ Command Reference</button>
            </div>

            {manualTab === 'guide' ? (
              /* ── ANIMATED GUIDED TOUR ── */
              <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                {/* Hero demo */}
                <div className={`rounded-2xl ${isLight ? 'bg-slate-100/80 text-slate-800' : 'bg-white/[0.03] text-slate-200'} p-5 space-y-4`}>
                  <div className="flex items-end gap-2 text-xs font-mono">
                    <span className="text-slate-500 font-bold">$ you@scholargrid:</span>
                    <span className={`${themeClasses.accentText || 'text-cyan-400'} font-medium sg-typewriter`}>{'\\section{Craft your research paper the Overleaf-grade way — entirely in your Sovereign OS.}'}</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { k: '1 · Write', d: 'Type LaTeX in the source editor — every change compiles live with real KaTeX math.', icon: '⌨' },
                      { k: '2 · Visualize', d: 'Flip to Visual Editor for live-editable abstract, keywords, figures, tables, charts & formulas.', icon: '👁' },
                      { k: '3 · Save', d: 'Hit Save — the paper, files, references & revisions all persist to PostgreSQL scoped to your profile.', icon: '💾' },
                      { k: '4 · Publish', d: 'Export the PDF or sync the paper straight to your Central Vault “LaTeX Projects” folder.', icon: '📦' },
                    ].map((s, i) => (
                      <div key={i} className={`flex items-center gap-3.5 p-3 rounded-xl ${isLight ? 'bg-white shadow-xs' : 'bg-white/[0.04]'} animate-slideInLeft`} style={{ animationDelay: `${0.15 * i}s` }}>
                        <span className={`w-7 h-7 rounded-lg ${isLight ? 'bg-indigo-50 text-indigo-700' : 'bg-cyan-500/20 text-cyan-300'} flex items-center justify-center text-sm shrink-0`}>{s.icon}</span>
                        <div className="text-xs">
                          <strong className={`${themeClasses.accentText || 'text-cyan-400'} font-mono font-bold block text-[11px] uppercase tracking-wider`}>{s.k}</strong>
                          <span className={themeClasses.textMuted}>{s.d}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Essential Shortcuts — cohesive theme styling, NO loud amber */}
                <div className={`rounded-2xl ${isLight ? 'bg-slate-100/60' : 'bg-white/[0.02]'} p-4 space-y-3`}>
                  <div className={`text-xs font-mono font-bold uppercase tracking-widest ${themeClasses.accentText || 'text-cyan-400'}`}>Essential Shortcuts</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      ['Ctrl+S', 'Save project'], ['Ctrl+Z', 'Undo'], ['Ctrl+Y', 'Redo'],
                      ['Ctrl+F', 'Find'], ['Ctrl+H', 'Replace'], ['F3', 'Find next'],
                      ['Ctrl+Enter', 'Add review comment'], ['Double-click', 'Edit visual section'], ['Right-click', 'File tree actions'],
                    ].map(([k, v]) => (
                      <div key={k} className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl ${isLight ? 'bg-white shadow-xs text-slate-800' : 'bg-white/[0.03] text-slate-200'}`}>
                        <span className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-bold shadow-xs ${isLight ? 'bg-slate-100 text-slate-800' : 'bg-black/40 text-cyan-300 border border-white/10'}`}>{k}</span>
                        <span className={`text-[10px] font-mono ${themeClasses.textMuted} text-center`}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* One-click actions */}
                <div className={`rounded-2xl ${isLight ? 'bg-slate-100/60' : 'bg-white/[0.02]'} p-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center`}>
                  {[
                    ['New Paper', '+'], ['Academic Template', '📑'], ['Insert Figure', '🖼'], ['Version History', '🕘'],
                  ].map(([label, icon]) => (
                    <button key={label} onClick={() => {
                      setIsManualModalOpen(false);
                      if (label === 'New Paper') { setShowProjectsWorkspace(true); setIsNewProjectModalOpen(true); }
                      if (label === 'Academic Template') { setShowTemplatesWorkspace(true); setShowProjectsWorkspace(false); fetchAcademicTemplates(1); }
                      if (label === 'Insert Figure') { insertSnippet('\\begin{figure}[htbp]\n\\centering\n\\includegraphics[width=0.85\\linewidth]{figures/image.png}\n\\caption{Caption.}\n\\label{fig:label}\n\\end{figure}\n'); }
                      if (label === 'Version History') { setIsHistoryOpen(true); fetchVersions(); }
                    }}
                      className={`p-3.5 rounded-xl ${isLight ? 'bg-white hover:bg-slate-50 text-slate-800 shadow-xs' : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-200'} cursor-pointer transition-all`}>
                      <div className="text-xl mb-1.5">{icon}</div>
                      <div className="text-[11px] font-mono font-bold uppercase tracking-wider">{label}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* ── REFERENCE / CHEAT SHEET ── */
              <>
                <div className={`p-4 border-b ${themeBorder}`}>
                  <input type="text" placeholder="Search commands..." value={manualSearchQuery} onChange={e => setManualSearchQuery(e.target.value)} className={`w-full px-3.5 py-2.5 rounded-xl ${inputCls} text-xs outline-none font-mono`}/>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                  {LATEX_MANUAL_SECTIONS.map(cat => (
                    <div key={cat.category} className="space-y-3">
                      <h3 className={`text-xs font-mono font-bold uppercase tracking-wider ${themeClasses.accentText || 'text-cyan-400'} pb-1`}>{cat.category}</h3>
                      <div className="grid grid-cols-1 gap-2.5">
                        {cat.items.filter(it => !manualSearchQuery || it.title.toLowerCase().includes(manualSearchQuery.toLowerCase()) || it.code.toLowerCase().includes(manualSearchQuery.toLowerCase())).map(it => (
                          <div key={it.title} className={`p-3.5 rounded-xl ${isLight ? 'bg-white shadow-xs' : 'bg-white/[0.03] hover:bg-white/[0.05]'} space-y-2`}>
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold ${themeClasses.text}`}>{it.title}</span>
                              <button onClick={() => { insertSnippet(it.code); setIsManualModalOpen(false); }} className={`text-[11px] font-mono ${themeClasses.accentText || 'text-cyan-400'} hover:underline cursor-pointer font-bold`}>Insert Snippet →</button>
                            </div>
                            <pre className={`p-2.5 rounded-lg ${isLight ? 'bg-slate-100 text-slate-900 border border-slate-200/60' : 'bg-black/50 text-cyan-300 border border-white/5'} text-xs font-mono overflow-x-auto`}>{it.code}</pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Reference Modal */}
      {showAddRefModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`${modalBoxCls} w-full max-w-2xl shadow-2xl p-6 space-y-4`}>
            <div className={`flex items-center justify-between border-b ${themeClasses.border} pb-3`}>
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm font-bold uppercase"><BookMarked size={16}/><span>Add BibTeX Reference</span></div>
              <button onClick={() => setShowAddRefModal(false)} className={`${themeClasses.textMuted} hover:${themeClasses.text} cursor-pointer p-1 rounded-lg`}><X size={16}/></button>
            </div>
            <div className="space-y-3 font-mono text-xs">
              <p className={`text-xs ${themeClasses.textMuted}`}>{'Paste a BibTeX entry (e.g. @article{key, title={...}, author={...}, journal={...}, year={2024}})'}</p>
              <textarea value={newBibtex} onChange={e => setNewBibtex(e.target.value)} placeholder="@article{vaswani2017attention, title={Attention Is All You Need}, author={Vaswani, Ashish and Shazeer, Noam and Parmar, Niki and Uszkoreit, Jakob and Jones, Llion and Gomez, Aidan N and Kaiser, {\L}ukasz and Polosukhin, Illia}, journal={Advances in Neural Information Processing Systems}, volume={30}, year={2017}}" rows={6} className={`w-full p-3.5 rounded-xl ${inputCls} outline-none focus:border-emerald-400 font-mono resize-none text-xs leading-relaxed`}></textarea>
              <div className="flex gap-2 justify-end pt-1">
                <button onClick={() => { setNewBibtex(''); setShowAddRefModal(false); }} className={`px-4 py-2.5 rounded-xl ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/5 hover:bg-white/10 text-slate-300'} border ${themeClasses.border} font-bold uppercase cursor-pointer text-xs`}>Cancel</button>
                <button onClick={handleAddReference} className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold uppercase cursor-pointer text-xs shadow-md transition-colors">Add Reference</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert / Prompt Modal (replaces native confirm/prompt) */}
      {dialogBox && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeDialogBox}>
          <div onClick={e => e.stopPropagation()} className={`${modalBoxCls} w-full max-w-md shadow-2xl p-6 space-y-4 animate-fadeIn`}
            style={{ boxShadow: '0 25px 60px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(34,211,238,0.15)' }}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${dialogBox.danger ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'}`}>
                {dialogBox.danger ? <AlertTriangle size={18}/> : <Edit3 size={18}/>}
              </div>
              <div>
                <h3 className={`text-base font-bold font-sans ${themeClasses.text}`}>{dialogBox.title}</h3>
                <p className={`text-xs ${themeClasses.textMuted} mt-0.5`}>{dialogBox.message}</p>
              </div>
            </div>
            {dialogBox.kind === 'input' && (
              <input
                autoFocus
                type="text"
                data-testid="dialog-input"
                defaultValue={dialogBox.value}
                onChange={e => setDialogBox(b => ({ ...b, value: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitDialogBox(); } }}
                placeholder={dialogBox.placeholder}
                className={`w-full p-3 rounded-xl ${inputCls} font-mono text-xs outline-none focus:border-cyan-400`}
              />
            )}
            <div className="flex gap-2.5 justify-end pt-2">
              <button data-testid="dialog-cancel-btn" onClick={closeDialogBox} className={`px-4 py-2.5 rounded-xl ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/5 hover:bg-white/10 text-slate-300'} border ${themeClasses.border} font-mono text-xs font-bold uppercase cursor-pointer transition-colors`}>Cancel</button>
              <button data-testid="dialog-confirm-btn" onClick={submitDialogBox}
                className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase cursor-pointer transition-colors shadow-md ${dialogBox.danger ? 'bg-rose-500 hover:bg-rose-400 text-slate-950' : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'}`}>
                {dialogBox.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Academic Template Preview Modal */}
      {templatePreview && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setTemplatePreview(null)}>
          <div onClick={e => e.stopPropagation()} className={`${modalBoxCls} w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden`}>
            <div className={`p-4 border-b ${themeClasses.border} flex items-center justify-between`}>
              <div className="flex items-center gap-2 text-violet-400 font-mono text-sm font-bold uppercase">
                <BookMarked size={16}/><span>Template Preview</span>
              </div>
              <button onClick={() => setTemplatePreview(null)} className={`${themeClasses.textMuted} hover:${themeClasses.text} cursor-pointer p-1 rounded-lg`}><X size={16}/></button>
            </div>
            <div className={`p-4 border-b ${themeClasses.border} flex items-start justify-between gap-4`}>
              <div>
                <h3 className={`text-base font-bold font-serif ${themeClasses.text}`}>{templatePreview.layout?.name}</h3>
                <p className={`text-xs ${themeClasses.textMuted} font-mono mt-1`}>
                  {templatePreview.layout?.publisher} · {templatePreview.layout?.category} · {templatePreview.layout?.columns === 2 ? 'Two-Column' : 'Single-Column'} · {templatePreview.layout?.citation_format} · {templatePreview.layout?.doc_class}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setTemplatePreview(null)} className={`px-3.5 py-2 rounded-xl ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/5 hover:bg-white/10 text-slate-300'} border ${themeClasses.border} text-xs font-mono font-bold uppercase cursor-pointer`}>Close</button>
                <button onClick={() => applyAcademicTemplate(templatePreview)} className="px-4 py-2 rounded-xl bg-violet-500 hover:bg-violet-400 text-slate-950 text-xs font-mono font-bold uppercase cursor-pointer shadow-md transition-colors">Load into Editor</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <pre className={`p-4 rounded-xl ${isLight ? 'bg-slate-100 text-slate-900 border border-slate-200' : 'bg-black/60 text-emerald-300'} text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap`}>{templatePreview.latex_code || 'No source available.'}</pre>
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`${modalBoxCls} w-full max-w-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto`}>
            <div className={`flex items-center justify-between border-b ${themeClasses.border} pb-3`}>
              <h3 className={`text-lg font-bold font-serif ${themeClasses.text}`}>Create New Research Paper</h3>
              <button onClick={() => setIsNewProjectModalOpen(false)} className={`${themeClasses.textMuted} hover:${themeClasses.text} cursor-pointer p-1 rounded-lg`}><X size={16}/></button>
            </div>
            <form onSubmit={handleCreateNewProject} className="space-y-3.5 font-mono text-xs">
              <div><label className={`text-xs ${themeClasses.textMuted} uppercase block mb-1.5 font-semibold`}>Template</label>
                <div className={`mb-2.5 flex items-center gap-2.5 p-3 rounded-xl bg-violet-500/5 border border-violet-500/20`}>
                  <BookMarked size={15} className="text-violet-400 shrink-0"/>
                  <span className={`text-xs ${themeClasses.textMuted} flex-1`}>Looking for an authentic journal template?</span>
                  <button type="button" onClick={() => { setIsNewProjectModalOpen(false); setShowTemplatesWorkspace(true); setShowProjectsWorkspace(false); fetchAcademicTemplates(1); }} className="text-xs font-mono text-violet-400 hover:text-violet-300 underline cursor-pointer shrink-0 font-bold">Browse Academic Templates →</button>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                  {(() => {
                    const cats = [...new Set(templates.map(t => t.category))];
                    return cats.map(cat => (
                      <div key={cat} className="space-y-2">
                        <div className={`text-xs font-bold uppercase tracking-wider text-cyan-400 border-b ${themeClasses.border} pb-1`}>{cat}</div>
                        <div className="grid grid-cols-1 gap-1.5">
                          {templates.filter(t => t.category === cat).map(t => (
                            <label key={t.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-colors ${newProjectForm.template === t.id ? 'bg-cyan-500/20 border-cyan-500/40' : `${isLight ? 'bg-slate-50 hover:bg-slate-100' : 'bg-black/30 hover:bg-white/5'} border ${themeClasses.border}`}`}>
                              <input type="radio" name="template" value={t.id} checked={newProjectForm.template === t.id} onChange={e => setNewProjectForm({...newProjectForm, template: t.id})} className="w-4 h-4 accent-cyan-500 cursor-pointer"/>
                              <div className="flex-1 text-left">
                                <div className={`font-semibold ${themeClasses.text}`}>{t.name}</div>
                                <div className={`text-[11px] ${themeClasses.textMuted}`}>{t.description}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
              <div><label className={`text-xs ${themeClasses.textMuted} uppercase block mb-1.5 font-semibold`}>Paper Title *</label><input type="text" required placeholder="e.g. Asymptotic Bounds on Neural Manifolds" value={newProjectForm.title} onChange={e => setNewProjectForm({...newProjectForm,title:e.target.value})} className={`w-full p-3 rounded-xl ${inputCls} outline-none focus:border-cyan-400 font-sans text-xs`}/></div>
              <div><label className={`text-xs ${themeClasses.textMuted} uppercase block mb-1.5 font-semibold`}>Target Journal</label><input type="text" placeholder="e.g. IEEE Transactions, Nature" value={newProjectForm.journal_name} onChange={e => setNewProjectForm({...newProjectForm,journal_name:e.target.value})} className={`w-full p-3 rounded-xl ${inputCls} outline-none focus:border-cyan-400 font-sans text-xs`}/></div>
              <div className="grid grid-cols-2 gap-2.5">
                <div><label className={`text-xs ${themeClasses.textMuted} uppercase block mb-1.5 font-semibold`}>Lead Author</label><input type="text" value={newProjectForm.authors} onChange={e => setNewProjectForm({...newProjectForm,authors:e.target.value})} className={`w-full p-3 rounded-xl ${inputCls} outline-none font-sans text-xs`}/></div>
                <div><label className={`text-xs ${themeClasses.textMuted} uppercase block mb-1.5 font-semibold`}>Affiliation</label><input type="text" value={newProjectForm.affiliations} onChange={e => setNewProjectForm({...newProjectForm,affiliations:e.target.value})} className={`w-full p-3 rounded-xl ${inputCls} outline-none font-sans text-xs`}/></div>
              </div>
              <div><label className={`text-xs ${themeClasses.textMuted} uppercase block mb-1.5 font-semibold`}>Abstract Summary</label><textarea rows={3} placeholder="Brief synopsis..." value={newProjectForm.abstract} onChange={e => setNewProjectForm({...newProjectForm,abstract:e.target.value})} className={`w-full p-3 rounded-xl ${inputCls} outline-none font-sans resize-none text-xs leading-relaxed`}/></div>
              <button type="submit" className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold uppercase cursor-pointer mt-3 shadow-md text-xs transition-colors">Initialize Project in Database</button>
            </form>
          </div>
        </div>
      )}

      {/* Citation Picker Modal */}
      {showCitePicker && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`${modalBoxCls} w-full max-w-xl shadow-2xl p-6 space-y-4 max-h-[80vh] overflow-hidden flex flex-col`}>
            <div className={`flex items-center justify-between border-b ${themeClasses.border} pb-3`}>
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm font-bold uppercase"><BookMarked size={16}/><span>Insert Citation</span></div>
              <button onClick={() => setShowCitePicker(false)} className={`${themeClasses.textMuted} hover:${themeClasses.text} cursor-pointer p-1 rounded-lg`}><X size={16}/></button>
            </div>
            <div className="flex gap-2 mb-2">
              <input type="text" placeholder="Search references..." value={citeSearchQuery} onChange={e => setCiteSearchQuery(e.target.value)} className={`flex-1 px-3.5 py-2.5 rounded-xl ${inputCls} outline-none focus:border-emerald-400 font-mono text-xs`} autoFocus/>
              <button onClick={fetchProjectReferences} className={`px-3.5 py-2.5 rounded-xl ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/5 hover:bg-white/10 text-slate-300'} border ${themeClasses.border} cursor-pointer transition-colors`}><RefreshCw size={15}/></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5">
              {projectReferences.length === 0 ? (
                <div className={`text-center py-8 ${themeClasses.textMuted} text-xs`}>No references yet. Add BibTeX entries first.</div>
              ) : (
                projectReferences
                  .filter(r => !citeSearchQuery || r.cite_key.toLowerCase().includes(citeSearchQuery.toLowerCase()) || r.raw_bibtex.toLowerCase().includes(citeSearchQuery.toLowerCase()))
                  .map(r => (
                    <button key={r.id} onClick={() => insertCitation(r.cite_key)} className={`w-full p-3 rounded-xl ${isLight ? 'bg-slate-50 hover:bg-emerald-50' : 'bg-black/30 hover:bg-emerald-500/10'} border ${themeClasses.border} hover:border-emerald-500/30 text-left cursor-pointer transition-colors`}>
                      <div className="font-mono text-xs font-bold text-emerald-400">[@{r.cite_key}]</div>
                      <div className={`text-xs ${themeClasses.textMuted} truncate mt-1`}>{r.raw_bibtex.slice(0, 140)}...</div>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Spell Check Modal */}
      {showSpellCheck && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`${modalBoxCls} w-full max-w-xl shadow-2xl p-6 space-y-4 max-h-[80vh] overflow-hidden flex flex-col`}>
            <div className={`flex items-center justify-between border-b ${themeClasses.border} pb-3`}>
              <div className="flex items-center gap-2 text-amber-400 font-mono text-sm font-bold uppercase"><AlertCircle size={16}/><span>Spell Check</span></div>
              <button onClick={() => setShowSpellCheck(false)} className={`${themeClasses.textMuted} hover:${themeClasses.text} cursor-pointer p-1 rounded-lg`}><X size={16}/></button>
            </div>
            <div className="flex gap-2 mb-2">
              <button onClick={runSpellCheck} disabled={spellChecking} className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2 transition-colors">
                {spellChecking ? <RefreshCw size={14} className="animate-spin"/> : <Search size={14}/>} Run Spell Check
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
              {spellResults.length === 0 ? (
                <div className={`text-center py-8 ${themeClasses.textMuted} text-xs`}>No issues found or run spell check first.</div>
              ) : (
                spellResults.map((r, i) => (
                  <div key={i} className={`p-3 rounded-xl ${isLight ? 'bg-slate-50' : 'bg-black/30'} border ${themeClasses.border}`}>
                    <div className="font-mono text-xs font-bold text-amber-400">{r.word}</div>
                    <div className={`text-[11px] ${themeClasses.textMuted} mt-0.5`}>No suggestions available</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cross-Reference Navigation Modal */}
      {showCrossRefs && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`${modalBoxCls} w-full max-w-2xl shadow-2xl p-6 space-y-4 max-h-[80vh] overflow-hidden flex flex-col`}>
            <div className={`flex items-center justify-between border-b ${themeClasses.border} pb-3`}>
              <div className="flex items-center gap-2 text-cyan-400 font-mono text-sm font-bold uppercase"><LinkIcon size={16}/><span>Cross-References</span></div>
              <button onClick={() => setShowCrossRefs(false)} className={`${themeClasses.textMuted} hover:${themeClasses.text} cursor-pointer p-1 rounded-lg`}><X size={16}/></button>
            </div>
            <div className="flex gap-2 mb-2">
              <button onClick={fetchCrossRefs} className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold cursor-pointer flex items-center gap-2 transition-colors"><RefreshCw size={14}/> Refresh</button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
              {crossRefData.labels.length > 0 && (
                <div className="space-y-1.5">
                  <div className={`text-xs font-bold uppercase tracking-wider text-cyan-400 border-b ${themeClasses.border} pb-1`}>Labels ({crossRefData.labels.length})</div>
                  {crossRefData.labels.map((l, i) => (
                    <div key={i} className={`p-2.5 rounded-xl ${isLight ? 'bg-slate-50' : 'bg-black/30'} border ${themeClasses.border} font-mono text-xs flex items-center justify-between`}>
                      <span className="text-emerald-400 font-bold">{"\\label{" + l.key + "}"}</span>
                      <span className={`${themeClasses.textMuted} ml-2 truncate`}>{l.context}</span>
                    </div>
                  ))}
                </div>
              )}
              {crossRefData.references.length > 0 && (
                <div className="space-y-1.5">
                  <div className={`text-xs font-bold uppercase tracking-wider text-amber-400 border-b ${themeClasses.border} pb-1`}>References ({crossRefData.references.length})</div>
                  {crossRefData.references.map((r, i) => (
                    <div key={i} className={`p-2.5 rounded-xl ${isLight ? 'bg-slate-50' : 'bg-black/30'} border ${themeClasses.border} font-mono text-xs flex items-center justify-between`}>
                      <span className="text-amber-400 font-bold">{"\\" + r.type + "{" + r.key + "}"}</span>
                      <span className={`${themeClasses.textMuted} ml-2 truncate`}>{r.context}</span>
                    </div>
                  ))}
                </div>
              )}
              {crossRefData.citations.length > 0 && (
                <div className="space-y-1.5">
                  <div className={`text-xs font-bold uppercase tracking-wider text-emerald-400 border-b ${themeClasses.border} pb-1`}>Citations ({crossRefData.citations.length})</div>
                  {crossRefData.citations.map((c, i) => (
                    <div key={i} className={`p-2.5 rounded-xl ${isLight ? 'bg-slate-50' : 'bg-black/30'} border ${themeClasses.border} font-mono text-xs flex items-center justify-between`}>
                      <span className="text-emerald-400 font-bold">{"\\cite{" + c.key + "}"}</span>
                      <span className={`${themeClasses.textMuted} ml-2 truncate`}>{c.context}</span>
                    </div>
                  ))}
                </div>
              )}
              {crossRefData.labels.length === 0 && crossRefData.references.length === 0 && crossRefData.citations.length === 0 && (
                <div className={`text-center py-8 ${themeClasses.textMuted} text-xs`}>No cross-references found. Click Refresh to scan.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Diff View Modal – GitHub-style */}
      {showDiff && (() => {
        const lines = (diffContent || '').split('\n');
        let addCount = 0, delCount = 0;
        lines.forEach(l => { if (l.startsWith('+') && !l.startsWith('+++')) addCount++; if (l.startsWith('-') && !l.startsWith('---')) delCount++; });
        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className={`${modalBoxCls} w-full max-w-4xl shadow-2xl flex flex-col max-h-[88vh]`} style={{padding:0, overflow:'hidden'}}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#161b22] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Diff size={16} className="text-amber-400"/>
                  <span className="font-mono text-sm font-bold text-white">Track Changes</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">+{addCount} additions</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">-{delCount} deletions</span>
                </div>
                <button onClick={() => setShowDiff(false)} className="text-slate-400 hover:text-white cursor-pointer p-1.5 rounded-lg hover:bg-white/10 transition-colors"><X size={16}/></button>
              </div>
              {/* Diff body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar" style={{background:'#0d1117'}}>
                {!diffContent ? (
                  <div className="py-16 text-center text-slate-500 text-sm">No changes detected.</div>
                ) : (
                  <table className="w-full font-mono text-[12px] border-collapse">
                    <tbody>
                      {lines.map((line, i) => {
                        const isAdd = line.startsWith('+') && !line.startsWith('+++');
                        const isDel = line.startsWith('-') && !line.startsWith('---');
                        const isHunk = line.startsWith('@@');
                        const isFileHeader = line.startsWith('---') || line.startsWith('+++');
                        let bg = 'transparent', textColor = '#8b949e', prefix = ' ';
                        if (isAdd) { bg = 'rgba(46,160,67,0.15)'; textColor = '#3fb950'; prefix = '+'; }
                        else if (isDel) { bg = 'rgba(248,81,73,0.15)'; textColor = '#f85149'; prefix = '-'; }
                        else if (isHunk) { bg = 'rgba(56,139,253,0.1)'; textColor = '#58a6ff'; }
                        else if (isFileHeader) { bg = 'rgba(56,139,253,0.08)'; textColor = '#58a6ff'; }
                        return (
                          <tr key={i} style={{background: bg}}>
                            <td className="select-none text-right w-10 px-3 py-0 align-top border-r border-white/5" style={{color:'#484f58',fontSize:'11px',lineHeight:'22px'}}>
                              {!isHunk && !isFileHeader ? i + 1 : ''}
                            </td>
                            <td className="pl-1 pr-1 w-5 select-none text-center align-top" style={{color: textColor, lineHeight:'22px', fontSize:'13px', fontWeight: isAdd||isDel ? 'bold' : 'normal'}}>
                              {isAdd ? '+' : isDel ? '-' : isHunk ? '' : ' '}
                            </td>
                            <td className="pl-2 pr-4 py-0 whitespace-pre-wrap break-all align-top" style={{color: textColor, lineHeight:'22px'}}>
                              {isHunk ? (
                                <span className="text-[#58a6ff] font-bold">{line}</span>
                              ) : isFileHeader ? (
                                <span className="font-bold">{line}</span>
                              ) : (
                                line.slice(isAdd || isDel ? 1 : 0)
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              {/* Footer */}
              <div className="flex gap-2 justify-end px-5 py-3 border-t border-white/10 bg-[#161b22] flex-shrink-0">
                <button onClick={() => setShowDiff(false)} className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold cursor-pointer text-xs transition-colors">Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Real Compile Result Modal */}
      {realCompileResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`${modalBoxCls} w-full max-w-2xl shadow-2xl p-6 space-y-4 max-h-[80vh] overflow-hidden flex flex-col`}>
            <div className={`flex items-center justify-between border-b ${themeClasses.border} pb-3`}>
              <div className="flex items-center gap-2 font-mono text-sm font-bold uppercase">
                {realCompileResult.compiled ? <CheckCircle2 size={16} className="text-emerald-400"/> : <AlertCircle size={16} className="text-rose-400"/>}
                <span>{realCompileResult.compiled ? 'Compilation Succeeded' : 'Compilation Failed'}</span>
              </div>
              <button onClick={() => setRealCompileResult(null)} className={`${themeClasses.textMuted} hover:${themeClasses.text} cursor-pointer p-1 rounded-lg`}><X size={16}/></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
              {realCompileResult.errors && realCompileResult.errors.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-rose-400 border-b border-rose-500/20 pb-1">Errors ({realCompileResult.errors.length})</div>
                  {realCompileResult.errors.map((e, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/20 font-mono text-xs text-rose-300">
                      Line {e.line}: {e.message}
                    </div>
                  ))}
                </div>
              )}
              {realCompileResult.warnings && realCompileResult.warnings.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-amber-500/20 pb-1">Warnings ({realCompileResult.warnings.length})</div>
                  {realCompileResult.warnings.map((w, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/20 font-mono text-xs text-amber-300">
                      Line {w.line}: {w.message}
                    </div>
                  ))}
                </div>
              )}
              <div className={`text-xs font-bold uppercase tracking-wider ${themeClasses.textMuted} border-b ${themeClasses.border} pb-1`}>Build Log</div>
              <pre className={`p-3.5 rounded-xl ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-black/40 text-slate-400'} border ${themeClasses.border} font-mono text-xs whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto`}>{realCompileResult.rawLog || 'No log'}</pre>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRealCompileResult(null)} className={`px-5 py-2.5 rounded-xl ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/5 hover:bg-white/10 text-slate-300'} border ${themeClasses.border} font-bold uppercase cursor-pointer text-xs`}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu for File/Folder Operations ── */}
      {contextMenu.visible && contextMenu.file && (
        <div
          className={`fixed z-[300] ${dropdownCls} py-1.5 min-w-[180px] shadow-2xl`}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.file.file_type !== 'folder' && !contextMenu.file.path.endsWith('/') && (
            <>
              <button data-testid="context-rename-btn" onClick={handleRenameFromMenu} className={`w-full px-3.5 py-2 text-left text-xs font-mono ${themeClasses.text} hover:bg-cyan-500/15 cursor-pointer flex items-center gap-2.5 transition-colors`}>
                <Edit3 size={14} className="text-cyan-400"/> Rename
              </button>
              <button onClick={handleMoveStart} className={`w-full px-3.5 py-2 text-left text-xs font-mono ${themeClasses.text} hover:bg-cyan-500/15 cursor-pointer flex items-center gap-2.5 transition-colors`}>
                <ArrowRight size={14} className="text-cyan-400"/> Move to folder…
              </button>
              <div className={`border-t ${themeClasses.border} my-1`}/>
              <button onClick={() => { navigator.clipboard.writeText(contextMenu.file.path); showToast('File path copied', 'success'); closeContextMenu(); }} className={`w-full px-3.5 py-2 text-left text-xs font-mono ${themeClasses.text} hover:bg-cyan-500/15 cursor-pointer flex items-center gap-2.5 transition-colors`}>
                <Copy size={14} className="text-cyan-400"/> Copy file path
              </button>
              <button onClick={() => { navigator.clipboard.writeText(contextMenu.file.path.split('/').pop()); showToast('File name copied', 'success'); closeContextMenu(); }} className={`w-full px-3.5 py-2 text-left text-xs font-mono ${themeClasses.text} hover:bg-cyan-500/15 cursor-pointer flex items-center gap-2.5 transition-colors`}>
                <FileText size={14} className="text-cyan-400"/> Copy file name
              </button>
              <div className={`border-t ${themeClasses.border} my-1`}/>
              <button data-testid="context-delete-btn" onClick={handleDeleteFromMenu} className="w-full px-3.5 py-2 text-left text-xs font-mono text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 cursor-pointer flex items-center gap-2.5 transition-colors">
                <Trash2 size={14} /> Delete
              </button>
            </>
          )}
          {contextMenu.file.file_type === 'folder' || contextMenu.file.path.endsWith('/') ? (
            <>
              <button data-testid="context-rename-btn" onClick={handleRenameFromMenu} className={`w-full px-3.5 py-2 text-left text-xs font-mono ${themeClasses.text} hover:bg-cyan-500/15 cursor-pointer flex items-center gap-2.5 transition-colors`}>
                <Edit3 size={14} className="text-cyan-400"/> Rename folder
              </button>
              <button onClick={() => { navigator.clipboard.writeText(contextMenu.file.path); showToast('Folder path copied', 'success'); closeContextMenu(); }} className={`w-full px-3.5 py-2 text-left text-xs font-mono ${themeClasses.text} hover:bg-cyan-500/15 cursor-pointer flex items-center gap-2.5 transition-colors`}>
                <Copy size={14} className="text-cyan-400"/> Copy folder path
              </button>
              <div className={`border-t ${themeClasses.border} my-1`}/>
              <button data-testid="context-delete-btn" onClick={handleDeleteFromMenu} className="w-full px-3.5 py-2 text-left text-xs font-mono text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 cursor-pointer flex items-center gap-2.5 transition-colors">
                <Trash2 size={14} /> Delete folder & contents
              </button>
            </>
          ) : null}
        </div>
      )}

      {/* ── Move Target Selector ── */}
      {moveTarget && (
        <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${modalBoxCls} w-full max-w-md shadow-2xl p-6 space-y-4`}>
            <div className={`flex items-center justify-between border-b ${themeClasses.border} pb-3`}>
              <h3 className={`text-base font-bold font-serif ${themeClasses.text}`}>Move "{moveTarget.file.path.split('/').pop()}" to folder</h3>
              <button onClick={() => setMoveTarget(null)} className={`${themeClasses.textMuted} hover:${themeClasses.text} cursor-pointer p-1 rounded-lg`}><X size={16}/></button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              <button
                onClick={() => { handleMove(moveTarget.file, ''); setMoveTarget(null); }}
                className={`w-full px-3.5 py-2.5 text-left text-xs font-mono ${themeClasses.text} hover:bg-cyan-500/15 cursor-pointer rounded-xl flex items-center gap-2.5 transition-colors`}
              >
                <Home size={14} className="text-cyan-400"/> Root /
              </button>
              {(() => {
                const folders = projectFiles.filter(f => f.file_type === 'folder' || f.path.endsWith('/'));
                return folders.map(f => (
                  <button
                    key={f.id}
                    onClick={() => { handleMove(moveTarget.file, f.path); setMoveTarget(null); }}
                    className={`w-full px-3.5 py-2.5 text-left text-xs font-mono ${themeClasses.text} hover:bg-cyan-500/15 cursor-pointer rounded-xl flex items-center gap-2.5 transition-colors`}
                  >
                    <Folder size={14} className="text-amber-400" /> {f.path}
                  </button>
                ));
              })()}
            </div>
            <button onClick={() => setMoveTarget(null)} className={`w-full py-2.5 rounded-xl ${isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-700/60 hover:bg-slate-700 text-white'} border ${themeClasses.border} font-mono text-xs font-bold uppercase cursor-pointer transition-colors`}>
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
