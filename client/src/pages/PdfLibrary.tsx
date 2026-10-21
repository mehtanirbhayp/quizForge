import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Play,
  RotateCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HelpCircle,
  FolderKanban,
  Eye,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Document, Collection } from '../types';
import { api } from '../lib/api';

interface PdfLibraryProps {
  documents: Document[];
  collections: Collection[];
  onRefresh: () => void;
  onOpenUpload: () => void;
  onReviewDocument: (docId: string) => void;
  onStartQuizFromDoc: (docId: string) => void;
}

export const PdfLibrary: React.FC<PdfLibraryProps> = ({
  documents,
  collections,
  onRefresh,
  onOpenUpload,
  onReviewDocument,
  onStartQuizFromDoc
}) => {
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [filterCollection, setFilterCollection] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const handleRetry = async (docId: string) => {
    setRetryingId(docId);
    try {
      await api.processDocument(docId);
      setTimeout(() => {
        onRefresh();
        setRetryingId(null);
      }, 1500);
    } catch (err: any) {
      alert('Error triggering extraction: ' + err.message);
      setRetryingId(null);
    }
  };

  const handleDelete = async (docId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? Extracted questions will also be removed.`)) {
      return;
    }
    try {
      await api.deleteDocument(docId);
      onRefresh();
    } catch (err: any) {
      alert('Error deleting document: ' + err.message);
    }
  };

  const filteredDocs = documents.filter(d => {
    if (filterCollection !== 'all' && d.collection_id !== filterCollection) return false;
    if (search.trim() && !d.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

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
            <AlertTriangle className="w-3 h-3" /> Warnings
          </span>
        );
      case 'extracting_text':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 animate-pulse">
            Extracting Text...
          </span>
        );
      case 'identifying_questions':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-500/15 text-violet-400 border border-violet-500/30 animate-pulse">
            Parsing Questions...
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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-indigo-400" />
            PDF Library & Document Processing
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage uploaded PDFs, check extraction pipeline status, and review questions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/30"
          >
            <Upload className="w-4 h-4" />
            <span>Upload PDF</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-[#111827] border border-slate-800">
        <input
          type="text"
          placeholder="Search by document title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 bg-[#161F30] border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        />

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-medium shrink-0">Collection:</span>
          <select
            value={filterCollection}
            onChange={(e) => setFilterCollection(e.target.value)}
            className="w-full sm:w-56 bg-[#161F30] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Collections ({documents.length})</option>
            {collections.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents List */}
      {filteredDocs.length === 0 ? (
        <div className="text-center py-16 bg-[#111827] border border-dashed border-slate-800 rounded-3xl p-8">
          <FileText className="w-14 h-14 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-200">No documents found</h3>
          <p className="text-xs text-slate-400 mt-1">Upload a PDF or select a different filter.</p>
          <button
            onClick={onOpenUpload}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            Upload PDF Now
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocs.map((doc) => {
            const isProcessing = ['extracting_text', 'identifying_questions', 'queued'].includes(doc.processing_status);
            return (
              <div
                key={doc.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-[#111827] border border-slate-800/80 hover:border-slate-700 transition-colors shadow-sm"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-white truncate">{doc.title}</h3>
                      {getStatusBadge(doc.processing_status)}
                    </div>
                    
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      File: <span className="font-mono text-slate-300">{doc.original_filename}</span>
                    </p>

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                      {doc.collection_name && (
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700/60 text-slate-300 text-[11px] font-medium">
                          {doc.collection_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {doc.page_count} pages
                      </span>
                      <span>•</span>
                      <span className="text-indigo-400 font-semibold">
                        {doc.question_count || 0} questions extracted
                      </span>
                      {doc.verified_question_count !== undefined && doc.verified_question_count > 0 && (
                        <span className="text-emerald-400">
                          ({doc.verified_question_count} verified)
                        </span>
                      )}
                    </div>

                    {doc.processing_error && (
                      <p className="text-xs text-rose-400 mt-2 bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg">
                        Error: {doc.processing_error}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end lg:self-center shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800/80 w-full lg:w-auto justify-end">
                  {doc.processing_status === 'failed' && (
                    <button
                      onClick={() => handleRetry(doc.id)}
                      disabled={retryingId === doc.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-amber-300 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${retryingId === doc.id ? 'animate-spin' : ''}`} />
                      <span>Retry</span>
                    </button>
                  )}

                  <button
                    onClick={() => onReviewDocument(doc.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Review Questions ({doc.question_count || 0})</span>
                  </button>

                  <button
                    onClick={() => onStartQuizFromDoc(doc.id)}
                    disabled={(doc.question_count || 0) === 0}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow-md shadow-indigo-600/30 transition-all active:scale-[0.98]"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Practice</span>
                  </button>

                  <button
                    onClick={() => handleDelete(doc.id, doc.title)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    title="Delete Document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
