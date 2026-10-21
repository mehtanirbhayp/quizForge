import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db/database';
import { generateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Register
router.post('/register', (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'All fields (email, password, displayName) are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const userId = 'usr_' + crypto.randomBytes(8).toString('hex');
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name)
      VALUES (?, ?, ?, ?)
    `).run(userId, email, passwordHash, displayName);

    // Create default user settings
    db.prepare(`
      INSERT INTO user_settings (user_id, ai_provider, theme)
      VALUES (?, 'none', 'dark')
    `).run(userId);

    const token = generateToken({ id: userId, email, displayName });
    return res.status(201).json({
      user: { id: userId, email, displayName },
      token
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({ id: user.id, email: user.email, displayName: user.display_name });
    return res.json({
      user: { id: user.id, email: user.email, displayName: user.display_name },
      token
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Current User Profile
router.get('/me', (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const user = db.prepare('SELECT id, email, display_name, created_at FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({ user });
});

export default router;
