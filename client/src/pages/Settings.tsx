import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Key,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { api } from '../lib/api';

export const Settings: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [aiProvider, setAiProvider] = useState<'none' | 'gemini' | 'openai'>('none');
  const [apiKey, setApiKey] = useState('');
  const [maskedKey, setMaskedKey] = useState('');
  const [defaultNegative, setDefaultNegative] = useState(0.25);
  const [defaultTime, setDefaultTime] = useState(90);

  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.getSettings();
      const s = res.settings;
      if (s) {
        setTheme(s.theme || 'dark');
        setAiProvider(s.ai_provider || 'none');
        setMaskedKey(s.apiKeyMasked || '');
        setDefaultNegative(s.default_negative_marking || 0.25);
        setDefaultTime(s.default_time_per_question || 90);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestKey = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await api.testAIConnection(aiProvider, apiKey);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await api.updateSettings({
        theme,
        aiProvider,
        apiKey: apiKey.trim() || undefined,
        defaultNegativeMarking: defaultNegative,
        defaultTimePerQuestion: defaultTime
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadSettings();
    } catch (err: any) {
      alert('Error saving settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <SettingsIcon className="w-6 h-6 text-indigo-400" />
          Application Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Customize assessment parameters, exam timing, visual mode, and AI extraction engine.
        </p>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        {/* Appearance */}
        <div className="space-y-3 pb-6 border-b border-slate-800">
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
            Interface Theme
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                theme === 'dark'
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
                  : 'bg-[#161F30] text-slate-400 border-slate-700/80 hover:text-white'
              }`}
            >
              <Moon className="w-4 h-4 text-indigo-400" />
              <span>Dark Mode (Recommended)</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                theme === 'light'
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
                  : 'bg-[#161F30] text-slate-400 border-slate-700/80 hover:text-white'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Light Mode</span>
            </button>
          </div>
        </div>

        {/* AI Provider & API Key */}
        <div className="space-y-4 pb-6 border-b border-slate-800">
          <div>
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block mb-1">
              Document Extraction Engine
            </label>
            <p className="text-xs text-slate-400">
              QuizForge uses high-precision heuristic rule parsing by default (100% offline). You can optionally connect an AI model for advanced unstructured multi-column layouts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'none', label: 'Rule-based Engine', desc: 'Fast, offline, zero API costs' },
              { id: 'gemini', label: 'Google Gemini', desc: 'Multimodal vision & layout analysis' },
              { id: 'openai', label: 'OpenAI API', desc: 'GPT-4o question parsing' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setAiProvider(p.id as any)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  aiProvider === p.id
                    ? 'bg-indigo-600/15 border-indigo-500 text-white'
                    : 'bg-[#161F30] border-slate-700/80 text-slate-300 hover:border-slate-600'
                }`}
              >
                <span className="text-xs font-bold block">{p.label}</span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">{p.desc}</span>
              </button>
            ))}
          </div>

          {aiProvider !== 'none' && (
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-slate-300">
                {aiProvider === 'gemini' ? 'Google Gemini API Key' : 'OpenAI API Key'}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder={maskedKey ? `Current Key: ${maskedKey}` : 'Paste API Key here...'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1 bg-[#161F30] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleTestKey}
                  disabled={testingConnection || (!apiKey && !maskedKey)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-50 transition-colors shrink-0"
                >
                  {testingConnection ? 'Testing...' : 'Test Connection'}
                </button>
              </div>

              {testResult && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Default Exam Rules */}
        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
            Default Examination Parameters
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-semibold text-slate-400 mb-1.5">
                Default Negative Marking Penalty
              </span>
              <select
                value={defaultNegative}
                onChange={(e) => setDefaultNegative(parseFloat(e.target.value))}
                className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
              >
                <option value={0.0}>No Penalty (0.0 marks)</option>
                <option value={0.25}>-0.25 marks (1/4 penalty)</option>
                <option value={0.33}>-0.33 marks (1/3 penalty)</option>
                <option value={0.5}>-0.50 marks (1/2 penalty)</option>
                <option value={1.0}>-1.00 mark (Full penalty)</option>
              </select>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-400 mb-1.5">
                Default Target Time Per Question
              </span>
              <select
                value={defaultTime}
                onChange={(e) => setDefaultTime(parseInt(e.target.value))}
                className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
              >
                <option value={45}>45 seconds</option>
                <option value={60}>60 seconds (1 minute)</option>
                <option value={90}>90 seconds (1.5 minutes)</option>
                <option value={120}>120 seconds (2 minutes)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-800">
          <div>
            {saveSuccess && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Settings saved successfully!
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
