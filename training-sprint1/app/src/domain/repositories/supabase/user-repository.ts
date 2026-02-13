import { SupabaseClient } from '@supabase/supabase-js';
import type { Role } from '@/lib/types/database';
import type { IUserRepository } from '../interfaces/user-repository';

export class SupabaseUserRepository implements IUserRepository {
  constructor(private supabase: SupabaseClient) {}

  async findRoleById(userId: string): Promise<Role | null> {
    const { data } = await this.supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    return (data?.role as Role) ?? null;
  }

  async findPropertyIdById(userId: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('users')
      .select('property_id')
      .eq('id', userId)
      .single();
    return data?.property_id ?? null;
  }

  async findNameById(userId: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();
    return data?.name ?? null;
  }

  async findByPropertyId(propertyId: string): Promise<{ id: string }[]> {
    const { data } = await this.supabase
      .from('users')
      .select('id')
      .eq('property_id', propertyId);
    return data ?? [];
  }
}
