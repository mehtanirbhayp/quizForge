import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Flag,
  RotateCcw,
  Send,
  X,
  FileText,
  AlertTriangle,
  Lightbulb,
  Check
} from 'lucide-react';
import { QuizSession, QuizSessionQuestion } from '../types';
import { api } from '../lib/api';
import { MathRenderer } from '../components/MathRenderer';

interface ActiveQuizProps {
  sessionId: string;
  onQuizSubmitted: (sessionId: string, report: any) => void;
  onExit: () => void;
}

export const ActiveQuiz: React.FC<ActiveQuizProps> = ({
  sessionId,
  onQuizSubmitted,
  onExit
}) => {
  const [session, setSession] = useState<QuizSession | null>(null);
  const [questions, setQuestions] = useState<QuizSessionQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Timer reference
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    loadSession();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionId]);

  const loadSession = async () => {
    setLoading(true);
    try {
      const res = await api.getQuizSession(sessionId);
      setSession(res.session);
      setQuestions(res.questions);

      // Hydrate previous responses if resuming
      const initialResponses: Record<string, any> = {};
      const initialReview = new Set<string>();

      res.questions.forEach((q: any) => {
        if (q.userResponse !== null && q.userResponse !== undefined) {
          initialResponses[q.id] = q.userResponse;
        }
        if (q.isMarkedForReview) {
          initialReview.add(q.id);
        }
      });

      setResponses(initialResponses);
      setMarkedForReview(initialReview);

      // Initialize countdown timer if configured
      const timeLimitMins = res.session.settings?.timeLimitMinutes || 0;
      if (timeLimitMins > 0) {
        const totalSecs = timeLimitMins * 60;
        setTimeLeftSeconds(totalSecs);

        timerRef.current = setInterval(() => {
          setTimeLeftSeconds(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(timerRef.current);
              handleAutoSubmit();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err: any) {
      alert('Error loading quiz session: ' + err.message);
      onExit();
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSubmit = () => {
    alert('Time limit reached! Your quiz is being automatically submitted.');
    submitFinalQuiz();
  };

  const currentQ = questions[currentIndex];

  const handleSelectOption = (optLabel: string) => {
    if (!currentQ) return;
    let newResponse: any;

    if (currentQ.question_type === 'multiple_select') {
      const prev = Array.isArray(responses[currentQ.id]) ? [...responses[currentQ.id]] : [];
      if (prev.includes(optLabel)) {
        newResponse = prev.filter(x => x !== optLabel);
      } else {
        newResponse = [...prev, optLabel];
      }
    } else {
      newResponse = optLabel;
    }

    setResponses(prev => ({ ...prev, [currentQ.id]: newResponse }));
    // Persist immediately to backend
    api.saveQuizResponse(sessionId, currentQ.id, newResponse, markedForReview.has(currentQ.id)).catch(console.error);
  };

  const handleTextChange = (text: string) => {
    if (!currentQ) return;
    setResponses(prev => ({ ...prev, [currentQ.id]: text }));
    api.saveQuizResponse(sessionId, currentQ.id, text, markedForReview.has(currentQ.id)).catch(console.error);
  };

  const handleClearResponse = () => {
    if (!currentQ) return;
    const next = { ...responses };
    delete next[currentQ.id];
    setResponses(next);
    api.saveQuizResponse(sessionId, currentQ.id, null, markedForReview.has(currentQ.id)).catch(console.error);
  };

  const handleToggleReview = () => {
    if (!currentQ) return;
    const next = new Set(markedForReview);
    const isNowReview = !next.has(currentQ.id);
    if (isNowReview) next.add(currentQ.id);
    else next.delete(currentQ.id);
    setMarkedForReview(next);
    api.saveQuizResponse(sessionId, currentQ.id, responses[currentQ.id], isNowReview).catch(console.error);
  };

  const handleToggleBookmark = async () => {
    if (!currentQ) return;
    try {
      const res = await api.toggleBookmark(currentQ.id);
      setQuestions(prev => prev.map(q => q.id === currentQ.id ? { ...q, is_bookmarked: res.isBookmarked } : q));
    } catch (err) {
      console.error(err);
    }
  };

  const submitFinalQuiz = async () => {
    setSubmitting(true);
    const elapsedSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    try {
      const res = await api.submitQuiz(sessionId, elapsedSeconds);
      setShowSubmitModal(false);
      onQuizSubmitted(sessionId, res.report);
    } catch (err: any) {
      alert('Error submitting quiz: ' + err.message);
      setSubmitting(false);
    }
  };

  if (loading || !currentQ) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium">Preparing distraction-free quiz workspace...</p>
        </div>
      </div>
    );
  }

  // Answered questions count
  const answeredCount = Object.keys(responses).filter(k => {
    const val = responses[k];
    if (val === null || val === undefined) return false;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'string') return val.trim().length > 0;
    return true;
  }).length;
  const unansweredCount = questions.length - answeredCount;

  const isImmediate = session?.settings?.quizMode === 'practice' || session?.settings?.immediateFeedback;
  const currentAnswer = responses[currentQ.id];

  // Timer formatting
  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Sticky Exam Header */}
      <div className="sticky top-0 z-30 bg-[#0B0F17]/90 backdrop-blur-md border-b border-slate-800/80 -mx-4 px-4 py-3 sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onExit}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              title="Pause & Exit Quiz"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate">{session?.title}</h1>
              <p className="text-[11px] text-slate-400 truncate">
                Question {currentIndex + 1} of {questions.length} • {answeredCount} Answered
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Timer Badge if enabled */}
            {timeLeftSeconds !== null && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-colors ${
                timeLeftSeconds < 120
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                  : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimer(timeLeftSeconds)}</span>
              </div>
            )}

            <button
              onClick={() => setShowSubmitModal(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Exam</span>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-800 h-1 mt-3 rounded-full overflow-hidden">
          <div
            className="bg-indigo-500 h-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Grid: Question Card & Question Palette */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Question Area (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            {/* Question Info Bar */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                  Question {currentIndex + 1}
                </span>
                <span className="text-slate-400">
                  [{currentQ.marks || 1} {(currentQ.marks || 1) === 1 ? 'Mark' : 'Marks'}
                  {(currentQ.negativeMarks || 0) > 0 ? ` | -${currentQ.negativeMarks}` : ''}]
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 capitalize text-[11px]">
                  {(currentQ.question_type || (currentQ as any).questionType || 'single_select').replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {currentQ.hint && (
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>{showHint ? 'Hide Hint' : 'Hint'}</span>
                  </button>
                )}
                <button
                  onClick={handleToggleBookmark}
                  className={`p-1.5 rounded-lg transition-colors ${
                    currentQ.is_bookmarked
                      ? 'text-amber-400 bg-amber-400/15'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Bookmark Question"
                >
                  {currentQ.is_bookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Hint Notice */}
            {showHint && currentQ.hint && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{currentQ.hint}</span>
              </div>
            )}

            {/* Question Text */}
            <div className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed">
              <MathRenderer text={currentQ.question_text} />
            </div>

            {/* Diagram notice if applicable */}
            {currentQ.is_diagram_based ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-300">
                <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  Refer to figure on source PDF page {currentQ.source_page} ({currentQ.document_title})
                </span>
              </div>
            ) : null}

            {/* Answer Options Area */}
            <div className="space-y-3 pt-2">
              {(currentQ.question_type === 'single_select' || currentQ.question_type === 'true_false' || (currentQ as any).questionType === 'single_select') ? (
                (currentQ.options || []).map((opt) => {
                  const isSelected = currentAnswer === opt.label;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectOption(opt.label)}
                      className={`w-full flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-500/10'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'border-slate-700 text-slate-400 bg-slate-800'
                      }`}>
                        {opt.label}
                      </div>
                      <div className={`flex-1 text-sm ${isSelected ? 'text-white font-semibold' : 'text-slate-300'}`}>
                        <MathRenderer text={opt.text} />
                      </div>
                    </button>
                  );
                })
              ) : (currentQ.question_type === 'multiple_select' || (currentQ as any).questionType === 'multiple_select') ? (
                (currentQ.options || []).map((opt) => {
                  const isSelected = Array.isArray(currentAnswer) && currentAnswer.includes(opt.label);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectOption(opt.label)}
                      className={`w-full flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-500/10'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 mt-0.5 border transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'border-slate-700 bg-slate-800'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div className={`flex-1 text-sm ${isSelected ? 'text-white font-semibold' : 'text-slate-300'}`}>
                        <span className="font-bold mr-2 text-indigo-400">({opt.label})</span>
                        <MathRenderer text={opt.text} />
                      </div>
                    </button>
                  );
                })
              ) : currentQ.question_type === 'numerical' ? (
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-semibold block">Enter Numerical Value:</label>
                  <input
                    type="number"
                    step="any"
                    value={currentAnswer || ''}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder="Enter calculated numerical magnitude..."
                    className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-semibold block">Enter Your Answer:</label>
                  <input
                    type="text"
                    value={currentAnswer || ''}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder="Type answer here..."
                    className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Immediate Practice Mode Feedback Box */}
            {isImmediate && currentAnswer && (() => {
              const correctOpt = (currentQ.options || []).find(o => o.isCorrect === true || Boolean(o.is_correct));
              const isSelectedCorrect = correctOpt ? (currentAnswer === correctOpt.label) : null;
              return (
                <div className={`mt-4 p-4 rounded-2xl border space-y-2.5 animate-in fade-in duration-150 ${
                  isSelectedCorrect === true
                    ? 'bg-emerald-950/30 border-emerald-500/40'
                    : isSelectedCorrect === false
                    ? 'bg-rose-950/30 border-rose-500/40'
                    : 'bg-indigo-950/30 border-indigo-500/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isSelectedCorrect === true ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Correct!
                        </span>
                      ) : isSelectedCorrect === false ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                          <AlertCircle className="w-4 h-4 text-rose-400" /> Incorrect
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Practice Mode Feedback</span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">Source Page {currentQ.source_page}</span>
                  </div>

                  {correctOpt && isSelectedCorrect === false && (
                    <div className="text-xs font-medium text-slate-200 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-emerald-400 font-bold mr-1">Correct Answer:</span>
                      Option {correctOpt.label} — {correctOpt.text}
                    </div>
                  )}

                  {currentQ.explanation && (
                    <div className="text-xs text-slate-300 leading-relaxed pt-1">
                      <span className="font-semibold text-slate-400 block mb-0.5">Explanation:</span>
                      <MathRenderer text={currentQ.explanation} />
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Question Actions (Clear / Mark for Review) */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
              <button
                onClick={handleClearResponse}
                disabled={!currentAnswer}
                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Choice</span>
              </button>

              <button
                onClick={handleToggleReview}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                  markedForReview.has(currentQ.id)
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{markedForReview.has(currentQ.id) ? 'Marked for Review' : 'Mark for Review'}</span>
              </button>
            </div>
          </div>

          {/* Bottom Navigation Buttons */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-semibold text-xs transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Review & Submit</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Question Palette Grid (1 col) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Question Palette
            </h3>

            {/* Status Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500/20 border border-emerald-500/50" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-slate-800 border border-slate-700" />
                <span>Unanswered ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-amber-500/20 border border-amber-500/50" />
                <span>Review ({markedForReview.size})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md border-2 border-indigo-500" />
                <span>Current</span>
              </div>
            </div>

            {/* Tile Grid */}
            <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = responses[q.id] !== undefined && responses[q.id] !== null && responses[q.id] !== '';
                const isReview = markedForReview.has(q.id);

                let tileBg = 'bg-slate-800/80 text-slate-400 border-slate-700/80';
                if (isReview) {
                  tileBg = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                } else if (isAnswered) {
                  tileBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-xl font-mono text-xs font-semibold border flex items-center justify-center transition-all ${tileBg} ${
                      isCurrent ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#111827]' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Submit Quiz CTA */}
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs tracking-wide shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Assessment</span>
            </button>
          </div>
        </div>
      </div>

      {/* Submission Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Confirm Quiz Submission</h3>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                Are you ready to finalize and calculate your score? Here is your question summary:
              </p>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="block text-lg font-black text-white">{questions.length}</span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Total</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="block text-lg font-black text-emerald-400">{answeredCount}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase">Answered</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <span className="block text-lg font-black text-rose-400">{unansweredCount}</span>
                  <span className="text-[10px] text-rose-400 font-semibold uppercase">Unanswered</span>
                </div>
              </div>

              {markedForReview.size > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                  <Flag className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>You still have {markedForReview.size} question(s) marked for review.</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Return to Quiz
              </button>
              <button
                onClick={submitFinalQuiz}
                disabled={submitting}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Calculating Score...' : 'Confirm Submission'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
