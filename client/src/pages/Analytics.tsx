import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Target,
  Trophy,
  Clock,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Play,
  Bookmark,
  RefreshCw,
  Sparkles,
  Zap
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';
import { api } from '../lib/api';

interface AnalyticsProps {
  onStartQuizPreset: (config: any) => void;
}

export const Analytics: React.FC<AnalyticsProps> = ({ onStartQuizPreset }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.getAnalytics();
      setData(res);
    } catch (err: any) {
      alert('Error loading analytics: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-400">
        Loading analytics dashboard...
      </div>
    );
  }

  const { overview, recentTrends, topicStats, recommendations } = data;

  // Chart data formatting
  const chartData = recentTrends.map((t: any, i: number) => ({
    name: `Quiz ${i + 1}`,
    score: Math.round(t.score),
    max: Math.round(t.maximum_score),
    accuracy: Math.round(t.accuracy)
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            Performance Analytics & Mastery
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track historical accuracy trends, identify weak topics, and launch targeted revision sets.
          </p>
        </div>

        <button
          onClick={loadAnalytics}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 self-start sm:self-auto"
          title="Refresh Statistics"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Top 4 Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5">
          <span className="text-xs font-medium text-slate-400 block mb-1">Total Attempted</span>
          <span className="text-2xl font-black text-white block">{overview.totalAttempted}</span>
          <span className="text-[11px] text-emerald-400 mt-1 block">
            {overview.totalCorrect} correct answers
          </span>
        </div>

        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5">
          <span className="text-xs font-medium text-slate-400 block mb-1">Overall Accuracy</span>
          <span className="text-2xl font-black text-indigo-400 block">{overview.averageAccuracy}%</span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Average test score: {overview.averageScore}%
          </span>
        </div>

        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5">
          <span className="text-xs font-medium text-slate-400 block mb-1">Total Quizzes</span>
          <span className="text-2xl font-black text-violet-400 block">{overview.totalQuizzes}</span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across {overview.totalDocuments} study PDFs
          </span>
        </div>

        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5">
          <span className="text-xs font-medium text-slate-400 block mb-1">Practice Time</span>
          <span className="text-2xl font-black text-emerald-400 block">
            {Math.floor(overview.totalTimeSpent / 60)}m
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Total focused study time</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accuracy Trend Chart */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Accuracy Over Recent Quizzes</h3>
              <p className="text-xs text-slate-400">Percentage of correctly answered questions per attempt</p>
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="h-64 w-full pt-4">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Complete at least one quiz to view trends.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#64748B" fontSize={11} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B0F17', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="accuracy" stroke="#818CF8" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAcc)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Score Progression Chart */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Score vs Max Possible Marks</h3>
              <p className="text-xs text-slate-400">Points earned across test sessions</p>
            </div>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>

          <div className="h-64 w-full pt-4">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Complete at least one quiz to view scores.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B0F17', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Bar dataKey="score" fill="#6366F1" radius={[6, 6, 0, 0]} name="Score" />
                  <Bar dataKey="max" fill="#334155" radius={[6, 6, 0, 0]} name="Max Score" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Targeted Revision Launchpad (Personalized revision) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Targeted Revision Launchpad
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            1-click practice quizzes generated based on your past mistakes and unattempted bank questions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Review Missed Questions</h3>
              <p className="text-xs text-slate-400 mt-1">
                {recommendations.missedQuestionsCount} questions previously answered incorrectly.
              </p>
            </div>
            <button
              onClick={() => onStartQuizPreset({ sourceType: 'incorrect_only', questionCount: 10, quizMode: 'revision' })}
              className="mt-4 w-full py-2 rounded-xl text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-colors flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-rose-300" />
              <span>Practice Missed Qs</span>
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
                <Bookmark className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Review Bookmarked Items</h3>
              <p className="text-xs text-slate-400 mt-1">
                {recommendations.bookmarkedQuestionsCount} questions saved for revision.
              </p>
            </div>
            <button
              onClick={() => onStartQuizPreset({ sourceType: 'bookmarked_only', questionCount: 10, quizMode: 'practice' })}
              disabled={recommendations.bookmarkedQuestionsCount === 0}
              className="mt-4 w-full py-2 rounded-xl text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-amber-300" />
              <span>Practice Bookmarks</span>
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Unattempted Question Bank</h3>
              <p className="text-xs text-slate-400 mt-1">
                {recommendations.unattemptedQuestionsCount} questions you have not tried yet.
              </p>
            </div>
            <button
              onClick={() => onStartQuizPreset({ sourceType: 'all', questionCount: 15, quizMode: 'practice' })}
              className="mt-4 w-full py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Start Fresh Practice</span>
            </button>
          </div>
        </div>
      </div>

      {/* Topic Breakdown Table */}
      {topicStats && topicStats.length > 0 && (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white">Topic Mastery & Practice Frequency</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 font-semibold">Topic</th>
                  <th className="py-2.5 font-semibold text-center">Attempts</th>
                  <th className="py-2.5 font-semibold text-center">Correct</th>
                  <th className="py-2.5 font-semibold text-center">Accuracy</th>
                  <th className="py-2.5 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {topicStats.map((ts: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-900/40">
                    <td className="py-3 font-medium text-slate-200">{ts.topic}</td>
                    <td className="py-3 text-center text-slate-400">{ts.totalAttempts}</td>
                    <td className="py-3 text-center text-emerald-400 font-semibold">{ts.correctCount}</td>
                    <td className="py-3 text-center">
                      <span className={`font-bold ${ts.accuracy >= 75 ? 'text-emerald-400' : ts.accuracy >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {ts.accuracy}%
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {ts.isStrong ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Mastered
                        </span>
                      ) : ts.isWeak ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          Needs Work
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400">
                          In Progress
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
