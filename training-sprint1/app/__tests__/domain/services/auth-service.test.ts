import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '@/domain/services/auth-service';
import { createMockUserRepo } from '../../helpers/mock-factories';

describe('AuthService', () => {
  let userRepo: ReturnType<typeof createMockUserRepo>;
  let service: AuthService;

  beforeEach(() => {
    userRepo = createMockUserRepo();
    service = new AuthService(userRepo);
  });

  describe('getUserRole', () => {
    it('returns admin role', async () => {
      vi.mocked(userRepo.findRoleById).mockResolvedValue('admin');
      const role = await service.getUserRole('user-1');
      expect(role).toBe('admin');
    });

    it('returns null for unknown user', async () => {
      vi.mocked(userRepo.findRoleById).mockResolvedValue(null);
      const role = await service.getUserRole('unknown');
      expect(role).toBeNull();
    });
  });

  describe('requireAdmin', () => {
    it('does not throw for admin user', async () => {
      vi.mocked(userRepo.findRoleById).mockResolvedValue('admin');
      await expect(service.requireAdmin('user-1')).resolves.not.toThrow();
    });

    it('throws for tenant user', async () => {
      vi.mocked(userRepo.findRoleById).mockResolvedValue('tenant');
      await expect(service.requireAdmin('user-1')).rejects.toThrow('権限がありません');
    });

    it('throws for unknown user', async () => {
      vi.mocked(userRepo.findRoleById).mockResolvedValue(null);
      await expect(service.requireAdmin('unknown')).rejects.toThrow('権限がありません');
    });
  });

  describe('getUserRoleAndPropertyId', () => {
    it('returns both role and propertyId', async () => {
      vi.mocked(userRepo.findRoleById).mockResolvedValue('admin');
      vi.mocked(userRepo.findPropertyIdById).mockResolvedValue('prop-1');
      const result = await service.getUserRoleAndPropertyId('user-1');
      expect(result).toEqual({ role: 'admin', propertyId: 'prop-1' });
    });

    it('returns null when role is missing', async () => {
      vi.mocked(userRepo.findRoleById).mockResolvedValue(null);
      vi.mocked(userRepo.findPropertyIdById).mockResolvedValue('prop-1');
      const result = await service.getUserRoleAndPropertyId('user-1');
      expect(result).toBeNull();
    });
  });
});
