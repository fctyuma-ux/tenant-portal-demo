import type { Role } from '@/lib/types/database';

export interface IUserRepository {
  findRoleById(userId: string): Promise<Role | null>;
  findPropertyIdById(userId: string): Promise<string | null>;
  findNameById(userId: string): Promise<string | null>;
  findByPropertyId(propertyId: string): Promise<{ id: string }[]>;
}
