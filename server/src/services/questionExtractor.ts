import { ExtractedPage } from './pdfParser';

export interface ExtractedOption {
  label: string;
  text: string;
  isCorrect: boolean;
}

export interface ExtractedQuestion {
  originalQuestionNumber: string;
  questionText: string;
  questionType: 'single_select' | 'multiple_select' | 'true_false' | 'numerical' | 'fill_blank' | 'short_answer';
  sourcePage: number;
  options: ExtractedOption[];
  correctAnswer: string | null;
  numericalAnswer?: number | null;
  acceptedTextAnswers?: string[];
  explanation: string | null;
  hint: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | 'unknown';
  verificationStatus: 'needs_review' | 'verified' | 'incorrect_extraction' | 'missing_answer_key' | 'diagram_required' | 'duplicate';
  extractionConfidence: number;
  isDiagramBased: boolean;
  diagramNote: string | null;
}

export class QuestionExtractor {
  public static extractQuestions(pages: ExtractedPage[]): ExtractedQuestion[] {
    const fullText = pages.map(p => `--- PAGE ${p.pageNumber} ---\n` + p.text).join('\n\n');
    const separateAnswerKeys = this.extractSeparateAnswerKeys(fullText);

    const questions: ExtractedQuestion[] = [];

    for (const page of pages) {
      const pageQuestions = this.extractFromPage(page, separateAnswerKeys);
      questions.push(...pageQuestions);
    }

    if (questions.length === 0) {
      const fullDocQuestions = this.extractFromFullText(fullText, separateAnswerKeys);
      questions.push(...fullDocQuestions);
    }

    return questions;
  }

