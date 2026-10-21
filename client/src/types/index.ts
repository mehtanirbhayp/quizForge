export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string;
  document_count?: number;
  question_count?: number;
  topic_count?: number;
  created_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  title: string;
  original_filename: string;
  storage_path: string;
  file_hash?: string;
  page_count: number;
  processing_status: 'uploaded' | 'queued' | 'extracting_text' | 'identifying_questions' | 'reviewing_results' | 'completed' | 'completed_with_warnings' | 'failed';
  processing_error?: string | null;
  raw_text?: string;
  question_count?: number;
  verified_question_count?: number;
  needs_review_count?: number;
  collection_name?: string;
  collection_id?: string;
  created_at: string;
}

export interface Topic {
  id: string;
  collection_id?: string;
  name: string;
  question_count?: number;
}

export interface QuestionOption {
  id: string;
  question_id?: string;
  label: string; // A, B, C, D
  option_label?: string;
  text: string;
  option_text?: string;
  is_correct?: boolean;
  isCorrect?: boolean;
  display_order?: number;
}

export interface Question {
  id: string;
  document_id: string;
  document_title?: string;
  original_question_number: string;
  question_text: string;
  question_type: 'single_select' | 'multiple_select' | 'true_false' | 'numerical' | 'fill_blank' | 'short_answer';
  source_page: number;
  topic_id?: string;
  topic_name?: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'unknown';
  verification_status: 'needs_review' | 'verified' | 'incorrect_extraction' | 'missing_answer_key' | 'diagram_required' | 'duplicate';
  extraction_confidence: number;
  explanation?: string | null;
  hint?: string | null;
  is_diagram_based?: boolean | number;
  diagram_note?: string | null;
  is_bookmarked?: boolean;
  user_note?: string | null;
  options: QuestionOption[];
  numericalAnswer?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface QuizSettings {
  sourceType: string;
  sourceId?: string;
  documentIds?: string[];
  questionIds?: string[];
  verifiedOnly?: boolean;
  questionTypes?: string[];
  difficulty?: string;
  questionCount: number | string;
  questionOrder: 'original' | 'random' | 'topic' | 'difficulty' | 'incorrect_first';
  shuffleOptions: boolean;
  quizMode: 'practice' | 'exam' | 'revision' | 'quick';
  timeLimitMinutes: number;
  negativeMarking: boolean;
  negativeMarks: number;
  marksPerQuestion: number;
  partialCredit: boolean;
  showHints: boolean;
  showExplanations: boolean;
  immediateFeedback?: boolean;
}

export interface QuizSessionQuestion extends Question {
  sessionQuestionId: string;
  displayOrder: number;
  marks: number;
  negativeMarks: number;
  documentTitle?: string;
  userResponse?: any;
  isMarkedForReview?: boolean;
  marksAwarded?: number;
  isCorrect?: boolean | number | null;
}

export interface QuizSession {
  id: string;
  user_id: string;
  title: string;
  status: 'active' | 'paused' | 'submitted' | 'abandoned';
  started_at: string;
  submitted_at?: string | null;
  time_taken: number;
  score: number;
  maximum_score: number;
  accuracy: number;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  ungraded_count: number;
  settings?: QuizSettings;
}

export interface EvaluationItem {
  questionId: string;
  isCorrect: boolean | null;
  isAnswered: boolean;
  marksAwarded: number;
  userResponse: any;
  explanationNote?: string;
  topicName?: string;
}

export interface QuizScoreReport {
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  ungradedCount: number;
  totalMarksAwarded: number;
  maximumMarks: number;
  percentageScore: number;
  accuracy: number;
  timeTaken: number;
  evaluations: EvaluationItem[];
  topicBreakdown: Record<string, {
    total: number;
    correct: number;
    incorrect: number;
    unanswered: number;
    accuracy: number;
  }>;
}

export interface AnalyticsOverview {
  totalDocuments: number;
  totalQuestions: number;
  verifiedQuestions: number;
  needsReviewQuestions: number;
  totalQuizzes: number;
  totalTimeSpent: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalUnanswered: number;
  totalAttempted: number;
  averageScore: number;
  averageAccuracy: number;
  bookmarkedCount: number;
}
