import { Router } from 'express';
import crypto from 'crypto';
import db from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { DuplicateDetector } from '../services/duplicateDetector';

const router = Router();

// Search and list questions with filters
router.get('/', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const {
      search,
      documentId,
      collectionId,
      topicId,
      questionType,
      difficulty,
      verificationStatus,
      bookmarkedOnly,
      limit = '100',
      offset = '0'
    } = req.query as Record<string, string>;

    let query = `
      SELECT 
        q.*,
        d.title as document_title,
        d.original_filename,
        t.name as topic_name,
        (SELECT COUNT(*) FROM bookmarks b WHERE b.question_id = q.id AND b.user_id = ?) as is_bookmarked,
        (SELECT note_text FROM user_notes un WHERE un.question_id = q.id AND un.user_id = ?) as user_note
      FROM questions q
      JOIN documents d ON d.id = q.document_id
      LEFT JOIN topics t ON t.id = q.topic_id
      WHERE d.user_id = ?
    `;

    const params: any[] = [userId, userId, userId];

    if (search && search.trim()) {
      query += ` AND (q.question_text LIKE ? OR q.explanation LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (documentId) {
      query += ` AND q.document_id = ?`;
      params.push(documentId);
    }

    if (collectionId) {
      query += ` AND q.document_id IN (SELECT document_id FROM collection_documents WHERE collection_id = ?)`;
      params.push(collectionId);
    }

    if (topicId) {
      query += ` AND q.topic_id = ?`;
      params.push(topicId);
    }

    if (questionType && questionType !== 'all') {
      query += ` AND q.question_type = ?`;
      params.push(questionType);
    }

    if (difficulty && difficulty !== 'all') {
      query += ` AND q.difficulty = ?`;
      params.push(difficulty);
    }

    if (verificationStatus && verificationStatus !== 'all') {
      query += ` AND q.verification_status = ?`;
      params.push(verificationStatus);
    }

    if (bookmarkedOnly === 'true') {
      query += ` AND q.id IN (SELECT question_id FROM bookmarks WHERE user_id = ?)`;
      params.push(userId);
    }

    query += ` ORDER BY q.source_page ASC, CAST(q.original_question_number AS INTEGER) ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const questions = db.prepare(query).all(...params) as any[];

    // Fetch options for each question
    const qIds = questions.map(q => q.id);
    let optionsMap: Record<string, any[]> = {};

    if (qIds.length > 0) {
      const placeholders = qIds.map(() => '?').join(',');
      const allOptions = db.prepare(`
        SELECT * FROM question_options 
        WHERE question_id IN (${placeholders})
        ORDER BY display_order ASC
      `).all(...qIds) as any[];

      for (const opt of allOptions) {
        if (!optionsMap[opt.question_id]) optionsMap[opt.question_id] = [];
        optionsMap[opt.question_id].push(opt);
      }
    }

    const result = questions.map(q => ({
      ...q,
      is_bookmarked: Boolean(q.is_bookmarked),
      options: optionsMap[q.id] || []
    }));

    return res.json({ questions: result, total: result.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Detect duplicate questions
router.get('/duplicates', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { documentId, collectionId, threshold = '0.70' } = req.query as Record<string, string>;

    let query = `
      SELECT q.id, q.question_text, d.title as document_title
      FROM questions q
      JOIN documents d ON d.id = q.document_id
      WHERE d.user_id = ?
    `;
    const params: any[] = [userId];

    if (documentId) {
      query += ` AND q.document_id = ?`;
      params.push(documentId);
    } else if (collectionId) {
      query += ` AND q.document_id IN (SELECT document_id FROM collection_documents WHERE collection_id = ?)`;
      params.push(collectionId);
    }

    const rows = db.prepare(query).all(...params) as { id: string; question_text: string }[];
    const duplicates = DuplicateDetector.findDuplicates(rows, parseFloat(threshold));

    return res.json({ duplicates });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get single question details
router.get('/:id', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const question = db.prepare(`
      SELECT 
        q.*,
        d.title as document_title,
        t.name as topic_name,
        (SELECT COUNT(*) FROM bookmarks b WHERE b.question_id = q.id AND b.user_id = ?) as is_bookmarked,
        (SELECT note_text FROM user_notes un WHERE un.question_id = q.id AND un.user_id = ?) as user_note
      FROM questions q
      JOIN documents d ON d.id = q.document_id
      LEFT JOIN topics t ON t.id = q.topic_id
      WHERE q.id = ? AND d.user_id = ?
    `).get(userId, userId, id, userId) as any;

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const options = db.prepare(`
      SELECT * FROM question_options WHERE question_id = ? ORDER BY display_order ASC
    `).all(id);

    const answers = db.prepare(`
      SELECT * FROM question_answers WHERE question_id = ?
    `).get(id);

    return res.json({
      question: {
        ...question,
        is_bookmarked: Boolean(question.is_bookmarked),
        options,
        answers
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update question (review, editing, options, correct answer)
router.patch('/:id', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const {
      questionText,
      questionType,
      difficulty,
      topicId,
      verificationStatus,
      explanation,
      hint,
      isDiagramBased,
      options,
      numericalAnswer
    } = req.body;

    // Verify ownership
    const existing = db.prepare(`
      SELECT q.id FROM questions q
      JOIN documents d ON d.id = q.document_id
      WHERE q.id = ? AND d.user_id = ?
    `).get(id, userId);

    if (!existing) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const updateTx = db.transaction(() => {
      // Update question table
      db.prepare(`
        UPDATE questions
        SET question_text = COALESCE(?, question_text),
            question_type = COALESCE(?, question_type),
            difficulty = COALESCE(?, difficulty),
            topic_id = COALESCE(?, topic_id),
            verification_status = COALESCE(?, verification_status),
            explanation = COALESCE(?, explanation),
            hint = COALESCE(?, hint),
            is_diagram_based = COALESCE(?, is_diagram_based),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        questionText,
        questionType,
        difficulty,
        topicId,
        verificationStatus,
        explanation,
        hint,
        isDiagramBased !== undefined ? (isDiagramBased ? 1 : 0) : null,
        id
      );

      // If options array provided, replace options
      if (Array.isArray(options)) {
        db.prepare('DELETE FROM question_options WHERE question_id = ?').run(id);
        const insertOpt = db.prepare(`
          INSERT INTO question_options (id, question_id, option_label, option_text, is_correct, display_order)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (let i = 0; i < options.length; i++) {
          const opt = options[i];
          const optId = opt.id || 'opt_' + crypto.randomBytes(8).toString('hex');
          insertOpt.run(optId, id, opt.label || opt.option_label, opt.text || opt.option_text, opt.is_correct ? 1 : 0, i);
        }
      }

      // If numerical answer provided
      if (numericalAnswer !== undefined) {
        db.prepare(`
          INSERT INTO question_answers (id, question_id, numerical_answer)
          VALUES (?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET numerical_answer = excluded.numerical_answer
        `).run('ans_' + crypto.randomBytes(8).toString('hex'), id, numericalAnswer);
      }
    });

    updateTx();

    const updated = db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as any;
    const updatedOptions = db.prepare('SELECT * FROM question_options WHERE question_id = ? ORDER BY display_order ASC').all(id);

    return res.json({ question: { ...updated, options: updatedOptions } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete question
router.delete('/:id', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const existing = db.prepare(`
      SELECT q.id FROM questions q
      JOIN documents d ON d.id = q.document_id
      WHERE q.id = ? AND d.user_id = ?
    `).get(id, userId);

    if (!existing) {
      return res.status(404).json({ error: 'Question not found' });
    }

    db.prepare('DELETE FROM questions WHERE id = ?').run(id);
    return res.json({ success: true, message: 'Question deleted' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Bulk update verification status or topic
router.post('/bulk-update', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { questionIds, verificationStatus, topicId } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ error: 'questionIds array is required' });
    }

    const placeholders = questionIds.map(() => '?').join(',');
    
    if (verificationStatus) {
      db.prepare(`
        UPDATE questions
        SET verification_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id IN (${placeholders})
          AND document_id IN (SELECT id FROM documents WHERE user_id = ?)
      `).run(verificationStatus, ...questionIds, userId);
    }

    if (topicId !== undefined) {
      db.prepare(`
        UPDATE questions
        SET topic_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id IN (${placeholders})
          AND document_id IN (SELECT id FROM documents WHERE user_id = ?)
      `).run(topicId, ...questionIds, userId);
    }

    return res.json({ success: true, count: questionIds.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Bulk delete questions
router.post('/bulk-delete', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { questionIds } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ error: 'questionIds array is required' });
    }

    const placeholders = questionIds.map(() => '?').join(',');
    db.prepare(`
      DELETE FROM questions
      WHERE id IN (${placeholders})
        AND document_id IN (SELECT id FROM documents WHERE user_id = ?)
    `).run(...questionIds, userId);

    return res.json({ success: true, count: questionIds.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Toggle bookmark
router.post('/:id/bookmark', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM bookmarks WHERE user_id = ? AND question_id = ?').get(userId, id);
    if (existing) {
      db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND question_id = ?').run(userId, id);
      return res.json({ isBookmarked: false });
    } else {
      db.prepare('INSERT INTO bookmarks (user_id, question_id) VALUES (?, ?)').run(userId, id);
      return res.json({ isBookmarked: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Save user note
router.post('/:id/notes', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { noteText } = req.body;

    const noteId = 'note_' + crypto.randomBytes(8).toString('hex');
    db.prepare(`
      INSERT INTO user_notes (id, user_id, question_id, note_text, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, question_id) DO UPDATE SET
        note_text = excluded.note_text,
        updated_at = CURRENT_TIMESTAMP
    `).run(noteId, userId, id, noteText || '');

    return res.json({ success: true, note: noteText });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
