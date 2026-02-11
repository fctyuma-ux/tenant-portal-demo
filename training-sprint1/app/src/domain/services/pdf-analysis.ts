import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

/**
 * テキストを指定サイズのチャンクに分割する
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

/**
 * OpenAI Embeddings API でテキストをベクトル化
 */
async function generateEmbeddings(openai: OpenAI, texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });

  return response.data.map((d) => d.embedding);
}

/**
 * PDFからテキストを抽出する（pdf-parse v2 API）
 */
async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  // pdf-parse v2: PDFParse クラスベース API
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFParse } = require('pdf-parse') as {
    PDFParse: new (opts: Record<string, unknown>) => {
      getText(): Promise<{ pages: { text: string }[]; totalPages: number }>;
      getInfo(): Promise<{ numPages?: number }>;
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

/**
 * PDFを解析し、チャンク分割・ベクトル化・DB保存を行うパイプライン
 */
export async function analyzePdf(
  supabase: SupabaseClient,
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  // 1. ドキュメント情報を取得
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id, file_path, property_id')
    .eq('id', documentId)
    .single();

  if (docError || !doc) {
    return { success: false, error: 'ドキュメントが見つかりません' };
  }

  // 2. ステータスを processing に更新
  await supabase.from('documents').update({ analysis_status: 'processing' }).eq('id', documentId);

  try {
    // 3. Storage から PDF をダウンロード
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(doc.file_path);

    if (downloadError || !fileData) {
      throw new Error(`PDFのダウンロードに失敗: ${downloadError?.message}`);
    }

    // 4. PDF テキスト抽出（pdf-parse v2）
    const buffer = Buffer.from(await fileData.arrayBuffer());
    const { text: fullText, pageCount } = await extractTextFromPdf(buffer);

    // 5. テキストをチャンクに分割
    const chunks = splitTextIntoChunks(fullText);

    if (chunks.length === 0) {
      throw new Error('PDFからテキストを抽出できませんでした');
    }

    // 6. OpenAI Embeddings でベクトル化（バッチ処理）
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const BATCH_SIZE = 20;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const embeddings = await generateEmbeddings(openai, batch);
      allEmbeddings.push(...embeddings);
    }

    // 7. document_chunks テーブルに一括挿入
    // 既存チャンクを削除（再解析の場合）
    await supabase.from('document_chunks').delete().eq('document_id', documentId);

    const chunkRecords = chunks.map((content, index) => ({
      document_id: documentId,
      content,
      embedding: JSON.stringify(allEmbeddings[index]),
      page_number: Math.min(Math.floor((index * pageCount) / chunks.length) + 1, pageCount),
      page_image_path: null,
    }));

    // バッチで挿入
    for (let i = 0; i < chunkRecords.length; i += 50) {
      const batch = chunkRecords.slice(i, i + 50);
      const { error: insertError } = await supabase.from('document_chunks').insert(batch);

      if (insertError) {
        throw new Error(`チャンク保存エラー: ${insertError.message}`);
      }
    }

    // 8. ドキュメントの解析完了を更新
    await supabase
      .from('documents')
      .update({
        analysis_status: 'completed',
        page_count: pageCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    return { success: true };
  } catch (error) {
    // エラー時はステータスを error に更新
    await supabase
      .from('documents')
      .update({
        analysis_status: 'error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    const message = error instanceof Error ? error.message : '不明なエラー';
    return { success: false, error: message };
  }
}
