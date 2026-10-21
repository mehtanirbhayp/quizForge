export interface QuestionScoringData {
  questionId: string;
  questionType: 'single_select' | 'multiple_select' | 'true_false' | 'numerical' | 'fill_blank' | 'short_answer';
  marks: number;
  negativeMarks: number;
  verificationStatus: string;
  correctOptions: string[]; // labels e.g. ["A"], or ["A", "C"]
  numericalAnswer?: number | null;
  toleranceAbsolute?: number;
  toleranceRelative?: number;
  acceptedTextAnswers?: string[];
  topicName?: string;
}

export interface UserResponseData {
  questionId: string;
  response: any; // e.g. "A" or ["A", "B"] or "42.5" or "enthalpy"
  isMarkedForReview?: boolean;
}

export interface EvaluationResult {
  questionId: string;
  isCorrect: boolean | null; // null if unverified/ungraded
  isAnswered: boolean;
  marksAwarded: number;
  userResponse: any;
  explanationNote?: string;
  topicName?: string;
}

export interface QuizScoreReport {
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  ungradedCount: number;
  totalMarksAwarded: number;
  maximumMarks: number;
  percentageScore: number;
  accuracy: number;
  timeTaken: number;
  evaluations: EvaluationResult[];
  topicBreakdown: Record<string, {
    total: number;
    correct: number;
    incorrect: number;
    unanswered: number;
    accuracy: number;
  }>;
}

