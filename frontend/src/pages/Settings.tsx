import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings as SettingsIcon, ShieldCheck, Key, Info, HelpCircle } from 'lucide-react';

export const Settings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/settings');
      setHasKey(res.data.has_key);
      setMaskedKey(res.data.masked_key);
    } catch (err) {
      console.error('Failed to load settings data', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await axios.post('/api/settings', { groq_api_key: apiKey });
      setApiKey('');
      setMsg('API Configuration updated successfully.');
      fetchSettings();
    } catch (err) {
      setMsg('Failed to update API Configuration settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-8 h-8 text-brand-primary" />
          Settings Panel
        </h2>
        <p className="text-sm text-gray-400">Manage LLM configurations, Groq credentials, local storage index caches, and DB settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* API Key Form */}
        <div className="md:col-span-2 glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
          <h3 className="text-md font-bold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-brand-primary" />
            Groq API Key
          </h3>
          
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-2">Groq Authorization Secret</label>
              <input 
                type="password" 
                placeholder={hasKey ? `Active: ${maskedKey}` : "Paste gsk_... key here"}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-brand-primary/50 text-white font-mono"
              />
              <span className="block text-[10px] text-gray-500 mt-1.5 leading-relaxed">
                ForgeMind AI utilizes free Groq rates to execute multi-agent scans. Keys are held locally inside this session index.
              </span>
            </div>

            {msg && (
              <div className={`p-3 rounded-xl border text-xs ${
                msg.includes('success') 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
              }`}>
                {msg}
              </div>
            )}

            <button 
              type="submit" 
              disabled={saving || !apiKey}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-brand-primary hover:bg-brand-primary/95 text-white disabled:opacity-40 disabled:hover:bg-brand-primary transition-all cursor-pointer"
            >
              {saving ? 'Updating Key...' : 'Register Key'}
            </button>
          </form>
        </div>

        {/* AI Router Reference card */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <Info className="w-4 h-4 text-brand-secondary" />
              Routing Guide
            </h3>
            
            <div className="space-y-3.5 text-xs">
              <div className="space-y-0.5">
                <span className="text-gray-500 font-semibold block">Explanations:</span>
                <span className="text-white font-mono font-bold">Llama 3.3 70B</span>
              </div>
              
              <div className="space-y-0.5">
                <span className="text-gray-500 font-semibold block">Deep Reasoning:</span>
                <span className="text-white font-mono font-bold">DeepSeek R1</span>
              </div>
              
              <div className="space-y-0.5">
                <span className="text-gray-500 font-semibold block">Code Generation:</span>
                <span className="text-white font-mono font-bold">Qwen Coder / Llama 3.3</span>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-white/5 text-[10px] text-gray-600 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            Automatic load balancing on.
          </div>
        </div>
      </div>
    </div>
  );
};
export default Settings;
