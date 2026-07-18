import React, { useState, useEffect } from 'react';
import api from './api';
import type { Project } from './types';

// Page Imports
import { Home } from './pages/Home';
import { UploadProject } from './pages/UploadProject';
import { Dashboard } from './pages/Dashboard';
import { CodeExplorer } from './pages/CodeExplorer';
import { Architecture } from './pages/Architecture';
import { AIChat } from './pages/AIChat';
import { BugReport } from './pages/BugReport';
import { SecurityReport } from './pages/SecurityReport';
import { Performance } from './pages/Performance';
import { Documentation } from './pages/Documentation';
import { Settings } from './pages/Settings';

// Icon Imports
import { 
  Upload, 
  Gauge, 
  Code, 
  Layers, 
  Cpu, 
  Bug, 
  ShieldAlert, 
  Zap, 
  BookOpen, 
  Settings as SettingsIcon,
  ChevronDown,
  Cpu as EngineLogo,
  Trash2
} from 'lucide-react';

// axios baseURL handled by centralized client in ./api

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  
  // Navigation active file state
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/api/projects');
      setProjects(res.data);
      if (res.data.length > 0 && !activeProject) {
        // Auto select last project if none is active
        setActiveProject(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load projects list', err);
    }
  };

  const handleUploadSuccess = async (projectId: string) => {
    try {
      // Reload projects and activate the uploaded project
      const res = await api.get('/api/projects');
      setProjects(res.data);
      const newlyCreated = res.data.find((p: Project) => p.id === projectId);
      if (newlyCreated) {
        setActiveProject(newlyCreated);
      }
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Failed to resolve workspace activation', err);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    setDeleteError('');
    try {
      await api.delete(`/api/projects/${projectId}`);
      const updated = projects.filter(p => p.id !== projectId);
      setProjects(updated);
      setConfirmDeleteId(null);
      if (activeProject?.id === projectId) {
        if (updated.length > 0) {
          // Switch to next available project and show its dashboard
          setActiveProject(updated[0]);
          setActiveFilePath(null);
          setActiveTab('dashboard');
        } else {
          // No projects left — go to upload screen
          setActiveProject(null);
          setActiveTab('upload');
        }
      }
    } catch (err: any) {
      console.error('Failed to remove project', err);
      setDeleteError(err.response?.data?.detail || 'Failed to delete workspace. Please try again.');
    }
  };

  // Cross-view selector link action
  const handleSelectFileLink = (path: string) => {
    setActiveFilePath(path);
    setActiveTab('explorer');
  };

  // Define sidebar navigation items
  const navigationItems = [
    { id: 'dashboard', name: 'Dashboard', icon: Gauge, requiresProject: true },
    { id: 'explorer', name: 'Code Explorer', icon: Code, requiresProject: true },
    { id: 'architecture', name: 'Architecture Flow', icon: Layers, requiresProject: true },
    { id: 'chat', name: 'AI Chat Agent', icon: Cpu, requiresProject: true },
    { id: 'bugs', name: 'Bugs Scan', icon: Bug, requiresProject: true },
    { id: 'security', name: 'Security Audits', icon: ShieldAlert, requiresProject: true },
    { id: 'performance', name: 'Performance', icon: Zap, requiresProject: true },
    { id: 'docs', name: 'Docs Summary', icon: BookOpen, requiresProject: true }
  ];

  return (
    <div className="min-h-screen text-white bg-dark-bg font-sans flex overflow-hidden">
      
      {/* 1. If tab is 'home', show landing page without dashboard sidebar wrapper */}
      {activeTab === 'home' ? (
        <Home onLaunch={() => {
          if (activeProject) {
            setActiveTab('dashboard');
          } else {
            setActiveTab('upload');
          }
        }} />
      ) : (
        
        /* 2. Main Dashboard Layout Frame */
        <div className="flex w-full h-screen overflow-hidden">
          
          {/* Dashboard Left Sidebar Navigator */}
          <aside className="w-64 glass-panel border-r border-white/5 flex flex-col justify-between h-full flex-shrink-0 relative z-20">
            <div className="flex flex-col overflow-y-auto">
              
              {/* Sidebar Header Logo */}
              <div 
                onClick={() => setActiveTab('home')}
                className="p-5 border-b border-white/5 flex items-center gap-2.5 cursor-pointer hover:bg-white/2 transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center">
                  <EngineLogo className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-extrabold text-sm tracking-tight leading-none text-white">ForgeMind</h1>
                  <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mt-1">AI Software Engineer</span>
                </div>
              </div>

              {/* Project Selector Box */}
              <div className="p-4 border-b border-white/5 space-y-1.5">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block px-1">Selected Workspace</span>
                
                {projects.length === 0 ? (
                  <button 
                    onClick={() => setActiveTab('upload')}
                    className="w-full py-2.5 px-3.5 rounded-xl border border-dashed border-white/10 hover:border-brand-primary/45 text-left text-xs text-gray-400 font-semibold transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span>Connect Workspace</span>
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="relative group">
                    <select 
                      value={activeProject?.id || ''}
                      onChange={(e) => {
                        const sel = projects.find(p => p.id === e.target.value);
                        if (sel) {
                          setActiveProject(sel);
                          setActiveFilePath(null);
                        }
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none appearance-none cursor-pointer pr-8"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id} className="bg-dark-surface text-white">
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-3 top-3 pointer-events-none" />
                  </div>
                )}

                {activeProject && (
                  <div className="px-1 pt-1.5 space-y-1.5">
                    {confirmDeleteId === activeProject.id ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-rose-400 font-semibold leading-snug">
                          Remove <span className="font-bold text-rose-300">{activeProject.name}</span>? This cannot be undone.
                        </p>
                        {deleteError && (
                          <p className="text-[10px] text-rose-500">{deleteError}</p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDeleteProject(activeProject.id)}
                            className="flex-1 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-[10px] font-bold text-rose-400 hover:bg-rose-500/30 transition-all cursor-pointer"
                          >
                            Yes, Remove
                          </button>
                          <button
                            onClick={() => { setConfirmDeleteId(null); setDeleteError(''); }}
                            className="flex-1 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-gray-400 hover:bg-white/10 transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-between items-center">
                        <button
                          onClick={() => setActiveTab('upload')}
                          className="text-[10px] text-brand-secondary font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3 h-3" /> Mount New
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(activeProject.id)}
                          className="text-[10px] text-rose-500 font-bold hover:text-rose-400 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Unmount
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sidebar navigation list */}
              <nav className="p-3 space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isDisabled = item.requiresProject && !activeProject;
                  const isTabActive = activeTab === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      disabled={isDisabled}
                      onClick={() => {
                        setActiveTab(item.id);
                        if (item.id !== 'explorer') {
                          setActiveFilePath(null);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isTabActive 
                          ? 'bg-gradient-to-r from-brand-primary/20 to-brand-primary/5 text-white border-l-2 border-brand-primary' 
                          : isDisabled
                            ? 'opacity-30 cursor-not-allowed text-gray-600'
                            : 'text-gray-400 hover:text-white hover:bg-white/2'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Settings bottom row */}
            <div className="p-3 border-t border-white/5">
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'settings' 
                    ? 'bg-gradient-to-r from-brand-primary/20 to-brand-primary/5 text-white border-l-2 border-brand-primary' 
                    : 'text-gray-400 hover:text-white hover:bg-white/2'
                }`}
              >
                <SettingsIcon className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </div>
          </aside>

          {/* Main Console View Area */}
          <main className="flex-grow h-screen overflow-y-auto bg-dark-bg grid-bg p-6 relative">
            <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-indigo-500/2 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-cyan-500/2 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="max-w-7xl mx-auto h-full flex flex-col">
              {/* Route switch mapping tabs */}
              {activeTab === 'upload' && (
                <UploadProject onUploadSuccess={handleUploadSuccess} />
              )}
              {activeTab === 'dashboard' && activeProject && (
                <Dashboard project={activeProject} onNavigate={setActiveTab} />
              )}
              {activeTab === 'explorer' && activeProject && (
                <CodeExplorer 
                  project={activeProject} 
                  activeFilePath={activeFilePath}
                  onSelectFilePath={setActiveFilePath}
                />
              )}
              {activeTab === 'architecture' && activeProject && (
                <Architecture project={activeProject} />
              )}
              {activeTab === 'chat' && activeProject && (
                <AIChat project={activeProject} onSelectFile={handleSelectFileLink} />
              )}
              {activeTab === 'bugs' && activeProject && (
                <BugReport project={activeProject} onNavigateToChat={(q) => { setActiveTab('chat'); setTimeout(() => { const event = new CustomEvent('prefill-chat', { detail: q }); window.dispatchEvent(event); }, 100); }} />
              )}
              {activeTab === 'security' && activeProject && (
                <SecurityReport project={activeProject} onNavigateToChat={(q) => { setActiveTab('chat'); setTimeout(() => { const event = new CustomEvent('prefill-chat', { detail: q }); window.dispatchEvent(event); }, 100); }} />
              )}
              {activeTab === 'performance' && activeProject && (
                <Performance project={activeProject} onNavigateToChat={(q) => { setActiveTab('chat'); setTimeout(() => { const event = new CustomEvent('prefill-chat', { detail: q }); window.dispatchEvent(event); }, 100); }} />
              )}
              {activeTab === 'docs' && activeProject && (
                <Documentation project={activeProject} />
              )}
              {activeTab === 'settings' && (
                <Settings />
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  );
};
export default App;
