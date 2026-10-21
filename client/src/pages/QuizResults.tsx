import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Play,
  ArrowRight,
  Download,
  Share2,
  Filter,
  Check,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { QuizScoreReport, QuizSession, QuizSessionQuestion } from '../types';
import { api } from '../lib/api';
import { MathRenderer } from '../components/MathRenderer';

interface QuizResultsProps {
  sessionId: string;
  report: QuizScoreReport | null;
  onRetryQuiz: (newSessionId: string) => void;
  onNavigate: (tab: string) => void;
}

export const QuizResults: React.FC<QuizResultsProps> = ({
  sessionId,
  report: initialReport,
  onRetryQuiz,
  onNavigate
}) => {
  const [session, setSession] = useState<QuizSession | null>(null);
  const [questions, setQuestions] = useState<QuizSessionQuestion[]>([]);
  const [report, setReport] = useState<QuizScoreReport | null>(initialReport);
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect' | 'unanswered' | 'ungraded'>('all');
  const [loading, setLoading] = useState<boolean>(!initialReport);

  useEffect(() => {
    loadResults();
  }, [sessionId]);

  const loadResults = async () => {
    try {
      const res = await api.getQuizSession(sessionId);
      setSession(res.session);
      setQuestions(res.questions);

      // Trigger confetti if accuracy is >= 70%
      const acc = res.session.accuracy || (initialReport?.accuracy || 0);
      if (acc >= 70) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (mode: 'all' | 'incorrect_only' | 'unanswered_only') => {
    try {
      const res = await api.retryQuiz(sessionId, mode);
      onRetryQuiz(res.sessionId);
    } catch (err: any) {
      alert('Error creating retry quiz: ' + err.message);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ session, questions, report }, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `quizforge_results_${sessionId}.json`);
    dlAnchorElem.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-400">
        Loading score report...
      </div>
    );
  }

  const score = session?.score ?? report?.totalMarksAwarded ?? 0;
  const maxScore = session?.maximum_score ?? report?.maximumMarks ?? 0;
  const accuracy = Math.round(session?.accuracy ?? report?.accuracy ?? 0);
  const correctCount = session?.correct_count ?? report?.correctCount ?? 0;
  const incorrectCount = session?.incorrect_count ?? report?.incorrectCount ?? 0;
  const unansweredCount = session?.unanswered_count ?? report?.unansweredCount ?? 0;
  const timeTaken = session?.time_taken ?? report?.timeTaken ?? 0;

  // Filter questions
  const filteredQuestions = questions.filter(q => {
    const isCorr = q.isCorrect === true || q.isCorrect === 1;
    const isWrong = q.isCorrect === false || q.isCorrect === 0;
    if (filter === 'correct') return isCorr;
    if (filter === 'incorrect') return isWrong && q.userResponse !== null && q.userResponse !== undefined;
    if (filter === 'unanswered') return q.userResponse === null || q.userResponse === undefined;
    if (filter === 'ungraded') return q.isCorrect === null || q.isCorrect === undefined;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#161F30] via-[#1B253D] to-[#141B2D] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20">
          <Trophy className="w-8 h-8" />
        </div>

        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Assessment Completed
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            {session?.title || 'Quiz Results'}
          </h1>
        </div>

        {/* Big Score Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 max-w-2xl mx-auto">
          <div className="p-4 rounded-2xl bg-[#111827]/80 border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">Final Score</span>
            <span className="text-2xl font-black text-white mt-0.5 block">
              {score} <span className="text-xs text-slate-400 font-normal">/ {maxScore}</span>
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#111827]/80 border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">Accuracy</span>
            <span className={`text-2xl font-black mt-0.5 block ${accuracy >= 75 ? 'text-emerald-400' : accuracy >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
              {accuracy}%
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#111827]/80 border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">Correct Answers</span>
            <span className="text-2xl font-black text-emerald-400 mt-0.5 block">
              {correctCount} <span className="text-xs text-slate-400 font-normal">/ {questions.length}</span>
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#111827]/80 border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">Time Taken</span>
            <span className="text-2xl font-black text-slate-200 mt-0.5 block">
              {Math.floor(timeTaken / 60)}m {timeTaken % 60}s
            </span>
          </div>
        </div>

        {/* Retry & Next Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
          <button
            onClick={() => handleRetry('all')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Entire Quiz</span>
          </button>

          {incorrectCount > 0 && (
            <button
              onClick={() => handleRetry('incorrect_only')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Practice Missed Questions ({incorrectCount})</span>
            </button>
          )}

          {unansweredCount > 0 && (
            <button
              onClick={() => handleRetry('unanswered_only')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <span>Practice Unanswered ({unansweredCount})</span>
            </button>
          )}

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-medium"
            title="Download JSON Report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Question-by-Question Review Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <h2 className="text-lg font-bold text-white">Question-by-Question Breakdown</h2>
          <p className="text-xs text-slate-400">Review your choices against verified answer keys and explanations</p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: 'all', label: `All (${questions.length})` },
            { id: 'correct', label: `Correct (${correctCount})` },
            { id: 'incorrect', label: `Incorrect (${incorrectCount})` },
            { id: 'unanswered', label: `Unanswered (${unansweredCount})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                filter === tab.id
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 bg-[#111827] border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-4">
        {filteredQuestions.map((q, idx) => {
          const isCorrect = q.isCorrect === true || q.isCorrect === 1;
          const isIncorrect = (q.isCorrect === false || q.isCorrect === 0) && q.userResponse !== null && q.userResponse !== undefined;
          const isUnanswered = q.userResponse === null || q.userResponse === undefined;
          const isUngraded = q.isCorrect === null || q.isCorrect === undefined;

          return (
            <div
              key={q.id}
              className={`bg-[#111827] border rounded-2xl p-6 transition-all ${
                isCorrect
                  ? 'border-emerald-500/30'
                  : isIncorrect
                  ? 'border-rose-500/30'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                    Q{q.displayOrder || idx + 1}
                  </span>
                  <span className="text-xs text-slate-400">
                    Source: {q.documentTitle} (p. {q.source_page})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isCorrect && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Correct (+{q.marksAwarded || q.marks})
                    </span>
                  )}
                  {isIncorrect && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                      <XCircle className="w-3.5 h-3.5" /> Incorrect ({q.marksAwarded !== undefined ? q.marksAwarded : 0})
                    </span>
                  )}
                  {isUnanswered && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                      Unanswered (0)
                    </span>
                  )}
                  {isUngraded && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-500/15 text-violet-400 border border-violet-500/30">
                      Ungraded Key
                    </span>
                  )}
                </div>
              </div>

              {/* Text */}
              <div className="text-sm font-semibold text-slate-100 my-2">
                <MathRenderer text={q.question_text} />
              </div>

              {/* Options */}
              {q.options && q.options.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3">
                  {q.options.map((opt) => {
                    const isUserPick = q.userResponse === opt.label || (Array.isArray(q.userResponse) && q.userResponse.includes(opt.label));
                    const isActualCorrect = opt.isCorrect || opt.is_correct;

                    let cardClass = 'bg-slate-900/40 border-slate-800 text-slate-300';
                    if (isActualCorrect) {
                      cardClass = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-medium';
                    } else if (isUserPick && !isActualCorrect) {
                      cardClass = 'bg-rose-500/10 border-rose-500/40 text-rose-300 font-medium line-through';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs ${cardClass}`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                          isActualCorrect
                            ? 'bg-emerald-500 text-white'
                            : isUserPick
                            ? 'bg-rose-500 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {opt.label}
                        </span>
                        <div className="flex-1">
                          <MathRenderer text={opt.text} />
                        </div>
                        {isUserPick && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                            Your Choice
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Numerical or text responses */}
              {q.question_type !== 'single_select' && q.question_type !== 'multiple_select' && q.question_type !== 'true_false' && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                  <div>
                    <span className="text-slate-400">Your Answer: </span>
                    <span className="font-mono text-slate-200 font-semibold">{q.userResponse || '(none)'}</span>
                  </div>
                </div>
              )}

              {/* Source Explanation */}
              {q.explanation && (
                <div className="mt-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-1">
                  <span className="font-semibold text-indigo-400 block">Explanation & Source Solution:</span>
                  <MathRenderer text={q.explanation} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Return to Dashboard CTA */}
      <div className="pt-4 text-center">
        <button
          onClick={() => onNavigate('dashboard')}
          className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};
