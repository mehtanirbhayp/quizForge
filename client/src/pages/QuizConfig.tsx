import React, { useState } from 'react';
import {
  PlayCircle,
  Sliders,
  Sparkles,
  Clock,
  Shuffle,
  ShieldAlert,
  HelpCircle,
  BookOpen,
  FolderKanban,
  FileText,
  Bookmark,
  RefreshCcw,
  Zap,
  Target,
  AlertTriangle
} from 'lucide-react';
import { Document, Collection, Topic, QuizSettings } from '../types';
import { api } from '../lib/api';

interface QuizConfigProps {
  documents: Document[];
  collections: Collection[];
  preselectedDocId?: string;
  preselectedCollectionId?: string;
  preselectedQuestionIds?: string[];
  onStartQuizSession: (sessionId: string) => void;
}

export const QuizConfig: React.FC<QuizConfigProps> = ({
  documents,
  collections,
  preselectedDocId,
  preselectedCollectionId,
  preselectedQuestionIds,
  onStartQuizSession
}) => {
  const [sourceType, setSourceType] = useState<string>(
    preselectedQuestionIds && preselectedQuestionIds.length > 0
      ? 'manual'
      : preselectedDocId
      ? 'document'
      : preselectedCollectionId
      ? 'collection'
      : 'all'
  );
  const [sourceId, setSourceId] = useState<string>(preselectedDocId || preselectedCollectionId || '');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [questionCount, setQuestionCount] = useState<number | string>(10);
  const [customCount, setCustomCount] = useState<string>('15');
  const [questionOrder, setQuestionOrder] = useState<'original' | 'random' | 'topic' | 'difficulty' | 'incorrect_first'>('random');
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(true);
  const [difficulty, setDifficulty] = useState<string>('all');
  
  // Behavior
  const [quizMode, setQuizMode] = useState<'practice' | 'exam' | 'revision' | 'quick'>('practice');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(0);
  const [negativeMarking, setNegativeMarking] = useState<boolean>(false);
  const [negativeMarks, setNegativeMarks] = useState<number>(0.25);
  const [showHints, setShowHints] = useState<boolean>(true);
  const [showExplanations, setShowExplanations] = useState<boolean>(true);
  const [immediateFeedback, setImmediateFeedback] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [warning, setWarning] = useState<string | null>(null);

  // Apply Presets
  const applyPreset = (preset: 'practice' | 'exam' | 'revision' | 'quick') => {
    setQuizMode(preset);
    if (preset === 'practice') {
      setImmediateFeedback(true);
      setTimeLimitMinutes(0);
      setNegativeMarking(false);
      setShowExplanations(true);
      setShowHints(true);
      setQuestionCount(10);
    } else if (preset === 'exam') {
      setImmediateFeedback(false);
      setTimeLimitMinutes(20);
      setNegativeMarking(true);
      setNegativeMarks(0.25);
      setShowExplanations(false);
      setShowHints(false);
      setQuestionCount(20);
      setShuffleOptions(true);
    } else if (preset === 'revision') {
      setSourceType('incorrect_only');
      setImmediateFeedback(true);
      setTimeLimitMinutes(0);
      setNegativeMarking(false);
      setShowExplanations(true);
      setQuestionCount(10);
    } else if (preset === 'quick') {
      setSourceType('all');
      setQuestionCount(10);
      setQuestionOrder('random');
      setImmediateFeedback(true);
      setTimeLimitMinutes(0);
      setNegativeMarking(false);
    }
  };

  const handleLaunchQuiz = async () => {
    setLoading(true);
    setWarning(null);

    const countToSend = questionCount === 'custom' ? parseInt(customCount) || 10 : questionCount;

    try {
      const res = await api.generateQuiz({
        title: `${quizMode.toUpperCase()} Quiz — ${new Date().toLocaleDateString()}`,
        sourceType,
        sourceId: sourceId || undefined,
        questionIds: preselectedQuestionIds,
        verifiedOnly,
        questionCount: countToSend,
        questionOrder,
        shuffleOptions,
        quizMode,
        timeLimitMinutes,
        negativeMarking,
        negativeMarks: negativeMarking ? negativeMarks : 0,
        marksPerQuestion: 1.0,
        showHints,
        showExplanations,
        immediateFeedback
      });

      if (res.fewerAvailable) {
        // If fewer available, still proceed into the session
        onStartQuizSession(res.sessionId);
      } else {
        onStartQuizSession(res.sessionId);
      }
    } catch (err: any) {
      setWarning(err.message || 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Sliders className="w-6 h-6 text-indigo-400" />
          Interactive Quiz Generator
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure questions, timing, scoring, and feedback rules to match your study goals.
        </p>
      </div>

      {/* Presets Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            id: 'practice',
            name: 'Practice Mode',
            desc: 'Immediate feedback, hints & explanations',
            icon: BookOpen,
            color: 'indigo'
          },
          {
            id: 'exam',
            name: 'Timed Exam Mode',
            desc: 'Countdown timer, negative marks, end score',
            icon: Clock,
            color: 'rose'
          },
          {
            id: 'revision',
            name: 'Revision Mode',
            desc: 'Focus on previously missed questions',
            icon: RefreshCcw,
            color: 'amber'
          },
          {
            id: 'quick',
            name: 'Quick 10-Q Test',
            desc: '10 randomized questions with instant start',
            icon: Zap,
            color: 'emerald'
          }
        ].map((p) => {
          const Icon = p.icon;
          const isSelected = quizMode === p.id;
          return (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id as any)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'bg-indigo-600/15 border-indigo-500 shadow-sm'
                  : 'bg-[#111827] border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`} />
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                )}
              </div>
              <h3 className="text-xs font-bold text-slate-200">{p.name}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{p.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Warning Box */}
      {warning && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{warning}</span>
        </div>
      )}

      {/* Configuration Form Panels */}
      <div className="space-y-6 bg-[#111827] border border-slate-800 rounded-3xl p-6 md:p-8">
        {/* Section 1: Question Source */}
        <div className="space-y-3 pb-6 border-b border-slate-800">
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
            1. Question Source
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: 'all', label: 'All Documents' },
              { id: 'document', label: 'Specific PDF' },
              { id: 'collection', label: 'Study Collection' },
              { id: 'bookmarked_only', label: 'Bookmarked Only' },
              { id: 'incorrect_only', label: 'Previously Missed' },
              { id: 'unanswered_only', label: 'Unanswered Only' },
              ...(preselectedQuestionIds && preselectedQuestionIds.length > 0
                ? [{ id: 'manual', label: `Selected (${preselectedQuestionIds.length})` }]
                : [])
            ].map((src) => (
              <button
                key={src.id}
                type="button"
                onClick={() => {
                  setSourceType(src.id);
                  if (src.id === 'document' && (!sourceId || !documents.some(d => d.id === sourceId)) && documents.length > 0) {
                    setSourceId(documents[0].id);
                  } else if (src.id === 'collection' && (!sourceId || !collections.some(c => c.id === sourceId)) && collections.length > 0) {
                    setSourceId(collections[0].id);
                  }
                }}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                  sourceType === src.id
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-[#161F30] text-slate-300 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                {src.label}
              </button>
            ))}
          </div>

          {/* Conditional Dropdown for Document or Collection */}
          {sourceType === 'document' && (
            <div className="pt-2">
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Choose a PDF Document --</option>
                {documents.map(d => (
                  <option key={d.id} value={d.id}>{d.title} ({d.question_count || 0} questions)</option>
                ))}
              </select>
            </div>
          )}

          {sourceType === 'collection' && (
            <div className="pt-2">
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Choose a Collection --</option>
                {collections.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.question_count || 0} questions)</option>
                ))}
              </select>
            </div>
          )}

          {/* Verified Only toggle */}
          <div className="pt-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="verifiedOnly"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 cursor-pointer"
            />
            <label htmlFor="verifiedOnly" className="text-xs text-slate-300 cursor-pointer select-none">
              Include only verified questions (recommended for mock exams)
            </label>
          </div>
        </div>

        {/* Section 2: Question Count */}
        <div className="space-y-3 pb-6 border-b border-slate-800">
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
            2. Number of Questions
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {[5, 10, 15, 20, 25, 50, 'all', 'custom'].map((cnt) => (
              <button
                key={String(cnt)}
                type="button"
                onClick={() => setQuestionCount(cnt as any)}
                className={`py-2 px-4 rounded-xl text-xs font-semibold border transition-all ${
                  questionCount === cnt
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-[#161F30] text-slate-300 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                {cnt === 'all' ? 'All Available' : cnt === 'custom' ? 'Custom' : `${cnt} Questions`}
              </button>
            ))}
          </div>

          {questionCount === 'custom' && (
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs text-slate-400">Questions count:</span>
              <input
                type="number"
                min="1"
                max="200"
                value={customCount}
                onChange={(e) => setCustomCount(e.target.value)}
                className="w-24 bg-[#161F30] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
              />
            </div>
          )}
        </div>

        {/* Section 3: Ordering & Shuffling */}
        <div className="space-y-3 pb-6 border-b border-slate-800">
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
            3. Ordering & Option Shuffling
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-semibold text-slate-400 mb-1.5">Question Order</span>
              <select
                value={questionOrder}
                onChange={(e) => setQuestionOrder(e.target.value as any)}
                className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="random">Randomized Order</option>
                <option value="original">Original Source PDF Order</option>
                <option value="topic">Topic-wise Grouped</option>
                <option value="difficulty">Difficulty (Easy to Hard)</option>
              </select>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-400 mb-1.5">Option Shuffling</span>
              <div className="flex items-center gap-2 pt-1.5">
                <input
                  type="checkbox"
                  id="shuffOpt"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 cursor-pointer"
                />
                <label htmlFor="shuffOpt" className="text-xs text-slate-300 cursor-pointer select-none">
                  Shuffle answer options (safely preserves correct answer)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Timer & Marking Behavior */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
            4. Timer & Marking Rules
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-semibold text-slate-400 mb-1.5">Countdown Time Limit</span>
              <select
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value={0}>No Timer (Untimed Practice)</option>
                <option value={5}>5 Minutes (Sprint)</option>
                <option value={10}>10 Minutes</option>
                <option value={15}>15 Minutes</option>
                <option value={20}>20 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={60}>60 Minutes (Full Exam)</option>
              </select>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-400 mb-1.5">Feedback Mode</span>
              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="feedbackMode"
                    checked={immediateFeedback}
                    onChange={() => setImmediateFeedback(true)}
                    className="text-indigo-600"
                  />
                  <span>Immediate explanation after each question</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="feedbackMode"
                    checked={!immediateFeedback}
                    onChange={() => setImmediateFeedback(false)}
                    className="text-indigo-600"
                  />
                  <span>Feedback only after final submission</span>
                </label>
              </div>
            </div>
          </div>

          {/* Negative Marking */}
          <div className="pt-2 flex items-center justify-between p-3.5 rounded-xl bg-slate-900/50 border border-slate-800">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Negative Marking</span>
              <span className="text-[11px] text-slate-400">Deduct marks for incorrect answers</span>
            </div>
            <div className="flex items-center gap-3">
              {negativeMarking && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">Penalty:</span>
                  <select
                    value={negativeMarks}
                    onChange={(e) => setNegativeMarks(parseFloat(e.target.value))}
                    className="bg-[#161F30] border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200"
                  >
                    <option value={0.25}>-0.25 marks</option>
                    <option value={0.33}>-0.33 marks</option>
                    <option value={0.50}>-0.50 marks</option>
                    <option value={1.00}>-1.00 mark</option>
                  </select>
                </div>
              )}
              <input
                type="checkbox"
                checked={negativeMarking}
                onChange={(e) => setNegativeMarking(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="pt-4">
          <button
            onClick={handleLaunchQuiz}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm tracking-wide shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <PlayCircle className="w-5 h-5 fill-white" />
            <span>{loading ? 'Assembling Quiz...' : 'Generate & Begin Practice Quiz'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