export class QuizScorer {
  /**
   * Evaluates an entire quiz session and calculates scores deterministically
   */
  public static evaluateQuiz(
    questions: QuestionScoringData[],
    responses: UserResponseData[],
    options: {
      enableNegativeMarking?: boolean;
      partialCreditForMultipleSelect?: boolean;
      timeTaken?: number;
    } = {}
  ): QuizScoreReport {
    const responseMap = new Map<string, UserResponseData>();
    for (const r of responses) {
      responseMap.set(r.questionId, r);
    }

    const evaluations: EvaluationResult[] = [];
    let totalMarksAwarded = 0;
    let maximumMarks = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let ungradedCount = 0;

    const topicBreakdown: Record<string, {
      total: number;
      correct: number;
      incorrect: number;
      unanswered: number;
      accuracy: number;
    }> = {};

    for (const q of questions) {
      maximumMarks += q.marks;
      const resp = responseMap.get(q.questionId);
      const userVal = resp ? resp.response : null;

      const topic = q.topicName || 'General';
      if (!topicBreakdown[topic]) {
        topicBreakdown[topic] = { total: 0, correct: 0, incorrect: 0, unanswered: 0, accuracy: 0 };
      }
      topicBreakdown[topic].total += 1;

      // Check if unanswered
      const isAnswered = this.isResponseNonEmpty(userVal);
      if (!isAnswered) {
        unansweredCount++;
        topicBreakdown[topic].unanswered++;
        evaluations.push({
          questionId: q.questionId,
          isCorrect: false,
          isAnswered: false,
          marksAwarded: 0,
          userResponse: null,
          topicName: topic
        });
        continue;
      }

      // Check if question has unknown/unverified answer key
      if (q.verificationStatus === 'missing_answer_key' || (q.correctOptions.length === 0 && q.numericalAnswer === null && (!q.acceptedTextAnswers || q.acceptedTextAnswers.length === 0))) {
        ungradedCount++;
        evaluations.push({
          questionId: q.questionId,
          isCorrect: null, // Unverified
          isAnswered: true,
          marksAwarded: 0,
          userResponse: userVal,
          explanationNote: 'Question answer key is not verified in source document. Recorded without scoring.',
          topicName: topic
        });
        continue;
      }

      // Evaluate according to question type
      let isCorrect: boolean | null = false;
      let awardedMarks = 0;

      if (q.questionType === 'single_select' || q.questionType === 'true_false') {
        const selectedOption = String(userVal).trim().toUpperCase();
        const targetOption = q.correctOptions[0]?.trim().toUpperCase();
        isCorrect = selectedOption === targetOption;
      } else if (q.questionType === 'multiple_select') {
        const userArr = (Array.isArray(userVal) ? userVal : [userVal]).map(v => String(v).trim().toUpperCase());
        const targetArr = q.correctOptions.map(v => String(v).trim().toUpperCase());

        if (options.partialCreditForMultipleSelect) {
          // Partial credit: correct selected - incorrect selected
          const correctSelected = userArr.filter(v => targetArr.includes(v)).length;
          const incorrectSelected = userArr.filter(v => !targetArr.includes(v)).length;
          const fraction = Math.max(0, (correctSelected - incorrectSelected) / targetArr.length);
          isCorrect = fraction === 1.0;
          awardedMarks = fraction * q.marks;
        } else {
          // All-or-nothing
          const setA = new Set(userArr);
          const setB = new Set(targetArr);
          isCorrect = setA.size === setB.size && [...setA].every(x => setB.has(x));
        }
      } else if (q.questionType === 'numerical') {
        const numVal = parseFloat(userVal);
        if (isNaN(numVal) || q.numericalAnswer === null || q.numericalAnswer === undefined) {
          isCorrect = false;
        } else {
          const diff = Math.abs(numVal - q.numericalAnswer);
          const absTol = q.toleranceAbsolute ?? 0.01;
          const relTol = q.toleranceRelative ?? 0;
          const allowedDiff = Math.max(absTol, Math.abs(q.numericalAnswer) * relTol);
          isCorrect = diff <= allowedDiff;
        }
      } else if (q.questionType === 'fill_blank' || q.questionType === 'short_answer') {
        const normUser = String(userVal).trim().toLowerCase();
        const accepted = (q.acceptedTextAnswers || []).map(a => a.trim().toLowerCase());
        isCorrect = accepted.includes(normUser);
      }

      // Calculate final awarded marks and penalties
      if (isCorrect === true) {
        if (!options.partialCreditForMultipleSelect || q.questionType !== 'multiple_select') {
          awardedMarks = q.marks;
        }
        correctCount++;
        topicBreakdown[topic].correct++;
      } else {
        incorrectCount++;
        topicBreakdown[topic].incorrect++;
        if (options.enableNegativeMarking && q.negativeMarks > 0) {
          awardedMarks = -Math.abs(q.negativeMarks);
        } else {
          awardedMarks = 0;
        }
      }

      totalMarksAwarded += awardedMarks;
      evaluations.push({
        questionId: q.questionId,
        isCorrect,
        isAnswered: true,
        marksAwarded: awardedMarks,
        userResponse: userVal,
        topicName: topic
      });
    }

    // Compute percentage and accuracy
    const percentageScore = maximumMarks > 0 ? Math.max(0, (totalMarksAwarded / maximumMarks) * 100) : 0;
    const attemptedCount = correctCount + incorrectCount;
    const accuracy = attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : 0;

    // Calculate topic accuracies
    for (const k of Object.keys(topicBreakdown)) {
      const tb = topicBreakdown[k];
      const att = tb.correct + tb.incorrect;
      tb.accuracy = att > 0 ? (tb.correct / att) * 100 : 0;
    }

    return {
      totalQuestions: questions.length,
      correctCount,
      incorrectCount,
      unansweredCount,
      ungradedCount,
      totalMarksAwarded: Math.round(totalMarksAwarded * 100) / 100,
      maximumMarks: Math.round(maximumMarks * 100) / 100,
      percentageScore: Math.round(percentageScore * 10) / 10,
      accuracy: Math.round(accuracy * 10) / 10,
      timeTaken: options.timeTaken || 0,
      evaluations,
      topicBreakdown
    };
  }

  private static isResponseNonEmpty(val: any): boolean {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') return val.trim().length > 0;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'number') return !isNaN(val);
    return true;
  }
}
