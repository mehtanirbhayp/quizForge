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
  /**
   * Main entry point to extract structured questions from extracted pages
   */
  public static extractQuestions(pages: ExtractedPage[]): ExtractedQuestion[] {
    // 1. Clean watermarks, repetitive course headers, and footers from each page
    const cleanedPages = pages.map(p => ({
      pageNumber: p.pageNumber,
      text: this.cleanPageNoise(p.text)
    }));

    // Build unified text preserving page indicators
    const fullText = cleanedPages.map(p => `--- PAGE ${p.pageNumber} ---\n` + p.text).join('\n\n');

    // 2. Extract separate Answer Key section from full text
    const { keyMap: separateAnswerKeys, keySectionStartIndex } = this.extractSeparateAnswerKeys(fullText);

    // 3. Strip answer key section from text so it does not produce ghost questions
    let textForQuestions = fullText;
    if (keySectionStartIndex > 0) {
      textForQuestions = fullText.substring(0, keySectionStartIndex);
    }

    const questions: ExtractedQuestion[] = [];

    // Extract questions from combined text to safely handle questions spanning across page boundaries
    const extracted = this.extractFromUnifiedText(textForQuestions, separateAnswerKeys);
    questions.push(...extracted);

    return questions;
  }

  /**
   * Clean out watermarks, page numbers, repetitive headers from NPTEL / universities
   */
  private static cleanPageNoise(text: string): string {
    let clean = text;
    // Page indicators like "1 | P a g e" or "Page 1 of 4"
    clean = clean.replace(/\d+\s*\|\s*P\s*a\s*g\s*e/gi, '');
    clean = clean.replace(/Page\s+\d+\s+of\s+\d+/gi, '');
    clean = clean.replace(/\*{4,}[\s\S]*?\*{4,}/gi, ''); // "****** End of the Page ******"
    // Repetitive NPTEL / Course certification headers
    clean = clean.replace(/NPT\s*E\s*L\s*Online\s*Certification\s*Course[\s\S]*?Instructor:\s*Prof\.\s*[A-Za-z\s.]+/gi, '');
    clean = clean.replace(/Indian\s*Institute\s*of\s*Technology\s*[A-Za-z\s.]+/gi, '');
    clean = clean.replace(/Course\s*Name\s*:[\s\S]*?Instructor\s*:[\s\S]*?\n/gi, '');
    return clean;
  }

  /**
   * Search for separate answer key section with flexible kerning and headers
   */
  private static extractSeparateAnswerKeys(text: string): { keyMap: Map<string, string>; keySectionStartIndex: number } {
    const keyMap = new Map<string, string>();
    
    // Regex matching:
    // "Answers:", "Answers :", "A nswers:", "A n s w e r s :", "ANSWER KEY", "Correct Answer:", "KEY:", "SOLUTIONS:"
    const keySectionRegex = /(?:(?:A\s*n\s*s\s*w\s*e\s*r\s*s?|C\s*o\s*r\s*r\s*e\s*c\s*t\s*A\s*n\s*s\s*w\s*e\s*r\s*s?|A\s*N\s*S\s*W\s*E\s*R\s*S?)\s*(?:KEY|SHEET)?|SOLUTIONS?|KEY)\s*[:\n]/i;
    const match = text.match(keySectionRegex);
    if (!match || match.index === undefined) {
      return { keyMap, keySectionStartIndex: -1 };
    }

    const keySectionStartIndex = match.index;
    const keySection = text.substring(keySectionStartIndex);

    // Matches e.g. "1. b )", "1. B", "1: A", "Q1: C", "1-A"
    const itemRegex = /(?:Q(?:uestion)?\s*)?(\d{1,3})\s*(?:[.:\-\)]|\s)\s*([A-Da-d]|True|False|TRUE|FALSE|\d+(?:\.\d+)?)/g;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(keySection)) !== null) {
      const qNum = itemMatch[1];
      const ans = itemMatch[2].trim().toUpperCase();
      keyMap.set(qNum, ans);
    }

    return { keyMap, keySectionStartIndex };
  }

  /**
   * Parse questions from unified document text
   */
  private static extractFromUnifiedText(text: string, separateKeys: Map<string, string>): ExtractedQuestion[] {
    const questions: ExtractedQuestion[] = [];

    // Matches e.g. "1.", "1)", "Q1.", "Question 1:", "Q.1", "[1]"
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

      // Determine source page by scanning backwards for "--- PAGE X ---"
      const prefixText = text.substring(0, current.index);
      const pageMatches = prefixText.match(/--- PAGE (\d+) ---/g);
      let pageNumber = 1;
      if (pageMatches && pageMatches.length > 0) {
        const lastPageTag = pageMatches[pageMatches.length - 1];
        const pNum = lastPageTag.match(/\d+/);
        if (pNum) pageNumber = parseInt(pNum[0]);
      }

      const rawBlock = text.substring(startIndex, endIndex).trim();
      const parsed = this.parseQuestionBlock(rawBlock, current.qNum, pageNumber, separateKeys);
      if (parsed) {
        questions.push(parsed);
      }
    }

    return questions;
  }

  /**
   * Parse question block into question text, options, answer key, and explanation
   */
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

    // Strip any residual page markers
    let cleanBlock = block.replace(/--- PAGE \d+ ---/g, '').trim();

    // 1. Extract inline explanation
    let explanation: string | null = null;
    const explanationRegex = /(?:\n|^)(?:Explanation|Solution|Sol|Notes?):\s*([\s\S]*?)(?=(?:\n\s*Q\d|\n\s*Ans:|$))/i;
    const expMatch = cleanBlock.match(explanationRegex);
    if (expMatch) {
      explanation = expMatch[1].trim();
      cleanBlock = cleanBlock.replace(expMatch[0], '').trim();
    }

    // 2. Extract inline answer
    let inlineAnswer: string | null = null;
    const inlineAnsRegex = /(?:\n|^)(?:Ans(?:wer)?|Correct\s*Option|Key):\s*\(?([A-Da-d]|True|False|TRUE|FALSE|\d+(?:\.\d+)?)\)?/i;
    const inlineAnsMatch = cleanBlock.match(inlineAnsRegex);
    if (inlineAnsMatch) {
      inlineAnswer = inlineAnsMatch[1].trim().toUpperCase();
      cleanBlock = cleanBlock.replace(inlineAnsMatch[0], '').trim();
    }

    // 3. Extract options
    let optMatches: { label: string; text: string }[] = [];

    // Pattern 1: (A), (B), (C), (D) or (a), (b), (c), (d)
    const parenOptionRegex = /(?:\n|\s|^)\(([A-Da-d1-4])\)\s*([\s\S]*?)(?=(?:\s*\([A-Da-d1-4]\)|$))/g;
    // Pattern 2: A. or A) or a. or a) or a )
    const dotOptionRegex = /(?:\n|\s|^)([A-Da-d])[.)]\s*([\s\S]*?)(?=(?:\n\s*[A-Da-d][.)]|$))/g;

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

    // Pattern 3: Bare True / False without letter prefixes
    let isBareTrueFalse = false;
    if (optMatches.length === 0) {
      const tfMatch = cleanBlock.match(/(?:^|\n)\s*(True)\s*\n\s*(False)\s*$/i);
      if (tfMatch) {
        optMatches = [
          { label: 'A', text: 'True' },
          { label: 'B', text: 'False' }
        ];
        isBareTrueFalse = true;
      }
    }

    // Determine question text
    let questionText = cleanBlock;
    if (isBareTrueFalse) {
      const tfIndex = cleanBlock.search(/(?:^|\n)\s*True\s*\n\s*False/i);
      if (tfIndex > 0) {
        questionText = cleanBlock.substring(0, tfIndex).trim();
      }
    } else if (optMatches.length > 0) {
      const firstOptLabel = optMatches[0].label;
      const firstOptIndex = cleanBlock.search(new RegExp(`(?:\\(${firstOptLabel}\\)|${firstOptLabel}[.)])`, 'i'));
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

    const options: ExtractedOption[] = [];
    let hasCorrectAnswer = false;

    for (const opt of optMatches) {
      let isCorrect = false;
      if (detectedAnswer) {
        if (questionType === 'multiple_select') {
          const parts = detectedAnswer.split(/[,;\s]+/).map(s => s.trim().toUpperCase());
          isCorrect = parts.includes(opt.label);
        } else {
          // Normalize True/False vs A/B
          if (questionType === 'true_false') {
            if (detectedAnswer === 'TRUE' && (opt.label === 'A' || opt.text.toUpperCase() === 'TRUE')) isCorrect = true;
            else if (detectedAnswer === 'FALSE' && (opt.label === 'B' || opt.text.toUpperCase() === 'FALSE')) isCorrect = true;
            else if (detectedAnswer === opt.label) isCorrect = true;
          } else {
            isCorrect = opt.label === detectedAnswer || opt.text.toLowerCase() === detectedAnswer.toLowerCase();
          }
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

    if (isDiagramBased && options.length === 0) {
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
