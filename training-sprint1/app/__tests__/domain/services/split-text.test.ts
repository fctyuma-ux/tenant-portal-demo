import { describe, it, expect } from 'vitest';
import { splitTextIntoChunks } from '@/domain/services/pdf-analysis';

describe('splitTextIntoChunks', () => {
  it('returns empty array for empty text', () => {
    expect(splitTextIntoChunks('')).toEqual([]);
  });

  it('returns empty array for whitespace-only text', () => {
    expect(splitTextIntoChunks('   \n\t  ')).toEqual([]);
  });

  it('returns single chunk for short text', () => {
    const text = 'short text';
    const chunks = splitTextIntoChunks(text, 500);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe('short text');
  });

  it('splits text into chunks with overlap', () => {
    const text = 'a'.repeat(1000);
    const chunks = splitTextIntoChunks(text, 500, 50);
    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk should be at most 500 chars
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(500);
    }
  });

  it('normalizes whitespace', () => {
    const text = 'hello   world\n\nfoo   bar';
    const chunks = splitTextIntoChunks(text, 500);
    expect(chunks[0]).toBe('hello world foo bar');
  });

  it('handles exact chunk size', () => {
    const text = 'a'.repeat(500);
    const chunks = splitTextIntoChunks(text, 500);
    expect(chunks).toHaveLength(1);
  });

  it('handles text just over chunk size', () => {
    const text = 'a'.repeat(501);
    const chunks = splitTextIntoChunks(text, 500, 50);
    expect(chunks.length).toBe(2);
  });

  it('preserves all content across chunks', () => {
    const text = 'abcdefghijklmnopqrstuvwxyz';
    const chunks = splitTextIntoChunks(text, 10, 2);
    // The original text should be covered by the chunks
    expect(chunks[0]).toBe('abcdefghij');
    expect(chunks.length).toBeGreaterThan(1);
  });
});
