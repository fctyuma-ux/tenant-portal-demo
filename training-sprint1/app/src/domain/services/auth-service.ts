import type { IUserRepository } from '@/domain/repositories/interfaces';
import type { Role } from '@/lib/types/database';

export class AuthService {
  constructor(private userRepo: IUserRepository) {}

  async getUserRole(userId: string): Promise<Role | null> {
    return this.userRepo.findRoleById(userId);
  }

  async getUserPropertyId(userId: string): Promise<string | null> {
    return this.userRepo.findPropertyIdById(userId);
  }

  async requireAdmin(userId: string): Promise<void> {
    const role = await this.userRepo.findRoleById(userId);
    if (role !== 'admin') {
      throw new Error('権限がありません');
    }
  }

  async getUserName(userId: string): Promise<string | null> {
    return this.userRepo.findNameById(userId);
  }

  async getUserRoleAndPropertyId(
    userId: string
  ): Promise<{ role: Role; propertyId: string } | null> {
    const [role, propertyId] = await Promise.all([
      this.userRepo.findRoleById(userId),
      this.userRepo.findPropertyIdById(userId),
    ]);
    if (!role || !propertyId) return null;
    return { role, propertyId };
  }
}
