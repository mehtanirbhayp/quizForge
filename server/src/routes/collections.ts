import { Router } from 'express';
import crypto from 'crypto';
import db from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// List all collections for current user
router.get('/', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const collections = db.prepare(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM collection_documents cd WHERE cd.collection_id = c.id) as document_count,
        (SELECT COUNT(DISTINCT q.id) 
         FROM collection_documents cd
         JOIN questions q ON q.document_id = cd.document_id
         WHERE cd.collection_id = c.id) as question_count,
        (SELECT COUNT(*) FROM topics t WHERE t.collection_id = c.id) as topic_count
      FROM collections c
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `).all(userId);

    return res.json({ collections });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create collection
router.post('/', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Collection name is required' });
    }

    const id = 'col_' + crypto.randomBytes(8).toString('hex');
    db.prepare(`
      INSERT INTO collections (id, user_id, name, description)
      VALUES (?, ?, ?, ?)
    `).run(id, userId, name.trim(), description || '');

    const created = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
    return res.status(201).json({ collection: created });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get single collection with documents & topics
router.get('/:id', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const collection = db.prepare(`
      SELECT * FROM collections WHERE id = ? AND user_id = ?
    `).get(id, userId);

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const documents = db.prepare(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM questions q WHERE q.document_id = d.id) as question_count
      FROM documents d
      JOIN collection_documents cd ON cd.document_id = d.id
      WHERE cd.collection_id = ?
      ORDER BY d.created_at DESC
    `).all(id);

    const topics = db.prepare(`
      SELECT t.*,
        (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id) as question_count
      FROM topics t
      WHERE t.collection_id = ?
      ORDER BY t.name ASC
    `).all(id);

    return res.json({ collection, documents, topics });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update collection
router.patch('/:id', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { name, description } = req.body;

    const existing = db.prepare('SELECT id FROM collections WHERE id = ? AND user_id = ?').get(id, userId);
    if (!existing) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    db.prepare(`
      UPDATE collections
      SET name = COALESCE(?, name),
          description = COALESCE(?, description)
      WHERE id = ? AND user_id = ?
    `).run(name, description, id, userId);

    const updated = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
    return res.json({ collection: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete collection (documents are kept safe, only unlinked)
router.delete('/:id', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM collections WHERE id = ? AND user_id = ?').get(id, userId);
    if (!existing) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Delete association first
    db.prepare('DELETE FROM collection_documents WHERE collection_id = ?').run(id);
    // Delete collection
    db.prepare('DELETE FROM collections WHERE id = ? AND user_id = ?').run(id, userId);

    return res.json({ success: true, message: 'Collection deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
