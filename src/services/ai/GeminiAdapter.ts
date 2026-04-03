import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

interface GeminiConfig {
  model: string;
  maxOutputTokens: number;
  temperature: number;
  topP: number;
}

const DEFAULT_CONFIG: GeminiConfig = {
  model: 'gemini-3.1-pro-preview',
  maxOutputTokens: 2048,
  temperature: 0.85,
  topP: 0.95,
};

const FALLBACK_MODELS = ['gemini-3.1-flash-lite-preview', 'gemini-2.5-flash-preview-tts']; // Exemple de modèles de secours

export class GeminiAdapter {
  private client: GoogleGenAI;
  private config: GeminiConfig;
  private currentModelIndex: number = 0;

  constructor(apiKey: string, config: Partial<GeminiConfig> = {}) {
    this.client = new GoogleGenAI({ apiKey });
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private getClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables.");
    }
    return new GoogleGenAI({ apiKey });
  }

  private getModel(): string {
    const models = [this.config.model, ...FALLBACK_MODELS];
    return models[this.currentModelIndex % models.length];
  }

  private rotateModel() {
    this.currentModelIndex++;
    console.warn(`Switching to model: ${this.getModel()}`);
  }

  /**
   * Génération en streaming avec retry exponentiel et fallback de modèle.
   */
  async *streamGenerate(
    systemPrompt: string,
    userMessage: string,
    history: { role: 'user' | 'model'; parts: string }[],
    retries = 3
  ): AsyncGenerator<string> {
    const contents = history.map(h => ({
      role: h.role,
      parts: [{ text: h.parts }]
    }));
    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    let attempt = 0;
    while (attempt <= retries) {
      try {
        const client = this.getClient();
        const stream = await client.models.generateContentStream({
          model: this.getModel(),
          contents: contents,
          config: {
            systemInstruction: systemPrompt,
            maxOutputTokens: this.config.maxOutputTokens,
            temperature: this.config.temperature,
            topP: this.config.topP,
          }
        });

        for await (const chunk of stream) {
          const text = (chunk as GenerateContentResponse).text;
          if (text) yield text;
        }
        return; // Succès

      } catch (err: unknown) {
        attempt++;
        if (attempt > retries) {
            this.rotateModel(); // Fallback vers un modèle plus bas
            attempt = 0; // Réinitialiser les tentatives pour le nouveau modèle
            if (this.currentModelIndex >= FALLBACK_MODELS.length + 1) throw err; // Tous les modèles ont échoué
        }
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
      }
    }
  }

  /**
   * Génération JSON structurée (pour S1 — génération de personas).
   * Retourne un objet typé ou throw si le JSON est invalide.
   */
  async generateStructured<T>(
    systemPrompt: string,
    userMessage: string,
    schema: any,
    retries = 2
  ): Promise<T> {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        const client = this.getClient();
        const model = this.getModel();
        const result = await client.models.generateContent({
          model: model,
          contents: userMessage || " ", // Ensure non-empty contents
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema: schema,
          }
        });
        const text = result.text;
        if (!text) throw new Error("Empty response from model " + model);
        return JSON.parse(text) as T;
      } catch (err) {
        attempt++;
        console.error(`[GeminiAdapter] Structured generation attempt ${attempt} failed for model ${this.getModel()}:`, err);
        
        if (attempt > retries) {
          this.rotateModel();
          attempt = 0;
          if (this.currentModelIndex >= FALLBACK_MODELS.length + 1) {
            throw new Error('Structured generation failed after all fallbacks: ' + err);
          }
        }
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
    throw new Error('Unreachable');
  }
}
