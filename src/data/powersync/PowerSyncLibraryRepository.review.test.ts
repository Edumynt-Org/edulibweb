import { describe, expect, it } from 'vitest';
import { PowerSyncLibraryRepository } from './PowerSyncLibraryRepository';

describe('PowerSyncLibraryRepository reviews', () => {
  it('stores a half-step review locally and returns it for its book', async () => {
    const statements: Array<{ sql: string; parameters: unknown[] }> = [];
    const database = {
      execute: async (sql: string, parameters: unknown[]) => {
        statements.push({ sql, parameters });
      },
      getAll: async () => [{
        id: 'review-1',
        profile: 'reader-1',
        book: 'book-1',
        rating: 4.5,
        title: 'Excellent',
        body: '**A thoughtful read.**',
        contains_spoilers: 1,
        status: 'published',
        date_created: '2026-08-09T00:00:00.000Z',
        date_updated: '2026-08-09T00:00:00.000Z',
      }],
    };
    const repository = new PowerSyncLibraryRepository(database as never);

    await repository.createReview({
      profileId: 'reader-1',
      bookId: 'book-1',
      rating: 4.5,
      title: 'Excellent',
      body: '**A thoughtful read.**',
      containsSpoilers: true,
    });

    expect(statements).toHaveLength(1);
    expect(statements[0].sql).toContain('INSERT INTO reviews');
    expect(statements[0].parameters).toEqual(expect.arrayContaining(['reader-1', 'book-1', 4.5, 1]));
    await expect(repository.getReviewsForBook('book-1')).resolves.toMatchObject([
      { bookId: 'book-1', rating: 4.5, containsSpoilers: true },
    ]);
  });

  it('rejects ratings outside 0–5 or not in half-step increments', async () => {
    const repository = new PowerSyncLibraryRepository({} as never);
    const review = {
      profileId: 'reader-1',
      bookId: 'book-1',
      title: '',
      body: 'Review',
      containsSpoilers: false,
    };

    await expect(repository.createReview({ ...review, rating: 5.1 })).rejects.toThrow('0.5 increments');
    await expect(repository.createReview({ ...review, rating: -0.5 })).rejects.toThrow('0.5 increments');
  });
});
