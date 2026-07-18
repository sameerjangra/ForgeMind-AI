import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import type { Project, FileNode } from '../types';
import { Folder, File, ChevronDown, ChevronRight, HelpCircle, Code2, AlertTriangle } from 'lucide-react';

interface CodeExplorerProps {
  project: Project;
  activeFilePath: string | null;
  onSelectFilePath: (path: string | null) => void;
}

export const CodeExplorer: React.FC<CodeExplorerProps> = ({ 
  project, 
  activeFilePath, 
  onSelectFilePath 
}) => {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [fileContent, setFileContent] = useState<string>('// Select a file from the explorer sidebar to view code.');
  const [editorLanguage, setEditorLanguage] = useState<string>('javascript');
  const [loading, setLoading] = useState(false);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  // Explainer States
  const [explanation, setExplanation] = useState<any>(null);
  const [explaining, setExplaining] = useState(false);

  useEffect(() => {
    const fetchTree = async () => {
      try {
        const res = await axios.get(`/api/projects/${project.id}/files`);
        setTree(res.data);
      } catch (err) {
        console.error('Failed to load project file tree', err);
      }
    };
    fetchTree();
  }, [project.id]);

  useEffect(() => {
    if (activeFilePath) {
      loadFile(activeFilePath);
      // Auto-open directories leading to the file
      const parts = activeFilePath.split('/');
      const foldersToOpen: Record<string, boolean> = { ...openFolders };
      let accum = '';
      for (let i = 0; i < parts.length - 1; i++) {
        accum = accum ? `${accum}/${parts[i]}` : parts[i];
        foldersToOpen[accum] = true;
      }
      setOpenFolders(foldersToOpen);
    }
  }, [activeFilePath]);

  const loadFile = async (path: string) => {
    try {
      setLoading(true);
      onSelectFilePath(path);
      const res = await axios.get(`/api/projects/${project.id}/files/content`, {
        params: { path }
      });
      setFileContent(res.data.content);
      
      // Map extensions to Monaco languages
      const ext = path.split('.').pop()?.toLowerCase();
      const langMap: Record<string, string> = {
        'py': 'python',
        'cs': 'csharp',
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'sql': 'sql',
        'json': 'json',
        'md': 'markdown',
        'html': 'html',
        'css': 'css'
      };
      setEditorLanguage(langMap[ext || ''] || 'text');
      
      // Auto trigger AI Explainer
      triggerAIExplanation(path);
    } catch (err) {
      console.error('Failed to fetch file content', err);
      setFileContent('// Error loading file contents.');
    } finally {
      setLoading(false);
    }
  };

  const triggerAIExplanation = async (path: string) => {
    setExplaining(true);
    setExplanation(null);
    try {
      const res = await axios.get(`/api/projects/${project.id}/explain-file`, {
        params: { path }
      });
      setExplanation(res.data);
    } catch (err) {
      console.error('Failed to fetch file explanation', err);
      setExplanation({
        purpose: 'Could not load explanation — check backend connectivity.',
        complexity: 'Unknown',
        classes: [],
        functions: [],
        warnings: ['Backend explain-file endpoint unavailable.'],
        improvements: ['Ensure the FastAPI server is running on port 8000.']
      });
    } finally {
      setExplaining(false);
    }
  };

  const toggleFolder = (path: string) => {
    setOpenFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  // Recursive File Tree Node component
  const RenderNode: React.FC<{ node: FileNode; depth: number }> = ({ node, depth }) => {
    const isFolder = node.type === 'directory';
    const isOpen = openFolders[node.path] || false;
    const isSelected = activeFilePath === node.path;
    
    return (
      <div className="select-none">
        <div 
          onClick={() => isFolder ? toggleFolder(node.path) : loadFile(node.path)}
          className={`flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            isSelected 
              ? 'bg-brand-primary/20 text-indigo-300 border-l-2 border-brand-primary' 
              : 'text-gray-400 hover:text-white hover:bg-white/2'
          }`}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
        >
          {isFolder ? (
            <>
              {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />}
              <Folder className="w-4 h-4 text-brand-primary/75" />
            </>
          ) : (
            <>
              <div className="w-3.5" /> {/* alignment spacing */}
              <File className="w-4 h-4 text-brand-secondary/75" />
            </>
          )}
          <span className="truncate">{node.name}</span>
        </div>
        
        {isFolder && isOpen && node.children && (
          <div className="mt-0.5">
            {node.children.map((child, i) => (
              <RenderNode key={i} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6">
      {/* File Tree Explorer Column */}
      <div className="w-full md:w-64 flex-shrink-0 glass-panel rounded-3xl border border-white/5 flex flex-col h-1/3 md:h-full overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-black/10">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Explorer</span>
        </div>
        <div className="flex-grow p-2 overflow-y-auto space-y-0.5">
          {tree.length === 0 ? (
            <div className="text-center text-xs text-gray-600 mt-10">No files scanned.</div>
          ) : (
            tree.map((node, i) => <RenderNode key={i} node={node} depth={0} />)
          )}
        </div>
      </div>

      {/* Editor Center Container */}
      <div className="flex-grow glass-panel rounded-3xl border border-white/5 flex flex-col h-1/2 md:h-full overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-bg/85 z-20">
            <span className="text-xs font-semibold text-gray-400">Loading code view...</span>
          </div>
        ) }
        <div className="px-5 py-3 border-b border-white/5 bg-black/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <File className="w-4 h-4 text-brand-secondary" />
            <span className="text-xs font-mono text-gray-300 font-semibold">{activeFilePath || 'No file selected'}</span>
          </div>
          <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 rounded uppercase">
            {editorLanguage}
          </span>
        </div>
        
        <div className="flex-grow w-full h-[calc(100%-40px)]">
          <Editor
            height="100%"
            language={editorLanguage}
            value={fileContent}
            theme="vs-dark"
            options={{
              readOnly: true,
              fontSize: 12.5,
              minimap: { enabled: false },
              wordWrap: 'on',
              scrollbar: { vertical: 'visible', horizontal: 'visible' },
              padding: { top: 12 }
            }}
          />
        </div>
      </div>

      {/* AI Explainer Right Column */}
      <div className="w-full md:w-80 flex-shrink-0 glass-panel p-6 rounded-3xl border border-white/5 flex flex-col h-auto md:h-full overflow-y-auto">
        {explaining ? (
          <div className="flex-grow flex items-center justify-center text-center">
            <span className="text-xs font-semibold text-gray-400 animate-pulse">Explaining code patterns...</span>
          </div>
        ) : explanation ? (
          <div className="space-y-6">
            <div>
              <div className="inline-flex p-2 rounded-lg bg-brand-secondary/10 border border-brand-secondary/25 text-brand-secondary mb-3">
                <Code2 className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-white leading-tight">AI Explainer</h3>
              <p className="text-[10px] text-gray-500 mt-1">Real-time AST code analysis</p>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Purpose</span>
              <p className="text-xs text-gray-300 leading-relaxed">{explanation.purpose}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 py-3 border-y border-white/5 text-xs">
              <div>
                <span className="text-gray-500 font-semibold block">Complexity:</span>
                <span className="text-white font-bold">{explanation.complexity}</span>
              </div>
              <div>
                <span className="text-gray-500 font-semibold block">Language:</span>
                <span className="text-white capitalize font-bold">{explanation.language || editorLanguage}</span>
              </div>
              {explanation.lines && (
                <div className="col-span-2">
                  <span className="text-gray-500 font-semibold block">Lines:</span>
                  <span className="text-white font-bold">{explanation.lines} lines</span>
                </div>
              )}
            </div>

            {/* Symbols */}
            {(explanation.classes.length > 0 || explanation.functions.length > 0) && (
              <div className="space-y-3">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Symbols Identified</span>
                <div className="flex flex-wrap gap-1.5">
                  {explanation.classes.map((cls: string) => (
                    <span key={cls} className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-[10px] font-mono text-purple-300">
                      class {cls}
                    </span>
                  ))}
                  {explanation.functions.map((fn: string) => (
                    <span key={fn} className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] font-mono text-blue-300">
                      fn {fn}()
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {explanation.warnings.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Code Warnings
                </span>
                <div className="space-y-1.5">
                  {explanation.warnings.map((warn: string, i: number) => (
                    <div key={i} className="text-xs text-rose-300/90 py-1.5 px-2.5 rounded-lg bg-rose-500/5 border border-rose-500/15 leading-relaxed">
                      {warn}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Improvements */}
            <div className="space-y-2.5">
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Recommended Optimizations</span>
              <ul className="space-y-1.5">
                {explanation.improvements.map((imp: string, i: number) => (
                  <li key={i} className="text-xs text-gray-400 leading-relaxed flex items-start gap-1.5">
                    <span className="text-indigo-400 mt-1">•</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-500 space-y-3">
            <HelpCircle className="w-8 h-8 text-gray-600 animate-pulse" />
            <div>
              <p className="text-xs font-bold text-gray-400">Code Analyst</p>
              <p className="text-[10px] text-gray-600 max-w-[200px] mt-1 mx-auto leading-relaxed">
                Select any source file in the explorer. ForgeMind AI will automatically audit classes, complexity ratings, and vulnerabilities.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default CodeExplorer;
