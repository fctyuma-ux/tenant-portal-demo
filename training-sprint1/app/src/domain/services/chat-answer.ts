import type {
  IDocumentChunkRepository,
  IDocumentRepository,
  IFaqRepository,
  IAIClient,
} from '@/domain/repositories/interfaces';
import type { Source, ChatAnswerResult } from '@/domain/models';

export class ChatAnswerService {
  constructor(
    private chunkRepo: IDocumentChunkRepository,
    private documentRepo: IDocumentRepository,
    private faqRepo: IFaqRepository,
    private aiClient: IAIClient
  ) {}

  async generateAnswer(
    question: string,
    propertyId: string,
    options: { includeUnpublished?: boolean } = {}
  ): Promise<ChatAnswerResult> {
    // 1. 質問をベクトル化
    const queryEmbedding = await this.aiClient.generateEmbedding(question);

    // 2. ベクトル類似度検索
    const chunks = await this.chunkRepo.searchByVector(queryEmbedding, propertyId, options);

    // 3. FAQ 検索
    const faqs = await this.faqRepo.searchByKeyword(question, propertyId);

    // 4. 引用元情報を取得
    const documentIds = [...new Set(chunks.map((c) => c.document_id))];
    const documents = await this.documentRepo.findFileNamesByIds(documentIds);
    const docMap = new Map(documents.map((d) => [d.id, d.file_name]));

    // 5. プロンプト構築
    const chunkContext = chunks
      .map(
        (c, i) =>
          `[参考${i + 1}] (${docMap.get(c.document_id) ?? '不明'} p.${c.page_number})\n${c.content}`
      )
      .join('\n\n');

    const faqContext = faqs
      .map((f) => `[FAQ: ${f.category}] Q: ${f.question}\nA: ${f.answer}`)
      .join('\n\n');

    const systemPrompt = `あなたはビルの入居者向けAIアシスタントです。
以下のマニュアル情報とFAQを参考に、入居者の質問に丁寧に回答してください。

回答のルール：
- 参考情報に基づいて正確に回答する
- 参考情報にない内容は「この情報はマニュアルに記載されていないため、管理者にお問い合わせください」と案内する
- 簡潔で分かりやすい日本語で回答する

${chunkContext ? `【マニュアル参考情報】\n${chunkContext}` : ''}
${faqContext ? `\n【FAQ】\n${faqContext}` : ''}`;

    // 6. AI 回答生成
    const answerContent = await this.aiClient.chatCompletion(systemPrompt, question);

    const finalContent =
      answerContent || '申し訳ありません。回答を生成できませんでした。';

    // 7. 引用元を構築
    const sources: Source[] = chunks.slice(0, 3).map((c) => ({
      document_name: docMap.get(c.document_id) ?? '不明',
      page_number: c.page_number,
      page_image_url: c.page_image_path ?? null,
    }));

    return { content: finalContent, sources };
  }
}
