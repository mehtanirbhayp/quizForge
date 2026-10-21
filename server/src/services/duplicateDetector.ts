export interface DuplicateMatch {
  questionId1: string;
  questionText1: string;
  questionId2: string;
  questionText2: string;
  similarityScore: number; // 0.0 to 1.0
  isSuspectedDuplicate: boolean;
}

export class DuplicateDetector {
  /**
   * Normalizes question text for similarity comparison
   */
  public static normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Computes Jaccard word-level similarity between two texts
   */
  public static computeSimilarity(text1: string, text2: string): number {
    const norm1 = this.normalize(text1);
    const norm2 = this.normalize(text2);

    if (norm1 === norm2) return 1.0;
    if (norm1.length === 0 || norm2.length === 0) return 0.0;

    const words1 = new Set(norm1.split(' ').filter(w => w.length > 2));
    const words2 = new Set(norm2.split(' ').filter(w => w.length > 2));

    if (words1.size === 0 || words2.size === 0) return 0.0;

    let intersectionCount = 0;
    for (const w of words1) {
      if (words2.has(w)) {
        intersectionCount++;
      }
    }

    const unionCount = new Set([...words1, ...words2]).size;
    return unionCount > 0 ? intersectionCount / unionCount : 0;
  }

  /**
   * Scans a list of questions to identify pairs with similarity >= threshold
   */
  public static findDuplicates(
    questions: { id: string; question_text: string }[],
    threshold: number = 0.70
  ): DuplicateMatch[] {
    const duplicates: DuplicateMatch[] = [];

    for (let i = 0; i < questions.length; i++) {
      for (let j = i + 1; j < questions.length; j++) {
        const q1 = questions[i];
        const q2 = questions[j];

        const score = this.computeSimilarity(q1.question_text, q2.question_text);
        if (score >= threshold) {
          duplicates.push({
            questionId1: q1.id,
            questionText1: q1.question_text,
            questionId2: q2.id,
            questionText2: q2.question_text,
            similarityScore: Math.round(score * 100) / 100,
            isSuspectedDuplicate: true
          });
        }
      }
    }

    return duplicates;
  }
}
