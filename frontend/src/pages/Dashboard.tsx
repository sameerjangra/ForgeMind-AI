import React from 'react';
import type { Project } from '../types';
import { ShieldAlert, Zap, Layers, FileCode2, Code, ShieldCheck, Flame, BookOpen, GraduationCap } from 'lucide-react';

interface DashboardProps {
  project: Project;
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ project, onNavigate }) => {
  // Helpers to color code score values
  const getScoreColor = (score: number, invert = false) => {
    const isGood = invert ? score < 30 : score > 70;
    const isWarning = invert ? (score >= 30 && score <= 60) : (score >= 50 && score <= 70);
    
    if (isGood) return 'text-emerald-400 border-emerald-500/25 bg-emerald-500/5';
    if (isWarning) return 'text-amber-400 border-amber-500/25 bg-amber-500/5';
    return 'text-rose-400 border-rose-500/25 bg-rose-500/5';
  };

  const scoreStroke = (score: number) => {
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    return circumference - (score / 100) * circumference;
  };

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">{project.name} Workspace</h2>
          <p className="text-sm text-gray-400">Analysis finalized. Technical debt evaluated at {project.debt_score} days.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => onNavigate('chat')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-brand-primary text-white hover:bg-brand-primary/95 hover:shadow-lg hover:shadow-brand-primary/20 transition-all cursor-pointer"
          >
            Consult AI Agent
          </button>
        </div>
      </div>

      {/* Primary Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl">
          <span className="text-xs text-gray-500 font-semibold block uppercase tracking-wider">Total Files Scanned</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-3xl font-extrabold text-white">{project.file_count}</span>
            <FileCode2 className="w-6 h-6 text-brand-primary/60" />
          </div>
        </div>
        
        <div className="glass-panel p-5 rounded-2xl">
          <span className="text-xs text-gray-500 font-semibold block uppercase tracking-wider">API Routes Detected</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-3xl font-extrabold text-white">{project.api_count}</span>
            <Code className="w-6 h-6 text-brand-secondary/60" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <span className="text-xs text-gray-500 font-semibold block uppercase tracking-wider">Primary Framework</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-lg font-bold text-white truncate max-w-[150px]">
              {project.frameworks[0] || 'Unknown'}
            </span>
            <Layers className="w-5 h-5 text-brand-accent/60" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <span className="text-xs text-gray-500 font-semibold block uppercase tracking-wider">Technical Debt</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-3xl font-extrabold text-brand-accent">{project.debt_score}%</span>
            <Flame className="w-5 h-5 text-brand-accent/60" />
          </div>
        </div>
      </div>

      {/* Main Stats Gauges Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Security Score */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-center">
          <span className="text-xs font-semibold text-gray-400 uppercase mb-3">Security Score</span>
          <div className="relative w-20 h-20 flex items-center justify-center mb-2">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="40" cy="40" r="30" className="stroke-white/5 fill-transparent" strokeWidth="6" />
              <circle 
                cx="40" cy="40" r="30" 
                className="stroke-rose-500 fill-transparent transition-all duration-1000" 
                strokeWidth="6"
                strokeDasharray={2 * Math.PI * 30}
                strokeDashoffset={scoreStroke(project.security_score)}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-lg font-extrabold text-white">{project.security_score}%</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getScoreColor(project.security_score)}`}>
            {project.security_score < 50 ? 'Critical Risk' : 'Secure'}
          </span>
        </div>

        {/* Complexity Score */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-center">
          <span className="text-xs font-semibold text-gray-400 uppercase mb-3">Complexity</span>
          <div className="relative w-20 h-20 flex items-center justify-center mb-2">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="40" cy="40" r="30" className="stroke-white/5 fill-transparent" strokeWidth="6" />
              <circle 
                cx="40" cy="40" r="30" 
                className="stroke-amber-500 fill-transparent" 
                strokeWidth="6"
                strokeDasharray={2 * Math.PI * 30}
                strokeDashoffset={scoreStroke(project.complexity_score)}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-lg font-extrabold text-white">{project.complexity_score}%</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getScoreColor(project.complexity_score, true)}`}>
            {project.complexity_score < 30 ? 'Low' : project.complexity_score > 60 ? 'High' : 'Moderate'}
          </span>
        </div>

        {/* Performance Score */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-center">
          <span className="text-xs font-semibold text-gray-400 uppercase mb-3">Performance</span>
          <div className="relative w-20 h-20 flex items-center justify-center mb-2">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="40" cy="40" r="30" className="stroke-white/5 fill-transparent" strokeWidth="6" />
              <circle 
                cx="40" cy="40" r="30" 
                className="stroke-brand-secondary fill-transparent" 
                strokeWidth="6"
                strokeDasharray={2 * Math.PI * 30}
                strokeDashoffset={scoreStroke(project.performance_score)}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-lg font-extrabold text-white">{project.performance_score}%</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getScoreColor(project.performance_score)}`}>
            {project.performance_score > 70 ? 'Excellent' : 'Suboptimal'}
          </span>
        </div>

        {/* Test Coverage */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-center">
          <span className="text-xs font-semibold text-gray-400 uppercase mb-3">Test Coverage</span>
          <div className="relative w-20 h-20 flex items-center justify-center mb-2">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="40" cy="40" r="30" className="stroke-white/5 fill-transparent" strokeWidth="6" />
              <circle 
                cx="40" cy="40" r="30" 
                className="stroke-indigo-500 fill-transparent" 
                strokeWidth="6"
                strokeDasharray={2 * Math.PI * 30}
                strokeDashoffset={scoreStroke(project.coverage_score)}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-lg font-extrabold text-white">{project.coverage_score}%</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getScoreColor(project.coverage_score)}`}>
            {project.coverage_score > 60 ? 'Standard' : 'Undercovered'}
          </span>
        </div>

        {/* Documentation Score */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-center">
          <span className="text-xs font-semibold text-gray-400 uppercase mb-3">Documentation</span>
          <div className="relative w-20 h-20 flex items-center justify-center mb-2">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="40" cy="40" r="30" className="stroke-white/5 fill-transparent" strokeWidth="6" />
              <circle 
                cx="40" cy="40" r="30" 
                className="stroke-purple-500 fill-transparent" 
                strokeWidth="6"
                strokeDasharray={2 * Math.PI * 30}
                strokeDashoffset={scoreStroke(project.documentation_score)}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-lg font-extrabold text-white">{project.documentation_score}%</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getScoreColor(project.documentation_score)}`}>
            {project.documentation_score > 60 ? 'Detailed' : 'Lacking'}
          </span>
        </div>
      </div>

      {/* Languages & Frameworks detail layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Languages progress bars */}
        <div className="glass-panel p-6 rounded-2xl md:col-span-2">
          <h3 className="font-bold text-white text-md mb-4 flex items-center gap-2">
            <Code className="w-4 h-4 text-brand-primary" />
            Language Distribution
          </h3>
          <div className="space-y-4">
            {Object.entries(project.languages).map(([lang, percentage]) => (
              <div key={lang} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-gray-300">
                  <span className="capitalize">{lang === 'csharp' ? 'C# (.NET)' : lang}</span>
                  <span>{percentage}%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full bg-gradient-to-r ${
                      lang === 'csharp' 
                        ? 'from-purple-600 to-indigo-500' 
                        : lang === 'typescript' 
                          ? 'from-blue-500 to-cyan-400' 
                          : lang === 'python'
                            ? 'from-yellow-500 to-emerald-400'
                            : 'from-gray-500 to-gray-400'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Framework tags & configs */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-md mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-secondary" />
              Technology Stack
            </h3>
            <div className="flex flex-wrap gap-2">
              {project.frameworks.map((fw) => (
                <span 
                  key={fw}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-gray-300 hover:border-brand-secondary/30 transition-all"
                >
                  {fw}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-white/5 text-xs text-gray-400">
            Detected standard config settings, packages references and routes models.
          </div>
        </div>
      </div>

      {/* Critical Security Alert Widget (if score is low) */}
      {project.security_score < 50 && (
        <div className="p-5 rounded-2xl border border-rose-500/25 bg-rose-500/5 flex items-start gap-4">
          <ShieldAlert className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-rose-300 text-sm">Critical Vulnerabilities Detected</h4>
            <p className="text-xs text-rose-400/80 leading-relaxed">
              The Security Agent flagged hardcoded JWT credential keys and disabled auth validation schemes. 
              Deploying this code carries extreme exposure risk.
            </p>
            <div className="pt-2">
              <button 
                onClick={() => onNavigate('security')}
                className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 hover:bg-rose-500/35 transition-all cursor-pointer"
              >
                Inspect Vulnerability Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
