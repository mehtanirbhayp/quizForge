import React from 'react';
import {
  FileText,
  HelpCircle,
  Trophy,
  Target,
  ArrowRight,
  Play,
  Upload,
  PlusCircle,
  Database,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FolderKanban
} from 'lucide-react';
import { AnalyticsOverview, Document, Collection } from '../types';

interface DashboardProps {
  analytics: AnalyticsOverview | null;
  documents: Document[];
  collections: Collection[];
  recentTrends: any[];
  onNavigate: (tab: string, params?: any) => void;
  onOpenUpload: () => void;
  onStartQuizFromDoc: (docId: string) => void;
  onReviewDoc: (docId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  analytics,
  documents,
  collections,
  recentTrends,
  onNavigate,
  onOpenUpload,
  onStartQuizFromDoc,
  onReviewDoc
}) => {
  const recentDocs = documents.slice(0, 5);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Ready
          </span>
        );
      case 'completed_with_warnings':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3" /> Needs Review
          </span>
        );
      case 'extracting_text':
      case 'identifying_questions':
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 animate-pulse">
            Extracting...
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30">
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/15 text-slate-400 border border-slate-500/30">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome & Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#161F30] via-[#1A2338] to-[#141B2D] border border-slate-800 p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Interactive PDF Assessment Engine
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, Alex!
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Upload your course PDFs, lecture sheets, and question papers. QuizForge extracts questions and answer keys into customizable, distraction-free practice tests.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('practice_quiz')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start Practice Quiz</span>
            </button>
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-medium text-sm border border-slate-700 transition-all"
            >
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Upload PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Uploaded Documents</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{analytics?.totalDocuments || 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">Across all collections</div>
        </div>

        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Questions Extracted</span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{analytics?.totalQuestions || 0}</div>
          <div className="text-[11px] text-emerald-400 mt-1">
            {analytics?.verifiedQuestions || 0} verified answers
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Quizzes Completed</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{analytics?.totalQuizzes || 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {analytics?.totalAttempted || 0} questions answered
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Overall Accuracy</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{analytics?.averageAccuracy || 0}%</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Avg. score: {analytics?.averageScore || 0}%
          </div>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-3 p-4 rounded-2xl bg-[#111827] border border-slate-800/80 hover:border-indigo-500/50 hover:bg-[#141B2D] transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-sm font-semibold text-slate-200">Upload PDF</span>
            <span className="block text-xs text-slate-400">Add question bank</span>
          </div>
        </button>

        <button
          onClick={() => onNavigate('collections')}
          className="flex items-center gap-3 p-4 rounded-2xl bg-[#111827] border border-slate-800/80 hover:border-indigo-500/50 hover:bg-[#141B2D] transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-sm font-semibold text-slate-200">Collections</span>
            <span className="block text-xs text-slate-400">{collections.length} study groups</span>
          </div>
        </button>

        <button
          onClick={() => onNavigate('question_bank')}
          className="flex items-center gap-3 p-4 rounded-2xl bg-[#111827] border border-slate-800/80 hover:border-indigo-500/50 hover:bg-[#141B2D] transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-sm font-semibold text-slate-200">Question Bank</span>
            <span className="block text-xs text-slate-400">Search & edit</span>
          </div>
        </button>

        <button
          onClick={() => onNavigate('practice_quiz')}
          className="flex items-center gap-3 p-4 rounded-2xl bg-[#111827] border border-slate-800/80 hover:border-indigo-500/50 hover:bg-[#141B2D] transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Play className="w-5 h-5 fill-emerald-400" />
          </div>
          <div>
            <span className="block text-sm font-semibold text-slate-200">New Quiz</span>
            <span className="block text-xs text-slate-400">Custom practice</span>
          </div>
        </button>
      </div>

      {/* Main Split: Recent Documents & Continue Practicing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Documents Table (2 cols) */}
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800/80 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-white">Recent Documents</h2>
              <p className="text-xs text-slate-400">Uploaded PDFs processed into questions</p>
            </div>
            <button
              onClick={() => onNavigate('pdf_library')}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentDocs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
              <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">No documents uploaded yet</p>
              <p className="text-xs text-slate-500 mt-1">Upload a PDF question bank or exam paper to get started</p>
              <button
                onClick={onOpenUpload}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Upload First PDF
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800/60 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-200 truncate">{doc.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                        {doc.collection_name && (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                            {doc.collection_name}
                          </span>
                        )}
                        <span>{doc.question_count || 0} questions</span>
                        <span>•</span>
                        <span>{doc.page_count} pages</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 sm:self-center shrink-0">
                    {getStatusBadge(doc.processing_status)}
                    <button
                      onClick={() => onReviewDoc(doc.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                    >
                      Review
                    </button>
                    <button
                      onClick={() => onStartQuizFromDoc(doc.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 transition-colors"
                    >
                      <Play className="w-3 h-3 fill-indigo-400" />
                      <span>Practice</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Continue Practicing & Recent Tests (1 col) */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white">Recent Quizzes</h2>
                <p className="text-xs text-slate-400">Previous attempts & scores</p>
              </div>
              <button
                onClick={() => onNavigate('analytics')}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <span>Analytics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentTrends.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No quizzes attempted yet. Generate a quiz to start practicing!
              </div>
            ) : (
              <div className="space-y-3">
                {recentTrends.slice(-3).reverse().map((q) => (
                  <div
                    key={q.id}
                    className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200 truncate max-w-[170px]">{q.title}</span>
                      <span className={`text-xs font-bold ${q.accuracy >= 75 ? 'text-emerald-400' : q.accuracy >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {Math.round(q.accuracy)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full ${q.accuracy >= 75 ? 'bg-emerald-500' : q.accuracy >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.max(5, q.accuracy)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Score: {q.score} / {q.maximum_score}</span>
                      <span>{Math.round(q.time_taken / 60)}m spent</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <button
              onClick={() => onNavigate('practice_quiz')}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs tracking-wide shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Launch Quick Practice Test</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
