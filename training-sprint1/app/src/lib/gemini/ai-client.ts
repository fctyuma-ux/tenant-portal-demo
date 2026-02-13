import { GoogleGenAI } from '@google/genai';
import type { IAIClient } from '@/domain/repositories/interfaces/ai-client';

export class GeminiClient implements IAIClient {
  private ai: GoogleGenAI;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.GEMINI_API_KEY ?? '';
    this.ai = new GoogleGenAI({ apiKey: key });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text,
      config: { outputDimensionality: 1536 },
    });
    return response.embeddings![0].values!;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      const emb = await this.generateEmbedding(text);
      results.push(emb);
    }
    return results;
  }

  async chatCompletion(
    systemPrompt: string,
    userMessage: string,
    options: { maxTokens?: number; temperature?: number } = {}
  ): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: options.maxTokens ?? 1000,
        temperature: options.temperature ?? 0.3,
      },
    });
    return response.text ?? '';
  }
}
