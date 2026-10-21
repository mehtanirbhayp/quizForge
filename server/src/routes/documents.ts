import { Router } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import db from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { parsePdfFile } from '../services/pdfParser';
import { QuestionExtractor } from '../services/questionExtractor';

const router = Router();

// Upload one or multiple PDFs
router.post('/upload', upload.array('files', 10), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const files = req.files as Express.Multer.File[];
    const collectionId = req.body.collectionId;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No PDF files were uploaded' });
    }

    const createdDocuments = [];

    for (const file of files) {
      const docId = 'doc_' + crypto.randomBytes(8).toString('hex');
      const fileBuffer = fs.readFileSync(file.path);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const title = file.originalname.replace(/\.pdf$/i, '');

      db.prepare(`
        INSERT INTO documents (
          id, user_id, title, original_filename, storage_path, file_hash, processing_status
        ) VALUES (?, ?, ?, ?, ?, ?, 'uploaded')
      `).run(docId, userId, title, file.originalname, file.path, fileHash);

      // Link to collection if provided
      if (collectionId) {
        try {
          db.prepare(`
            INSERT OR IGNORE INTO collection_documents (collection_id, document_id)
            VALUES (?, ?)
          `).run(collectionId, docId);
        } catch (e) {
          // Ignore duplicate link
        }
      }

      const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId);
      createdDocuments.push(doc);

      // Automatically start background processing of the document
      processDocumentAsync(docId).catch(err => {
        console.error(`Error processing document ${docId}:`, err);
      });
    }

    return res.status(201).json({ documents: createdDocuments });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Helper function to execute the full PDF processing pipeline
export async function processDocumentAsync(docId: string) {
  try {
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId) as any;
    if (!doc) return;

    // Stage 1: Queued
    db.prepare("UPDATE documents SET processing_status = 'queued' WHERE id = ?").run(docId);

    // Stage 2: Extracting text
    db.prepare("UPDATE documents SET processing_status = 'extracting_text' WHERE id = ?").run(docId);
    
    if (!fs.existsSync(doc.storage_path)) {
      throw new Error(`File not found at storage path: ${doc.storage_path}`);
    }

    const parseResult = await parsePdfFile(doc.storage_path);
    
    db.prepare(`
      UPDATE documents 
      SET page_count = ?, raw_text = ?, processing_status = 'identifying_questions'
      WHERE id = ?
    `).run(parseResult.numPages, parseResult.text, docId);

    // Stage 3: Identifying questions
    const extracted = QuestionExtractor.extractQuestions(parseResult.pages);

    // Clear any previous questions if this is a retry
    db.prepare('DELETE FROM questions WHERE document_id = ?').run(docId);

    const insertQStmt = db.prepare(`
      INSERT INTO questions (
        id, document_id, original_question_number, question_text, question_type,
        source_page, difficulty, verification_status, extraction_confidence,
        explanation, hint, is_diagram_based, diagram_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertOptStmt = db.prepare(`
      INSERT INTO question_options (
        id, question_id, option_label, option_text, is_correct, display_order
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertAnsStmt = db.prepare(`
      INSERT INTO question_answers (
        id, question_id, numerical_answer, accepted_text_answers
      ) VALUES (?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      for (const q of extracted) {
        const qId = 'q_' + crypto.randomBytes(8).toString('hex');
        
        insertQStmt.run(
          qId,
          docId,
          q.originalQuestionNumber,
          q.questionText,
          q.questionType,
          q.sourcePage,
          q.difficulty,
          q.verificationStatus,
          q.extractionConfidence,
          q.explanation,
          q.hint,
          q.isDiagramBased ? 1 : 0,
          q.diagramNote
        );

        // Insert options
        let optIndex = 0;
        for (const opt of q.options) {
          const optId = 'opt_' + crypto.randomBytes(8).toString('hex');
          insertOptStmt.run(
            optId,
            qId,
            opt.label,
            opt.text,
            opt.isCorrect ? 1 : 0,
            optIndex++
          );
        }

        // Insert answers for numerical or text questions
        if (q.numericalAnswer !== undefined && q.numericalAnswer !== null) {
          const ansId = 'ans_' + crypto.randomBytes(8).toString('hex');
          insertAnsStmt.run(
            ansId,
            qId,
            q.numericalAnswer,
            JSON.stringify(q.acceptedTextAnswers || [])
          );
        }
      }
    });

    transaction();

    // Determine final status
    const hasWarnings = extracted.some(q => q.verificationStatus === 'diagram_required' || q.verificationStatus === 'missing_answer_key');
    const finalStatus = extracted.length === 0 ? 'completed_with_warnings' : (hasWarnings ? 'completed_with_warnings' : 'completed');

    db.prepare(`
      UPDATE documents 
      SET processing_status = ?, processing_error = NULL
      WHERE id = ?
    `).run(finalStatus, docId);

  } catch (err: any) {
    console.error(`Document extraction failed for ${docId}:`, err);
    db.prepare(`
      UPDATE documents 
      SET processing_status = 'failed', processing_error = ?
      WHERE id = ?
    `).run(err.message, docId);
  }
}

// List user's documents
router.get('/', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const documents = db.prepare(`
      SELECT 
        d.*,
        (SELECT COUNT(*) FROM questions q WHERE q.document_id = d.id) as question_count,
        (SELECT COUNT(*) FROM questions q WHERE q.document_id = d.id AND q.verification_status = 'verified') as verified_question_count,
        (SELECT COUNT(*) FROM questions q WHERE q.document_id = d.id AND q.verification_status = 'needs_review') as needs_review_count,
        (SELECT c.name FROM collections c 
         JOIN collection_documents cd ON cd.collection_id = c.id 
         WHERE cd.document_id = d.id LIMIT 1) as collection_name,
        (SELECT cd.collection_id FROM collection_documents cd WHERE cd.document_id = d.id LIMIT 1) as collection_id
      FROM documents d
      WHERE d.user_id = ?
      ORDER BY d.created_at DESC
    `).all(userId);

    return res.json({ documents });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get document details & status
router.get('/:id', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const document = db.prepare(`
      SELECT d.*,
        (SELECT COUNT(*) FROM questions q WHERE q.document_id = d.id) as question_count,
        (SELECT c.name FROM collections c 
         JOIN collection_documents cd ON cd.collection_id = c.id 
         WHERE cd.document_id = d.id LIMIT 1) as collection_name
      FROM documents d
      WHERE d.id = ? AND d.user_id = ?
    `).get(id, userId);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    return res.json({ document });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Trigger / Retry processing
router.post('/:id/process', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const doc = db.prepare('SELECT id FROM documents WHERE id = ? AND user_id = ?').get(id, userId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Run processing
    processDocumentAsync(id).catch(err => console.error(err));

    return res.json({ success: true, message: 'Processing started' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete document
router.delete('/:id', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete file from disk
    if (doc.storage_path && fs.existsSync(doc.storage_path)) {
      try {
        fs.unlinkSync(doc.storage_path);
      } catch (e) {
        console.warn('Failed to delete storage file:', e);
      }
    }

    // Cascade delete in database
    db.prepare('DELETE FROM documents WHERE id = ?').run(id);

    return res.json({ success: true, message: 'Document and extracted questions deleted' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
