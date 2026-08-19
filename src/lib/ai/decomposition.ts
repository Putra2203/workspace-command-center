export interface SubtaskTemplate {
  title: string;
  priority?: string;
}

/**
 * Decomposes a high-level feature prompt into a list of structured subtasks.
 */
export async function decomposeFeatureToSubtasks(
  featurePrompt: string,
  _projectKey: string = 'PROJECT'
): Promise<SubtaskTemplate[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (apiKey) {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an expert technical project lead. Decompose the following feature request into 3 to 6 actionable subtasks for Plane Project Management.
Output ONLY a JSON array of objects, where each object has a "title" (concise, clear string) and "priority" ("high", "medium", or "low").

Feature Request: "${featurePrompt}"`,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = typeof (response as any).text === 'function' ? (response as any).text() : (response as any).text;
      if (text) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => ({
            title: typeof item === 'string' ? item : item.title || 'Subtask',
            priority: item.priority || 'medium',
          }));
        }
      }
    } catch (err) {
      console.warn('Gemini LLM Decomposition Fallback:', err);
    }
  }

  // Fallback deterministic smart decomposition engine
  const cleanPrompt = featurePrompt.replace(/^(pecah|decompose|break down|buatkan plan|plan)\s+(?:feature|sprint|task)?\s*/i, '').trim();

  return [
    { title: `Design & Specs: ${cleanPrompt}`, priority: 'high' },
    { title: `Backend/API Implementation: ${cleanPrompt}`, priority: 'high' },
    { title: `Frontend/UI Component: ${cleanPrompt}`, priority: 'medium' },
    { title: `Integration Testing & Verification: ${cleanPrompt}`, priority: 'low' },
  ];
}
