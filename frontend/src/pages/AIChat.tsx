import React, { useState, useEffect, useRef } from 'react';
import { Send, Cpu, Loader, ChevronRight, CornerDownLeft } from 'lucide-react';
import api from '../api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Project, ChatMessage } from '../types';

interface AIChatProps {
  project: Project;
  onSelectFile: (path: string) => void;
}

export const AIChat: React.FC<AIChatProps> = ({ project, onSelectFile }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  const presetQueries = [
    { label: 'Authentication Review', query: 'Explain Authentication' },
    { label: 'Security Scan', query: 'Find security issues' },
    { label: 'Generate Unit Tests', query: 'Generate tests for auth.py' },
    { label: 'Write README.md', query: 'Create README' },
    { label: 'Add OTP Flow Plan', query: 'Add OTP login' }
  ];

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get(`/api/projects/${project.id}/chat/history`);
        setMessages(res.data);
      } catch (err) {
        console.error('Failed to load chat history', err);
      }
    };
    fetchHistory();
  }, [project.id]);

  useEffect(() => {
    const handlePrefill = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        submitQuery(customEvent.detail);
      }
    };
    window.addEventListener('prefill-chat', handlePrefill);
    return () => {
      window.removeEventListener('prefill-chat', handlePrefill);
    };
  }, [project.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const submitQuery = async (queryText: string) => {
    if (!queryText.trim() || sending) return;

    setInput('');
    setSending(true);
    setErrorMsg('');

    const userMsg: ChatMessage = {
      role: 'user',
      content: queryText,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);

    setAgentLogs([]);
    const logsList = [
      '[Agent Router] Evaluating query intent...',
      `[Agent Router] Semantic search hit: matched ${project.name} index.`,
      '[Orchestrator] Invoking Security & Analysis Agents...',
      '[Orchestrator] Reviewing file content contexts...',
      '[Assistant] Compiling response payload...'
    ];

    let logIdx = 0;
    const logInterval = setInterval(() => {
      if (logIdx < logsList.length) {
        setAgentLogs(prev => [...prev, logsList[logIdx]]);
        logIdx++;
      } else {
        clearInterval(logInterval);
      }
    }, 600);

    try {
      const res = await api.post(`/api/projects/${project.id}/chat`, { message: queryText });
      clearInterval(logInterval);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.data.content,
        timestamp: new Date().toISOString(),
        model: res.data.model
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      clearInterval(logInterval);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '### Error\nFailed to compile AI response. Please verify backend connectivity.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setSending(false);
      setAgentLogs([]);
    }
  };

  // Custom components for react-markdown with premium dark styling
  const markdownComponents: any = {
    // Headers
    h1: ({ children }: any) => <h1 className="text-xl font-black text-white mt-5 mb-3 pb-2 border-b border-white/10">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-lg font-extrabold text-white mt-4 mb-2">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-base font-bold text-indigo-200 mt-3 mb-2">{children}</h3>,
    h4: ({ children }: any) => <h4 className="text-sm font-bold text-gray-200 mt-2 mb-1">{children}</h4>,

    // Paragraph — use div to avoid invalid DOM nesting when markdown renders block elements inside p
    p: ({ children }: any) => <div className="text-sm text-gray-300 leading-relaxed mb-2">{children}</div>,

    // Bold & Italic
    strong: ({ children }: any) => <strong className="font-bold text-white">{children}</strong>,
    em: ({ children }: any) => <em className="italic text-indigo-300">{children}</em>,

    // Unordered list
    ul: ({ children }: any) => <ul className="my-2 space-y-1 pl-2">{children}</ul>,

    // Ordered / numbered list
    ol: ({ children }: any) => <ol className="my-2 space-y-1 pl-2 list-decimal list-inside">{children}</ol>,

    // List items — handles both bullet and numbered
    li: ({ children, ordered }: any) => (
      <li className="flex items-start gap-2 text-sm text-gray-300 leading-relaxed">
        {!ordered && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />}
        <span>{children}</span>
      </li>
    ),

    // Inline code
    code: ({ inline, className, children }: any) => {
      if (inline) {
        return (
          <code className="bg-indigo-950/60 border border-indigo-500/20 px-1.5 py-0.5 rounded font-mono text-xs text-indigo-300">
            {children}
          </code>
        );
      }
      // Block code
      const lang = (className || '').replace('language-', '');
      return (
        <div className="my-3 rounded-xl overflow-hidden border border-white/10">
          {lang && (
            <div className="bg-white/5 px-4 py-1.5 border-b border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{lang}</span>
              <span className="text-[10px] text-gray-500">code</span>
            </div>
          )}
          <pre className="bg-black/50 p-4 overflow-x-auto">
            <code className="font-mono text-xs text-indigo-200 leading-relaxed whitespace-pre">{children}</code>
          </pre>
        </div>
      );
    },

    // Tables (GitHub Flavored Markdown)
    table: ({ children }: any) => (
      <div className="my-3 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-xs">{children}</table>
      </div>
    ),
    thead: ({ children }: any) => <thead className="bg-white/5 border-b border-white/10">{children}</thead>,
    tbody: ({ children }: any) => <tbody className="divide-y divide-white/5">{children}</tbody>,
    tr: ({ children }: any) => <tr className="hover:bg-white/2 transition-colors">{children}</tr>,
    th: ({ children }: any) => <th className="px-4 py-2.5 font-bold text-gray-200 uppercase tracking-wider text-[10px]">{children}</th>,
    td: ({ children }: any) => <td className="px-4 py-2.5 text-gray-300">{children}</td>,

    // Blockquote
    blockquote: ({ children }: any) => (
      <blockquote className="my-2 pl-4 border-l-2 border-indigo-500/50 text-gray-400 italic">{children}</blockquote>
    ),

    // Horizontal rule
    hr: () => <hr className="my-4 border-white/10" />,

    // Links — intercept file:/// links to open in code explorer
    a: ({ href, children }: any) => {
      if (href?.startsWith('file:///')) {
        const path = href.replace('file:///', '').split('#')[0];
        return (
          <button
            onClick={() => onSelectFile(path)}
            className="text-indigo-400 hover:text-indigo-300 font-semibold font-mono underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0 inline"
          >
            {children}
          </button>
        );
      }
      return (
        <a href={href} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
          {children}
        </a>
      );
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6">
      {/* Main Chat Box */}
      <div className="flex-grow glass-panel rounded-3xl flex flex-col justify-between overflow-hidden border border-white/5 h-full">
        {/* Messages list */}
        <div className="flex-grow p-6 overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center">
                <Cpu className="w-6 h-6 text-brand-primary" />
              </div>
              <div>
                <h3 className="font-bold text-white text-md">ForgeMind Agent Console</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Discuss code architectures, find performance bottlenecks, generate test scripts, or draft code updates inside the {project.name} context.
                </p>
              </div>
              {/* Example prompts grid */}
              <div className="grid grid-cols-2 gap-2 w-full mt-2">
                {presetQueries.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => submitQuery(p.query)}
                    className="p-2.5 rounded-xl border border-white/5 bg-white/2 hover:border-brand-primary/30 text-[11px] font-semibold text-gray-400 hover:text-white transition-all text-left cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${
                  msg.role === 'user'
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-brand-primary/15 flex items-center justify-center text-brand-primary flex-shrink-0 mt-0.5">
                    <Cpu className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[85%] min-w-0 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">
                      {msg.role === 'user' ? 'Developer' : 'ForgeMind AI'}
                    </span>
                    {msg.model && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/20 font-bold">
                        {msg.model}
                      </span>
                    )}
                  </div>

                  <div className={`rounded-2xl px-4 py-3 min-w-0 overflow-x-hidden ${
                    msg.role === 'user'
                      ? 'bg-brand-primary/15 border border-brand-primary/20 text-sm text-white'
                      : 'glass-panel border border-white/5 w-full'
                  }`}>
                    {msg.role === 'user' ? (
                      <p className="text-sm text-white leading-relaxed">{msg.content}</p>
                    ) : (
                      <div className="prose-forgemind">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Pending log display */}
          {sending && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary flex-shrink-0 mt-0.5">
                <Loader className="w-4 h-4 animate-spin" />
              </div>
              <div className="glass-panel border border-white/5 rounded-2xl px-4 py-3 max-w-[85%]">
                <span className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Agent Processing</span>
                <div className="font-mono text-[11px] text-indigo-300 space-y-1">
                  {agentLogs.map((log, l) => (
                    <div key={l} className="flex items-center gap-1.5">
                      <ChevronRight className="w-3 h-3 text-gray-500 flex-shrink-0" />
                      <span>{log}</span>
                    </div>
                  ))}
                  {agentLogs.length < 5 && (
                    <div className="flex gap-1 pt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input panel */}
        <div className="p-4 bg-black/20 border-t border-white/5">
          <form
            onSubmit={(e) => { e.preventDefault(); submitQuery(input); }}
            className="relative flex items-center"
          >
            <input
              type="text"
              placeholder="Ask anything about this codebase..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={sending}
              className="w-full pl-4 pr-24 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-brand-primary/50 text-white disabled:opacity-50 placeholder:text-gray-600"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="absolute right-2 px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer text-xs font-bold"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          </form>
          <div className="mt-2 flex items-center justify-between text-[10px] text-gray-600 px-1">
            <span>Groq Multi-Model Routing • llama-3.3-70b / deepseek-r1</span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" /> Enter to send
            </span>
          </div>
        </div>
      </div>

      {/* Preset sidebar actions */}
      <div className="w-full md:w-56 flex-shrink-0 glass-panel p-5 rounded-3xl border border-white/5 flex flex-col h-auto md:h-full">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Quick Demos</h3>
        <div className="space-y-2 flex-grow">
          {presetQueries.map((item, idx) => (
            <button
              key={idx}
              onClick={() => submitQuery(item.query)}
              disabled={sending}
              className="w-full text-left p-3 rounded-xl border border-white/5 bg-white/2 hover:border-brand-primary/30 text-xs font-semibold text-gray-400 hover:text-white transition-all flex items-center justify-between group cursor-pointer disabled:opacity-50"
            >
              <span className="truncate pr-1">{item.label}</span>
              <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-brand-primary transition-all flex-shrink-0" />
            </button>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-white/5 text-[10px] text-gray-600 text-center leading-relaxed">
          Click any target to run pre-seeded hackathon demo flows.
        </div>
      </div>
    </div>
  );
};
export default AIChat;
