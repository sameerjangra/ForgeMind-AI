import React from 'react';
import { Cpu, Code2, ShieldAlert, Zap, BookOpen, Layers } from 'lucide-react';

interface HomeProps {
  onLaunch: () => void;
}

export const Home: React.FC<HomeProps> = ({ onLaunch }) => {
  return (
    <div className="min-h-screen text-white grid-bg relative overflow-hidden bg-dark-bg flex flex-col justify-between">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-secondary/10 blur-[120px] pointer-events-none" />

      {/* Navbar Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center shadow-lg shadow-brand-primary/20">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
            ForgeMind <span className="text-brand-secondary">AI</span>
          </span>
        </div>
        <button 
          onClick={onLaunch}
          className="px-5 py-2 rounded-xl text-sm font-semibold glass-panel text-indigo-300 hover:text-white hover:border-brand-primary/50 transition-all cursor-pointer"
        >
          Console
        </button>
      </header>

      {/* Main Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-16 flex-grow flex flex-col items-center justify-center text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-indigo-300 mb-6 tracking-wide uppercase">
          <span className="w-2 h-2 rounded-full bg-brand-secondary animate-ping" />
          Next-Gen AI Software Engineering Platform
        </div>
        
        <div className="flex flex-col items-center text-center justify-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight text-center">
            From Idea <span className="bg-gradient-to-r from-brand-primary via-brand-accent to-brand-secondary bg-clip-text text-transparent">→ Code → Test</span>
            <br />
            <span className="text-white">Powered Autonomous Agent</span>
          </h1>
          
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed text-center mx-auto">
            ForgeMind AI is an AI software engineer that scans your entire codebase, maps dependencies, uncovers security bugs, runs optimization tasks, and implements code in minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-16 justify-center">
            <button 
              onClick={onLaunch}
              className="px-8 py-4 rounded-xl font-bold bg-gradient-to-r from-brand-primary via-brand-accent to-brand-secondary text-white hover:shadow-xl hover:shadow-brand-primary/20 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
            >
              Launch Free Agent Workspace
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-10">
          <div className="glass-panel p-6 rounded-2xl text-center border border-white/5 hover:border-brand-primary/30 transition-all duration-300 flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center mb-4 mx-auto">
              <Code2 className="w-6 h-6 text-brand-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">Automated Scanner</h3>
            <p className="text-sm text-gray-400 leading-relaxed text-center">
              Detects framework signatures, maps imports, and builds logical structures for .NET, React, Python, Go, and more.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl text-center border border-white/5 hover:border-brand-accent/30 transition-all duration-300 flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-brand-accent/10 flex items-center justify-center mb-4 mx-auto">
              <ShieldAlert className="w-6 h-6 text-brand-accent" />
            </div>
            <h3 className="text-lg font-bold mb-2">Security & Performance</h3>
            <p className="text-sm text-gray-400 leading-relaxed text-center">
              Locates hardcoded credentials, JWT security flaws, slow queries, and memory leaks before they reach production.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl text-center border border-white/5 hover:border-brand-secondary/30 transition-all duration-300 flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-brand-secondary/10 flex items-center justify-center mb-4 mx-auto">
              <Zap className="w-6 h-6 text-brand-secondary" />
            </div>
            <h3 className="text-lg font-bold mb-2">Multi-Agent Pipeline</h3>
            <p className="text-sm text-gray-400 leading-relaxed text-center">
              Runs parallel task forces (Security, Testing, Documentation, Refactoring) to manage complex repo upgrades.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-gray-500 border-t border-white/5 relative z-10">
        © 2026 ForgeMind AI Engine. Built for Next-Gen Autonomous Coding.
      </footer>
    </div>
  );
};
