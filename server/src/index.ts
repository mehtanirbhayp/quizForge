import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth';
import collectionRoutes from './routes/collections';
import documentRoutes from './routes/documents';
import questionRoutes from './routes/questions';
import quizRoutes from './routes/quizzes';
import analyticsRoutes from './routes/analytics';
import settingsRoutes from './routes/settings';
import { authMiddleware } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 5001;

// CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static uploads directory
const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'QuizForge Backend'
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/collections', authMiddleware, collectionRoutes);
app.use('/api/documents', authMiddleware, documentRoutes);
app.use('/api/questions', authMiddleware, questionRoutes);
app.use('/api/quizzes', authMiddleware, quizRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`QuizForge backend server running on http://localhost:${PORT}`);
});
