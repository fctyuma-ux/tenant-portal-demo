import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export interface Source {
  document_name: string;
  page_number: number;
  page_image_url: string | null;
}

export interface ChatAnswerResult {
  content: string;
  sources: Source[];
}

/**
 * 質問テキストをベクトル化する
 */
async function embedQuery(openai: OpenAI, text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * ベクトル類似度検索で関連チャンクを取得
 */
async function searchChunks(
  supabase: SupabaseClient,
  queryEmbedding: number[],
  propertyId: string,
  options: { includeUnpublished?: boolean } = {}
) {
  const funcName = options.includeUnpublished
    ? 'match_document_chunks_preview'
    : 'match_document_chunks';

  const { data, error } = await supabase.rpc(funcName, {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: 0.5,
    match_count: 5,
    target_property_id: propertyId,
  });

  if (error) {
    console.error('Vector search error:', error.message);
    return [];
  }

  return data ?? [];
}

/**
 * FAQ テーブルからキーワード検索
 */
async function searchFaqs(supabase: SupabaseClient, question: string, propertyId: string) {
  const { data } = await supabase
    .from('faqs')
    .select('category, question, answer')
    .eq('property_id', propertyId)
    .or(`question.ilike.%${question}%,answer.ilike.%${question}%`)
    .limit(3);

  return data ?? [];
}

/**
 * AI 回答を生成する
 */
export async function generateAnswer(
  supabase: SupabaseClient,
  question: string,
  propertyId: string,
  options: { includeUnpublished?: boolean } = {}
): Promise<ChatAnswerResult> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // 1. 質問をベクトル化
  const queryEmbedding = await embedQuery(openai, question);

  // 2. ベクトル類似度検索
  const chunks = await searchChunks(supabase, queryEmbedding, propertyId, options);

  // 3. FAQ 検索
  const faqs = await searchFaqs(supabase, question, propertyId);

  // 4. 引用元情報を取得
  const documentIds = [...new Set(chunks.map((c: { document_id: string }) => c.document_id))];
  const { data: documents } = await supabase
    .from('documents')
    .select('id, file_name')
    .in('id', documentIds.length > 0 ? documentIds : ['00000000-0000-0000-0000-000000000000']);

  const docMap = new Map(
    (documents ?? []).map((d: { id: string; file_name: string }) => [d.id, d.file_name])
  );

  // 5. プロンプト構築
  const chunkContext = chunks
    .map(
      (c: { content: string; page_number: number; document_id: string }, i: number) =>
        `[参考${i + 1}] (${docMap.get(c.document_id) ?? '不明'} p.${c.page_number})\n${c.content}`
    )
    .join('\n\n');

  const faqContext = faqs
    .map(
      (f: { category: string; question: string; answer: string }) =>
        `[FAQ: ${f.category}] Q: ${f.question}\nA: ${f.answer}`
    )
    .join('\n\n');

  const systemPrompt = `あなたはビルの入居者向けAIアシスタントです。
以下のマニュアル情報とFAQを参考に、入居者の質問に丁寧に回答してください。

回答のルール：
- 参考情報に基づいて正確に回答する
- 参考情報にない内容は「この情報はマニュアルに記載されていないため、管理者にお問い合わせください」と案内する
- 簡潔で分かりやすい日本語で回答する

${chunkContext ? `【マニュアル参考情報】\n${chunkContext}` : ''}
${faqContext ? `\n【FAQ】\n${faqContext}` : ''}`;

  // 6. OpenAI Chat API 呼び出し
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
    max_tokens: 1000,
    temperature: 0.3,
  });

  const answerContent =
    completion.choices[0]?.message?.content ?? '申し訳ありません。回答を生成できませんでした。';

  // 7. 引用元を構築
  const sources: Source[] = chunks
    .slice(0, 3)
    .map((c: { document_id: string; page_number: number; page_image_path: string | null }) => ({
      document_name: docMap.get(c.document_id) ?? '不明',
      page_number: c.page_number,
      page_image_url: c.page_image_path ?? null,
    }));

  return { content: answerContent, sources };
}
