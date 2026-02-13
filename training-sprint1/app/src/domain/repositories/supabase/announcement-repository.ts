import { SupabaseClient } from '@supabase/supabase-js';
import type { Announcement } from '@/lib/types/database';
import type { IAnnouncementRepository } from '../interfaces/announcement-repository';

export class SupabaseAnnouncementRepository implements IAnnouncementRepository {
  constructor(private supabase: SupabaseClient) {}

  async findRecentByPropertyId(
    propertyId: string,
    limit = 5
  ): Promise<Announcement[]> {
    const { data } = await this.supabase
      .from('announcements')
      .select('*')
      .eq('property_id', propertyId)
      .order('published_at', { ascending: false })
      .limit(limit);
    return data ?? [];
  }
}
