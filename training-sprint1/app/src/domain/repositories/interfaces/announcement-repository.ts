import type { Announcement } from '@/lib/types/database';

export interface IAnnouncementRepository {
  findRecentByPropertyId(propertyId: string, limit?: number): Promise<Announcement[]>;
}
