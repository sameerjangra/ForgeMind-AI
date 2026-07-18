import React, { useState, useEffect } from 'react';
import api from '../api';
import type { Project } from '../types';
import { Zap, ArrowRight, Loader } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PerformanceProps {
  project: Project;
  onNavigateToChat: (prefilledQuery: string) => void;
}

interface OptItem {
  id: string;
  title: string;
  file: string;
  line: string;
  impact: string;
  difficulty: string;
  fixQuery: string;
}

const difficultyStyle = (diff: string) => {
  switch (diff.toLowerCase()) {
    case 'low':    return { label: 'text-green-400',          card: 'hover:border-green-500/30',  btn: 'bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30'  };
    case 'medium': return { label: 'text-amber-400',          card: 'hover:border-amber-500/30',  btn: 'bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30'  };
    case 'high':   return { label: 'text-rose-400',           card: 'hover:border-rose-500/30',   btn: 'bg-rose-500/20 border-rose-500/30 text-rose-400 hover:bg-rose-500/30'   };
    case 'info':   return { label: 'text-gray-400',           card: 'hover:border-gray-500/30',   btn: 'bg-brand-secondary/20 border-brand-secondary/30 text-brand-secondary hover:bg-brand-secondary/30' };
    default:       return { label: 'text-brand-secondary',    card: 'hover:border-brand-secondary/20', btn: 'bg-brand-secondary/20 border-brand-secondary/30 text-brand-secondary hover:bg-brand-secondary/30' };
  }
};

export const Performance: React.FC<PerformanceProps> = ({ project, onNavigateToChat }) => {
  const [optimizationsList, setOptimizationsList] = useState<OptItem[]>([]);
  const [reportContent, setReportContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const issuesRes = await api.get(`/api/projects/${project.id}/scan-issues`);
        setOptimizationsList(issuesRes.data.performance || []);

        const reportRes = await api.get(`/api/projects/${project.id}/report/performance`);
        setReportContent(reportRes.data.content || '');
      } catch (err) {
        console.error('Failed to load performance report', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [project.id]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Zap className="w-8 h-8 text-brand-secondary" />
            Performance Optimizer
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Runtime hotspot analysis for <span className="text-white font-semibold">{project.name}</span> — detecting N+1 queries, blocking I/O, oversized modules, and memory risks.
          </p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-brand-secondary/10 border border-brand-secondary/25 text-brand-secondary font-bold text-sm">
          Performance Score: {project.performance_score}%
        </div>
      </div>

      {loading ? (
        <div className="glass-panel p-10 text-center text-gray-500 rounded-3xl flex items-center justify-center gap-2">
          <Loader className="w-4 h-4 animate-spin" />
          Analyzing runtime performance profiles...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
              Performance Hotspots — {optimizationsList.length} found
            </h3>
            {optimizationsList.map((opt) => {
              const style = difficultyStyle(opt.difficulty);
              const isInfo = opt.difficulty.toLowerCase() === 'info';
              return (
                <div
                  key={opt.id}
                  className={`glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between transition-all ${style.card}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className={`text-[10px] font-bold ${style.label} tracking-widest uppercase block mb-1`}>
                        {opt.difficulty} {isInfo ? '' : 'Difficulty Fix'}
                      </span>
                      <h4 className="text-md font-bold text-white leading-snug">{opt.title}</h4>
                    </div>
                    <div className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-indigo-300 ml-3 shrink-0">
                      {opt.file.split('/').pop()}:{opt.line}
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed mb-5">{opt.impact}</p>

                  <div className="flex justify-between items-center pt-3 border-t border-white/5">
                    <span className="text-[10px] text-gray-500">
                      {isInfo ? 'No action required' : 'Target Area: Performance Optimization'}
                    </span>
                    <button
                      onClick={() => onNavigateToChat(opt.fixQuery)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${style.btn}`}
                    >
                      Optimize Code
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-white/5 h-fit overflow-hidden">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Optimizer Agent Output</h3>
            <div className="prose prose-invert prose-xs max-w-none text-xs leading-relaxed text-gray-300 space-y-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportContent}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Performance;