  private static extractSeparateAnswerKeys(text: string): Map<string, string> {
    const keyMap = new Map<string, string>();
    const keySectionRegex = /(?:ANSWER\s*KEY|ANSWERS|KEY|SOLUTIONS|ANSWER\s*SHEET)[\s\S]*$/i;
    const match = text.match(keySectionRegex);
    if (!match) return keyMap;

    const keySection = match[0];
    const itemRegex = /(?:Q(?:uestion)?\s*)?(\d{1,3})\s*(?:[.:\-\)]|\s)\s*([A-Da-d]|True|False|TRUE|FALSE|\d+(?:\.\d+)?)/g;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(keySection)) !== null) {
      const qNum = itemMatch[1];
      const ans = itemMatch[2].trim().toUpperCase();
      keyMap.set(qNum, ans);
    }

    return keyMap;
  }

  private static extractFromPage(page: ExtractedPage, separateKeys: Map<string, string>): ExtractedQuestion[] {
    const questions: ExtractedQuestion[] = [];
    const text = page.text;
    const cleanText = text.replace(/Page\s+\d+\s+of\s+\d+/gi, '').trim();

    // Matches e.g. "1.", "1)", "Q1.", "Question 1:", "[1]"
    const questionStartRegex = /(?:^|\n)(?:Q(?:uestion)?\s*(\d{1,3})[.:)]\s*|(\d{1,3})[.)\]\-]\s*|\[(\d{1,3})\]\s*)/gi;

    const matches: { index: number; qNum: string; fullMatch: string }[] = [];
    let match;
    while ((match = questionStartRegex.exec(cleanText)) !== null) {
      const qNum = match[1] || match[2] || match[3];
      matches.push({
        index: match.index,
        qNum,
        fullMatch: match[0]
      });
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const startIndex = current.index + current.fullMatch.length;
      const endIndex = (i + 1 < matches.length) ? matches[i + 1].index : cleanText.length;
      
      const rawBlock = cleanText.substring(startIndex, endIndex).trim();
      const parsed = this.parseQuestionBlock(rawBlock, current.qNum, page.pageNumber, separateKeys);
      if (parsed) {
        questions.push(parsed);
      }
    }

    return questions;
  }

  private static extractFromFullText(text: string, separateKeys: Map<string, string>): ExtractedQuestion[] {
    const questions: ExtractedQuestion[] = [];
    const questionStartRegex = /(?:^|\n)(?:Q(?:uestion)?\s*(\d{1,3})[.:)]\s*|(\d{1,3})[.)\]\-]\s*|\[(\d{1,3})\]\s*)/gi;

    const matches: { index: number; qNum: string; fullMatch: string }[] = [];
    let match;
    while ((match = questionStartRegex.exec(text)) !== null) {
      const qNum = match[1] || match[2] || match[3];
      matches.push({
        index: match.index,
        qNum,
        fullMatch: match[0]
      });
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const startIndex = current.index + current.fullMatch.length;
      const endIndex = (i + 1 < matches.length) ? matches[i + 1].index : text.length;
      
      const rawBlock = text.substring(startIndex, endIndex).trim();
      const parsed = this.parseQuestionBlock(rawBlock, current.qNum, 1, separateKeys);
      if (parsed) {
        questions.push(parsed);
      }
    }

    return questions;
  }

  private static parseQuestionBlock(
    block: string,
    qNum: string,
    pageNumber: number,
    separateKeys: Map<string, string>
  ): ExtractedQuestion | null {
    if (!block || block.length < 5) return null;

    // Check for diagram/image mentions
    const diagramMentions = /(?:refer\s+to\s+(?:the\s+)?(?:diagram|figure|image|circuit|table)|shown\s+in\s+(?:the\s+)?(?:figure|diagram|graph|image)|figure\s*\d+|diagram\s+below)/i;
    const isDiagramBased = diagramMentions.test(block);

    let cleanBlock = block;

    // 1. Extract inline explanation first
    let explanation: string | null = null;
    const explanationRegex = /(?:\n|^)(?:Explanation|Solution|Sol|Notes?):\s*([\s\S]*?)(?=(?:\n\s*Q\d|\n\s*Ans:|$))/i;
    const expMatch = cleanBlock.match(explanationRegex);
    if (expMatch) {
      explanation = expMatch[1].trim();
      cleanBlock = cleanBlock.replace(expMatch[0], '').trim();
    }

    // 2. Extract inline answer second
    let inlineAnswer: string | null = null;
    const inlineAnsRegex = /(?:\n|^)(?:Ans(?:wer)?|Correct\s*Option|Key):\s*\(?([A-Da-d]|True|False|TRUE|FALSE|\d+(?:\.\d+)?)\)?/i;
    const inlineAnsMatch = cleanBlock.match(inlineAnsRegex);
    if (inlineAnsMatch) {
      inlineAnswer = inlineAnsMatch[1].trim().toUpperCase();
      cleanBlock = cleanBlock.replace(inlineAnsMatch[0], '').trim();
    }

    // 3. Extract options
    const options: ExtractedOption[] = [];
    
    // Pattern 1: (A), (B), (C), (D) or (a), (b), (c), (d)
    const parenOptionRegex = /(?:\n|\s|^)\(([A-Da-d1-4])\)\s*([\s\S]*?)(?=(?:\s*\([A-Da-d1-4]\)|$))/g;
    // Pattern 2: A. or A) or a. or a)
    const dotOptionRegex = /(?:\n|\s|^)([A-Da-d])[.)]\s*([\s\S]*?)(?=(?:\n\s*[A-Da-d][.)]|$))/g;

    let optMatches: { label: string; text: string }[] = [];

    // Test paren pattern
    const parenFound: { label: string; text: string }[] = [];
    let pMatch;
    while ((pMatch = parenOptionRegex.exec(cleanBlock)) !== null) {
      parenFound.push({
        label: pMatch[1].toUpperCase(),
        text: pMatch[2].trim()
      });
    }

    if (parenFound.length >= 2) {
      optMatches = parenFound;
    } else {
      // Test dot pattern
      const dotFound: { label: string; text: string }[] = [];
      let dMatch;
      while ((dMatch = dotOptionRegex.exec(cleanBlock)) !== null) {
        dotFound.push({
          label: dMatch[1].toUpperCase(),
          text: dMatch[2].trim()
        });
      }
      if (dotFound.length >= 2) {
        optMatches = dotFound;
      }
    }

    // Determine question text
    let questionText = cleanBlock;
    if (optMatches.length > 0) {
      const firstOptLabel = optMatches[0].label;
      const firstOptIndex = cleanBlock.search(new RegExp(`(?:\\(${firstOptLabel}\\)|${firstOptLabel}[.)])`));
      if (firstOptIndex > 0) {
        questionText = cleanBlock.substring(0, firstOptIndex).trim();
      }
    }

    questionText = questionText.replace(/\s+/g, ' ').trim();

    // Determine correct answer
    const detectedAnswer = inlineAnswer || separateKeys.get(qNum) || null;

    // Detect question type
    let questionType: 'single_select' | 'multiple_select' | 'true_false' | 'numerical' | 'fill_blank' | 'short_answer' = 'single_select';
    
    if (optMatches.length === 2 && optMatches.some(o => o.text.toLowerCase() === 'true') && optMatches.some(o => o.text.toLowerCase() === 'false')) {
      questionType = 'true_false';
    } else if (/select\s+all|more\s+than\s+one\s+correct|multiple\s+options/i.test(questionText) || (detectedAnswer && detectedAnswer.includes(','))) {
      questionType = 'multiple_select';
    } else if (optMatches.length === 0) {
      if (/__+|\[blank\]|fill\s+in\s+the\s+blank/i.test(questionText)) {
        questionType = 'fill_blank';
      } else if (/calculate|find\s+the\s+value|numerical|magnitude|evaluate/i.test(questionText) || (detectedAnswer && !isNaN(Number(detectedAnswer)))) {
        questionType = 'numerical';
      } else {
        questionType = 'short_answer';
      }
    }

    let hasCorrectAnswer = false;
    for (const opt of optMatches) {
      let isCorrect = false;
      if (detectedAnswer) {
        if (questionType === 'multiple_select') {
          const parts = detectedAnswer.split(/[,;\s]+/).map(s => s.trim().toUpperCase());
          isCorrect = parts.includes(opt.label);
        } else {
          isCorrect = opt.label === detectedAnswer || opt.text.toLowerCase() === detectedAnswer.toLowerCase();
        }
      }
      if (isCorrect) hasCorrectAnswer = true;

      options.push({
        label: opt.label,
        text: opt.text.replace(/\s+/g, ' ').trim(),
        isCorrect
      });
    }

    let verificationStatus: 'needs_review' | 'verified' | 'incorrect_extraction' | 'missing_answer_key' | 'diagram_required' | 'duplicate' = 'needs_review';
    let confidence = 0.85;

    if (isDiagramBased) {
      verificationStatus = 'diagram_required';
      confidence = 0.75;
    } else if (!detectedAnswer && options.length > 0) {
      verificationStatus = 'missing_answer_key';
      confidence = 0.80;
    } else if (hasCorrectAnswer || (questionType === 'numerical' && detectedAnswer)) {
      verificationStatus = 'verified';
      confidence = 0.95;
    }

    let numericalAnswer: number | null = null;
    if (questionType === 'numerical' && detectedAnswer) {
      const num = parseFloat(detectedAnswer);
      if (!isNaN(num)) numericalAnswer = num;
    }

    return {
      originalQuestionNumber: qNum,
      questionText,
      questionType,
      sourcePage: pageNumber,
      options,
      correctAnswer: detectedAnswer,
      numericalAnswer,
      acceptedTextAnswers: detectedAnswer ? [detectedAnswer.trim().toLowerCase()] : [],
      explanation,
      hint: null,
      difficulty: 'medium',
      verificationStatus,
      extractionConfidence: confidence,
      isDiagramBased,
      diagramNote: isDiagramBased ? 'Question references a diagram or figure from the source PDF' : null
    };
  }
}
