import React, { useState, useEffect } from 'react';
import { Upload, GitBranch, Play, Cpu, CheckCircle, Loader } from 'lucide-react';
import axios from 'axios';

interface UploadProjectProps {
  onUploadSuccess: (projectId: string) => void;
}

export const UploadProject: React.FC<UploadProjectProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('Initializing Scanner...');
  const [logs, setLogs] = useState<string[]>([]);
  const [activeAgentIdx, setActiveAgentIdx] = useState<number>(-1);
  const [errorMsg, setErrorMsg] = useState('');

  const agents = [
    { id: 'analyzer', name: 'Repository Analyzer' },
    { id: 'architecture', name: 'Architecture Agent' },
    { id: 'bug', name: 'Bug Detection Agent' },
    { id: 'security', name: 'Security Agent' },
    { id: 'optimization', name: 'Optimization Agent' },
    { id: 'testing', name: 'Testing Agent' },
    { id: 'documentation', name: 'Documentation Agent' },
    { id: 'feature', name: 'Feature Builder Agent' }
  ];

  // Simulated agent run animation for the hackathon demo
  const runAgentAnimation = (projectId: string, scanLogs: string[]) => {
    setLoading(true);
    setLogs([]);
    setErrorMsg('');
    
    let currentLogIndex = 0;
    let currentAgentIndex = 0;
    setActiveAgentIdx(0);
    
    const interval = setInterval(() => {
      if (currentLogIndex < scanLogs.length) {
        const logLine = scanLogs[currentLogIndex];
        setLogs(prev => [...prev, logLine]);
        setStatusText(logLine);
        
        // Advance active agent display based on log prefixes
        if (logLine.includes('[Repository Analyzer]')) {
          setActiveAgentIdx(0);
        } else if (logLine.includes('[Architecture Agent]')) {
          setActiveAgentIdx(1);
        } else if (logLine.includes('[Bug Detection Agent]')) {
          setActiveAgentIdx(2);
        } else if (logLine.includes('[Security Agent]')) {
          setActiveAgentIdx(3);
        } else if (logLine.includes('[Optimization Agent]')) {
          setActiveAgentIdx(4);
        } else if (logLine.includes('[Testing Agent]')) {
          setActiveAgentIdx(5);
        } else if (logLine.includes('[Documentation Agent]')) {
          setActiveAgentIdx(6);
        } else if (logLine.includes('[Orchestrator]')) {
          setActiveAgentIdx(7);
        }
        
        currentLogIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setLoading(false);
          onUploadSuccess(projectId);
        }, 800);
      }
    }, 450); // fast log printing speed
  };

  const handleDemoLaunch = async () => {
    try {
      setLoading(true);
      setStatusText('Contacting Seed Endpoint...');
      const res = await axios.post('/api/demo-seed');
      
      // Get analysis logs from database reports
      const logRes = await axios.get(`/api/projects/${res.data.project_id}/report/logs`);
      const scanLogs = logRes.data;
      
      runAgentAnimation(res.data.project_id, scanLogs);
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.response?.data?.detail || 'Failed to initialize demo repository');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleFileUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    
    try {
      setLoading(true);
      let res;
      
      setStatusText('Uploading ZIP archive...');
      const formData = new FormData();
      formData.append('file', file);
      res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Get analysis logs from database reports
      const logRes = await axios.get(`/api/projects/${res.data.project_id}/report/logs`);
      const scanLogs = logRes.data;
      
      runAgentAnimation(res.data.project_id, scanLogs);
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.response?.data?.detail || 'Failed to parse project directory. Ensure repository is accessible and contains source code.');
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center p-6 relative">
      {/* Background Decorative Element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      {!loading ? (
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          {/* Centered Card: Standard ZIP Upload */}
          <div className="glass-panel p-8 rounded-3xl flex flex-col justify-between md:col-span-2 max-w-xl mx-auto w-full">
            <div>
              <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Upload Project</h2>
              <p className="text-sm text-gray-400 mb-6">Upload a local project folder (.zip archive) for analysis.</p>
              
              <form onSubmit={handleFileUploadSubmit} className="space-y-6">
                {/* Upload drag-n-drop file */}
                <div className="relative border-2 border-dashed border-white/10 hover:border-brand-primary/45 rounded-2xl p-6 text-center cursor-pointer transition-all">
                  <input 
                    type="file" 
                    accept=".zip" 
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                  />
                  <Upload className="w-10 h-10 text-brand-primary mx-auto mb-3" />
                  <span className="block text-sm font-semibold text-gray-200">
                    {file ? file.name : "Select Project Archive"}
                  </span>
                  <span className="block text-xs text-gray-500 mt-1">Supports standard ZIP compression formats</span>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                    {errorMsg}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={!file}
                  className="w-full py-3.5 rounded-xl font-semibold bg-brand-primary hover:bg-brand-primary/95 text-white disabled:opacity-40 disabled:hover:bg-brand-primary hover:shadow-lg hover:shadow-brand-primary/20 transition-all cursor-pointer"
                >
                  Initiate Project Scan
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* Agent Scan Logging Console Screen */
        <div className="w-full max-w-4xl glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl relative z-10">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-primary/20 flex items-center justify-center animate-spin">
                <Loader className="w-5 h-5 text-brand-primary" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">ForgeMind AI Multi-Agent Scan</h3>
                <p className="text-xs text-gray-400">Executing autonomous task pipelines</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-brand-secondary tracking-widest uppercase bg-brand-secondary/10 px-3 py-1.5 rounded-lg border border-brand-secondary/20">
              {statusText.length > 25 ? statusText.slice(0, 25) + '...' : statusText}
            </span>
          </div>

          {/* Agents Pipeline Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {agents.map((agent, idx) => {
              const isPending = idx > activeAgentIdx;
              const isRunning = idx === activeAgentIdx;
              const isCompleted = idx < activeAgentIdx;
              
              return (
                <div 
                  key={agent.id} 
                  className={`p-4 rounded-xl border transition-all ${
                    isRunning 
                      ? 'border-brand-primary bg-brand-primary/10 shadow-md shadow-brand-primary/5 agent-scanning-pulse' 
                      : isCompleted 
                        ? 'border-emerald-500/30 bg-emerald-500/5' 
                        : 'border-white/5 bg-white/2'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Cpu className={`w-5 h-5 ${isRunning ? 'text-brand-primary' : isCompleted ? 'text-emerald-400' : 'text-gray-600'}`} />
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : isRunning ? (
                      <Loader className="w-3.5 h-3.5 text-brand-primary animate-spin" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
                    )}
                  </div>
                  <span className={`text-xs font-bold block ${isPending ? 'text-gray-500' : 'text-white'}`}>
                    {agent.name}
                  </span>
                  <span className="text-[10px] text-gray-500 mt-0.5 block">
                    {isCompleted ? 'Complete' : isRunning ? 'Running' : 'Pending'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Terminal Console Log */}
          <div className="bg-black/50 border border-white/5 rounded-2xl p-5 h-64 overflow-y-auto font-mono text-xs text-gray-300 space-y-1.5">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2.5">
                <span className="text-gray-600 select-none">[{i+1}]</span>
                <span className={
                  log.includes('ALERT') || log.includes('Vulnerability')
                    ? 'text-rose-400'
                    : log.includes('complete') || log.includes('executed')
                      ? 'text-emerald-400'
                      : log.includes('Analyzer')
                        ? 'text-cyan-300'
                        : 'text-gray-300'
                }>
                  {log}
                </span>
              </div>
            ))}
            <div className="w-1.5 h-4 bg-brand-primary animate-pulse inline-block ml-1" />
          </div>
        </div>
      )}
    </div>
  );
};
