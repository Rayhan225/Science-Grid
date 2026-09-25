import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Copy, Check, Code, Sparkles, BookmarkPlus, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { sanitizeKatexString } from '../aiHelper';

const rehypeKatexOptions = [rehypeKatex, { strict: false, throwOnError: false }];

/**
 * Pre-processes LLM responses to ensure LaTeX math syntax is parsed precisely by remark-math & KaTeX:
 * 1. Converts \( ... \) inline math to $ ... $
 * 2. Converts \[ ... \] block math to $$ ... $$
 * 3. Normalizes unescaped unicode math symbols into KaTeX commands
 * 4. Ensures display math blocks have newlines around them
 */
export function formatLLMResponseText(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText;

  // 1. Sanitize unicode characters that break strict KaTeX
  text = sanitizeKatexString(text);

  // 2. Convert \[ ... \] display math delimiters to $$ ... $$
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, inner) => {
    return `\n\n$$\n${inner.trim()}\n$$\n\n`;
  });

  // 3. Convert \( ... \) inline math delimiters to $ ... $
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (match, inner) => {
    return `$${inner.trim()}$`;
  });

  // 4. Wrap standalone LaTeX environments (\begin{equation} etc.) in $$ if not already
  text = text.replace(/(?<!\$)\\(begin\{(?:equation|align|gather|matrix|bmatrix|pmatrix|cases)\*?\}[\s\S]*?\\end\{(?:equation|align|gather|matrix|bmatrix|pmatrix|cases)\*?\})(?!\$)/g, (match) => {
    return `\n\n$$\n${match.trim()}\n$$\n\n`;
  });

  // 5. Ensure display math $$ has clean separation from surrounding prose
  text = text.replace(/([^\n])\$\$([^\n])/g, '$1\n\n$$\n$2');

  return text;
}

/**
 * Extracts math equations from text for the "Precise Formula Inspector"
 */
function extractMathFormulas(text) {
  if (!text) return [];
  const formulas = [];
  
  // Extract block math $$...$$
  const blockMatches = text.matchAll(/\$\$([\s\S]*?)\$\$/g);
  for (const m of blockMatches) {
    if (m[1] && m[1].trim()) {
      formulas.push({ type: 'block', formula: m[1].trim() });
    }
  }

  // Extract inline math $...$
  const inlineMatches = text.matchAll(/(?<!\$)\$([^$\n]+)\$(?!\$)/g);
  for (const m of inlineMatches) {
    if (m[1] && m[1].trim() && !formulas.some(f => f.formula === m[1].trim())) {
      formulas.push({ type: 'inline', formula: m[1].trim() });
    }
  }

  return formulas;
}

