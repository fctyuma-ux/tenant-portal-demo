import type { IFaqRepository } from '@/domain/repositories/interfaces';
import type { FAQ } from '@/lib/types/database';

export class FaqService {
  constructor(private faqRepo: IFaqRepository) {}

  async getByPropertyId(propertyId: string): Promise<FAQ[]> {
    return this.faqRepo.findByPropertyId(propertyId);
  }

  async create(data: {
    property_id: string;
    category: string;
    question: string;
    answer: string;
  }): Promise<void> {
    return this.faqRepo.create(data);
  }

  async update(
    faqId: string,
    data: { category: string; question: string; answer: string }
  ): Promise<void> {
    return this.faqRepo.update(faqId, data);
  }

  async delete(faqId: string): Promise<void> {
    return this.faqRepo.delete(faqId);
  }
}
