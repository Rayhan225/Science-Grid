import React from 'react';
import { Sliders, Database, ArrowRight, Activity, FileText, UploadCloud, BookOpen } from 'lucide-react';

export default function Dashboard({ onSelectTool, telemetry }) {
  const tools = [
    {
      id: 'math-evaluator',
      title: 'Mathematical Evaluator',
      description: 'Ingest technical documents and extract algorithmic boundaries into isolated WebAssembly sandboxes.',
      icon: Sliders,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'group-hover:border-cyan-500/50',
      stats: [
        { label: 'Isolated Nodes', value: telemetry?.isolatedPages || 0 },
        { label: 'Validated Formulations', value: telemetry?.validatedNodes || 0 }
      ]
    },
    {
      id: 'central-vault',
      title: 'Central Repository Vault',
      description: 'Global file management. Upload and vectorize 50+ page documents for instantaneous cross-tool access.',
      icon: Database,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'group-hover:border-purple-500/50',
      stats: [
        { label: 'System Access', value: 'Global' },
        { label: 'Engine', value: 'pgvector' }
      ]
    },
    {
      id: 'insight-lens',
      title: 'InsightLens Reader',
      description: 'Document Centric Visual Inspector. Hover, target, and inspect element geometry boundaries using live layout parser layers.',
      icon: BookOpen,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'group-hover:border-emerald-500/50',
      stats: [
        { label: 'Mode', value: 'Spatial DOM' },
        { label: 'Parser', value: 'Layout-Aware' }
      ]
    }
  ];

  return (
    <div className="p-8 md:p-12 max-w-[1400px] mx-auto w-full animate-fadeIn pb-32">
      <div className="mb-12">
        <h1 className="text-3xl font-serif text-white tracking-tight mb-3">Command Matrix</h1>
        <p className="text-slate-500 font-light text-sm max-w-2xl leading-relaxed">
          Select an operational module to initiate system tasks. All environments run in secure local sandboxes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              className={`group text-left bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 transition-all duration-300 hover:bg-white/[0.02] ${tool.border} relative overflow-hidden flex flex-col h-full shadow-lg hover:shadow-2xl`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              
              <div className={`w-14 h-14 ${tool.bg} rounded-2xl flex items-center justify-center mb-6 shadow-inner`}>
                <Icon size={24} className={tool.color} />
              </div>
              
              <h3 className="text-lg font-medium text-white mb-3 tracking-wide">{tool.title}</h3>
              <p className="text-xs text-slate-500 font-light leading-relaxed mb-8 flex-grow">
                {tool.description}
              </p>

              <div className="w-full space-y-3 mb-8">
                {tool.stats.map((stat, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{stat.label}</span>
                    <span className={`text-xs font-mono font-bold ${tool.color}`}>{stat.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center text-[10px] font-mono tracking-widest uppercase text-slate-400 group-hover:text-white transition-colors mt-auto">
                Initialize <ArrowRight size={14} className="ml-2 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}