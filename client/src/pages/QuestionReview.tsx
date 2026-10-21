import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Edit3,
  Trash2,
  Check,
  Plus,
  Eye,
  Tag,
  BookOpen,
  ArrowLeft,
  X,
  Sparkles,
  Layers
} from 'lucide-react';
import { Question, Document, Topic } from '../types';
import { api } from '../lib/api';
import { MathRenderer } from '../components/MathRenderer';

interface QuestionReviewProps {
  initialDocumentId?: string;
  documents: Document[];
  onBack: () => void;
  onStartQuiz: (qIds: string[]) => void;
}

export const QuestionReview: React.FC<QuestionReviewProps> = ({
  initialDocumentId,
  documents,
  onBack,
  onStartQuiz
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocumentId || (documents[0]?.id || ''));
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  useEffect(() => {
    if (selectedDocId) {
      loadQuestions(selectedDocId);
    }
  }, [selectedDocId]);

  const loadQuestions = async (docId: string) => {
    setLoading(true);
    try {
      const res = await api.getQuestions({ documentId: docId });
      setQuestions(res.questions);
      setSelectedQuestionIds(new Set());
    } catch (err: any) {
      alert('Error loading questions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = questions.filter(q => {
    if (statusFilter !== 'all' && q.verification_status !== statusFilter) return false;
    return true;
  });

  const toggleSelectAll = () => {
    if (selectedQuestionIds.size === filteredQuestions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(filteredQuestions.map(q => q.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedQuestionIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedQuestionIds(next);
  };

  const handleBulkVerify = async () => {
    const ids = Array.from(selectedQuestionIds);
    if (ids.length === 0) return;
    try {
      await api.bulkUpdateQuestions(ids, { verificationStatus: 'verified' });
      loadQuestions(selectedDocId);
    } catch (err: any) {
      alert('Error verifying questions: ' + err.message);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedQuestionIds);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} selected question(s)?`)) return;
    try {
      await api.bulkDeleteQuestions(ids);
      loadQuestions(selectedDocId);
    } catch (err: any) {
      alert('Error deleting questions: ' + err.message);
    }
  };

  const handleUpdateStatus = async (qId: string, status: string) => {
    try {
      await api.updateQuestion(qId, { verificationStatus: status });
      setQuestions(prev => prev.map(q => q.id === qId ? { ...q, verification_status: status as any } : q));
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleSaveQuestion = async (updated: Question) => {
    try {
      await api.updateQuestion(updated.id, {
        questionText: updated.question_text,
        questionType: updated.question_type,
        difficulty: updated.difficulty,
        verificationStatus: updated.verification_status,
        explanation: updated.explanation,
        hint: updated.hint,
        options: updated.options
      });
      setQuestions(prev => prev.map(q => q.id === updated.id ? updated : q));
      setEditingQuestion(null);
    } catch (err: any) {
      alert('Error saving question: ' + err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <Check className="w-3 h-3" /> Verified
          </span>
        );
      case 'needs_review':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Needs Review
          </span>
        );
      case 'missing_answer_key':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-400 border border-violet-500/30 flex items-center gap-1">
            Missing Key
          </span>
        );
      case 'diagram_required':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
            Diagram Required
          </span>
        );
      case 'incorrect_extraction':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            Extraction Error
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-indigo-400" />
              Question Review & Verification
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect and edit extracted questions before publishing them to the practice pool.
            </p>
          </div>
        </div>

        {/* Document Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold shrink-0">Source PDF:</span>
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="bg-[#161F30] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 max-w-xs"
          >
            {documents.map(d => (
              <option key={d.id} value={d.id}>{d.title} ({d.question_count || 0} Qs)</option>
            ))}
          </select>
        </div>
      </div>

      {/* Action / Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#111827] border border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={toggleSelectAll}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white"
          >
            {selectedQuestionIds.size === filteredQuestions.length && filteredQuestions.length > 0
              ? 'Deselect All'
              : `Select All (${filteredQuestions.length})`}
          </button>

          {selectedQuestionIds.size > 0 && (
            <>
              <button
                onClick={handleBulkVerify}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark Verified ({selectedQuestionIds.size})</span>
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete ({selectedQuestionIds.size})</span>
              </button>
              <button
                onClick={() => onStartQuiz(Array.from(selectedQuestionIds))}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
              >
                <span>Practice Selected</span>
              </button>
            </>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'All' },
            { id: 'needs_review', label: 'Needs Review' },
            { id: 'verified', label: 'Verified' },
            { id: 'missing_answer_key', label: 'Missing Key' },
            { id: 'diagram_required', label: 'Diagram Required' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-xl font-medium transition-colors ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Question Cards List */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          Loading questions for review...
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="text-center py-16 bg-[#111827] border border-dashed border-slate-800 rounded-2xl p-8">
          <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-300">No questions match filter</h3>
          <p className="text-xs text-slate-500 mt-1">Switch status filter or select another document.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((q) => {
            const isSelected = selectedQuestionIds.has(q.id);
            return (
              <div
                key={q.id}
                className={`bg-[#111827] border rounded-2xl p-6 transition-all ${
                  isSelected ? 'border-indigo-500/80 bg-[#13192B]' : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(q.id)}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-lg border border-indigo-500/20">
                      Q{q.original_question_number || '1'}
                    </span>
                    <span className="text-xs text-slate-400">
                      Page {q.source_page}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 capitalize">
                      {q.question_type.replace('_', ' ')}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 capitalize">
                      {q.difficulty}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(q.verification_status)}
                    <button
                      onClick={() => setPreviewQuestion(q)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                      title="Preview in Student View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingQuestion({ ...q, options: q.options || [] })}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800"
                      title="Edit Question"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Question Text */}
                <div className="text-sm font-semibold text-slate-100 my-3">
                  <MathRenderer text={q.question_text} />
                </div>

                {/* Diagram Note if present */}
                {q.is_diagram_based ? (
                  <div className="flex items-center gap-2 my-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>References visual diagram or figure from source PDF page {q.source_page}</span>
                  </div>
                ) : null}

                {/* Options List */}
                {q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3">
                    {q.options.map((opt, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs ${
                          opt.is_correct || opt.isCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-medium'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                          opt.is_correct || opt.isCorrect
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {opt.label || opt.option_label}
                        </span>
                        <div className="flex-1">
                          <MathRenderer text={opt.text || opt.option_text || ''} />
                        </div>
                        {(opt.is_correct || opt.isCorrect) && (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Explanation */}
                {q.explanation && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs text-slate-300">
                    <span className="font-semibold text-indigo-400 block mb-1">Source Explanation:</span>
                    <MathRenderer text={q.explanation} />
                  </div>
                )}

                {/* Quick Status Buttons */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/80 text-xs">
                  <span className="text-slate-500">
                    Extraction confidence: {Math.round((q.extraction_confidence || 0.85) * 100)}%
                  </span>
                  <div className="flex items-center gap-1.5">
                    {q.verification_status !== 'verified' && (
                      <button
                        onClick={() => handleUpdateStatus(q.id, 'verified')}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30"
                      >
                        Mark Verified
                      </button>
                    )}
                    {q.verification_status !== 'needs_review' && (
                      <button
                        onClick={() => handleUpdateStatus(q.id, 'needs_review')}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30"
                      >
                        Flag for Review
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Edit Question Details</h3>
              <button
                onClick={() => setEditingQuestion(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Question Text */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Question Wording *</label>
                <textarea
                  rows={3}
                  value={editingQuestion.question_text}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                  className="w-full bg-[#161F30] border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Type, Difficulty & Status Row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Type</label>
                  <select
                    value={editingQuestion.question_type}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, question_type: e.target.value as any })}
                    className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="single_select">Single Select MCQ</option>
                    <option value="multiple_select">Multiple Select</option>
                    <option value="true_false">True / False</option>
                    <option value="numerical">Numerical Answer</option>
                    <option value="fill_blank">Fill in the Blank</option>
                    <option value="short_answer">Short Answer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Difficulty</label>
                  <select
                    value={editingQuestion.difficulty}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value as any })}
                    className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    value={editingQuestion.verification_status}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, verification_status: e.target.value as any })}
                    className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="verified">Verified</option>
                    <option value="needs_review">Needs Review</option>
                    <option value="missing_answer_key">Missing Answer Key</option>
                    <option value="diagram_required">Diagram Required</option>
                    <option value="incorrect_extraction">Extraction Error</option>
                  </select>
                </div>
              </div>

              {/* Options Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300">Answer Options & Correct Key</label>
                  <button
                    onClick={() => {
                      const nextLabel = String.fromCharCode(65 + editingQuestion.options.length);
                      const newOpt = { id: 'opt_' + Math.random(), label: nextLabel, text: '', is_correct: false };
                      setEditingQuestion({
                        ...editingQuestion,
                        options: [...editingQuestion.options, newOpt]
                      });
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Option</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {editingQuestion.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-[#161F30] p-2 rounded-xl border border-slate-700">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editingQuestion.options.map((o, i) => {
                            if (editingQuestion.question_type === 'multiple_select') {
                              return i === idx ? { ...o, is_correct: !o.is_correct } : o;
                            } else {
                              return { ...o, is_correct: i === idx };
                            }
                          });
                          setEditingQuestion({ ...editingQuestion, options: updated });
                        }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          opt.is_correct || opt.isCorrect
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                        title="Click to toggle as correct answer"
                      >
                        {opt.label || opt.option_label}
                      </button>
                      <input
                        type="text"
                        value={opt.text || opt.option_text || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const updated = editingQuestion.options.map((o, i) => i === idx ? { ...o, text: val, option_text: val } : o);
                          setEditingQuestion({ ...editingQuestion, options: updated });
                        }}
                        placeholder="Option wording..."
                        className="flex-1 bg-transparent text-xs text-slate-200 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editingQuestion.options.filter((_, i) => i !== idx);
                          setEditingQuestion({ ...editingQuestion, options: updated });
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Explanation & Solution</label>
                <textarea
                  rows={2}
                  value={editingQuestion.explanation || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                  placeholder="Why the correct option is right..."
                  className="w-full bg-[#161F30] border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/30">
              <button
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveQuestion(editingQuestion)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Student View Preview Drawer / Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-bold text-white">Student Quiz Preview</h3>
              </div>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-100">
                <MathRenderer text={previewQuestion.question_text} />
              </div>

              <div className="space-y-2 pt-2">
                {previewQuestion.options.map((opt, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-200 hover:border-indigo-500/50 cursor-pointer transition-colors"
                  >
                    <span className="w-5 h-5 rounded-full border border-slate-600 flex items-center justify-center text-[10px] text-slate-400">
                      {opt.label || opt.option_label}
                    </span>
                    <span>{opt.text || opt.option_text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setPreviewQuestion(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
