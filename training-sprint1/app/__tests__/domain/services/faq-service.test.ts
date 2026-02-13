import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FaqService } from '@/domain/services/faq-service';
import { createMockFaqRepo } from '../../helpers/mock-factories';

describe('FaqService', () => {
  let repo: ReturnType<typeof createMockFaqRepo>;
  let service: FaqService;

  beforeEach(() => {
    repo = createMockFaqRepo();
    service = new FaqService(repo);
  });

  describe('create', () => {
    it('creates FAQ via repository', async () => {
      vi.mocked(repo.create).mockResolvedValue();
      await service.create({
        property_id: 'prop-1',
        category: '設備',
        question: 'Q',
        answer: 'A',
      });
      expect(repo.create).toHaveBeenCalledWith({
        property_id: 'prop-1',
        category: '設備',
        question: 'Q',
        answer: 'A',
      });
    });
  });

  describe('update', () => {
    it('updates FAQ via repository', async () => {
      vi.mocked(repo.update).mockResolvedValue();
      await service.update('faq-1', { category: '設備', question: 'Q2', answer: 'A2' });
      expect(repo.update).toHaveBeenCalledWith('faq-1', {
        category: '設備',
        question: 'Q2',
        answer: 'A2',
      });
    });
  });

  describe('delete', () => {
    it('deletes FAQ via repository', async () => {
      vi.mocked(repo.delete).mockResolvedValue();
      await service.delete('faq-1');
      expect(repo.delete).toHaveBeenCalledWith('faq-1');
    });
  });
});
