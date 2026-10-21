export interface AISettings {
  provider: 'none' | 'gemini' | 'openai';
  apiKey?: string;
}

export class AIService {
  /**
   * Tests connection to the configured AI API
   */
  public static async testConnection(provider: string, apiKey: string): Promise<{ success: boolean; message: string }> {
    if (!apiKey || apiKey.trim().length === 0) {
      return { success: false, message: 'API key is required' };
    }

    try {
      if (provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Ping test. Reply with "OK".' }] }]
          })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return { success: false, message: `Gemini API error: ${res.statusText} (${(errData as any)?.error?.message || ''})` };
        }
        return { success: true, message: 'Gemini API connection successful!' };
      } else if (provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` }
        });
        if (!res.ok) {
          return { success: false, message: `OpenAI API error: ${res.statusText}` };
        }
        return { success: true, message: 'OpenAI API connection successful!' };
      }
      return { success: false, message: 'Unsupported provider' };
    } catch (err: any) {
      return { success: false, message: `Network error connecting to ${provider}: ${err.message}` };
    }
  }

  /**
   * Optional AI extraction for complex documents
   */
  public static async extractWithAI(
    text: string,
    provider: string,
    apiKey: string
  ): Promise<any | null> {
    if (!apiKey || provider === 'none') return null;

    const prompt = `You are an expert educational question parser. Extract questions from this document into clean JSON:
Return ONLY valid JSON matching this structure:
{
  "documentTitle": "Document Title",
  "questions": [
    {
      "originalQuestionNumber": "1",
      "questionText": "Question wording",
      "questionType": "single_select",
      "options": [
        { "label": "A", "text": "Option text", "isCorrect": false },
        { "label": "B", "text": "Option text", "isCorrect": true }
      ],
      "correctAnswer": "B",
      "explanation": "Why B is correct",
      "sourcePage": 1,
      "difficulty": "medium",
      "verificationStatus": "verified"
    }
  ]
}

DOCUMENT TEXT:
${text.slice(0, 8000)}`;

    try {
      if (provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });
        if (res.ok) {
          const data = await res.json();
          const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawJson) {
            return JSON.parse(rawJson);
          }
        }
      }
    } catch (err) {
      console.warn('AI extraction fallback to rule-based parser:', err);
    }
    return null;
  }
}
