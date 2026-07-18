import React, { useState, useEffect } from 'react';
import api from '../api';
import type { Project } from '../types';
import { Bug, ArrowRight, Loader } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface BugReportProps {
  project: Project;
  onNavigateToChat: (prefilledQuery: string) => void;
}

interface BugItem {
  id: string;
  title: string;
  file: string;
  line: string;
  impact: string;
  severity: string;
  fixQuery: string;
}

const severityStyle = (sev: string) => {
  switch (sev.toLowerCase()) {
    case 'high':   return { label: 'text-rose-400',   card: 'hover:border-rose-500/30'   };
    case 'medium': return { label: 'text-amber-400',  card: 'hover:border-amber-500/30'  };
    case 'low':    return { label: 'text-green-400',  card: 'hover:border-green-500/30'  };
    case 'info':   return { label: 'text-gray-400',   card: 'hover:border-gray-500/30'   };
    default:       return { label: 'text-brand-accent', card: 'hover:border-brand-accent/30' };
  }
};

export const BugReport: React.FC<BugReportProps> = ({ project, onNavigateToChat }) => {
  const [bugsList, setBugsList] = useState<BugItem[]>([]);
  const [reportContent, setReportContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Fetch structured dynamic issues
        const issuesRes = await api.get(`/api/projects/${project.id}/scan-issues`);
        setBugsList(issuesRes.data.bugs || []);

        // Fetch the raw markdown agent report
        const reportRes = await api.get(`/api/projects/${project.id}/report/bugs`);
        setReportContent(reportRes.data.content || '');
      } catch (err) {
        console.error('Failed to load bug report', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [project.id]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Bug className="w-8 h-8 text-brand-accent" />
          Bug Scan Report
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Live static analysis for <span className="text-white font-semibold">{project.name}</span> — detecting N+1 loops, bare exceptions, TODOs, and logical errors.
        </p>
      </div>

      {loading ? (
        <div className="glass-panel p-10 text-center text-gray-500 rounded-3xl flex items-center justify-center gap-2">
          <Loader className="w-4 h-4 animate-spin" />
          Scanning codebase for logical bugs...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dynamic Issue Cards */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
              Logic & Flow Alerts — {bugsList.length} found
            </h3>
            {bugsList.map((bug) => {
              const style = severityStyle(bug.severity);
              const isInfo = bug.severity.toLowerCase() === 'info';
              return (
                <div
                  key={bug.id}
                  className={`glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between transition-all ${style.card}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className={`text-[10px] font-bold ${style.label} tracking-widest uppercase block mb-1`}>
                        {bug.severity} {isInfo ? '' : 'Severity'}
                      </span>
                      <h4 className="text-md font-bold text-white leading-snug">{bug.title}</h4>
                    </div>
                    <div className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-indigo-300 ml-3 shrink-0">
                      {bug.file.split('/').pop()}:{bug.line}
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed mb-5">{bug.impact}</p>

                  <div className="flex justify-between items-center pt-3 border-t border-white/5">
                    <span className="text-[10px] text-gray-500">
                      {isInfo ? 'No action required' : 'Suggested Action: Code Refactoring'}
                    </span>
                    <button
                      onClick={() => onNavigateToChat(bug.fixQuery)}
                      className="px-3.5 py-1.5 rounded-lg bg-brand-accent/20 border border-brand-accent/30 text-xs font-bold text-brand-accent hover:bg-brand-accent/30 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      Fix with AI Agent
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Agent Report Panel */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 h-fit overflow-hidden">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Agent Summary Report</h3>
            <div className="prose prose-invert prose-xs max-w-none text-xs leading-relaxed text-gray-300 space-y-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportContent}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default BugReport;