function CodeBlock({ children, className, inline, ...props }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const codeContent = String(children).replace(/\n$/, '');

  if (inline) {
    return (
      <code className="px-1.5 py-0.5 rounded font-mono text-[0.85em] bg-white/10 text-cyan-300 border border-white/10" {...props}>
        {children}
      </code>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3 rounded-xl overflow-hidden border border-white/15 bg-black/40 shadow-xl">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-white/[0.04] border-b border-white/10 text-xs font-mono text-slate-400">
        <span className="uppercase tracking-wider font-semibold text-[11px] text-cyan-400 flex items-center gap-1.5">
          <Code size={13} /> {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono hover:text-white hover:bg-white/10 transition-colors"
          title="Copy code"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-[13px] font-mono text-slate-200 leading-relaxed custom-scrollbar">
        <code className={className} {...props}>
          {codeContent}
        </code>
      </pre>
    </div>
  );
}

export default function LLMResponseView({
  content,
  citations = [],
  page,
  isLight = false,
  onSaveToNotes,
  showFormulaInspector = true,
  className = ''
}) {
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);

  const formattedContent = React.useMemo(() => formatLLMResponseText(content), [content]);
  const extractedFormulas = React.useMemo(() => extractMathFormulas(formattedContent), [formattedContent]);

  const handleCopyAll = () => {
    navigator.clipboard.writeText(content);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  return (
    <div className={`llm-reply-wrapper text-sm font-sans ${className}`}>
      {/* Main Markdown Body with KaTeX & Code Blocks */}
      <div className={`llm-prose prose max-w-none select-text ${isLight ? 'prose-slate text-slate-800' : 'prose-invert text-slate-100'} [&_strong]:text-cyan-400 [&_strong]:font-semibold [&_h1]:text-cyan-400 [&_h2]:text-cyan-300 [&_h3]:text-cyan-300 [&_a]:text-cyan-400 [&_a]:underline`}>
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatexOptions]}
          components={{
            code: CodeBlock,
            table: ({ children }) => (
              <div className="overflow-x-auto my-3 rounded-xl border border-white/10 shadow-lg">
                <table className="w-full text-left border-collapse text-xs sm:text-sm font-sans">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className={`px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b ${isLight ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-white/10 border-white/15 text-cyan-300'}`}>
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className={`px-3 py-2 border-b text-xs sm:text-sm ${isLight ? 'border-slate-200 text-slate-800' : 'border-white/5 text-slate-200'}`}>
                {children}
              </td>
            )
          }}
        >
          {formattedContent}
        </ReactMarkdown>
      </div>

      {/* Citations Row */}
      {Array.isArray(citations) && citations.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mr-1">Sources:</span>
          {citations.map((c, idx) => {
            const pageNum = (c && (c.page ?? c.page_number)) || 1;
            const snippet = (c && c.snippet) || '';
            return (
              <span
                key={idx}
                className={`text-[11px] font-mono px-2 py-0.5 rounded-md border flex items-center gap-1 transition-colors ${
                  isLight 
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' 
                    : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-cyan-300'
                }`}
                title={snippet}
              >
                <FileText size={10} className="text-cyan-400" />
                [Page {pageNum}]
              </span>
            );
          })}
        </div>
      )}

      {/* Action Footer: Copy full response, Save to Notes, Formula Inspector */}
      <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-3">
          {extractedFormulas.length > 0 && showFormulaInspector && (
            <button
              onClick={() => setShowFormulas(!showFormulas)}
              className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
              title="Inspect exact raw LaTeX math formulas"
            >
              <Sparkles size={12} />
              <span>{extractedFormulas.length} LaTeX Formula{extractedFormulas.length > 1 ? 's' : ''}</span>
              {showFormulas ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onSaveToNotes && (
            <button
              onClick={onSaveToNotes}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-slate-300 hover:text-emerald-400 hover:bg-white/5 transition-colors cursor-pointer"
              title="Save to Research Notebook"
            >
              <BookmarkPlus size={12} />
              <span>Pin Note</span>
            </button>
          )}

          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-slate-300 hover:text-cyan-300 hover:bg-white/5 transition-colors cursor-pointer"
            title="Copy entire response"
          >
            {copiedResponse ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copiedResponse ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Collapsible Precise LaTeX Formula Inspector */}
      {showFormulas && extractedFormulas.length > 0 && (
        <div className={`mt-2.5 p-3 rounded-xl border text-xs font-mono space-y-2.5 animate-fadeIn ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-black/40 border-white/10 text-slate-200'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-cyan-400">
            <span>Precise Mathematical Formulations</span>
            <span className="text-slate-500 font-normal">Click to copy raw LaTeX</span>
          </div>
          <div className="space-y-2">
            {extractedFormulas.map((item, fIdx) => (
              <div
                key={fIdx}
                onClick={() => {
                  navigator.clipboard.writeText(item.formula);
                }}
                className={`p-2 rounded-lg border cursor-pointer group transition-all ${
                  isLight 
                    ? 'bg-white hover:bg-slate-100 border-slate-200' 
                    : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10'
                }`}
                title="Click to copy LaTeX code"
              >
                <div className="flex items-center justify-between mb-1 text-[10px] text-slate-500 font-mono">
                  <span>{item.type === 'block' ? 'Display Math' : 'Inline Math'} #{fIdx + 1}</span>
                  <span className="opacity-0 group-hover:opacity-100 text-cyan-400 flex items-center gap-1">
                    <Copy size={10} /> Copy LaTeX
                  </span>
                </div>
                <code className="text-xs text-amber-300 font-mono block break-all whitespace-pre-wrap select-all">
                  {item.formula}
                </code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
