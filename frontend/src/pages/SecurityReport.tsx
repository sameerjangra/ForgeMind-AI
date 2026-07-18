import React, { useState, useEffect } from 'react';
import api from '../api';
import type { Project } from '../types';
import { ShieldAlert, ArrowRight, Loader } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SecurityReportProps {
  project: Project;
  onNavigateToChat: (prefilledQuery: string) => void;
}

interface ThreatItem {
  id: string;
  title: string;
  file: string;
  line: string;
  severity: string;
  impact: string;
  fixQuery: string;
}

const severityStyle = (sev: string) => {
  switch (sev.toLowerCase()) {
    case 'critical': return { label: 'text-red-400',   card: 'hover:border-red-500/30',   btn: 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30'   };
    case 'high':     return { label: 'text-rose-400',  card: 'hover:border-rose-500/30',  btn: 'bg-rose-500/20 border-rose-500/30 text-rose-400 hover:bg-rose-500/30'  };
    case 'medium':   return { label: 'text-amber-400', card: 'hover:border-amber-500/30', btn: 'bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30' };
    case 'low':      return { label: 'text-green-400', card: 'hover:border-green-500/30', btn: 'bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30' };
    default:         return { label: 'text-gray-400',  card: 'hover:border-gray-500/30',  btn: 'bg-gray-500/20 border-gray-500/30 text-gray-400 hover:bg-gray-500/30'  };
  }
};

export const SecurityReport: React.FC<SecurityReportProps> = ({ project, onNavigateToChat }) => {
  const [threatsList, setThreatsList] = useState<ThreatItem[]>([]);
  const [reportContent, setReportContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const issuesRes = await api.get(`/api/projects/${project.id}/scan-issues`);
        setThreatsList(issuesRes.data.security || []);

        const reportRes = await api.get(`/api/projects/${project.id}/report/security`);
        setReportContent(reportRes.data.content || '');
      } catch (err) {
        console.error('Failed to load security report', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [project.id]);

  const criticalCount = threatsList.filter(t => t.severity.toLowerCase() === 'critical').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-rose-500" />
            Security Audit
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            OWASP pattern scan for <span className="text-white font-semibold">{project.name}</span> — checking secrets, token validation, SSL flags, and injection risks.
          </p>
        </div>
        <div className="text-right space-y-1">
          <div className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 font-bold text-sm">
            Security Score: {project.security_score}%
          </div>
          {criticalCount > 0 && (
            <div className="text-[10px] text-red-400 font-bold text-right">{criticalCount} Critical Issue{criticalCount > 1 ? 's' : ''} Found</div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="glass-panel p-10 text-center text-gray-500 rounded-3xl flex items-center justify-center gap-2">
          <Loader className="w-4 h-4 animate-spin" />
          Auditing codebase for security vulnerabilities...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
              Security Vulnerabilities — {threatsList.length} found
            </h3>
            {threatsList.map((threat) => {
              const style = severityStyle(threat.severity);
              const isInfo = threat.severity.toLowerCase() === 'info';
              return (
                <div
                  key={threat.id}
                  className={`glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between transition-all ${style.card}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className={`text-[10px] font-bold ${style.label} tracking-widest uppercase block mb-1`}>
                        {threat.severity} {isInfo ? '' : 'Vulnerability'}
                      </span>
                      <h4 className="text-md font-bold text-white leading-snug">{threat.title}</h4>
                    </div>
                    <div className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-indigo-300 ml-3 shrink-0">
                      {threat.file.split('/').pop()}:{threat.line}
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed mb-5">{threat.impact}</p>

                  <div className="flex justify-between items-center pt-3 border-t border-white/5">
                    <span className="text-[10px] text-gray-500">
                      {isInfo ? 'No action required' : 'Suggested Action: Remediation Plan'}
                    </span>
                    <button
                      onClick={() => onNavigateToChat(threat.fixQuery)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${style.btn}`}
                    >
                      Remediate Code
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-white/5 h-fit overflow-hidden">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Security Agent Output</h3>
            <div className="prose prose-invert prose-xs max-w-none text-xs leading-relaxed text-gray-300 space-y-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportContent}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SecurityReport;
