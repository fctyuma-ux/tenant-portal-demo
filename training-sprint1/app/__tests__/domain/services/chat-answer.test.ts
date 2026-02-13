import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatAnswerService } from '@/domain/services/chat-answer';
import {
  createMockDocumentChunkRepo,
  createMockDocumentRepo,
  createMockFaqRepo,
  createMockAIClient,
} from '../../helpers/mock-factories';

describe('ChatAnswerService', () => {
  let chunkRepo: ReturnType<typeof createMockDocumentChunkRepo>;
  let documentRepo: ReturnType<typeof createMockDocumentRepo>;
  let faqRepo: ReturnType<typeof createMockFaqRepo>;
  let aiClient: ReturnType<typeof createMockAIClient>;
  let service: ChatAnswerService;

  beforeEach(() => {
    chunkRepo = createMockDocumentChunkRepo();
    documentRepo = createMockDocumentRepo();
    faqRepo = createMockFaqRepo();
    aiClient = createMockAIClient();
    service = new ChatAnswerService(chunkRepo, documentRepo, faqRepo, aiClient);
  });

  it('generates answer with sources', async () => {
    vi.mocked(aiClient.generateEmbedding).mockResolvedValue([0.1, 0.2]);
    vi.mocked(chunkRepo.searchByVector).mockResolvedValue([
      { document_id: 'doc-1', content: 'chunk content', page_number: 1, page_image_path: null },
    ]);
    vi.mocked(faqRepo.searchByKeyword).mockResolvedValue([]);
    vi.mocked(documentRepo.findFileNamesByIds).mockResolvedValue([
      { id: 'doc-1', file_name: 'manual.pdf' },
    ]);
    vi.mocked(aiClient.chatCompletion).mockResolvedValue('AI回答テスト');

    const result = await service.generateAnswer('テスト質問', 'prop-1');

    expect(result.content).toBe('AI回答テスト');
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].document_name).toBe('manual.pdf');
  });

  it('returns fallback message when AI returns empty', async () => {
    vi.mocked(aiClient.generateEmbedding).mockResolvedValue([0.1]);
    vi.mocked(chunkRepo.searchByVector).mockResolvedValue([]);
    vi.mocked(faqRepo.searchByKeyword).mockResolvedValue([]);
    vi.mocked(documentRepo.findFileNamesByIds).mockResolvedValue([]);
    vi.mocked(aiClient.chatCompletion).mockResolvedValue('');

    const result = await service.generateAnswer('質問', 'prop-1');
    expect(result.content).toBe('申し訳ありません。回答を生成できませんでした。');
  });

  it('includes FAQ context in prompt', async () => {
    vi.mocked(aiClient.generateEmbedding).mockResolvedValue([0.1]);
    vi.mocked(chunkRepo.searchByVector).mockResolvedValue([]);
    vi.mocked(faqRepo.searchByKeyword).mockResolvedValue([
      { category: '設備', question: 'エアコン?', answer: 'リモコンで操作' },
    ]);
    vi.mocked(documentRepo.findFileNamesByIds).mockResolvedValue([]);
    vi.mocked(aiClient.chatCompletion).mockResolvedValue('回答');

    await service.generateAnswer('エアコン', 'prop-1');

    const systemPrompt = vi.mocked(aiClient.chatCompletion).mock.calls[0][0];
    expect(systemPrompt).toContain('FAQ');
    expect(systemPrompt).toContain('エアコン');
  });

  it('passes includeUnpublished option to chunk search', async () => {
    vi.mocked(aiClient.generateEmbedding).mockResolvedValue([0.1]);
    vi.mocked(chunkRepo.searchByVector).mockResolvedValue([]);
    vi.mocked(faqRepo.searchByKeyword).mockResolvedValue([]);
    vi.mocked(documentRepo.findFileNamesByIds).mockResolvedValue([]);
    vi.mocked(aiClient.chatCompletion).mockResolvedValue('回答');

    await service.generateAnswer('質問', 'prop-1', { includeUnpublished: true });

    expect(chunkRepo.searchByVector).toHaveBeenCalledWith(
      [0.1],
      'prop-1',
      { includeUnpublished: true }
    );
  });

  it('propagates error when AI client throws on embedding', async () => {
    vi.mocked(aiClient.generateEmbedding).mockRejectedValue(new Error('API key is invalid'));

    await expect(service.generateAnswer('質問', 'prop-1')).rejects.toThrow('API key is invalid');
  });

  it('propagates error when AI client throws on chat completion', async () => {
    vi.mocked(aiClient.generateEmbedding).mockResolvedValue([0.1]);
    vi.mocked(chunkRepo.searchByVector).mockResolvedValue([]);
    vi.mocked(faqRepo.searchByKeyword).mockResolvedValue([]);
    vi.mocked(documentRepo.findFileNamesByIds).mockResolvedValue([]);
    vi.mocked(aiClient.chatCompletion).mockRejectedValue(new Error('Rate limit exceeded'));

    await expect(service.generateAnswer('質問', 'prop-1')).rejects.toThrow('Rate limit exceeded');
  });

  it('limits sources to 3', async () => {
    vi.mocked(aiClient.generateEmbedding).mockResolvedValue([0.1]);
    vi.mocked(chunkRepo.searchByVector).mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        document_id: `d${i + 1}`,
        content: `c${i + 1}`,
        page_number: i + 1,
        page_image_path: null,
      }))
    );
    vi.mocked(faqRepo.searchByKeyword).mockResolvedValue([]);
    vi.mocked(documentRepo.findFileNamesByIds).mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({ id: `d${i + 1}`, file_name: `${i}.pdf` }))
    );
    vi.mocked(aiClient.chatCompletion).mockResolvedValue('回答');

    const result = await service.generateAnswer('質問', 'prop-1');
    expect(result.sources).toHaveLength(3);
  });
});
