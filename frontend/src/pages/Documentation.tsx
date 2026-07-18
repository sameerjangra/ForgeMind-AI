import React, { useState, useEffect } from 'react';
import api from '../api';
import type { Project } from '../types';
import { BookOpen, Copy, Check, FileDown } from 'lucide-react';

interface DocumentationProps {
  project: Project;
}

export const Documentation: React.FC<DocumentationProps> = ({ project }) => {
  const [reportHtml, setReportHtml] = useState<string>('');
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/projects/${project.id}/report/documentation`);
        
        let rawMarkdown = res.data.content || '';
        setMarkdown(rawMarkdown);
        
        // Basic parser for documentation view
        let formattedHtml = rawMarkdown
          .replace(/^#\s+(.+)$/gm, '<h2 class="text-xl font-black text-white mt-6 mb-3 border-b border-white/5 pb-2">$1</h2>')
          .replace(/^##\s+(.+)$/gm, '<h3 class="text-md font-extrabold text-white mt-5 mb-2">$1</h3>')
          .replace(/^\s*-\s+(.+)$/gm, '<li class="ml-4 list-disc text-xs text-gray-300 py-1">$1</li>')
          .replace(/`([^`]+)`/g, '<code class="bg-white/5 px-1.5 py-0.5 rounded font-mono text-[11px] text-brand-secondary">$1</code>')
          .replace(/```markdown\n([\s\S]*?)```/g, '<pre class="bg-black/35 p-3 rounded-lg border border-white/5 font-mono text-[10px] text-indigo-300 overflow-x-auto my-2 select-all"><code>$1</code></pre>');
        
        setReportHtml(formattedHtml);
      } catch (err) {
        console.error('Failed to load documentation report', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReport();
  }, [project.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name}-Developer-Guide.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-brand-primary" />
            Project Documentation
          </h2>
          <p className="text-sm text-gray-400">View generated code flows, database schemas, developer onboarding guides, and configuration references.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl text-xs font-semibold glass-panel text-gray-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy MD'}
          </button>
          
          <button 
            onClick={handleExport}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-primary text-white hover:bg-brand-primary/95 flex items-center gap-1.5 cursor-pointer animate-pulse"
          >
            <FileDown className="w-3.5 h-3.5" />
            Export Markdown
          </button>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel p-10 text-center text-gray-500 rounded-3xl">
          Compiling codebase files documentation...
        </div>
      ) : (
        <div className="glass-panel p-8 rounded-3xl border border-white/5 max-w-4xl">
          <div className="space-y-4 font-sans text-xs leading-relaxed text-gray-300" dangerouslySetInnerHTML={{ __html: reportHtml }} />
        </div>
      )}
    </div>
  );
};
export default Documentation;
