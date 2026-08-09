import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PowerSyncLibraryRepository } from '../../src/data/powersync/PowerSyncLibraryRepository';
import { PowerSyncSyncConnector } from '../../src/data/powersync/PowerSyncSyncConnector';
import { AppSchema } from '../../src/data/powersync/AppSchema';
import { AbstractPowerSyncDatabase } from '@powersync/web';

describe('PowerSync Integration - edulibweb', () => {
  let mockDb: any;
  let repo: PowerSyncLibraryRepository;
  let connector: PowerSyncSyncConnector;

  beforeEach(() => {
    mockDb = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      getAll: vi.fn(),
      getOptional: vi.fn(),
      connected: false,
      currentStatus: {
        connected: false,
        lastSyncedAt: null,
        dataFlowStatus: { uploading: false },
      },
    } as unknown as AbstractPowerSyncDatabase;

    repo = new PowerSyncLibraryRepository(mockDb);
    connector = new PowerSyncSyncConnector(mockDb);
  });

  describe('AppSchema (AC: #1, #2)', () => {
    it('must contain required tables with correct indexing', () => {
      expect(AppSchema.tables).toBeDefined();
      const tables = AppSchema.tables.map((t) => t.name);
      expect(tables).toContain('books');
      expect(tables).toContain('editions');
      expect(tables).toContain('authors');
      expect(tables).toContain('genres');
    });
  });

  describe('PowerSyncSyncConnector - Anonymous Auth (AC: #1)', () => {
    it('must connect to PowerSync without failing on credentials', async () => {
      await connector.connect();
      expect(mockDb.connect).toHaveBeenCalled();
      
      const connectCall = mockDb.connect.mock.calls[0][0];
      expect(connectCall).toBeDefined();
      
      const creds = await connectCall.fetchCredentials();
      expect(creds.endpoint).toBe('https://powersync.edumynt.org');
      expect(creds.token).toBe('anonymous-guest-token');
    });
  });

  describe('PowerSyncLibraryRepository - Catalog Queries (AC: #2)', () => {
    it('must fetch catalog books directly from local cache', async () => {
      mockDb.getAll.mockResolvedValueOnce([
        { id: '11111111-1111-4b01-90e6-111111111111', title: 'Test Book', slug: 'test-book' },
      ]);
      const books = await repo.getCatalogBooks();
      
      expect(books).toHaveLength(1);
      expect(books[0].title).toBe('Test Book');
      expect(mockDb.getAll).toHaveBeenCalled();
      const sql = mockDb.getAll.mock.calls[0][0];
      expect(sql).toContain('SELECT b.*, group_concat(a.name, \', \') as author');
      expect(sql).toContain('ORDER BY b.title ASC');
    });

    it('must handle empty search queries defensively', async () => {
      const results = await repo.searchCatalog('   ');
      expect(results).toEqual([]);
      expect(mockDb.getAll).not.toHaveBeenCalled();
    });

    it('must search catalog books via FTS MATCH operator', async () => {
      mockDb.getAll.mockResolvedValueOnce([]);
      await repo.searchCatalog('test');
      
      expect(mockDb.getAll).toHaveBeenCalled();
      const sql = mockDb.getAll.mock.calls[0][0];
      const params = mockDb.getAll.mock.calls[0][1];
      expect(sql).toContain('fts_books MATCH ?');
      expect(params).toEqual(['test*']);
    });

    it('must fetch hierarchical book details (AC: #3, #4)', async () => {
      mockDb.getOptional.mockResolvedValueOnce({
        id: 'book1',
        title: 'Hierarchical Book',
        slug: 'hierarchical-book',
        cover: 'some-uuid-1234',
        editions_json: JSON.stringify([
          {
            id: 'edition1',
            cover: 'edition-cover-uuid',
            parts: [
              {
                id: 'part1',
                chapters: [
                  { id: 'chapter1', countsTowardCompletion: 1 }
                ]
              }
            ],
            chapters: []
          }
        ]),
        audio_editions_json: JSON.stringify([])
      });
      const book = await repo.getBookDetails('hierarchical-book');
      
      expect(book).toBeDefined();
      expect(book?.title).toBe('Hierarchical Book');
      
      // Edge Cover Display (AC: #4)
      expect(book?.coverUrl).toContain('some-uuid-1234?key=cover');
      expect(book?.editions[0].cover).toContain('edition-cover-uuid?key=cover');
      
      // Hierarchical layout (AC: #3)
      expect(book?.editions[0].parts[0].chapters[0].id).toBe('chapter1');
      expect(book?.editions[0].parts[0].chapters[0].countsTowardCompletion).toBe(true);

      expect(mockDb.getOptional).toHaveBeenCalled();
      const sql = mockDb.getOptional.mock.calls[0][0];
      expect(sql).toContain('json_group_array');
      expect(sql).toContain('edition_chapters');
    });

    it('must watch curated lists (AC: 1.5)', () => {
      mockDb.watch = vi.fn().mockImplementation(() => {
        return {
          [Symbol.asyncIterator]() {
            return {
              next: async () => ({ done: true, value: undefined })
            };
          }
        };
      });

      const unsubscribe = repo.watchCuratedLists(() => {});
      
      expect(typeof unsubscribe).toBe('function');
      expect(mockDb.watch).toHaveBeenCalled();
      
      const sql = mockDb.watch.mock.calls[0][0];
      expect(sql).toContain('book_lists');
      expect(sql).toContain('json_group_array');
      expect(sql).toContain('book_list_items');
      
      unsubscribe();
    });
  });
});
