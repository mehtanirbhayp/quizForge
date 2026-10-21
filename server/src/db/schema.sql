-- QuizForge Complete Relational Database Schema
-- Compatible with SQLite & PostgreSQL

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_hash TEXT,
  page_count INTEGER DEFAULT 1,
  processing_status TEXT DEFAULT 'uploaded', -- uploaded, queued, extracting_text, identifying_questions, reviewing_results, completed, completed_with_warnings, failed
  processing_error TEXT,
  raw_text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collection_documents (
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (collection_id, document_id)
);

CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  collection_id TEXT REFERENCES collections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  original_question_number TEXT,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'single_select', -- single_select, multiple_select, true_false, numerical, fill_blank, short_answer
  source_page INTEGER DEFAULT 1,
  topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
  difficulty TEXT DEFAULT 'medium', -- easy, medium, hard, unknown
  verification_status TEXT DEFAULT 'needs_review', -- needs_review, verified, incorrect_extraction, missing_answer_key, diagram_required, duplicate
  extraction_confidence REAL DEFAULT 0.85,
  explanation TEXT,
  hint TEXT,
  is_diagram_based INTEGER DEFAULT 0,
  diagram_note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS question_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_label TEXT NOT NULL, -- A, B, C, D, etc.
  option_text TEXT NOT NULL,
  is_correct INTEGER DEFAULT 0, -- 1 if correct, 0 if false (or unknown if question has no verified key)
  display_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS question_answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  numerical_answer REAL,
  tolerance_absolute REAL DEFAULT 0.0,
  tolerance_relative REAL DEFAULT 0.0,
  accepted_text_answers TEXT, -- JSON array of strings
  unit TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_configurations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  settings_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  configuration_id TEXT REFERENCES quiz_configurations(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active', -- active, paused, submitted, abandoned
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  submitted_at DATETIME,
  time_taken INTEGER DEFAULT 0, -- in seconds
  score REAL DEFAULT 0,
  maximum_score REAL DEFAULT 0,
  accuracy REAL DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  incorrect_count INTEGER DEFAULT 0,
  unanswered_count INTEGER DEFAULT 0,
  ungraded_count INTEGER DEFAULT 0,
  settings_json TEXT
);

CREATE TABLE IF NOT EXISTS quiz_session_questions (
  id TEXT PRIMARY KEY,
  quiz_session_id TEXT NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  marks REAL DEFAULT 1.0,
  negative_marks REAL DEFAULT 0.0,
  options_shuffled_json TEXT -- JSON array of option IDs in shuffled order
);

CREATE TABLE IF NOT EXISTS quiz_responses (
  id TEXT PRIMARY KEY,
  quiz_session_id TEXT NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  response_json TEXT, -- selected option label/ids, or string/number input
  is_correct INTEGER, -- 1 = correct, 0 = incorrect, NULL = ungraded/unknown
  marks_awarded REAL DEFAULT 0,
  is_marked_for_review INTEGER DEFAULT 0,
  answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(quiz_session_id, question_id)
);

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, question_id)
);

CREATE TABLE IF NOT EXISTS user_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, question_id)
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  ai_provider TEXT DEFAULT 'none', -- none, gemini, openai
  api_key TEXT,
  theme TEXT DEFAULT 'dark',
  default_negative_marking REAL DEFAULT 0.0,
  default_time_per_question INTEGER DEFAULT 60,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_questions_document_id ON questions(document_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_verification ON questions(verification_status);
CREATE INDEX IF NOT EXISTS idx_question_options_qid ON question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user ON quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_session ON quiz_responses(quiz_session_id);
CREATE INDEX IF NOT EXISTS idx_collection_docs_col ON collection_documents(collection_id);
