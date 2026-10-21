import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Play,
  FileText,
  HelpCircle,
  MoreVertical,
  Edit2,
  Trash2,
  ExternalLink,
  BookOpen,
  X,
  Check
} from 'lucide-react';
import { Collection, Document } from '../types';
import { api } from '../lib/api';

interface CollectionsProps {
  collections: Collection[];
  documents: Document[];
  onRefresh: () => void;
  onStartQuizFromCollection: (colId: string) => void;
  onViewCollectionDocs: (colId: string) => void;
}

export const Collections: React.FC<CollectionsProps> = ({
  collections,
  documents,
  onRefresh,
  onStartQuizFromCollection,
  onViewCollectionDocs
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editCollection, setEditCollection] = useState<Collection | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedColDetails, setSelectedColDetails] = useState<any | null>(null);

  const handleOpenCreate = () => {
    setName('');
    setDescription('');
    setError(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (col: Collection) => {
    setEditCollection(col);
    setName(col.name);
    setDescription(col.description);
    setError(null);
  };

  const handleSaveCollection = async () => {
    if (!name.trim()) {
      setError('Collection name is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (editCollection) {
        await api.updateCollection(editCollection.id, name, description);
      } else {
        await api.createCollection(name, description);
      }
      setIsCreateModalOpen(false);
      setEditCollection(null);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save collection');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCollection = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete collection "${name}"? Documents inside will remain safe in your PDF Library.`)) {
      return;
    }
    try {
      await api.deleteCollection(id);
      onRefresh();
    } catch (err: any) {
      alert('Error deleting collection: ' + err.message);
    }
  };

  const handleInspectCollection = async (id: string) => {
    try {
      const res = await api.getCollection(id);
      setSelectedColDetails(res);
    } catch (err: any) {
      alert('Failed to load collection details');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-indigo-400" />
            My Study Collections
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Group your documents by subject, syllabus topic, semester, or examination.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/30 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Collection</span>
        </button>
      </div>

      {/* Grid of Collections */}
      {collections.length === 0 ? (
        <div className="text-center py-16 bg-[#111827] border border-dashed border-slate-800 rounded-3xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-200">No collections created yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Create collections to organize your study materials like &quot;Thermodynamics&quot; or &quot;Computer Science&quot;.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
          >
            Create Your First Collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {collections.map((col) => (
            <div
              key={col.id}
              className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(col)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                      title="Edit Collection"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCollection(col.id, col.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                      title="Delete Collection"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                  {col.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                  {col.description || 'No description provided.'}
                </p>

                <div className="flex items-center gap-4 mt-5 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{col.document_count || 0} PDFs</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-violet-400" />
                    <span>{col.question_count || 0} Questions</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-5">
                <button
                  onClick={() => handleInspectCollection(col.id)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-colors text-center"
                >
                  View Details
                </button>
                <button
                  onClick={() => onStartQuizFromCollection(col.id)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all active:scale-[0.98]"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Practice</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {(isCreateModalOpen || editCollection) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {editCollection ? 'Edit Collection' : 'Create Study Collection'}
              </h3>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditCollection(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Collection Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Chemical Engineering - Thermodynamics"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#161F30] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Course outline, exam syllabus, semester details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#161F30] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditCollection(null);
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCollection}
                disabled={loading}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
              >
                {loading ? 'Saving...' : 'Save Collection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Collection Drawer / Modal */}
      {selectedColDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedColDetails.collection.name}</h3>
                <p className="text-xs text-slate-400">{selectedColDetails.collection.description}</p>
              </div>
              <button
                onClick={() => setSelectedColDetails(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Linked Documents */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Linked Documents ({selectedColDetails.documents.length})
                </h4>
                {selectedColDetails.documents.length === 0 ? (
                  <p className="text-xs text-slate-500">No documents linked to this collection yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedColDetails.documents.map((d: any) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span className="text-slate-200 font-semibold truncate">{d.title}</span>
                          <span className="text-slate-500">({d.question_count || 0} questions)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Topics */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Syllabus Topics ({selectedColDetails.topics.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedColDetails.topics.map((t: any) => (
                    <span
                      key={t.id}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300"
                    >
                      {t.name} ({t.question_count || 0})
                    </span>
                  ))}
                  {selectedColDetails.topics.length === 0 && (
                    <span className="text-xs text-slate-500">Topics are automatically created from question chapters.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/80 bg-slate-900/30">
              <span className="text-xs text-slate-400">Created: {new Date(selectedColDetails.collection.created_at).toLocaleDateString()}</span>
              <button
                onClick={() => {
                  const id = selectedColDetails.collection.id;
                  setSelectedColDetails(null);
                  onStartQuizFromCollection(id);
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Launch Quiz from Collection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
