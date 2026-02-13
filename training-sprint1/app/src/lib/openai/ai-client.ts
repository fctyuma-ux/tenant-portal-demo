import OpenAI from 'openai';
import type { IAIClient } from '@/domain/repositories/interfaces/ai-client';

export class OpenAIClient implements IAIClient {
  private client: OpenAI;

  constructor(apiKey?: string) {
    // コンストラクタで例外を投げない。キーが無い場合は空文字を渡し、
    // 実際のAPI呼び出し時にOpenAI SDKがエラーを返す（try-catchで捕捉可能）
    const key = apiKey ?? process.env.OPENAI_API_KEY ?? '';
    this.client = new OpenAI({ apiKey: key });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });
    return response.data.map((d) => d.embedding);
  }

  async chatCompletion(
    systemPrompt: string,
    userMessage: string,
    options: { maxTokens?: number; temperature?: number } = {}
  ): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: options.maxTokens ?? 1000,
      temperature: options.temperature ?? 0.3,
    });
    return completion.choices[0]?.message?.content ?? '';
  }
}
