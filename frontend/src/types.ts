export interface Project {
  id: string;
  name: string;
  created_at: string;
  status: string;
  languages: Record<string, number>;
  frameworks: string[];
  file_count: number;
  api_count: number;
  complexity_score: number;
  security_score: number;
  performance_score: number;
  coverage_score: number;
  documentation_score: number;
  debt_score: number;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  language?: string;
  size?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
}

export interface Agent {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  log?: string;
}
