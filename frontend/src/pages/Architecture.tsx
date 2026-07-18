import React, { useState, useEffect } from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import api from '../api';
import type { Project } from '../types';
import { Layers, HelpCircle, ArrowRightLeft } from 'lucide-react';

interface ArchitectureProps {
  project: Project;
}

export const Architecture: React.FC<ArchitectureProps> = ({ project }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArchitecture = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/projects/${project.id}/report/architecture`);
        
        // Apply custom premium styling to nodes
        const styledNodes = res.data.nodes.map((node: any) => ({
          ...node,
          style: {
            background: 'rgba(15, 19, 34, 0.9)',
            color: '#fff',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '12px',
            padding: '12px',
            fontSize: '11px',
            fontWeight: 'bold',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 10px rgba(99, 102, 241, 0.1)',
            minWidth: '160px',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif'
          }
        }));

        // Apply custom styles to edges
        const styledEdges = res.data.edges.map((edge: any) => ({
          ...edge,
          style: {
            stroke: 'rgba(99, 102, 241, 0.45)',
            strokeWidth: 2,
          },
          labelStyle: {
            fill: '#818cf8',
            fontWeight: 700,
            fontSize: '9px',
            background: 'transparent'
          }
        }));

        setNodes(styledNodes);
        setEdges(styledEdges);
      } catch (err) {
        console.error('Failed to load architecture flow', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArchitecture();
  }, [project.id]);

  const onNodeClick = (_event: React.MouseEvent, node: Node) => {
    // Generate details dynamically for demo purposes
    const label = node.data.label;
    let details = {
      title: label,
      description: 'System module component',
      files: [] as string[],
      port: 'N/A',
      framework: 'N/A'
    };

    if (label.includes('React')) {
      details = {
        title: 'Client Web Interface',
        description: 'Single-page web view implementing user dashboard metrics and auth configurations.',
        files: ['frontend/src/App.tsx', 'frontend/src/components/Login.tsx'],
        port: '5173',
        framework: 'React / Vite'
      };
    } else if (label.includes('.NET')) {
      details = {
        title: '.NET 8 Gateway Middleware',
        description: 'Gateway entrypoint validating token security and forwarding invoice processing payloads.',
        files: ['Program.cs'],
        port: '5000',
        framework: 'ASP.NET Core'
      };
    } else if (label.includes('FastAPI')) {
      details = {
        title: 'FastAPI Invoicing Controller',
        description: 'Main server backend processing active listings, DB queries, and OTP auth routines.',
        files: ['backend/routes/invoice.py', 'backend/main.py'],
        port: '8000',
        framework: 'FastAPI / Python'
      };
    } else if (label.includes('Auth')) {
      details = {
        title: 'JWT Authentication Module',
        description: 'Signs and verifies security authorization tokens inside Python PyJWT routines.',
        files: ['backend/auth.py'],
        port: 'Shared Lib',
        framework: 'PyJWT Standard'
      };
    } else if (label.includes('SQLite')) {
      details = {
        title: 'SQLite Database Model',
        description: 'Local relational tables storing invoice values, user structures, and session records.',
        files: ['database/schema.sql', 'backend/database/db.py'],
        port: 'Local File',
        framework: 'SQLite3 standard'
      };
    }
    
    setSelectedNode(details);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6">
      {/* React Flow Board */}
      <div className="flex-grow glass-panel rounded-3xl relative overflow-hidden border border-white/5 h-full">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-bg/85 z-20">
            <span className="text-sm font-semibold text-gray-400">Loading flow configuration...</span>
          </div>
        ) : (
          <ReactFlow 
            nodes={nodes} 
            edges={edges}
            onNodeClick={onNodeClick}
            fitView
            attributionPosition="bottom-left"
          >
            <Background color="rgba(255,255,255,0.06)" gap={16} />
            <Controls className="bg-dark-surface border border-white/10 text-white rounded-lg" />
          </ReactFlow>
        )}
      </div>

      {/* Slide-out Node Detail Drawer Panel */}
      <div className="w-full md:w-80 flex-shrink-0 glass-panel p-6 rounded-3xl border border-white/5 flex flex-col justify-between h-auto md:h-full">
        {selectedNode ? (
          <div className="space-y-6">
            <div>
              <div className="inline-flex p-2 rounded-lg bg-brand-primary/10 border border-brand-primary/25 text-brand-primary mb-3">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-white leading-tight">{selectedNode.title}</h3>
              <span className="text-[10px] text-brand-secondary font-bold tracking-widest uppercase block mt-1">
                {selectedNode.framework}
              </span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              {selectedNode.description}
            </p>

            <div className="space-y-3.5 pt-4 border-t border-white/5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 font-semibold">Active Port:</span>
                <span className="text-white font-mono">{selectedNode.port}</span>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Related Code Files:</span>
                <div className="space-y-1">
                  {selectedNode.files.map((file: string) => (
                    <div 
                      key={file} 
                      className="text-xs text-indigo-300 font-mono py-1 px-2 rounded bg-white/2 border border-white/5 truncate"
                    >
                      {file}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-500 space-y-3">
            <HelpCircle className="w-8 h-8 text-gray-600 animate-pulse" />
            <div>
              <p className="text-xs font-bold text-gray-400">Node Inspector</p>
              <p className="text-[10px] text-gray-600 max-w-[200px] mt-1 mx-auto leading-relaxed">
                Click any component block on the architecture graph to analyze file connections, ports, and structures.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-white/5 text-[10px] text-gray-600 flex items-center gap-1.5 justify-center">
          <ArrowRightLeft className="w-3.5 h-3.5" />
          Interactive flow graphs synced by AI Agents.
        </div>
      </div>
    </div>
  );
};
export default Architecture;
