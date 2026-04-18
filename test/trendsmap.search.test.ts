import { describe, it, expect, vi } from 'vitest';

// Mock the DB pool to avoid real database dependency in unit tests.
const mockRow = {
  id: 99999,
  text: 'PruebaUnit mock #unittest',
  hashtags: ['unittest'],
  latitude: 4.6,
  longitude: -74.07,
  departamento: 'TestDept',
  municipio: 'TestCity',
  expires_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

vi.mock('@/lib/db', () => ({
  pool: {
    query: vi.fn(async (sql: string, params?: any[]) => {
      // Simulate insert
      if (/INSERT INTO trendsmap_entries/i.test(sql)) {
        return { rows: [{ id: mockRow.id }] };
      }
      // Simulate select
      if (/SELECT \*/i.test(sql)) {
        return { rows: [mockRow] };
      }
      return { rows: [] };
    }),
  },
}));

// Import after mocking
import { searchEntries } from '../src/lib/trendsmap.search';

describe('trendsmap.search', () => {
  it('returns mocked rows for keyword and hashtag searches', async () => {
    const kResults = await searchEntries({ q: 'mock', days: 30, limit: 10 });
    expect(Array.isArray(kResults)).toBe(true);
    expect(kResults.length).toBeGreaterThanOrEqual(1);
    expect(kResults[0].id).toBe(mockRow.id);

    const hResults = await searchEntries({ hashtags: ['unittest'], days: 30, limit: 10 });
    expect(Array.isArray(hResults)).toBe(true);
    expect(hResults.length).toBeGreaterThanOrEqual(1);
    expect(hResults[0].hashtags).toEqual(expect.arrayContaining(['unittest']));
  });
});
