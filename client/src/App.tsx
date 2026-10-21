import React, { useState, useEffect } from 'react';
import { Menu, Zap } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { UploadModal } from './components/UploadModal';
import { Dashboard } from './pages/Dashboard';
import { Collections } from './pages/Collections';
import { PdfLibrary } from './pages/PdfLibrary';
import { QuestionReview } from './pages/QuestionReview';
import { QuestionBank } from './pages/QuestionBank';
import { QuizConfig } from './pages/QuizConfig';
import { ActiveQuiz } from './pages/ActiveQuiz';
import { QuizResults } from './pages/QuizResults';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { api } from './lib/api';
import { Document, Collection, AnalyticsOverview } from './types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Core Data
  const [documents, setDocuments] = useState<Document[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [recentTrends, setRecentTrends] = useState<any[]>([]);

  // Navigation Parameters
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeQuizReport, setActiveQuizReport] = useState<any | null>(null);
  const [reviewDocumentId, setReviewDocumentId] = useState<string | undefined>(undefined);
  const [configParams, setConfigParams] = useState<{
    docId?: string;
    colId?: string;
    questionIds?: string[];
  }>({});

  useEffect(() => {
    loadAppData();
  }, []);

  const loadAppData = async () => {
    try {
      const [docsRes, colsRes, analyticsRes] = await Promise.all([
        api.getDocuments(),
        api.getCollections(),
        api.getAnalytics()
      ]);
      setDocuments(docsRes.documents);
      setCollections(colsRes.collections);
      setAnalytics(analyticsRes.overview);
      setRecentTrends(analyticsRes.recentTrends);
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  };

  // Handlers for starting quizzes
  const handleStartQuizFromDoc = (docId: string) => {
    setConfigParams({ docId });
    setCurrentTab('practice_quiz');
  };

  const handleStartQuizFromCollection = (colId: string) => {
    setConfigParams({ colId });
    setCurrentTab('practice_quiz');
  };

  const handleStartQuizWithQuestions = (questionIds: string[]) => {
    setConfigParams({ questionIds });
    setCurrentTab('practice_quiz');
  };

  const handleStartQuizPreset = (config: any) => {
    api.generateQuiz({
      title: 'Targeted Revision Assessment',
      ...config,
      shuffleOptions: true,
      marksPerQuestion: 1.0
    }).then(res => {
      setActiveSessionId(res.sessionId);
      setCurrentTab('active_quiz');
    }).catch(err => alert(err.message));
  };

  const handleReviewDoc = (docId: string) => {
    setReviewDocumentId(docId);
    setCurrentTab('question_review');
  };

  const handleStartQuizSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setCurrentTab('active_quiz');
  };

  const handleQuizSubmitted = (sessionId: string, report: any) => {
    setActiveSessionId(sessionId);
    setActiveQuizReport(report);
    setCurrentTab('quiz_results');
    loadAppData(); // Refresh attempt counts and stats
  };

  const handleRetryQuiz = (newSessionId: string) => {
    setActiveSessionId(newSessionId);
    setCurrentTab('active_quiz');
  };

  const handleUploadSuccess = () => {
    loadAppData();
    setCurrentTab('pdf_library');
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col lg:flex-row font-sans">
      {/* Mobile Top Header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#0E131F] border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Zap className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-white">
            Quiz<span className="text-indigo-400">Forge</span>
          </span>
        </div>
        <button
          onClick={() => setIsOpenMobile(true)}
          className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Main Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setConfigParams({});
          setCurrentTab(tab);
        }}
        isOpenMobile={isOpenMobile}
        onToggleMobile={() => setIsOpenMobile(!isOpenMobile)}
        onOpenUpload={() => setIsUploadModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-64 min-w-0 flex flex-col">
        <div className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto w-full">
          {currentTab === 'dashboard' && (
            <Dashboard
              analytics={analytics}
              documents={documents}
              collections={collections}
              recentTrends={recentTrends}
              onNavigate={(tab) => setCurrentTab(tab)}
              onOpenUpload={() => setIsUploadModalOpen(true)}
              onStartQuizFromDoc={handleStartQuizFromDoc}
              onReviewDoc={handleReviewDoc}
            />
          )}

          {currentTab === 'collections' && (
            <Collections
              collections={collections}
              documents={documents}
              onRefresh={loadAppData}
              onStartQuizFromCollection={handleStartQuizFromCollection}
              onViewCollectionDocs={(colId) => {
                setConfigParams({ colId });
                setCurrentTab('pdf_library');
              }}
            />
          )}

          {currentTab === 'pdf_library' && (
            <PdfLibrary
              documents={documents}
              collections={collections}
              onRefresh={loadAppData}
              onOpenUpload={() => setIsUploadModalOpen(true)}
              onReviewDocument={handleReviewDoc}
              onStartQuizFromDoc={handleStartQuizFromDoc}
            />
          )}

          {currentTab === 'question_review' && (
            <QuestionReview
              initialDocumentId={reviewDocumentId}
              documents={documents}
              onBack={() => setCurrentTab('pdf_library')}
              onStartQuiz={handleStartQuizWithQuestions}
            />
          )}

          {currentTab === 'question_bank' && (
            <QuestionBank
              documents={documents}
              collections={collections}
              onStartQuizWithQuestions={handleStartQuizWithQuestions}
            />
          )}

          {currentTab === 'practice_quiz' && (
            <QuizConfig
              documents={documents}
              collections={collections}
              preselectedDocId={configParams.docId}
              preselectedCollectionId={configParams.colId}
              preselectedQuestionIds={configParams.questionIds}
              onStartQuizSession={handleStartQuizSession}
            />
          )}

          {currentTab === 'active_quiz' && activeSessionId && (
            <ActiveQuiz
              sessionId={activeSessionId}
              onQuizSubmitted={handleQuizSubmitted}
              onExit={() => setCurrentTab('dashboard')}
            />
          )}

          {currentTab === 'quiz_results' && activeSessionId && (
            <QuizResults
              sessionId={activeSessionId}
              report={activeQuizReport}
              onRetryQuiz={handleRetryQuiz}
              onNavigate={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'analytics' && (
            <Analytics
              onStartQuizPreset={handleStartQuizPreset}
            />
          )}

          {currentTab === 'settings' && (
            <Settings />
          )}
        </div>
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        collections={collections}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
};
