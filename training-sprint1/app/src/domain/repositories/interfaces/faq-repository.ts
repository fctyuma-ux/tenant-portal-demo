import type { FAQ } from '@/lib/types/database';

export interface IFaqRepository {
  findByPropertyId(propertyId: string): Promise<FAQ[]>;
  searchByKeyword(
    question: string,
    propertyId: string,
    limit?: number
  ): Promise<{ category: string; question: string; answer: string }[]>;
  create(data: {
    property_id: string;
    category: string;
    question: string;
    answer: string;
  }): Promise<void>;
  update(
    faqId: string,
    data: { category: string; question: string; answer: string }
  ): Promise<void>;
  delete(faqId: string): Promise<void>;
}
