import { describe, it, expect } from 'vitest';

describe('Test Setup', () => {
  it('Vitest is working', () => {
    expect(1 + 1).toBe(2);
  });

  it('path aliases resolve correctly', async () => {
    const types = await import('@/lib/types/database');
    expect(types).toBeDefined();
  });
});
