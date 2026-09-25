// src/components/DesignTypographyCustomizer.jsx
import React from 'react';
import { 
  Palette, Type, Columns, Sliders, RotateCcw, X, Check, Sparkles, 
  AlignLeft, AlignJustify, Eye, BookOpen, Layers
} from 'lucide-react';

export const PUBLISHER_PALETTES = [
  { name: 'Elsevier Teal', hex: '#007398', desc: 'ScienceDirect / Elsevier' },
  { name: 'Elsevier Orange', hex: '#eb6534', desc: 'ScienceDirect Brand' },
  { name: 'IEEE Navy', hex: '#002855', desc: 'IEEE Transactions' },
  { name: 'Nature Crimson', hex: '#b91c1c', desc: 'Nature Portfolio' },
  { name: 'MDPI Sapphire', hex: '#1b365d', desc: 'MDPI Open Access' },
  { name: 'PLOS Teal', hex: '#0d9488', desc: 'PLOS ONE Research' },
  { name: 'Springer Navy', hex: '#1a365d', desc: 'Springer LNCS' },
  { name: 'Cambridge Navy', hex: '#002b49', desc: 'Cambridge Univ. Press' },
  { name: 'Cell Cobalt', hex: '#00539b', desc: 'Cell Press' },
  { name: 'Emerald Green', hex: '#16a34a', desc: 'Open Science' },
  { name: 'Oxford Crimson', hex: '#990000', desc: 'Oxford Academic' },
  { name: 'Slate Academic', hex: '#334155', desc: 'Classic Charcoal' },
];

