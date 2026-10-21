import { Router } from 'express';
import crypto from 'crypto';
import db from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { QuizScorer, QuestionScoringData, UserResponseData } from '../services/quizScorer';

const router = Router();

// Generate a new quiz session based on user configuration
router.post('/generate', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const {
      title = 'Custom Practice Quiz',
      sourceType = 'all', // all, document, documents, collection, topic, manual, incorrect_only, unanswered_only, bookmarked_only
      sourceId,
      documentIds,
      questionIds,
      verifiedOnly = false,
      questionTypes,
      difficulty,
      questionCount = 10,
      questionOrder = 'random', // original, random, topic, difficulty, incorrect_first
      shuffleOptions = true,
      quizMode = 'practice', // practice, exam, revision, quick
      timeLimitMinutes = 0,
      negativeMarking = false,
      negativeMarks = 0.25,
      marksPerQuestion = 1.0,
      partialCredit = false,
      showHints = true,
      showExplanations = true,
      immediateFeedback = false
    } = req.body;

    // Build query for candidate questions
    let query = `
      SELECT 
        q.*,
        d.title as document_title,
        t.name as topic_name,
        (SELECT COUNT(*) FROM bookmarks b WHERE b.question_id = q.id AND b.user_id = ?) as is_bookmarked
      FROM questions q
      JOIN documents d ON d.id = q.document_id
      LEFT JOIN topics t ON t.id = q.topic_id
      WHERE d.user_id = ?
    `;
    const params: any[] = [userId, userId];

    // Source filtering
    if (sourceType === 'document' && sourceId) {
      query += ` AND q.document_id = ?`;
      params.push(sourceId);
    } else if (sourceType === 'documents' && Array.isArray(documentIds) && documentIds.length > 0) {
      const ph = documentIds.map(() => '?').join(',');
      query += ` AND q.document_id IN (${ph})`;
      params.push(...documentIds);
    } else if (sourceType === 'collection' && sourceId) {
      query += ` AND q.document_id IN (SELECT document_id FROM collection_documents WHERE collection_id = ?)`;
      params.push(sourceId);
    } else if (sourceType === 'topic' && sourceId) {
      query += ` AND q.topic_id = ?`;
      params.push(sourceId);
    } else if (sourceType === 'manual' && Array.isArray(questionIds) && questionIds.length > 0) {
      const ph = questionIds.map(() => '?').join(',');
      query += ` AND q.id IN (${ph})`;
      params.push(...questionIds);
    } else if (sourceType === 'bookmarked_only') {
      query += ` AND q.id IN (SELECT question_id FROM bookmarks WHERE user_id = ?)`;
      params.push(userId);
    } else if (sourceType === 'incorrect_only') {
      query += ` AND q.id IN (SELECT qr.question_id FROM quiz_responses qr JOIN quiz_sessions qs ON qs.id = qr.quiz_session_id WHERE qs.user_id = ? AND qr.is_correct = 0)`;
      params.push(userId);
    } else if (sourceType === 'unanswered_only') {
      query += ` AND q.id IN (SELECT qsq.question_id FROM quiz_session_questions qsq JOIN quiz_sessions qs ON qs.id = qsq.quiz_session_id WHERE qs.user_id = ? AND qsq.question_id NOT IN (SELECT qr.question_id FROM quiz_responses qr WHERE qr.quiz_session_id = qs.id AND qr.response_json IS NOT NULL))`;
      params.push(userId);
    }

    // Verified only filter
    if (verifiedOnly) {
      query += ` AND q.verification_status = 'verified'`;
    }

    // Difficulty filter
    if (difficulty && difficulty !== 'all') {
      query += ` AND q.difficulty = ?`;
      params.push(difficulty);
    }

    // Question types filter
    if (Array.isArray(questionTypes) && questionTypes.length > 0 && !questionTypes.includes('all')) {
      const ph = questionTypes.map(() => '?').join(',');
      query += ` AND q.question_type IN (${ph})`;
      params.push(...questionTypes);
    }

    let candidateQuestions = db.prepare(query).all(...params) as any[];

    if (candidateQuestions.length === 0) {
      return res.status(400).json({
        error: 'No questions match the selected criteria. Please adjust your filters or upload more study material.'
      });
    }

    // Order candidates
    if (questionOrder === 'random') {
      candidateQuestions.sort(() => Math.random() - 0.5);
    } else if (questionOrder === 'topic') {
      candidateQuestions.sort((a, b) => (a.topic_name || '').localeCompare(b.topic_name || ''));
    } else if (questionOrder === 'difficulty') {
      const diffOrder: Record<string, number> = { easy: 1, medium: 2, hard: 3, unknown: 4 };
      candidateQuestions.sort((a, b) => (diffOrder[a.difficulty] || 2) - (diffOrder[b.difficulty] || 2));
    } else {
      // Original PDF order
      candidateQuestions.sort((a, b) => {
        if (a.source_page !== b.source_page) return a.source_page - b.source_page;
        return (parseInt(a.original_question_number) || 0) - (parseInt(b.original_question_number) || 0);
      });
    }

    // Slice to desired count (or use all available without duplicating)
    const targetCount = questionCount === 'all' || questionCount === -1 
      ? candidateQuestions.length 
      : Math.min(candidateQuestions.length, Number(questionCount) || 10);
    
    const selectedQuestions = candidateQuestions.slice(0, targetCount);

    const sessionId = 'quiz_' + crypto.randomBytes(8).toString('hex');
    const settingsJson = JSON.stringify({
      sourceType,
      sourceId,
      quizMode,
      timeLimitMinutes,
      negativeMarking,
      negativeMarks: negativeMarking ? negativeMarks : 0,
      marksPerQuestion,
      partialCredit,
      showHints,
      showExplanations,
      immediateFeedback: quizMode === 'practice' || immediateFeedback,
      shuffleOptions
    });

    const createSessionTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO quiz_sessions (
          id, user_id, title, status, total_questions, maximum_score, settings_json
        ) VALUES (?, ?, ?, 'active', ?, ?, ?)
      `).run(
        sessionId,
        userId,
        title,
        selectedQuestions.length,
        selectedQuestions.length * marksPerQuestion,
        settingsJson
      );

      const insertSessionQ = db.prepare(`
        INSERT INTO quiz_session_questions (
          id, quiz_session_id, question_id, display_order, marks, negative_marks, options_shuffled_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < selectedQuestions.length; i++) {
        const q = selectedQuestions[i];
        const sqId = 'qsq_' + crypto.randomBytes(8).toString('hex');
        
        // Fetch question options
        let options = db.prepare('SELECT id, option_label, option_text, is_correct FROM question_options WHERE question_id = ? ORDER BY display_order ASC').all(q.id) as any[];

        let shuffledOptionIds: string[] = options.map(o => o.id);
        if (shuffleOptions && options.length > 1) {
          // Shuffle array
          shuffledOptionIds.sort(() => Math.random() - 0.5);
        }

        insertSessionQ.run(
          sqId,
          sessionId,
          q.id,
          i + 1,
          marksPerQuestion,
          negativeMarking ? negativeMarks : 0,
          JSON.stringify(shuffledOptionIds)
        );
      }
    });

    createSessionTx();

    return res.status(201).json({
      sessionId,
      totalQuestions: selectedQuestions.length,
      requestedCount: questionCount,
      fewerAvailable: selectedQuestions.length < Number(questionCount)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get quiz session details with questions, options, and previous answers
router.get('/:id', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const session = db.prepare(`
      SELECT * FROM quiz_sessions WHERE id = ? AND user_id = ?
    `).get(id, userId) as any;

    if (!session) {
      return res.status(404).json({ error: 'Quiz session not found' });
    }

    const settings = session.settings_json ? JSON.parse(session.settings_json) : {};

    // Get session questions
    const sessionQuestions = db.prepare(`
      SELECT 
        qsq.id as session_question_id,
        qsq.display_order,
        qsq.marks,
        qsq.negative_marks,
        qsq.options_shuffled_json,
        q.*,
        d.title as document_title,
        (SELECT COUNT(*) FROM bookmarks b WHERE b.question_id = q.id AND b.user_id = ?) as is_bookmarked,
        qr.response_json,
        qr.is_marked_for_review,
        qr.is_correct,
        qr.marks_awarded
      FROM quiz_session_questions qsq
      JOIN questions q ON q.id = qsq.question_id
      JOIN documents d ON d.id = q.document_id
      LEFT JOIN quiz_responses qr ON qr.quiz_session_id = qsq.quiz_session_id AND qr.question_id = q.id
      WHERE qsq.quiz_session_id = ?
      ORDER BY qsq.display_order ASC
    `).all(userId, id) as any[];

    // Fetch and format options
    const formattedQuestions = sessionQuestions.map(sq => {
      let options = db.prepare('SELECT id, option_label, option_text, is_correct FROM question_options WHERE question_id = ?').all(sq.id) as any[];
      
      const shuffledIds = sq.options_shuffled_json ? JSON.parse(sq.options_shuffled_json) : [];
      if (Array.isArray(shuffledIds) && shuffledIds.length > 0) {
        const optMap = new Map(options.map(o => [o.id, o]));
        options = shuffledIds.map(oid => optMap.get(oid)).filter(Boolean);
      }

      // Hide is_correct if in exam mode or before submission
      const isSubmitted = session.status === 'submitted';
      const isPracticeImmediate = settings.quizMode === 'practice' || settings.immediateFeedback;

      const safeOptions = options.map((o: any, idx: number) => {
        const optionLabel = String.fromCharCode(65 + idx); // Re-label A, B, C, D in order
        return {
          id: o.id,
          label: optionLabel,
          originalLabel: o.option_label,
          text: o.option_text,
          isCorrect: (isSubmitted || isPracticeImmediate) ? Boolean(o.is_correct) : undefined
        };
      });

      let parsedResponse = null;
      if (sq.response_json) {
        try {
          parsedResponse = JSON.parse(sq.response_json);
        } catch {
          parsedResponse = sq.response_json;
        }
      }

      return {
        id: sq.id,
        sessionQuestionId: sq.session_question_id,
        displayOrder: sq.display_order,
        display_order: sq.display_order,
        questionText: sq.question_text,
        question_text: sq.question_text,
        questionType: sq.question_type,
        question_type: sq.question_type,
        marks: sq.marks,
        negativeMarks: sq.negative_marks,
        negative_marks: sq.negative_marks,
        sourcePage: sq.source_page,
        source_page: sq.source_page,
        documentTitle: sq.document_title,
        document_title: sq.document_title,
        difficulty: sq.difficulty,
        verificationStatus: sq.verification_status,
        verification_status: sq.verification_status,
        explanation: (isSubmitted || isPracticeImmediate) ? sq.explanation : null,
        hint: settings.showHints ? sq.hint : null,
        isDiagramBased: Boolean(sq.is_diagram_based),
        is_diagram_based: Boolean(sq.is_diagram_based),
        diagramNote: sq.diagram_note,
        diagram_note: sq.diagram_note,
        isBookmarked: Boolean(sq.is_bookmarked),
        is_bookmarked: Boolean(sq.is_bookmarked),
        options: safeOptions || [],
        userResponse: parsedResponse,
        isMarkedForReview: Boolean(sq.is_marked_for_review),
        isCorrect: isSubmitted ? sq.is_correct : undefined,
        marksAwarded: isSubmitted ? sq.marks_awarded : undefined
      };
    });

    return res.json({
      session: {
        ...session,
        settings
      },
      questions: formattedQuestions
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Save answer response in real-time
router.post('/:id/responses', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id: sessionId } = req.params;
    const { questionId, response, isMarkedForReview = false } = req.body;

    const session = db.prepare('SELECT id, status FROM quiz_sessions WHERE id = ? AND user_id = ?').get(sessionId, userId) as any;
    if (!session) {
      return res.status(404).json({ error: 'Quiz session not found' });
    }
    if (session.status === 'submitted') {
      return res.status(400).json({ error: 'Cannot update responses on a submitted quiz' });
    }

    const respId = 'qr_' + crypto.randomBytes(8).toString('hex');
    const responseJson = response !== null && response !== undefined ? JSON.stringify(response) : null;

    db.prepare(`
      INSERT INTO quiz_responses (
        id, quiz_session_id, question_id, response_json, is_marked_for_review, answered_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(quiz_session_id, question_id) DO UPDATE SET
        response_json = excluded.response_json,
        is_marked_for_review = excluded.is_marked_for_review,
        answered_at = CURRENT_TIMESTAMP
    `).run(respId, sessionId, questionId, responseJson, isMarkedForReview ? 1 : 0);

    return res.json({ success: true, savedResponse: response });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Submit quiz and calculate deterministic scores on the backend
router.post('/:id/submit', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id: sessionId } = req.params;
    const { timeTaken = 0 } = req.body;

    const session = db.prepare('SELECT * FROM quiz_sessions WHERE id = ? AND user_id = ?').get(sessionId, userId) as any;
    if (!session) {
      return res.status(404).json({ error: 'Quiz session not found' });
    }

    const settings = session.settings_json ? JSON.parse(session.settings_json) : {};

    // Get questions and answers
    const questionsData = db.prepare(`
      SELECT 
        q.id as questionId,
        q.question_type as questionType,
        q.verification_status as verificationStatus,
        qsq.marks,
        qsq.negative_marks as negativeMarks,
        t.name as topicName,
        qa.numerical_answer as numericalAnswer,
        qa.tolerance_absolute as toleranceAbsolute,
        qa.tolerance_relative as toleranceRelative,
        qa.accepted_text_answers as acceptedTextJson
      FROM quiz_session_questions qsq
      JOIN questions q ON q.id = qsq.question_id
      LEFT JOIN topics t ON t.id = q.topic_id
      LEFT JOIN question_answers qa ON qa.question_id = q.id
      WHERE qsq.quiz_session_id = ?
      ORDER BY qsq.display_order ASC
    `).all(sessionId) as any[];

    // Fetch options for questions
    const scoringQuestions: QuestionScoringData[] = questionsData.map(qd => {
      const options = db.prepare('SELECT option_label, is_correct FROM question_options WHERE question_id = ?').all(qd.questionId) as any[];
      const correctOptions = options.filter(o => o.is_correct === 1).map(o => o.option_label);

      let acceptedTextAnswers: string[] = [];
      if (qd.acceptedTextJson) {
        try {
          acceptedTextAnswers = JSON.parse(qd.acceptedTextJson);
        } catch {}
      }

      return {
        questionId: qd.questionId,
        questionType: qd.questionType,
        marks: qd.marks,
        negativeMarks: qd.negativeMarks,
        verificationStatus: qd.verificationStatus,
        correctOptions,
        numericalAnswer: qd.numericalAnswer,
        toleranceAbsolute: qd.toleranceAbsolute,
        toleranceRelative: qd.toleranceRelative,
        acceptedTextAnswers,
        topicName: qd.topicName
      };
    });

    // Fetch user responses
    const responsesRows = db.prepare(`
      SELECT question_id, response_json, is_marked_for_review
      FROM quiz_responses
      WHERE quiz_session_id = ?
    `).all(sessionId) as any[];

    const userResponses: UserResponseData[] = responsesRows.map(r => {
      let resp = null;
      if (r.response_json) {
        try {
          resp = JSON.parse(r.response_json);
        } catch {
          resp = r.response_json;
        }
      }
      return {
        questionId: r.question_id,
        response: resp,
        isMarkedForReview: Boolean(r.is_marked_for_review)
      };
    });

    // Score the quiz deterministically
    const report = QuizScorer.evaluateQuiz(scoringQuestions, userResponses, {
      enableNegativeMarking: settings.negativeMarking,
      partialCreditForMultipleSelect: settings.partialCredit,
      timeTaken: Number(timeTaken) || 0
    });

    // Update responses in DB with calculated correctness and marks
    const updateRespTx = db.transaction(() => {
      const updateRespStmt = db.prepare(`
        UPDATE quiz_responses
        SET is_correct = ?, marks_awarded = ?
        WHERE quiz_session_id = ? AND question_id = ?
      `);

      for (const evalItem of report.evaluations) {
        const isCorrInt = evalItem.isCorrect === null ? null : (evalItem.isCorrect ? 1 : 0);
        updateRespStmt.run(isCorrInt, evalItem.marksAwarded, sessionId, evalItem.questionId);
      }

      // Update quiz_session record
      db.prepare(`
        UPDATE quiz_sessions
        SET status = 'submitted',
            submitted_at = CURRENT_TIMESTAMP,
            time_taken = ?,
            score = ?,
            maximum_score = ?,
            accuracy = ?,
            total_questions = ?,
            correct_count = ?,
            incorrect_count = ?,
            unanswered_count = ?,
            ungraded_count = ?
        WHERE id = ?
      `).run(
        report.timeTaken,
        report.totalMarksAwarded,
        report.maximumMarks,
        report.accuracy,
        report.totalQuestions,
        report.correctCount,
        report.incorrectCount,
        report.unansweredCount,
        report.ungradedCount,
        sessionId
      );
    });

    updateRespTx();

    return res.json({
      success: true,
      report
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Retry quiz (all, incorrect only, unanswered only)
router.post('/:id/retry', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id: sourceSessionId } = req.params;
    const { mode = 'all' } = req.body; // all, incorrect_only, unanswered_only

    const sourceSession = db.prepare('SELECT * FROM quiz_sessions WHERE id = ? AND user_id = ?').get(sourceSessionId, userId) as any;
    if (!sourceSession) {
      return res.status(404).json({ error: 'Source quiz session not found' });
    }

    let targetQuestionsQuery = `
      SELECT qsq.question_id, qsq.marks, qsq.negative_marks
      FROM quiz_session_questions qsq
      WHERE qsq.quiz_session_id = ?
    `;

    if (mode === 'incorrect_only') {
      targetQuestionsQuery += ` AND qsq.question_id IN (
        SELECT qr.question_id FROM quiz_responses qr 
        WHERE qr.quiz_session_id = ? AND qr.is_correct = 0
      )`;
    } else if (mode === 'unanswered_only') {
      targetQuestionsQuery += ` AND qsq.question_id NOT IN (
        SELECT qr.question_id FROM quiz_responses qr 
        WHERE qr.quiz_session_id = ? AND qr.response_json IS NOT NULL
      )`;
    }

    const params = mode === 'all' ? [sourceSessionId] : [sourceSessionId, sourceSessionId];
    const eligibleQuestions = db.prepare(targetQuestionsQuery).all(...params) as any[];

    if (eligibleQuestions.length === 0) {
      return res.status(400).json({ error: `No eligible questions found for retry mode "${mode}".` });
    }

    const newSessionId = 'quiz_' + crypto.randomBytes(8).toString('hex');
    const settings = sourceSession.settings_json ? JSON.parse(sourceSession.settings_json) : {};

    const retryTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO quiz_sessions (
          id, user_id, title, status, total_questions, maximum_score, settings_json
        ) VALUES (?, ?, ?, 'active', ?, ?, ?)
      `).run(
        newSessionId,
        userId,
        `${sourceSession.title} (Retry ${mode === 'incorrect_only' ? 'Missed' : ''})`.trim(),
        eligibleQuestions.length,
        eligibleQuestions.length * (settings.marksPerQuestion || 1.0),
        sourceSession.settings_json
      );

      const insertSessionQ = db.prepare(`
        INSERT INTO quiz_session_questions (
          id, quiz_session_id, question_id, display_order, marks, negative_marks, options_shuffled_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < eligibleQuestions.length; i++) {
        const eq = eligibleQuestions[i];
        const sqId = 'qsq_' + crypto.randomBytes(8).toString('hex');
        
        const options = db.prepare('SELECT id FROM question_options WHERE question_id = ? ORDER BY display_order ASC').all(eq.question_id) as any[];
        let shuffledIds = options.map(o => o.id);
        if (settings.shuffleOptions) {
          shuffledIds.sort(() => Math.random() - 0.5);
        }

        insertSessionQ.run(
          sqId,
          newSessionId,
          eq.question_id,
          i + 1,
          eq.marks,
          eq.negative_marks,
          JSON.stringify(shuffledIds)
        );
      }
    });

    retryTx();

    return res.status(201).json({ sessionId: newSessionId, totalQuestions: eligibleQuestions.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get user's quiz attempt history
router.get('/history/all', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const history = db.prepare(`
      SELECT * FROM quiz_sessions
      WHERE user_id = ?
      ORDER BY started_at DESC
      LIMIT 50
    `).all(userId);

    return res.json({ history });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
