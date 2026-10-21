# QuizForge — PDF-to-Interactive Quiz Generator

QuizForge is a full-stack, responsive web application that converts uploaded educational PDFs, question banks, previous-year papers, and lecture notes into interactive, customizable quizzes.

It eliminates the tedious process of scrolling through static PDFs and tracking answers manually, giving students and educators a modern, distraction-free practice and assessment platform.

---

## 🌟 Key Features

### 1. Document Processing & Extraction Engine
- **Multi-File Upload**: Drag-and-drop or browse multiple PDFs simultaneously with file validation and SHA-256 integrity checks.
- **Rule-Based Heuristic Parser**: 100% offline, zero-API-cost extraction of question numbers, option labels ((A)-(D), 1-4, etc.), inline/separate answer keys, and explanations.
- **Mathematical & Technical Notation**: KaTeX rendering for formulas ($E=mc^2$, $\Delta H$, $\eta = 1 - T_C/T_H$), subscripts, superscripts, and scientific units.
- **Diagram & Figure Detection**: Automatically identifies questions referencing visual diagrams and flags them for review without inventing false answers.
- **Optional AI Mode**: Pluggable Google Gemini and OpenAI endpoints for complex multi-column or unstructured layouts.

### 2. Question Review & Staging Interface
- **Verification Workflow**: Filter by `Needs Review`, `Verified`, `Missing Key`, or `Diagram Required`.
- **In-Place Editor**: Modify question wording, add/remove options, toggle correct answers, add explanations, and assign difficulty levels.
- **Live Student Preview**: Test how any question renders in the student quiz environment.
- **Bulk Operations**: One-click bulk verification and bulk deletion.

### 3. Comprehensive Question Bank
- Search by question text, formulas, topics, and source documents.
- Filter by study collection, question type, difficulty, and bookmark status.
- **Duplicate Detection**: Normalized word-level Jaccard similarity to flag near-duplicate questions across uploaded exams.
- **Personal Notes & Bookmarks**: Add personal study notes and save key questions for revision.

### 4. Custom Quiz Configuration & Presets
- **Source Selection**: Practice from all documents, a specific PDF, a study collection, bookmarked questions, or previously missed questions.
- **Presets**:
  - *Practice Mode*: Immediate feedback, hints, and explanations enabled.
  - *Timed Exam Mode*: Real-time countdown timer, feedback hidden until submission, negative marking.
  - *Revision Mode*: Targeted set of previously missed questions.
  - *Quick 10-Q Test*: Instant 10-question randomized sprint.
- **Question & Option Shuffling**: Randomize question sequence and option order while preserving correct answer keys.

### 5. Interactive Assessment Interface
- **Distraction-Free Workspace**: Clean examination view with question palette, progress indicator, and countdown timer.
- **Question Formats**: Single-select MCQs, Multiple-select, True/False, Numerical answers with tolerances, and Fill-in-the-blanks.
- **State Persistence**: Real-time server sync on every selection so page refreshes never erase active attempts.
- **Auto-Submission**: Automatically submits and evaluates when the countdown timer expires.

### 6. Deterministic Scoring & Results Review
- **Backend Validation**: Scores are computed server-side rather than trusting client-reported values.
- **Scoring Rules**: Supports exact matching, numerical absolute tolerances ($\pm 0.05$), relative tolerances, partial credit for multi-select, and negative marking penalties (e.g. -0.25).
- **Unknown Answer Protection**: Questions without verified answer keys are marked as ungraded and never falsely credited or penalized.
- **Question-by-Question Breakdown**: Filter review by Correct, Incorrect, Unanswered, and Ungraded.
- **Targeted Retries**: One-click retry for all questions, missed questions only, or unanswered questions only.

### 7. Performance Analytics & Study Collections
- **Historical Trends**: Recharts area and bar charts tracking scores and accuracy over time.
- **Topic Mastery**: Identifies mastered vs weak topics using attempt frequency thresholds.
- **Study Collections**: Group documents by subject, syllabus topic, or examination.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, KaTeX, Canvas Confetti.
- **Backend**: Node.js, Express, TypeScript, better-sqlite3, pdf-parse, pdfkit, bcryptjs, jsonwebtoken.
- **Database**: SQLite (local zero-configuration) with clean PostgreSQL DDL migration file provided for Supabase or RDS.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### Installation
Clone or navigate to the project directory:
```bash
cd Quizforge
```

Install root, backend, and frontend dependencies:
```bash
npm run install:all
```

Seed sample academic PDFs and initial question bank:
```bash
npm run seed
```

### Running Locally
Run both client and server concurrently with a single command:
```bash
npm run dev
```

- **Frontend Application**: `http://localhost:5173`
- **Backend REST API**: `http://localhost:5001`
- **Demo Scholar Account**: `demo@quizforge.io` / `password123`

---

## ⚙️ Environment Variables

Create `.env` in the `server/` directory:
```env
PORT=5001
JWT_SECRET=your-secure-jwt-secret-key-2026
DATABASE_PATH=./data/quizforge.db
# Optional AI Provider Configuration (can also be configured in Settings UI)
GEMINI_API_KEY=
OPENAI_API_KEY=
```

---

## 🗄️ Database Schema & PostgreSQL Migration

The SQLite database is stored locally in `server/data/quizforge.db`.
For cloud deployments (e.g. Supabase, AWS RDS, Neon), a PostgreSQL-compatible DDL schema is provided at:
`server/src/db/schema.sql`

Entities:
- `users`: User authentication and profiles.
- `collections`: Study subjects, courses, and syllabus groups.
- `documents`: Uploaded PDF documents with storage paths, file hashes, and processing states.
- `collection_documents`: Many-to-many relationship linking documents to study collections.
- `topics`: Syllabus topics and chapters linked to collections.
- `questions`: Extracted questions with difficulty, type, verification status, and page references.
- `question_options`: Option labels ((A)-(D)), text, and correctness flags.
- `question_answers`: Numerical answers, tolerances, and accepted string variations.
- `quiz_sessions`: Quiz sessions with time limits, presets, scores, accuracy, and timestamps.
- `quiz_session_questions`: Questions assigned to a session with custom order and marks.
- `quiz_responses`: Real-time student answers, correctness status, and review flags.
- `bookmarks`: Bookmarked questions for targeted revision.
- `user_notes`: Personal study notes on individual questions.
- `user_settings`: Preferences for visual themes, negative marking penalties, and AI keys.

---

## 🧪 Testing the PDF-to-Quiz Workflow

1. Open `http://localhost:5173`.
2. Inspect the **Dashboard** metrics and click **Upload New PDF**.
3. Upload any educational PDF (or use the preloaded Thermodynamics / GATE CS test papers).
4. Navigate to **PDF Library** to observe the processing pipeline (`Uploaded` → `Extracting Text` → `Parsing Questions` → `Completed`).
5. Open **Question Review** to review extracted question wording, options, and KaTeX formulas.
6. Open **Practice Quiz**, choose *Timed Exam Mode* or *Practice Mode*, set your desired question count and time limit, and click **Generate & Begin Practice Quiz**.
7. In the **Active Quiz** view, select options, use the question palette to jump between questions, and submit your exam.
8. In the **Quiz Results** screen, review your score breakdown, filter by incorrect answers, and click **Practice Missed Questions** to launch a focused revision quiz!
