import { Router } from 'express';
import db from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Overall user performance analytics
router.get('/overview', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;

    // Overall metrics from completed quizzes
    const summary = db.prepare(`
      SELECT 
        COUNT(*) as total_quizzes,
        COALESCE(SUM(time_taken), 0) as total_time_spent,
        COALESCE(SUM(total_questions), 0) as total_questions_served,
        COALESCE(SUM(correct_count), 0) as total_correct,
        COALESCE(SUM(incorrect_count), 0) as total_incorrect,
        COALESCE(SUM(unanswered_count), 0) as total_unanswered,
        COALESCE(AVG(CASE WHEN maximum_score > 0 THEN (score * 100.0 / maximum_score) ELSE 0 END), 0) as average_score,
        COALESCE(AVG(accuracy), 0) as average_accuracy
      FROM quiz_sessions
      WHERE user_id = ? AND status = 'submitted'
    `).get(userId) as any;

    // Document & question repository stats
    const libraryStats = db.prepare(`
      SELECT 
        COUNT(DISTINCT d.id) as total_documents,
        COUNT(DISTINCT q.id) as total_questions,
        COUNT(DISTINCT CASE WHEN q.verification_status = 'verified' THEN q.id END) as verified_questions,
        COUNT(DISTINCT CASE WHEN q.verification_status = 'needs_review' THEN q.id END) as needs_review_questions
      FROM documents d
      LEFT JOIN questions q ON q.document_id = d.id
      WHERE d.user_id = ?
    `).get(userId) as any;

    // Total bookmarked questions
    const bookmarkCount = db.prepare(`
      SELECT COUNT(*) as count FROM bookmarks WHERE user_id = ?
    `).get(userId) as any;

    // Recent 10 quiz attempts for timeline/trend chart
    const recentTrends = db.prepare(`
      SELECT 
        id, title, started_at, submitted_at, time_taken,
        score, maximum_score, accuracy,
        correct_count, incorrect_count, unanswered_count
      FROM quiz_sessions
      WHERE user_id = ? AND status = 'submitted'
      ORDER BY submitted_at ASC
      LIMIT 15
    `).all(userId);

    // Topic performance analysis
    const topicStats = db.prepare(`
      SELECT 
        COALESCE(t.name, 'General') as topic_name,
        COUNT(qr.id) as total_attempts,
        SUM(CASE WHEN qr.is_correct = 1 THEN 1 ELSE 0 END) as correct_count,
        SUM(CASE WHEN qr.is_correct = 0 THEN 1 ELSE 0 END) as incorrect_count
      FROM quiz_responses qr
      JOIN quiz_sessions qs ON qs.id = qr.quiz_session_id
      JOIN questions q ON q.id = qr.question_id
      LEFT JOIN topics t ON t.id = q.topic_id
      WHERE qs.user_id = ? AND qs.status = 'submitted' AND qr.is_correct IS NOT NULL
      GROUP BY COALESCE(t.name, 'General')
      HAVING total_attempts >= 1
    `).all(userId) as any[];

    const processedTopics = topicStats.map(ts => {
      const accuracy = ts.total_attempts > 0 ? (ts.correct_count / ts.total_attempts) * 100 : 0;
      return {
        topic: ts.topic_name,
        totalAttempts: ts.total_attempts,
        correctCount: ts.correct_count,
        incorrectCount: ts.incorrect_count,
        accuracy: Math.round(accuracy * 10) / 10,
        isWeak: ts.total_attempts >= 3 && accuracy < 60,
        isStrong: ts.total_attempts >= 3 && accuracy >= 75
      };
    });

    // Recommendations
    const incorrectCount = db.prepare(`
      SELECT COUNT(DISTINCT qr.question_id) as count
      FROM quiz_responses qr
      JOIN quiz_sessions qs ON qs.id = qr.quiz_session_id
      WHERE qs.user_id = ? AND qr.is_correct = 0
    `).get(userId) as any;

    const unattemptedCount = db.prepare(`
      SELECT COUNT(DISTINCT q.id) as count
      FROM questions q
      JOIN documents d ON d.id = q.document_id
      WHERE d.user_id = ?
        AND q.id NOT IN (
          SELECT DISTINCT qr.question_id 
          FROM quiz_responses qr 
          JOIN quiz_sessions qs ON qs.id = qr.quiz_session_id 
          WHERE qs.user_id = ?
        )
    `).get(userId, userId) as any;

    return res.json({
      overview: {
        totalDocuments: libraryStats.total_documents || 0,
        totalQuestions: libraryStats.total_questions || 0,
        verifiedQuestions: libraryStats.verified_questions || 0,
        needsReviewQuestions: libraryStats.needs_review_questions || 0,
        totalQuizzes: summary.total_quizzes || 0,
        totalTimeSpent: summary.total_time_spent || 0,
        totalCorrect: summary.total_correct || 0,
        totalIncorrect: summary.total_incorrect || 0,
        totalUnanswered: summary.total_unanswered || 0,
        totalAttempted: (summary.total_correct || 0) + (summary.total_incorrect || 0),
        averageScore: Math.round((summary.average_score || 0) * 10) / 10,
        averageAccuracy: Math.round((summary.average_accuracy || 0) * 10) / 10,
        bookmarkedCount: bookmarkCount.count || 0
      },
      recentTrends,
      topicStats: processedTopics,
      recommendations: {
        missedQuestionsCount: incorrectCount.count || 0,
        unattemptedQuestionsCount: unattemptedCount.count || 0,
        bookmarkedQuestionsCount: bookmarkCount.count || 0,
        weakTopicsCount: processedTopics.filter(t => t.isWeak).length
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
