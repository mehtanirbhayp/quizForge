import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  Filter,
  Bookmark,
  BookmarkCheck,
  FileText,
  Play,
  Copy,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Check,
  AlertCircle,
  HelpCircle,
  StickyNote,
  X,
  Sparkles
} from 'lucide-react';
import { Question, Document, Collection, Topic } from '../types';
import { api } from '../lib/api';
import { MathRenderer } from '../components/MathRenderer';

interface QuestionBankProps {
  documents: Document[];
  collections: Collection[];
  onStartQuizWithQuestions: (questionIds: string[]) => void;
}

export const QuestionBank: React.FC<QuestionBankProps> = ({
  documents,
  collections,
  onStartQuizWithQuestions
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState('all');
  const [selectedCol, setSelectedCol] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDiff, setSelectedDiff] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Note Modal state
  const [noteModalQuestion, setNoteModalQuestion] = useState<Question | null>(null);
  const [noteText, setNoteText] = useState('');

  // Duplicate Check state
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [scanningDuplicates, setScanningDuplicates] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, [selectedDoc, selectedCol, selectedType, selectedDiff, selectedStatus, bookmarkedOnly]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await api.getQuestions({
        search: search.trim() || undefined,
        documentId: selectedDoc !== 'all' ? selectedDoc : undefined,
        collectionId: selectedCol !== 'all' ? selectedCol : undefined,
        questionType: selectedType !== 'all' ? selectedType : undefined,
        difficulty: selectedDiff !== 'all' ? selectedDiff : undefined,
        verificationStatus: selectedStatus !== 'all' ? selectedStatus : undefined,
        bookmarkedOnly: bookmarkedOnly ? 'true' : undefined
      });
      setQuestions(res.questions);
    } catch (err: any) {
      alert('Error fetching question bank: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuestions();
  };

  const handleToggleBookmark = async (qId: string) => {
    try {
      const res = await api.toggleBookmark(qId);
      setQuestions(prev => prev.map(q => q.id === qId ? { ...q, is_bookmarked: res.isBookmarked } : q));
    } catch (err: any) {
      alert('Error bookmarking: ' + err.message);
    }
  };

  const handleOpenNote = (q: Question) => {
    setNoteModalQuestion(q);
    setNoteText(q.user_note || '');
  };

  const handleSaveNote = async () => {
    if (!noteModalQuestion) return;
    try {
      await api.saveNote(noteModalQuestion.id, noteText);
      setQuestions(prev => prev.map(q => q.id === noteModalQuestion.id ? { ...q, user_note: noteText } : q));
      setNoteModalQuestion(null);
    } catch (err: any) {
      alert('Error saving note: ' + err.message);
    }
  };

  const handleScanDuplicates = async () => {
    setScanningDuplicates(true);
    try {
      const res = await api.getDuplicates({ threshold: 0.65 });
      setDuplicates(res.duplicates);
      setShowDuplicateModal(true);
    } catch (err: any) {
      alert('Error scanning duplicates: ' + err.message);
    } finally {
      setScanningDuplicates(false);
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map(q => q.id)));
    }
  };

  const handleStartSelectedQuiz = () => {
    if (selectedIds.size === 0) return;
    onStartQuizWithQuestions(Array.from(selectedIds));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Database className="w-6 h-6 text-indigo-400" />
            Comprehensive Question Bank
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Search, filter, bookmark, and generate quizzes from individual questions across all documents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleScanDuplicates}
            disabled={scanningDuplicates}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-violet-400" />
            <span>{scanningDuplicates ? 'Scanning...' : 'Find Duplicates'}</span>
          </button>

          {selectedIds.size > 0 && (
            <button
              onClick={handleStartSelectedQuiz}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 animate-pulse"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Practice Selected ({selectedIds.size})</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search questions by keyword, equation, concept, or explanation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#161F30] border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
          {/* Document filter */}
          <div>
            <select
              value={selectedDoc}
              onChange={(e) => setSelectedDoc(e.target.value)}
              className="w-full bg-[#161F30] border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">All Documents</option>
              {documents.map(d => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>

          {/* Question Type */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-[#161F30] border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">All Question Types</option>
              <option value="single_select">Single Select MCQ</option>
              <option value="multiple_select">Multiple Select</option>
              <option value="true_false">True / False</option>
              <option value="numerical">Numerical</option>
              <option value="fill_blank">Fill in the Blank</option>
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <select
              value={selectedDiff}
              onChange={(e) => setSelectedDiff(e.target.value)}
              className="w-full bg-[#161F30] border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-[#161F30] border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="verified">Verified Only</option>
              <option value="needs_review">Needs Review</option>
              <option value="missing_answer_key">Missing Key</option>
              <option value="diagram_required">Diagram Required</option>
            </select>
          </div>

          {/* Bookmarked Checkbox */}
          <div className="flex items-center gap-2 px-2 bg-[#161F30] border border-slate-700/80 rounded-xl">
            <input
              type="checkbox"
              id="bmOnly"
              checked={bookmarkedOnly}
              onChange={(e) => setBookmarkedOnly(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-indigo-600 bg-slate-800 border-slate-700 cursor-pointer"
            />
            <label htmlFor="bmOnly" className="text-xs text-slate-300 cursor-pointer select-none truncate">
              Bookmarked Only
            </label>
          </div>
        </div>
      </div>

      {/* Select All Row */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedIds.size === questions.length && questions.length > 0}
            onChange={toggleSelectAll}
            className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 cursor-pointer"
          />
          <span>Select All ({questions.length} questions found)</span>
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          Searching question bank...
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-16 bg-[#111827] border border-dashed border-slate-800 rounded-2xl p-8">
          <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-300">No questions found</h3>
          <p className="text-xs text-slate-500 mt-1">Try broadening your search filters.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {questions.map((q) => {
            const isSelected = selectedIds.has(q.id);
            return (
              <div
                key={q.id}
                className={`bg-[#111827] border rounded-2xl p-5 transition-all ${
                  isSelected ? 'border-indigo-500/80 bg-[#13192B]' : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(q.id)}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 cursor-pointer"
                    />
                    <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                      Q{q.original_question_number || '1'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium truncate max-w-xs">
                      {q.document_title} (p. {q.source_page})
                    </span>
                    {q.topic_name && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        {q.topic_name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleToggleBookmark(q.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        q.is_bookmarked ? 'text-amber-400 bg-amber-400/10' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title={q.is_bookmarked ? 'Remove Bookmark' : 'Bookmark Question'}
                    >
                      {q.is_bookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleOpenNote(q)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        q.user_note ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title="Personal Study Notes"
                    >
                      <StickyNote className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Text */}
                <div className="text-sm font-semibold text-slate-100 my-2.5">
                  <MathRenderer text={q.question_text} />
                </div>

                {/* Options Preview */}
                {q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2.5">
                    {q.options.map((opt, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 p-2.5 rounded-xl border text-xs ${
                          opt.is_correct || opt.isCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-medium'
                            : 'bg-slate-900/40 border-slate-800 text-slate-300'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                          opt.is_correct || opt.isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {opt.label || opt.option_label}
                        </span>
                        <div className="flex-1">
                          <MathRenderer text={opt.text || opt.option_text || ''} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* User Note tag if present */}
                {q.user_note && (
                  <div className="mt-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg flex items-start gap-1.5">
                    <StickyNote className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                    <span><strong>My Note:</strong> {q.user_note}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Note Modal */}
      {noteModalQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-indigo-400" />
                Personal Question Notes
              </h3>
              <button
                onClick={() => setNoteModalQuestion(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-2 truncate">
                Question: {noteModalQuestion.question_text}
              </p>
              <textarea
                rows={4}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write formulas, shortcuts, or key reminders for this question..."
                className="w-full bg-[#161F30] border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setNoteModalQuestion(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicates Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Copy className="w-5 h-5 text-violet-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Suspected Duplicate Questions</h3>
                  <p className="text-xs text-slate-400">Similarity matching across uploaded test papers</p>
                </div>
              </div>
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {duplicates.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No duplicate questions detected. Your question repository is cleanly normalized!
                </div>
              ) : (
                duplicates.map((dup, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-400">
                        {Math.round(dup.similarityScore * 100)}% Similarity Match
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-800/80 text-slate-300">
                        <span className="font-semibold text-slate-400 block mb-0.5">Instance 1:</span>
                        {dup.questionText1}
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-800/80 text-slate-300">
                        <span className="font-semibold text-slate-400 block mb-0.5">Instance 2:</span>
                        {dup.questionText2}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