export const FONT_OPTIONS = [
  { id: 'computer_modern', name: 'Computer Modern (LaTeX Default)', family: "'Latin Modern Roman', 'CMU Serif', 'Computer Modern', 'Newsreader', serif" },
  { id: 'times', name: 'Times New Roman (IEEE / ACM / Elsevier)', family: "'Times New Roman', 'Nimbus Roman No9 L', Times, serif" },
  { id: 'palatino', name: 'Palatino / Book Antiqua (Springer)', family: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" },
  { id: 'garamond', name: 'EB Garamond (Classic Literature & Science)', family: "'EB Garamond', Garamond, Georgia, serif" },
  { id: 'sans', name: 'Inter / Humanist Sans (Clean Modern)', family: "'Inter', system-ui, -apple-system, sans-serif" }
];

export const PRESET_OPTIONS = [
  { id: 'elsevier_box', name: 'Elsevier Boxed', badge: 'ScienceDirect', desc: 'Boxed abstract, article history dates, clean serif rules' },
  { id: 'ieee_twocolumn', name: 'IEEE Transactions', badge: 'IEEE 2-Col', desc: 'Centered title, drop cap, Roman numerals, author bio box' },
  { id: 'nature_springer', name: 'Nature Portfolio', badge: 'Nature Lead', desc: 'Crimson banner, bold lead summary bar, humanist typography' },
  { id: 'mdpi_banner', name: 'MDPI Open Access', badge: 'MDPI OA', desc: 'Sapphire & emerald banner, modern two-column layout' },
  { id: 'plos_band', name: 'PLOS ONE Band', badge: 'PLOS ONE', desc: 'Teal masthead band, open access citation format' },
  { id: 'springer_lncs', name: 'Springer LNCS', badge: 'LNCS 1-Col', desc: 'Single-column computer science lecture notes style' },
  { id: 'society_classic', name: 'Society Classic', badge: 'Classic', desc: 'Double-rule traditional scholarly format' },
];

export const PAPER_TONES = [
  { id: '#ffffff', name: 'Pure White', bg: '#ffffff', border: '#e2e8f0' },
  { id: '#fcfbf7', name: 'Ivory Page', bg: '#fcfbf7', border: '#e6e4dc' },
  { id: '#faf8f5', name: 'Warm Cream', bg: '#faf8f5', border: '#e8e4dc' },
  { id: '#f4f6f8', name: 'Soft Cool', bg: '#f4f6f8', border: '#dde2e6' },
];

export default function DesignTypographyCustomizer({
  customization,
  onChange,
  onResetToTemplate,
  onClose,
  activeTemplateName = 'Authentic Template',
  isLight = true
}) {
  const updateField = (field, value) => {
    onChange({
      ...customization,
      [field]: value
    });
  };

  return (
    <div 
      data-testid="design-typography-customizer-drawer"
      className={`w-full max-w-full flex flex-col h-full z-30 shadow-2xl select-none overflow-x-hidden ${
        isLight ? 'bg-white/95 border-slate-200 text-slate-800' : 'bg-[#0f1420]/95 border-white/10 text-slate-200'
      }`}
    >
      {/* Header */}
      <div className={`p-4 border-b flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
        <div className="flex items-center gap-2">
          <Palette size={16} className={isLight ? 'text-indigo-600' : 'text-cyan-400'} />
          <span className="font-mono text-xs font-bold uppercase tracking-wider">
            Design & Typography
          </span>
        </div>
        <button 
          onClick={onClose}
          className={`p-1 rounded cursor-pointer ${isLight ? 'hover:bg-slate-100 text-slate-400 hover:text-slate-700' : 'hover:bg-white/10 text-slate-400 hover:text-white'}`}
          title="Close Customizer"
        >
          <X size={15} />
        </button>
      </div>

      {/* Scrollable controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar text-xs font-sans">
        
        {/* Active Template Notice & Quick Reset */}
        <div className={`p-3 rounded-xl border flex items-center justify-between ${
          isLight ? 'bg-indigo-50/60 border-indigo-200 text-indigo-900' : 'bg-cyan-950/40 border-cyan-800/40 text-cyan-200'
        }`}>
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-mono uppercase block font-bold opacity-75">Template In Use</span>
            <span className="font-bold truncate block">{activeTemplateName}</span>
          </div>
          <button
            type="button"
            data-testid="reset-template-defaults-btn"
            onClick={onResetToTemplate}
            className={`px-2.5 py-1.5 rounded-lg border font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs shrink-0 ${
              isLight 
                ? 'bg-white hover:bg-slate-50 text-indigo-700 border-indigo-200' 
                : 'bg-white/10 hover:bg-white/15 text-cyan-300 border-cyan-400/30'
            }`}
            title="Reset all styling back to this template's original specifications"
          >
            <RotateCcw size={11} />
            <span>Reset Defaults</span>
          </button>
        </div>

        {/* ── SECTION 1: PRESET SELECTION ─────────────────────────────────────── */}
        <div className="space-y-2.5">
          <label className={`font-mono text-[11px] font-bold uppercase flex items-center gap-1.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <Sparkles size={12} className={isLight ? 'text-indigo-500' : 'text-cyan-400'} />
            <span>Publisher Layout Preset</span>
          </label>
          <div className="grid grid-cols-1 gap-1.5">
            {PRESET_OPTIONS.map(preset => {
              const active = customization.preset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`preset-btn-${preset.id}`}
                  onClick={() => updateField('preset', preset.id)}
                  className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                    active
                      ? (isLight 
                          ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400 text-indigo-950 shadow-xs' 
                          : 'bg-cyan-500/15 border-cyan-400 ring-1 ring-cyan-400 text-white shadow-xs')
                      : (isLight 
                          ? 'bg-white border-slate-200 hover:border-slate-300 text-slate-700' 
                          : 'bg-white/5 border-white/10 hover:border-white/20 text-slate-300')
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-xs">{preset.name}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                      active 
                        ? (isLight ? 'bg-indigo-200/80 text-indigo-900' : 'bg-cyan-400/20 text-cyan-300')
                        : (isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/10 text-slate-400')
                    }`}>
                      {preset.badge}
                    </span>
                  </div>
                  <p className={`text-[10px] leading-tight ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {preset.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── SECTION 2: COLORS & ACCENTS ─────────────────────────────────────── */}
        <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-white/10">
          <label className={`font-mono text-[11px] font-bold uppercase flex items-center gap-1.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <Palette size={12} className={isLight ? 'text-indigo-500' : 'text-cyan-400'} />
            <span>Primary Brand & Accent Color</span>
          </label>
          
          {/* Quick Swatches */}
          <div className="grid grid-cols-4 gap-2">
            {PUBLISHER_PALETTES.map(p => {
              const active = (customization.accentColor || '').toLowerCase() === p.hex.toLowerCase();
              return (
                <button
                  key={p.hex}
                  type="button"
                  onClick={() => updateField('accentColor', p.hex)}
                  title={`${p.name} (${p.desc})`}
                  className={`h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all border relative ${
                    active ? 'ring-2 ring-offset-2 ring-indigo-500 scale-105' : 'hover:scale-102 border-transparent'
                  }`}
                  style={{ backgroundColor: p.hex }}
                >
                  {active && <Check size={14} className="text-white drop-shadow-md" />}
                </button>
              );
            })}
          </div>

          {/* Custom Color Input & Hex Code */}
          <div className="flex items-center gap-2 pt-1">
            <input 
              type="color"
              value={customization.accentColor || '#007398'}
              onChange={e => updateField('accentColor', e.target.value)}
              className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-white/20 p-0.5 bg-transparent"
              title="Pick any custom accent color"
            />
            <div className="flex-1 flex items-center gap-1">
              <span className="font-mono text-slate-400 text-xs">HEX:</span>
              <input 
                type="text"
                value={customization.accentColor || '#007398'}
                onChange={e => updateField('accentColor', e.target.value)}
                className={`w-full font-mono text-xs px-2 py-1 rounded-lg border outline-none ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white' : 'bg-white/5 border-white/15 text-white focus:bg-white/10'
                }`}
                placeholder="#007398"
              />
            </div>
          </div>

          {/* Paper Canvas Background Tone */}
          <div className="space-y-1.5 pt-2">
            <span className={`text-[10px] font-mono uppercase font-bold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Paper Sheet Tone
            </span>
            <div className="grid grid-cols-4 gap-2">
              {PAPER_TONES.map(tone => {
                const active = (customization.paperTone || '#ffffff').toLowerCase() === tone.id.toLowerCase();
                return (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => updateField('paperTone', tone.id)}
                    className={`h-7 rounded-lg text-[9px] font-sans font-bold cursor-pointer border flex items-center justify-center transition-all ${
                      active ? 'ring-2 ring-indigo-500 font-extrabold shadow-xs' : 'hover:border-slate-400 text-slate-700'
                    }`}
                    style={{ backgroundColor: tone.bg, borderColor: tone.border }}
                  >
                    <span>{tone.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── SECTION 3: TYPOGRAPHY ────────────────────────────────────────────── */}
        <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-white/10">
          <label className={`font-mono text-[11px] font-bold uppercase flex items-center gap-1.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <Type size={12} className={isLight ? 'text-indigo-500' : 'text-cyan-400'} />
            <span>Academic Typography</span>
          </label>

          {/* Font Family */}
          <div className="space-y-1">
            <span className={`text-[10px] font-mono uppercase font-bold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Font Family
            </span>
            <select
              value={customization.fontFamily || 'computer_modern'}
              onChange={e => updateField('fontFamily', e.target.value)}
              className={`w-full p-2 rounded-xl border text-xs outline-none cursor-pointer ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-white/5 border-white/15 text-white'
              }`}
            >
              {FONT_OPTIONS.map(f => (
                <option key={f.id} value={f.id} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size & Line Spacing */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className={`text-[10px] font-mono uppercase font-bold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Base Size: {customization.fontSize || 11}px
              </span>
              <div className="flex gap-1">
                {[10, 10.5, 11, 12, 13].map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => updateField('fontSize', sz)}
                    className={`flex-1 py-1 rounded text-[10px] font-mono font-bold border cursor-pointer transition-colors ${
                      (customization.fontSize || 11) === sz
                        ? (isLight ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-cyan-500 text-white border-cyan-500')
                        : (isLight ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10')
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <span className={`text-[10px] font-mono uppercase font-bold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Line Height
              </span>
              <div className="flex gap-1">
                {[
                  { label: 'Tight', val: 1.38 },
                  { label: 'Norm', val: 1.55 },
                  { label: 'Relax', val: 1.75 }
                ].map(lh => (
                  <button
                    key={lh.label}
                    type="button"
                    onClick={() => updateField('lineHeight', lh.val)}
                    className={`flex-1 py-1 rounded text-[10px] font-mono font-bold border cursor-pointer transition-colors ${
                      Math.abs((customization.lineHeight || 1.55) - lh.val) < 0.05
                        ? (isLight ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-cyan-500 text-white border-cyan-500')
                        : (isLight ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10')
                    }`}
                  >
                    {lh.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Text Justification */}
          <div className="flex items-center justify-between pt-1 gap-2">
            <span className={`text-[11px] font-medium min-w-0 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Justify Body Paragraphs (Academic standard)
            </span>
            <button
              type="button"
              onClick={() => updateField('textJustify', !customization.textJustify)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                customization.textJustify 
                  ? (isLight ? 'bg-indigo-600' : 'bg-cyan-500') 
                  : (isLight ? 'bg-slate-300' : 'bg-white/20')
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                customization.textJustify ? 'left-6' : 'left-1'
              }`} />
            </button>
          </div>

          {/* Title Sizing & Alignment */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <span className={`text-[10px] font-mono uppercase font-bold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Title Alignment
              </span>
              <div className="flex rounded-lg border border-slate-300 dark:border-white/15 overflow-hidden">
                <button
                  type="button"
                  onClick={() => updateField('titleAlign', 'left')}
                  className={`flex-1 py-1 flex justify-center items-center cursor-pointer ${
                    customization.titleAlign === 'left' ? (isLight ? 'bg-indigo-100 text-indigo-800' : 'bg-cyan-500/20 text-cyan-300') : 'text-slate-500'
                  }`}
                >
                  <AlignLeft size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => updateField('titleAlign', 'center')}
                  className={`flex-1 py-1 flex justify-center items-center cursor-pointer ${
                    customization.titleAlign === 'center' ? (isLight ? 'bg-indigo-100 text-indigo-800' : 'bg-cyan-500/20 text-cyan-300') : 'text-slate-500'
                  }`}
                >
                  <AlignJustify size={13} />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <span className={`text-[10px] font-mono uppercase font-bold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Title Size
              </span>
              <select
                value={customization.titleSize || 22}
                onChange={e => updateField('titleSize', Number(e.target.value))}
                className={`w-full p-1.5 rounded-lg border text-xs outline-none cursor-pointer ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-white/5 border-white/15 text-white'
                }`}
              >
                <option value={18}>18px (Compact)</option>
                <option value={20}>20px (Medium)</option>
                <option value={22}>22px (Standard)</option>
                <option value={24}>24px (Large)</option>
                <option value={28}>28px (Hero)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── SECTION 4: LAYOUT & SECTIONS ─────────────────────────────────────── */}
        <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-white/10">
          <label className={`font-mono text-[11px] font-bold uppercase flex items-center gap-1.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <Columns size={12} className={isLight ? 'text-indigo-500' : 'text-cyan-400'} />
            <span>Layout Columns & Elements</span>
          </label>

          {/* Column Count */}
          <div className="space-y-1">
            <span className={`text-[10px] font-mono uppercase font-bold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Page Column Layout
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateField('columns', 1)}
                className={`p-2 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all ${
                  (customization.columns || 2) === 1
                    ? (isLight ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-1 ring-indigo-500' : 'bg-cyan-500/20 border-cyan-400 text-white ring-1 ring-cyan-400')
                    : (isLight ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-white/5 border-white/10 text-slate-300')
                }`}
              >
                1 Column (Thesis / LNCS)
              </button>
              <button
                type="button"
                onClick={() => updateField('columns', 2)}
                className={`p-2 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all ${
                  (customization.columns || 2) === 2
                    ? (isLight ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-1 ring-indigo-500' : 'bg-cyan-500/20 border-cyan-400 text-white ring-1 ring-cyan-400')
                    : (isLight ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-white/5 border-white/10 text-slate-300')
                }`}
              >
                2 Columns (IEEE / Elsevier)
              </button>
            </div>
          </div>

          {/* Column Gap & Divider */}
          {(customization.columns || 2) === 2 && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <span className={`text-[10px] font-mono uppercase font-bold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Column Gap
                </span>
                <select
                  value={customization.columnGap || 24}
                  onChange={e => updateField('columnGap', Number(e.target.value))}
                  className={`w-full p-1.5 rounded-lg border text-xs outline-none cursor-pointer ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-white/5 border-white/15 text-white'
                  }`}
                >
                  <option value={16}>16px (Dense)</option>
                  <option value={20}>20px (Compact)</option>
                  <option value={24}>24px (Standard)</option>
                  <option value={32}>32px (Spacious)</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className={`text-[10px] font-mono uppercase font-bold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Column Divider Rule
                </span>
                <button
                  type="button"
                  onClick={() => updateField('columnDivider', !customization.columnDivider)}
                  className={`w-full py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                    customization.columnDivider 
                      ? (isLight ? 'bg-indigo-100 text-indigo-800 border-indigo-300' : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40')
                      : (isLight ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-white/5 text-slate-400 border-white/10')
                  }`}
                >
                  {customization.columnDivider ? 'Rule Enabled' : 'No Rule'}
                </button>
              </div>
            </div>
          )}

          {/* Drop Cap & Roman Numerals */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[11px] font-medium min-w-0 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Drop Cap on Section 1 (Traditional IEEE style)
              </span>
              <button
                type="button"
                onClick={() => updateField('dropCap', !customization.dropCap)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  customization.dropCap 
                    ? (isLight ? 'bg-indigo-600' : 'bg-cyan-500') 
                    : (isLight ? 'bg-slate-300' : 'bg-white/20')
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  customization.dropCap ? 'left-6' : 'left-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className={`text-[11px] font-medium min-w-0 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Section Numbering
              </span>
              <select
                value={customization.headingNumbering || 'arabic'}
                onChange={e => updateField('headingNumbering', e.target.value)}
                className={`p-1 rounded-lg border text-xs outline-none cursor-pointer shrink-0 ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-white/5 border-white/15 text-white'
                }`}
              >
                <option value="arabic">1, 2, 3 (Arabic)</option>
                <option value="roman">I, II, III (Roman)</option>
                <option value="none">Unnumbered</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className={`text-[11px] font-medium min-w-0 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Article History Box (Received/Accepted)
              </span>
              <button
                type="button"
                onClick={() => updateField('showArticleInfo', !customization.showArticleInfo)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  customization.showArticleInfo 
                    ? (isLight ? 'bg-indigo-600' : 'bg-cyan-500') 
                    : (isLight ? 'bg-slate-300' : 'bg-white/20')
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  customization.showArticleInfo ? 'left-6' : 'left-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className={`text-[11px] font-medium min-w-0 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Author Biography Box (IEEE style)
              </span>
              <button
                type="button"
                onClick={() => updateField('showAuthorBio', !customization.showAuthorBio)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  customization.showAuthorBio 
                    ? (isLight ? 'bg-indigo-600' : 'bg-cyan-500') 
                    : (isLight ? 'bg-slate-300' : 'bg-white/20')
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  customization.showAuthorBio ? 'left-6' : 'left-1'
                }`} />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Actions */}
      <div className={`p-3.5 border-t flex items-center justify-between ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'}`}>
        <button
          type="button"
          onClick={onResetToTemplate}
          className={`px-3 py-1.5 rounded-lg border font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
            isLight ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300' : 'bg-white/10 hover:bg-white/15 text-slate-200 border-white/15'
          }`}
        >
          <RotateCcw size={12} />
          <span>Reset All</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer shadow-md transition-all ${
            isLight ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-cyan-600 hover:bg-cyan-500'
          }`}
        >
          Apply & Done
        </button>
      </div>
    </div>
  );
}
