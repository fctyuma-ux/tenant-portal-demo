import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseUserRepository } from '@/domain/repositories/supabase/user-repository';

function createMockSupabase() {
  const mockSingle = vi.fn();
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

  return {
    client: { from: mockFrom } as never,
    mockFrom,
    mockSelect,
    mockEq,
    mockSingle,
  };
}

describe('SupabaseUserRepository', () => {
  let mock: ReturnType<typeof createMockSupabase>;
  let repo: SupabaseUserRepository;

  beforeEach(() => {
    mock = createMockSupabase();
    repo = new SupabaseUserRepository(mock.client);
  });

  describe('findRoleById', () => {
    it('returns role when user exists', async () => {
      mock.mockSingle.mockResolvedValue({ data: { role: 'admin' }, error: null });
      const role = await repo.findRoleById('user-1');
      expect(role).toBe('admin');
      expect(mock.mockFrom).toHaveBeenCalledWith('users');
    });

    it('returns null when user not found', async () => {
      mock.mockSingle.mockResolvedValue({ data: null, error: null });
      const role = await repo.findRoleById('nonexistent');
      expect(role).toBeNull();
    });
  });

  describe('findPropertyIdById', () => {
    it('returns property_id when user exists', async () => {
      mock.mockSingle.mockResolvedValue({ data: { property_id: 'prop-1' }, error: null });
      const propertyId = await repo.findPropertyIdById('user-1');
      expect(propertyId).toBe('prop-1');
    });

    it('returns null when user not found', async () => {
      mock.mockSingle.mockResolvedValue({ data: null, error: null });
      const propertyId = await repo.findPropertyIdById('nonexistent');
      expect(propertyId).toBeNull();
    });
  });

  describe('findByPropertyId', () => {
    it('returns users for property', async () => {
      const mockEq = vi.fn().mockResolvedValue({
        data: [{ id: 'u1' }, { id: 'u2' }],
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      const client = { from: mockFrom } as never;
      const repo = new SupabaseUserRepository(client);

      const users = await repo.findByPropertyId('prop-1');
      expect(users).toHaveLength(2);
      expect(users[0].id).toBe('u1');
    });

    it('returns empty array when no users', async () => {
      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      const client = { from: mockFrom } as never;
      const repo = new SupabaseUserRepository(client);

      const users = await repo.findByPropertyId('prop-empty');
      expect(users).toEqual([]);
    });
  });
});
