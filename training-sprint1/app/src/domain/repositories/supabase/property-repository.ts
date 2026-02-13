import { SupabaseClient } from '@supabase/supabase-js';
import type { IPropertyRepository } from '../interfaces/property-repository';

export class SupabasePropertyRepository implements IPropertyRepository {
  constructor(private supabase: SupabaseClient) {}

  async findNameById(propertyId: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('properties')
      .select('name')
      .eq('id', propertyId)
      .single();
    return data?.name ?? null;
  }
}
