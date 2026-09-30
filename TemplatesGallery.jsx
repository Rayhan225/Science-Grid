// src/components/TemplatesGallery.jsx
import React, { useState, useMemo } from 'react';
import { 
  Search, BookOpen, Award, Lock, Unlock, ArrowRight, X, ExternalLink, 
  Sparkles, CheckCircle2, ChevronRight, FileText, Download, Building, 
  Layers, Compass, Filter, RefreshCw
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { 
  AUTHENTIC_TEMPLATES, 
  FILTER_KINDS, 
  FILTER_RANKINGS, 
  FILTER_TOPICS, 
  FILTER_PUBLISHERS,
  FILTER_ACCESS 
} from '../data/authenticTemplates';
import EditableJournalHeader from './EditableJournalHeader';

export default function TemplatesGallery({ setCurrentView, onOpenInStudio }) {
  const { isLight, themeClasses } = useTheme();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKind, setSelectedKind] = useState('All');
  const [selectedRanking, setSelectedRanking] = useState('All');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [selectedPublisher, setSelectedPublisher] = useState('All');
  const [selectedAccess, setSelectedAccess] = useState('All');
  const [visibleKindsCount, setVisibleKindsCount] = useState(4);

  // Active Preview Modal State
  const [previewTemplate, setPreviewTemplate] = useState(null);

  // Filtered Templates Calculation
  const filteredTemplates = useMemo(() => {
    return AUTHENTIC_TEMPLATES.filter(tmpl => {
      // Kind filter
      if (selectedKind !== 'All' && tmpl.kind !== selectedKind) return false;
      // Ranking filter
      if (selectedRanking !== 'All' && tmpl.ranking !== selectedRanking) return false;
      // Topic filter
      if (selectedTopic !== 'All' && tmpl.category !== selectedTopic) return false;
      // Publisher filter
      if (selectedPublisher !== 'All' && tmpl.publisher !== selectedPublisher) return false;
      // Access filter
      if (selectedAccess !== 'All' && tmpl.access !== selectedAccess) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = tmpl.name.toLowerCase().includes(q);
        const matchTitle = tmpl.paper_title.toLowerCase().includes(q);
        const matchPub = tmpl.publisher.toLowerCase().includes(q);
        const matchCat = tmpl.category.toLowerCase().includes(q);
        const matchIssn = (tmpl.issn || '').toLowerCase().includes(q);
        const matchId = (tmpl.id || '').toLowerCase().includes(q);
        const matchLabel = (tmpl.journal_label || '').toLowerCase().includes(q);
        const matchTags = (tmpl.tags || []).some(t => t.toLowerCase().includes(q));
        if (!matchName && !matchTitle && !matchPub && !matchCat && !matchIssn && !matchTags && !matchId && !matchLabel) {
          return false;
        }
      }
      return true;
    });
  }, [searchQuery, selectedKind, selectedRanking, selectedTopic, selectedPublisher, selectedAccess]);

  const handleStartWriting = (template) => {
    const payload = {
      layout: template,
      latex_code: template.latex_code,
      bib_content: template.bib_content
    };
    window.__sg_pending_template = payload;
    try {
      sessionStorage.setItem('sg_pending_template', JSON.stringify(payload));
    } catch {}

    if (onOpenInStudio) {
      onOpenInStudio(template);
    } else {
      if (setCurrentView) {
        setCurrentView('latex-studio');
      }
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('sg-apply-layout', {
          detail: payload
        }));
      }, 150);
    }
  };

  // Helper to render authentic visual thumbnail per publication style
  const renderThumbnail = (template) => {
    const style = template.layout_style || 'elsevier_box';
    const isTwoCol = template.columns === 2;

    return (
      <div className="w-full md:w-56 h-48 md:h-auto flex-shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white shadow-sm flex flex-col p-3 select-none relative group-hover:border-orange-400 transition-colors text-slate-800">
        
        {/* Style-specific Mini Masthead */}
        {style === 'ieee_twocolumn' ? (
          <div className="border-b-2 border-slate-900 pb-1 mb-1.5 flex items-center justify-between text-[6.5px] font-sans">
            <span className="font-bold tracking-wider uppercase text-blue-900 truncate">IEEE TRANSACTIONS</span>
            <span className="text-[6px] font-mono text-slate-500">{template.ranking.split(' ')[0]}</span>
          </div>
        ) : style === 'nature_springer' ? (
          <div className="bg-red-800 text-white px-1.5 py-0.5 -mx-3 -mt-3 mb-1.5 flex items-center justify-between text-[6px] font-sans font-bold">
            <span>NATURE PORTFOLIO</span>
            <span className="text-[5.5px] tracking-wider uppercase">ARTICLE</span>
          </div>
        ) : style === 'mdpi_banner' ? (
          <div className="border-b border-blue-900/30 pb-1 mb-1.5 flex items-center justify-between text-[6px] font-sans">
            <span className="font-bold text-blue-800">MDPI · {template.name}</span>
            <span className="text-[5.5px] font-mono text-emerald-600">OA</span>
          </div>
        ) : style === 'plos_band' ? (
          <div className="border-b border-teal-600 pb-1 mb-1.5 flex items-center justify-between text-[6.5px] font-sans text-teal-800 font-bold">
            <span>PLOS ONE · RESEARCH</span>
            <span className="text-[6px] font-mono text-teal-600">{template.ranking.split(' ')[0]}</span>
          </div>
        ) : (
          /* Default Elsevier / Society Header */
          <div className="border-b border-slate-300 pb-1 mb-1.5 flex items-center justify-between text-[6.5px] font-sans text-slate-500">
            <span className="font-bold uppercase tracking-wider text-cyan-800 truncate max-w-[120px]">
              {template.journal_label ? template.journal_label.slice(0, 22) : template.publisher}
            </span>
            <span className="text-[6px] font-mono text-emerald-700 bg-emerald-50 px-1 rounded">
              {template.ranking.split(' ')[0]}
            </span>
          </div>
        )}

        {/* Miniature Paper Title */}
        <div className={`font-serif font-bold text-[8px] text-slate-900 leading-tight mb-1 line-clamp-2 ${style === 'ieee_twocolumn' ? 'text-center' : ''}`}>
          {template.paper_title}
        </div>

        {/* Miniature Authors */}
        <div className={`text-[6px] text-slate-600 mb-1.5 truncate ${style === 'ieee_twocolumn' ? 'text-center italic' : ''}`}>
          {template.authors}
        </div>

        {/* Distinctive Body Preview */}
        {style === 'elsevier_box' ? (
          <div className="flex-1 overflow-hidden flex flex-col gap-1 text-[5.5px] text-slate-500">
            <div className="bg-slate-50 border border-slate-200 p-1 rounded-xs">
              <div className="font-bold text-[5.5px] text-slate-800 uppercase">Abstract (Boxed)</div>
              <p className="line-clamp-2">{template.abstract}</p>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-0.5">
              <div className="space-y-0.5">
                <div className="font-bold text-[5.5px] text-slate-700">1. Introduction</div>
                <p className="line-clamp-2">{template.sections?.[0]?.[1]}</p>
              </div>
              <div className="space-y-0.5 border-l border-slate-100 pl-1">
                <div className="font-bold text-[5.5px] text-slate-700">2. Methods</div>
                <p className="line-clamp-2">{template.sections?.[1]?.[1]}</p>
              </div>
            </div>
          </div>
        ) : style === 'ieee_twocolumn' ? (
          <div className="flex-1 overflow-hidden grid grid-cols-2 gap-1.5 text-[5.5px] text-slate-600 leading-snug pt-0.5">
            <div className="space-y-0.5">
              <p className="italic font-sans text-[5px] line-clamp-2"><strong className="font-bold">Abstract—</strong>{template.abstract}</p>
              <div className="font-bold text-[5.5px] text-slate-900 uppercase">I. INTRODUCTION</div>
              <p className="line-clamp-2"><span className="font-serif font-bold text-[9px] float-left leading-none pr-0.5">T</span>{template.sections?.[0]?.[1]}</p>
            </div>
            <div className="space-y-0.5 border-l border-slate-100 pl-1">
              <div className="font-bold text-[5.5px] text-slate-900 uppercase">II. SYSTEM MODEL</div>
              <p className="line-clamp-2">{template.sections?.[1]?.[1]}</p>
              <div className="h-4 bg-slate-50 rounded border border-slate-200 flex items-center justify-center text-[4.5px] font-mono text-slate-400">
                [Eq. (1) Matrix]
              </div>
            </div>
          </div>
        ) : style === 'nature_springer' ? (
          <div className="flex-1 overflow-hidden text-[5.5px] text-slate-600 space-y-1">
            <p className="font-serif font-bold text-[6px] text-slate-800 line-clamp-3 leading-snug border-b border-slate-100 pb-1">
              {template.abstract}
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-[5.5px]">
              <div>
                <span className="font-bold uppercase text-[5.5px] text-slate-800 block">Results</span>
                <p className="line-clamp-2">{template.sections?.[0]?.[1]}</p>
              </div>
              <div className="border-l border-slate-100 pl-1">
                <span className="font-bold uppercase text-[5.5px] text-slate-800 block">Discussion</span>
                <p className="line-clamp-2">{template.sections?.[1]?.[1]}</p>
              </div>
            </div>
          </div>
        ) : style === 'springer_lncs' ? (
          <div className="flex-1 overflow-hidden text-[5.5px] text-slate-600 space-y-1 text-center px-1">
            <div className="px-2 italic line-clamp-3 border-y border-slate-100 py-0.5 text-[5px]">
              Abstract. {template.abstract}
            </div>
            <div className="text-left pt-0.5 space-y-0.5">
              <div className="font-bold text-[5.5px] text-slate-800">1 Introduction</div>
              <p className="line-clamp-2">{template.sections?.[0]?.[1]}</p>
            </div>
          </div>
        ) : (
          /* General 2-column or 1-column layout */
          <div className={`flex-1 overflow-hidden ${isTwoCol ? 'grid grid-cols-2 gap-1.5' : 'space-y-1'} text-[5.5px] text-slate-500 leading-snug`}>
            <div className="space-y-0.5">
              <div className="font-bold text-[5.5px] text-slate-800 uppercase">Abstract</div>
              <p className="line-clamp-3">{template.abstract}</p>
            </div>
            <div className={`space-y-0.5 ${isTwoCol ? 'border-l border-slate-100 pl-1' : ''}`}>
              <div className="font-bold text-[5.5px] text-slate-800 uppercase">1. Introduction</div>
              <p className="line-clamp-2">{template.sections?.[0]?.[1]}</p>
            </div>
          </div>
        )}

        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="bg-white text-orange-600 font-mono text-[9px] font-bold px-2 py-1 rounded shadow-md border border-orange-200">
            Preview & Edit
          </span>
        </div>
      </div>
    );
  };

  return (
    <div 
      id="templates-gallery-root" 
      data-testid="templates-gallery" 
      className={`flex-1 flex flex-col h-full w-full overflow-hidden select-none relative ${
        themeClasses?.bgMain || (isLight ? 'bg-slate-50 text-slate-800' : 'bg-[#0b0f17] text-slate-200')
      }`}
    >
      {/* Dynamic Background Pattern from active Theme */}
      <div className={`absolute inset-0 pointer-events-none z-0 ${themeClasses?.bgPattern || ''}`} />

      {/* ── TOP BREADCRUMB & UTILITY HEADER ───────────────────────────────────── */}
      <header className={`flex-shrink-0 px-6 sm:px-8 py-3.5 border-b flex items-center justify-between relative z-20 backdrop-blur-xl ${
        themeClasses?.bgHeader || (isLight ? 'bg-white/95 border-slate-200 shadow-sm' : 'bg-[#0f1420]/95 border-white/5')
      }`}>
        <div data-testid="templates-breadcrumb" className="flex items-center gap-2 font-mono text-xs">
          <button 
            onClick={() => setCurrentView && setCurrentView('dashboard')}
            className={`hover:underline cursor-pointer ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
          >
            Home
          </button>
          <span className="text-slate-400">›</span>
          <span className={`font-bold ${themeClasses?.accentText || (isLight ? 'text-slate-900' : 'text-white')}`}>
            Paper Templates
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setSearchQuery('');
              setSelectedKind('All');
              setSelectedRanking('All');
              setSelectedTopic('All');
              setSelectedPublisher('All');
              setSelectedAccess('All');
            }}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
              isLight ? 'border-slate-200 text-slate-600 hover:bg-slate-100' : 'border-white/10 text-slate-300 hover:bg-white/5'
            }`}
            title="Reset Filters"
          >
            <RefreshCw size={13} />
            <span>Reset</span>
          </button>
          <div className="h-4 w-px bg-slate-300 dark:bg-white/10" />
          <button 
            onClick={() => setCurrentView && setCurrentView('latex-studio')}
            className={`px-4 py-1.5 rounded-lg ${themeClasses?.accentBg || 'bg-orange-600 hover:bg-orange-500'} text-white font-mono text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5`}
          >
            <span>LaTeX Studio</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </header>

      {/* ── MAIN WORKSPACE: LEFT FILTERS + RIGHT TEMPLATES LIST ──────────────── */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* ── LEFT FILTER PANE ──────────────────────────────────────────────── */}
        <aside className={`w-72 flex-shrink-0 border-r flex flex-col overflow-y-auto custom-scrollbar p-6 space-y-6 backdrop-blur-xl ${
          themeClasses?.bgSidebar || (isLight ? 'bg-white/95 border-slate-200' : 'bg-[#0f1420]/80 border-white/5')
        }`}>
          <div>
            <h2 className={`text-base font-serif font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Publication Templates
            </h2>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              {AUTHENTIC_TEMPLATES.length} Authentic Journal Layouts (Q1–Q4)
            </p>
          </div>

          {/* Filter by Kind */}
          <div className="space-y-2.5">
            <label className={`text-xs font-mono font-bold uppercase tracking-wider block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Filter by Kind
            </label>
            <div className="flex flex-wrap gap-1.5">
              {FILTER_KINDS.slice(0, visibleKindsCount).map(kind => {
                const isSelected = selectedKind === kind;
                return (
                  <button
                    key={kind}
                    onClick={() => setSelectedKind(kind)}
                    className={`px-3 py-1.5 rounded-full text-xs font-sans transition-all cursor-pointer border ${
                      isSelected
                        ? `${themeClasses?.accentBg || 'bg-orange-600'} text-white border-transparent shadow-sm font-semibold`
                        : isLight
                          ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                          : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-300'
                    }`}
                  >
                    {kind === 'Journal Article' && <BookOpen size={12} className="inline mr-1 -mt-0.5" />}
                    {kind}
                  </button>
                );
              })}
            </div>
            {visibleKindsCount < FILTER_KINDS.length ? (
              <button
                onClick={() => setVisibleKindsCount(FILTER_KINDS.length)}
                className="text-[11px] font-mono text-orange-500 hover:underline cursor-pointer pt-1 block"
              >
                ... View more ({FILTER_KINDS.length - visibleKindsCount})
              </button>
            ) : (
              <button
                onClick={() => setVisibleKindsCount(4)}
                className="text-[11px] font-mono text-orange-500 hover:underline cursor-pointer pt-1 block"
              >
                Show less
              </button>
            )}
          </div>

          {/* Filter by Ranking (Q1, Q2, Q3, Q4) */}
          <div className="space-y-2.5 border-t border-slate-200 dark:border-white/5 pt-4">
            <label className={`text-xs font-mono font-bold uppercase tracking-wider block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Quartile Ranking (Q1–Q4)
            </label>
            <div className="space-y-1.5">
              {FILTER_RANKINGS.map(rank => (
                <label 
                  key={rank} 
                  className={`flex items-center gap-2.5 text-xs font-sans cursor-pointer py-1 px-1.5 rounded-lg transition-colors ${
                    selectedRanking === rank 
                      ? isLight ? 'bg-orange-50 font-semibold text-orange-700' : 'bg-orange-500/10 font-semibold text-orange-400'
                      : isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <input
                    type="radio"
                    name="filter-ranking"
                    checked={selectedRanking === rank}
                    onChange={() => setSelectedRanking(rank)}
                    className="accent-orange-500 cursor-pointer"
                  />
                  <span className="flex items-center gap-1.5">
                    {rank === 'Q1 Journals' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                    {rank === 'Q2 Journals' && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
                    {rank === 'Q3 Journals' && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                    {rank === 'Q4 Journals' && <span className="w-2 h-2 rounded-full bg-purple-500" />}
                    {rank}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Filter by Topic */}
          <div className="space-y-2.5 border-t border-slate-200 dark:border-white/5 pt-4">
            <label className={`text-xs font-mono font-bold uppercase tracking-wider block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Discipline / Category
            </label>
            <div className="space-y-1.5">
              {FILTER_TOPICS.map(topic => (
                <label 
                  key={topic} 
                  className={`flex items-center gap-2.5 text-xs font-sans cursor-pointer py-1 px-1.5 rounded-lg transition-colors ${
                    selectedTopic === topic 
                      ? isLight ? 'bg-orange-50 font-semibold text-orange-700' : 'bg-orange-500/10 font-semibold text-orange-400'
                      : isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <input
                    type="radio"
                    name="filter-topic"
                    checked={selectedTopic === topic}
                    onChange={() => setSelectedTopic(topic)}
                    className="accent-orange-500 cursor-pointer"
                  />
                  <span className="truncate">{topic}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Filter by Publisher */}
          <div className="space-y-2 border-t border-slate-200 dark:border-white/5 pt-4">
            <label className={`text-xs font-mono font-bold uppercase tracking-wider block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Publisher
            </label>
            <select
              value={selectedPublisher}
              onChange={e => setSelectedPublisher(e.target.value)}
              className={`w-full p-2 rounded-xl text-xs font-sans border outline-none cursor-pointer ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#151a28] border-white/10 text-white'
              }`}
            >
              {FILTER_PUBLISHERS.map(pub => (
                <option key={pub} value={pub}>{pub}</option>
              ))}
            </select>
          </div>

          {/* Filter by Access */}
          <div className="space-y-2 border-t border-slate-200 dark:border-white/5 pt-4">
            <label className={`text-xs font-mono font-bold uppercase tracking-wider block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Access Type
            </label>
            <div className="flex gap-2">
              {FILTER_ACCESS.map(acc => (
                <button
                  key={acc}
                  onClick={() => setSelectedAccess(acc)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all border cursor-pointer ${
                    selectedAccess === acc
                      ? `${themeClasses?.accentBg || 'bg-orange-600'} text-white border-transparent font-bold`
                      : isLight
                        ? 'bg-slate-100 border-slate-200 text-slate-700'
                        : 'bg-white/5 border-white/5 text-slate-300'
                  }`}
                >
                  {acc}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── RIGHT MAIN TEMPLATE BROWSER ───────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-6 sm:p-8 space-y-6">
          
          {/* Search Header Row */}
          <div className="space-y-3">
            <div className="relative w-full max-w-3xl">
              <Search 
                size={18} 
                className={`absolute left-4 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} 
              />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search Templates (e.g. Zygote, IEEE, Plant, Nature, Brazilian, Sensors)..."
                className={`w-full pl-12 pr-4 py-3 rounded-2xl text-sm font-sans outline-none border transition-all shadow-sm ${
                  isLight 
                    ? 'bg-white border-slate-200 text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20' 
                    : 'bg-[#121622] border-white/10 text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
                }`}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-slate-500">
              <span>Showing {filteredTemplates.length} of {AUTHENTIC_TEMPLATES.length} authentic publication templates</span>
              <span className="hidden sm:inline">Authentic Peer-Reviewed Journal Standard</span>
            </div>
          </div>

          {/* Templates Feed */}
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <BookOpen size={48} className="mx-auto text-slate-400" />
              <h3 className="text-lg font-serif font-bold">No templates match your criteria</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try loosening your filters or clearing your search term to see more authentic journal templates.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedKind('All');
                  setSelectedRanking('All');
                  setSelectedTopic('All');
                  setSelectedPublisher('All');
                  setSelectedAccess('All');
                }}
                className="text-xs font-mono text-orange-500 font-bold hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-6 max-w-5xl">
              {filteredTemplates.map(template => {
                const rankBadgeClass = template.ranking === 'Q1 Journals' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                  : template.ranking === 'Q2 Journals'
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                    : template.ranking === 'Q3 Journals'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                      : 'bg-purple-500/10 border-purple-500/30 text-purple-400';

                return (
                  <div 
                    key={template.id}
                    id={`template-card-${template.id}`}
                    data-testid={`template-card-${template.id}`}
                    onClick={() => setPreviewTemplate(template)}
                    className={`p-6 ${themeClasses?.radius || 'rounded-2xl'} border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md flex flex-col md:flex-row items-stretch justify-between gap-6 group relative backdrop-blur-md ${
                      isLight 
                        ? 'bg-white/95 border-slate-200 hover:border-orange-300' 
                        : `${themeClasses?.bgCard || 'bg-[#121724]/90 border-white/5'} hover:border-orange-500/40`
                    }`}
                  >
                    {/* Left Column: Authentic Metadata */}
                    <div className="flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        {/* Journal Title */}
                        <h3 className={`text-xl font-serif font-bold group-hover:text-orange-500 transition-colors ${
                          isLight ? 'text-slate-900' : 'text-white'
                        }`}>
                          {template.name}
                        </h3>

                        {/* ISSN & Publisher */}
                        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-500 mt-1.5">
                          <span>ISSN: {template.issn}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1.5 font-sans font-medium text-slate-700 dark:text-slate-300">
                            <Building size={14} className="text-slate-400" />
                            {template.publisher}
                          </span>
                        </div>

                        {/* Paper Title */}
                        <p className={`text-xs font-serif italic mt-2.5 line-clamp-1 ${
                          isLight ? 'text-slate-600' : 'text-slate-400'
                        }`}>
                          "{template.paper_title}"
                        </p>

                        {/* Badges row */}
                        <div className="flex flex-wrap items-center gap-2 mt-3.5">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-sans px-2.5 py-1 rounded-md border ${
                            isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-slate-300'
                          }`}>
                            <BookOpen size={12} className="text-orange-500" />
                            {template.kind}
                          </span>

                          <span className={`inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-md border font-semibold ${rankBadgeClass}`}>
                            <Award size={12} />
                            {template.ranking}
                          </span>

                          <span className={`inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-md border ${
                            template.access === 'Open Access'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                          }`}>
                            {template.access === 'Open Access' ? <Unlock size={11}/> : <Lock size={11}/>}
                            {template.access}
                          </span>

                          <span className={`text-[11px] font-sans px-2.5 py-1 rounded-md ${
                            isLight ? 'bg-slate-50 text-slate-500' : 'bg-white/5 text-slate-400'
                          }`}>
                            {template.category}
                          </span>
                        </div>
                      </div>

                      {/* Start Writing Link */}
                      <div className="pt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartWriting(template);
                          }}
                          className="inline-flex items-center gap-2 text-sm font-sans font-bold text-orange-600 hover:text-orange-500 group/btn transition-colors cursor-pointer"
                        >
                          <span>Start Writing</span>
                          <ArrowRight size={15} className="group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>

                    {/* Right Column: Style-Specific Authentic Thumbnail */}
                    {renderThumbnail(template)}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* ── FULL AUTHENTIC PREVIEW MODAL MATCHING USER SCREENSHOT 2 ────────────── */}
      {previewTemplate && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6"
          onClick={() => setPreviewTemplate(null)}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            className="w-full max-w-5xl h-[92vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden bg-slate-900 border border-white/10"
          >
            {/* Top Bar matching Screenshot 2: Author info on left, orange Start Writing on right */}
            <div className="px-6 py-3.5 bg-[#182030] border-b border-white/10 flex items-center justify-between z-20">
              <div className="flex items-center gap-3 text-xs font-mono text-slate-300">
                <span>Author: <strong className="text-white font-serif">{previewTemplate.name}</strong></span>
                <span className="text-slate-500">|</span>
                <span>Ranking: <span className="text-amber-400 font-bold">{previewTemplate.ranking}</span></span>
                <span className="text-slate-500 hidden sm:inline">|</span>
                <span>License: <span className="text-emerald-400 font-medium">{previewTemplate.access}</span></span>
                <span className="text-slate-500 hidden sm:inline">|</span>
                <span className="text-slate-400 hidden sm:inline">{previewTemplate.doi}</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 font-mono text-xs cursor-pointer transition-colors"
                >
                  Close
                </button>
                <button
                  id="modal-start-writing-btn"
                  data-testid="modal-start-writing-btn"
                  onClick={() => {
                    const tmpl = previewTemplate;
                    setPreviewTemplate(null);
                    handleStartWriting(tmpl);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-sans font-bold text-sm shadow-lg hover:shadow-orange-500/25 transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Start Writing</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body: Realistic PDF Page Canvas in Gray Background matching Screenshot 2 */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#525659] flex justify-center custom-scrollbar">
              <div 
                id="authentic-paper-preview-canvas" 
                data-testid="paper-preview-canvas" 
                className="w-full max-w-3xl min-h-[1100px] bg-white text-slate-900 p-8 sm:p-14 shadow-2xl rounded-sm font-serif text-xs leading-relaxed relative flex flex-col justify-between"
              >
                <div>
                  
                  {/* Journal Header Bar matching Screenshot from prompt: 100% EDITABLE! */}
                  <EditableJournalHeader
                    journalName={previewTemplate.journal_label || `${previewTemplate.name.toUpperCase()} · ${previewTemplate.publisher.toUpperCase()}`}
                    volumeIssue={previewTemplate.volume_issue || 'VOL. 48, NO. 9, SEPTEMBER 2026'}
                    doi={previewTemplate.doi || '10.1016/j.pbi.2020.101993'}
                    rankingBadge={
                      previewTemplate.ranking_badge || 
                      `${previewTemplate.access === 'Subscription' ? 'SUBSCRIPTION' : 'OPEN ACCESS'} · ${previewTemplate.ranking.split(' ')[0]}`
                    }
                    layoutStyle={previewTemplate.layout_style || 'elsevier_box'}
                    headerBadge={previewTemplate.header_badge || ''}
                    publisher={previewTemplate.publisher || ''}
                    accentColor={
                      previewTemplate.layout_style === 'ieee_twocolumn' ? '#002855' :
                      previewTemplate.layout_style === 'nature_springer' ? '#b91c1c' :
                      previewTemplate.layout_style === 'mdpi_banner' ? '#1b365d' :
                      previewTemplate.layout_style === 'plos_band' ? '#0d9488' :
                      previewTemplate.layout_style === 'springer_lncs' ? '#1a365d' : '#007398'
                    }
                    onUpdate={(updated) => {
                      setPreviewTemplate(prev => ({
                        ...prev,
                        ...updated,
                        journal_label: updated.journal_name
                      }));
                    }}
                  />

                  {/* Research Paper Title */}
                  <h1 className={`text-2xl font-serif font-bold text-slate-900 leading-snug mb-3 ${
                    previewTemplate.layout_style === 'ieee_twocolumn' ? 'text-center' : ''
                  }`}>
                    {previewTemplate.paper_title}
                  </h1>

                  {/* Authors */}
                  <div className={`text-sm font-bold text-slate-800 mb-1 ${
                    previewTemplate.layout_style === 'ieee_twocolumn' ? 'text-center' : ''
                  }`}>
                    {previewTemplate.authors}
                  </div>

                  {/* Affiliations / Addresses */}
                  <div className={`text-[10px] text-slate-600 space-y-0.5 mb-4 ${
                    previewTemplate.layout_style === 'ieee_twocolumn' ? 'text-center' : ''
                  }`}>
                    <div className="italic">{previewTemplate.affiliations}</div>
                    <div className="font-mono text-slate-500">
                      *Corresponding author: {previewTemplate.authors.split(' ')[0].toLowerCase()}@institution.edu · Received 2026; accepted 2026.
                    </div>
                  </div>

                  {/* Authentic Publication Content based on layout_style */}
                  {previewTemplate.layout_style === 'elsevier_box' ? (
                    /* ── ELSEVIER STYLE: Boxed Abstract with Article History ── */
                    <div className="space-y-6">
                      <div className="bg-slate-50 border border-slate-300 rounded p-4 text-[10.5px]">
                        <div className="flex flex-col sm:flex-row gap-4 border-b border-slate-200 pb-3 mb-3">
                          <div className="w-48 text-[9px] font-sans text-slate-500 space-y-1 shrink-0 border-r border-slate-200 pr-3">
                            <div className="font-bold uppercase text-slate-800 tracking-wider">Article Info</div>
                            <div>Article history:</div>
                            <div>Received 12 January 2026</div>
                            <div>Received in revised form 18 April 2026</div>
                            <div>Accepted 24 May 2026</div>
                            <div>Available online 1 June 2026</div>
                          </div>
                          <div className="flex-1">
                            <strong className="font-sans font-bold uppercase tracking-wider text-[10px] text-slate-900 block mb-1">
                              Abstract
                            </strong>
                            <p className="leading-relaxed text-slate-700">
                              {previewTemplate.abstract}
                            </p>
                            <div className="mt-2 text-[9.5px] font-sans">
                              <strong>Keywords: </strong>{previewTemplate.keywords}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2-Column Sections */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-[10.5px]">
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-sans font-bold uppercase text-[11px] text-slate-900 border-b border-slate-200 pb-1 mb-2">
                              1. {previewTemplate.sections?.[0]?.[0] || 'Introduction'}
                            </h3>
                            <p className="leading-relaxed text-slate-700">
                              {previewTemplate.sections?.[0]?.[1]}
                            </p>
                          </div>
                          <div>
                            <h3 className="font-sans font-bold uppercase text-[11px] text-slate-900 border-b border-slate-200 pb-1 mb-2">
                              2. {previewTemplate.sections?.[1]?.[0] || 'Methodology'}
                            </h3>
                            <p className="leading-relaxed text-slate-700">
                              {previewTemplate.sections?.[1]?.[1]}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-center font-mono text-[10px]">
                            <code>\mathcal&#123;L&#125;(\theta) = \sum_&#123;i=1&#125;^N \nabla \Phi_i(x) + \lambda \|\mathbf&#123;W&#125;\|^2_2</code>
                            <span className="block text-[8px] text-slate-400 mt-1">(Equation 1 · Exact Mathematical Formulation)</span>
                          </div>
                          <div>
                            <h3 className="font-sans font-bold uppercase text-[11px] text-slate-900 border-b border-slate-200 pb-1 mb-2">
                              3. Results and Empirical Benchmark
                            </h3>
                            <p className="leading-relaxed text-slate-700">
                              {previewTemplate.sections?.[2]?.[1] || 'Empirical trials confirm standard convergence properties.'}
                            </p>
                            <div className="mt-2.5 border border-slate-200 rounded p-2 text-[9px] bg-slate-50">
                              <strong className="block text-[9.5px] font-sans text-slate-800 mb-1">Table 1: Benchmark and Experimental Parameters</strong>
                              <div className="flex justify-between border-b border-slate-300 pb-0.5 text-slate-600 font-bold font-mono">
                                <span>Metric / Parameter</span>
                                <span>Baseline</span>
                                <span>Proposed</span>
                              </div>
                              <div className="flex justify-between py-0.5 border-b border-slate-200 text-slate-700">
                                <span>Convergence Rate</span>
                                <span>84.2%</span>
                                <span className="font-bold text-emerald-700">96.8%</span>
                              </div>
                              <div className="flex justify-between py-0.5 text-slate-700">
                                <span>Transmission Fidelity</span>
                                <span>0.912</span>
                                <span className="font-bold text-emerald-700">0.994</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : previewTemplate.layout_style === 'ieee_twocolumn' ? (
                    /* ── IEEE STYLE: 2-Column, Drop Cap, Roman Numerals, Bio Box ── */
                    <div className="space-y-4">
                      {/* Abstract / Index Terms */}
                      <div className="px-4 py-2 border-y border-slate-300 text-[10.5px]">
                        <p className="italic leading-relaxed text-slate-800">
                          <strong className="font-sans font-bold not-italic">Abstract—</strong>{previewTemplate.abstract}
                        </p>
                        <div className="mt-1 font-sans text-[9.5px]">
                          <strong>Index Terms—</strong>{previewTemplate.keywords}
                        </div>
                      </div>

                      {/* Two Column Body */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-[10.5px] pt-2">
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-sans font-bold uppercase text-[11px] text-slate-900 mb-2">
                              I. INTRODUCTION
                            </h3>
                            <p className="leading-relaxed text-slate-700">
                              <span className="float-left text-3xl font-serif font-bold leading-none pr-1.5 pt-0.5 text-slate-900">
                                {previewTemplate.sections?.[0]?.[1]?.[0] || 'T'}
                              </span>
                              {previewTemplate.sections?.[0]?.[1]?.slice(1)}
                            </p>
                          </div>
                          <div>
                            <h3 className="font-sans font-bold uppercase text-[11px] text-slate-900 mb-2">
                              II. SYSTEM MODEL & FORMULATION
                            </h3>
                            <p className="leading-relaxed text-slate-700">
                              {previewTemplate.sections?.[1]?.[1]}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-center font-mono text-[10px]">
                            <code>\min_&#123;\theta&#125; \frac&#123;1&#125;&#123;N&#125; \sum_&#123;i=1&#125;^N \mathcal&#123;L&#125;(f_&#123;\theta&#125;(x_i), y_i) + \lambda \mathcal&#123;R&#125;(\theta)</code>
                            <span className="block text-[8px] text-slate-400 mt-1">(1)</span>
                          </div>
                          <div>
                            <h3 className="font-sans font-bold uppercase text-[11px] text-slate-900 mb-2">
                              III. EXPERIMENTAL RESULTS
                            </h3>
                            <p className="leading-relaxed text-slate-700">
                              {previewTemplate.sections?.[2]?.[1] || 'Evaluation results demonstrate significant accuracy enhancements.'}
                            </p>
                          </div>
                          {/* IEEE Biography Box */}
                          <div className="border border-slate-300 p-2.5 rounded bg-slate-50/50 flex gap-2.5 items-start text-[9px] mt-4">
                            <div className="w-9 h-11 bg-slate-200 border border-slate-300 rounded shrink-0 flex items-center justify-center font-mono text-[7px] text-slate-500">
                              PHOTO
                            </div>
                            <div>
                              <strong className="text-slate-900 font-bold block">{previewTemplate.authors.split(' and ')[0]}</strong>
                              received the Ph.D. degree in engineering. Research interests include theoretical foundations and machine intelligence systems. Member, IEEE.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : previewTemplate.layout_style === 'nature_springer' ? (
                    /* ── NATURE / SPRINGER STYLE: Clean Humanist, Bold Lead Abstract ── */
                    <div className="space-y-4">
                      <div className="border-l-4 border-red-700 pl-4 py-1">
                        <span className="text-[10px] font-sans font-bold uppercase text-red-700 tracking-wider block mb-1">
                          Article Summary & Context
                        </span>
                        <p className="font-serif font-bold text-[12px] leading-relaxed text-slate-900">
                          {previewTemplate.abstract}
                        </p>
                      </div>
                      <div className="h-px bg-slate-200 my-4" />
                      <div className="space-y-4 text-[10.5px]">
                        <div>
                          <h3 className="font-sans font-bold text-[13px] text-slate-900 mb-1">
                            Introduction and Background
                          </h3>
                          <p className="leading-relaxed text-slate-700">
                            {previewTemplate.sections?.[0]?.[1]}
                          </p>
                        </div>
                        <div>
                          <h3 className="font-sans font-bold text-[13px] text-slate-900 mb-1">
                            Key Findings and Molecular Validation
                          </h3>
                          <p className="leading-relaxed text-slate-700">
                            {previewTemplate.sections?.[1]?.[1]}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ── SOCIETY CLASSIC / GENERAL STYLE ── */
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-3.5 rounded border border-slate-200">
                        <strong className="font-sans font-bold uppercase tracking-wider text-[10px] text-slate-900 block mb-1">
                          Abstract
                        </strong>
                        <p className="text-[10.5px] leading-relaxed text-slate-700">
                          {previewTemplate.abstract}
                        </p>
                        <div className="mt-2.5 pt-2 border-t border-slate-200 text-[10px] font-sans">
                          <strong>Keywords: </strong>{previewTemplate.keywords}
                        </div>
                      </div>

                      <div className={`mt-6 gap-6 ${previewTemplate.columns === 2 ? 'grid grid-cols-1 sm:grid-cols-2' : 'space-y-4'}`}>
                        <div className="space-y-4">
                          {previewTemplate.sections?.[0] && (
                            <div>
                              <h3 className="font-sans font-bold uppercase text-[11px] text-slate-900 border-b border-slate-200 pb-1 mb-2">
                                1. {previewTemplate.sections[0][0]}
                              </h3>
                              <p className="text-[10.5px] leading-relaxed text-slate-700">
                                {previewTemplate.sections[0][1]}
                              </p>
                            </div>
                          )}
                          {previewTemplate.sections?.[1] && (
                            <div>
                              <h3 className="font-sans font-bold uppercase text-[11px] text-slate-900 border-b border-slate-200 pb-1 mb-2">
                                2. {previewTemplate.sections[1][0]}
                              </h3>
                              <p className="text-[10.5px] leading-relaxed text-slate-700">
                                {previewTemplate.sections[1][1]}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          {previewTemplate.sections?.[2] && (
                            <div>
                              <h3 className="font-sans font-bold uppercase text-[11px] text-slate-900 border-b border-slate-200 pb-1 mb-2">
                                3. {previewTemplate.sections[2][0]}
                              </h3>
                              <p className="text-[10.5px] leading-relaxed text-slate-700">
                                {previewTemplate.sections[2][1]}
                              </p>
                            </div>
                          )}
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-center font-mono text-[10px] my-2 text-slate-800">
                            <code>\mathcal&#123;L&#125;(\theta) = \sum_&#123;i=1&#125;^N \nabla \Phi_i(x) + \lambda \|\mathbf&#123;W&#125;\|^2_2</code>
                            <span className="block text-[8px] text-slate-400 mt-1">(Equation 1 · Exact Mathematical Formulation)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Authentic Empirical Table */}
                  <div className="border border-slate-200 rounded p-3 text-[9.5px] mt-6">
                    <div className="font-sans font-bold text-slate-800 mb-1.5">
                      Table 1. Empirical Validation & Comparative Baseline Performance across Test Trials
                    </div>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-900 font-bold">
                          <th className="py-1">Model / Pipeline</th>
                          <th className="py-1">Precision (%)</th>
                          <th className="py-1">Recall (%)</th>
                          <th className="py-1">F1 Score</th>
                          <th className="py-1">Throughput</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="py-1">Standard Baseline Model</td>
                          <td className="py-1">87.4 ± 0.3</td>
                          <td className="py-1">85.1 ± 0.4</td>
                          <td className="py-1">86.2</td>
                          <td className="py-1">1,420 ops/s</td>
                        </tr>
                        <tr>
                          <td className="py-1">Iterative Refinement Approach</td>
                          <td className="py-1">91.2 ± 0.2</td>
                          <td className="py-1">89.8 ± 0.3</td>
                          <td className="py-1">90.5</td>
                          <td className="py-1">2,180 ops/s</td>
                        </tr>
                        <tr className="font-bold text-orange-600 bg-orange-50/50">
                          <td className="py-1">Our Authentic Framework</td>
                          <td className="py-1">96.8 ± 0.1</td>
                          <td className="py-1">95.4 ± 0.2</td>
                          <td className="py-1">96.1</td>
                          <td className="py-1">4,850 ops/s</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* References list */}
                  <div className="mt-6 pt-4 border-t border-slate-300 text-[9px] text-slate-600 space-y-1">
                    <h4 className="font-sans font-bold uppercase text-[10px] text-slate-800 mb-1.5">References</h4>
                    <div>[1] A. Vaswani et al., "Attention is all you need," <em>Advances in Neural Information Processing Systems</em>, vol. 30, 2017.</div>
                    <div>[2] {previewTemplate.authors}, "{previewTemplate.paper_title}," <em>{previewTemplate.name}</em>, {previewTemplate.volume_issue}.</div>
                  </div>
                </div>

                {/* Footer matching Real Paper */}
                <div className="border-t border-slate-200 pt-3 mt-8 flex justify-between items-center text-[9px] font-sans text-slate-400">
                  <span>{previewTemplate.publisher} · {previewTemplate.ranking}</span>
                  <span>Page 1 of 12</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
