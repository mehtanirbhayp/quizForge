import { Router } from 'express';
import db from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { AIService } from '../services/aiService';

const router = Router();

// Get settings
router.get('/', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    let settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as any;
    
    if (!settings) {
      db.prepare(`
        INSERT INTO user_settings (user_id, ai_provider, theme)
        VALUES (?, 'none', 'dark')
      `).run(userId);
      settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);
    }

    // Mask API key if set
    const maskedKey = settings.api_key 
      ? settings.api_key.substring(0, 4) + '...' + settings.api_key.substring(settings.api_key.length - 4)
      : '';

    return res.json({
      settings: {
        ...settings,
        apiKeyMasked: maskedKey,
        hasApiKey: Boolean(settings.api_key)
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update settings
router.patch('/', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { aiProvider, apiKey, theme, defaultNegativeMarking, defaultTimePerQuestion } = req.body;

    const existing = db.prepare('SELECT user_id, api_key FROM user_settings WHERE user_id = ?').get(userId) as any;
    
    let keyToSave = existing ? existing.api_key : null;
    if (apiKey !== undefined && apiKey !== '') {
      keyToSave = apiKey;
    }

    db.prepare(`
      INSERT INTO user_settings (
        user_id, ai_provider, api_key, theme, default_negative_marking, default_time_per_question, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        ai_provider = COALESCE(?, ai_provider),
        api_key = COALESCE(?, api_key),
        theme = COALESCE(?, theme),
        default_negative_marking = COALESCE(?, default_negative_marking),
        default_time_per_question = COALESCE(?, default_time_per_question),
        updated_at = CURRENT_TIMESTAMP
    `).run(
      userId,
      aiProvider || 'none',
      keyToSave,
      theme || 'dark',
      defaultNegativeMarking || 0.0,
      defaultTimePerQuestion || 60,
      aiProvider,
      keyToSave,
      theme,
      defaultNegativeMarking,
      defaultTimePerQuestion
    );

    return res.json({ success: true, message: 'Settings saved' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Test AI API connection
router.post('/test-ai', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { provider, apiKey } = req.body;

    let keyToTest = apiKey;
    if (!keyToTest) {
      const settings = db.prepare('SELECT api_key FROM user_settings WHERE user_id = ?').get(userId) as any;
      keyToTest = settings?.api_key;
    }

    const result = await AIService.testConnection(provider || 'gemini', keyToTest || '');
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
