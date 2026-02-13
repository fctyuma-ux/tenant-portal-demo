import type {
  IDocumentRepository,
  IDocumentChunkRepository,
  IStorageRepository,
  IAIClient,
} from '@/domain/repositories/interfaces';
import type { PdfAnalysisResult } from '@/domain/models';

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

/**
 * テキストを指定サイズのチャンクに分割する（純粋関数）
 */
export function splitTextIntoChunks(
  text: string,
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP
): string[] {
  const chunks: string[] = [];
  const cleanText = text.replace(/\s+/g, ' ').trim();

  if (cleanText.length === 0) return [];
  if (cleanText.length <= chunkSize) return [cleanText];

  let start = 0;
  while (start < cleanText.length) {
    const end = Math.min(start + chunkSize, cleanText.length);
    const chunk = cleanText.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    start += chunkSize - overlap;
  }

  return chunks;
}

export class PdfAnalysisService {
  constructor(
    private documentRepo: IDocumentRepository,
    private chunkRepo: IDocumentChunkRepository,
    private storageRepo: IStorageRepository,
    private aiClient: IAIClient
  ) {}

  async analyzePdf(documentId: string): Promise<PdfAnalysisResult> {
    // 1. ドキュメント情報を取得
    const doc = await this.documentRepo.findById(documentId);
    if (!doc) {
      return { success: false, error: 'ドキュメントが見つかりません' };
    }

    // 2. ステータスを processing に更新
    await this.documentRepo.updateStatus(documentId, { analysis_status: 'processing' });

    try {
      // 3. Storage から PDF をダウンロード
      const fileBlob = await this.storageRepo.download(doc.file_path);

      // 4. PDF テキスト抽出
      const buffer = Buffer.from(await fileBlob.arrayBuffer());
      const { text: fullText, pageCount } = await this.extractTextFromPdf(buffer);

      // 5. テキストをチャンクに分割
      const chunks = splitTextIntoChunks(fullText);

      if (chunks.length === 0) {
        throw new Error('PDFからテキストを抽出できませんでした');
      }

      // 6. Embeddings でベクトル化（バッチ処理）
      const BATCH_SIZE = 20;
      const allEmbeddings: number[][] = [];

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const embeddings = await this.aiClient.generateEmbeddings(batch);
        allEmbeddings.push(...embeddings);
      }

      // 7. 既存チャンクを削除して新しいチャンクを挿入
      await this.chunkRepo.deleteByDocumentId(documentId);

      const chunkRecords = chunks.map((content, index) => ({
        document_id: documentId,
        content,
        embedding: JSON.stringify(allEmbeddings[index]),
        page_number: Math.min(
          Math.floor((index * pageCount) / chunks.length) + 1,
          pageCount
        ),
        page_image_path: null,
      }));

      await this.chunkRepo.insertBatch(chunkRecords);

      // 8. ドキュメントの解析完了を更新
      await this.documentRepo.updateStatus(documentId, {
        analysis_status: 'completed',
        page_count: pageCount,
        updated_at: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      await this.documentRepo.updateStatus(documentId, {
        analysis_status: 'error',
        updated_at: new Date().toISOString(),
      });

      const message = error instanceof Error ? error.message : '不明なエラー';
      return { success: false, error: message };
    }
  }

  private async extractTextFromPdf(
    buffer: Buffer
  ): Promise<{ text: string; pageCount: number }> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require('pdf-parse') as {
      PDFParse: new (opts: Record<string, unknown>) => {
        getText(): Promise<{ pages: { text: string }[]; totalPages: number }>;
        destroy(): Promise<void>;
      };
    };

    const parser = new PDFParse({ data: new Uint8Array(buffer), verbosity: 0 });
    const textResult = await parser.getText();

    const fullText = textResult.pages.map((p) => p.text).join('\n');
    const pageCount = textResult.totalPages ?? textResult.pages.length;

    await parser.destroy();

    return { text: fullText, pageCount };
  }
}
