// @ts-nocheck
import { ILibraryRepository } from '../../domain/repositories/ILibraryRepository';
import { Book } from '../../domain/models/Book';
import { BookDetails } from '../../domain/models/BookDetails';
import { BookList } from '../../domain/models/BookList';
import { AbstractPowerSyncDatabase } from '@powersync/web';

export class PowerSyncLibraryRepository implements ILibraryRepository {
  private db: AbstractPowerSyncDatabase;

  constructor(db: AbstractPowerSyncDatabase) {
    this.db = db;
  }

  private get baseQuery(): string {
    return `
      SELECT b.*, group_concat(a.name, ', ') as author
      FROM books b
      LEFT JOIN book_authors ba ON b.id = ba.book
      LEFT JOIN authors a ON ba.author = a.id
      GROUP BY b.id
    `;
  }

  async getCatalogBooks(): Promise<Book[]> {
    try {
      const records = await this.db.getAll(`${this.baseQuery} ORDER BY b.title ASC`);
      return records.map(this.mapRecordToBook);
    } catch (e: any) {
      throw new Error(`Failed to fetch catalog books: ${e.message}`);
    }
  }

  async getBookById(id: string): Promise<Book | null> {
    try {
      const record = await this.db.getOptional(`${this.baseQuery} HAVING b.id = ?`, [id]);
      return record ? this.mapRecordToBook(record) : null;
    } catch (e: any) {
      throw new Error(`Failed to fetch book by id: ${e.message}`);
    }
  }

  async getBookDetails(slug: string): Promise<BookDetails | null> {
    try {
      const record = await this.db.getOptional(`
        SELECT 
          b.*,
          group_concat(a.name, ', ') as author,
          (
            SELECT json_group_array(
              json_object(
                'id', e.id,
                'format', e.format,
                'title', e.title,
                'slug', e.slug,
                'isbn', e.isbn,
                'pages', e.pages,
                'language', e.language,
                'cover', e.cover,
                'chapters', (
                  SELECT json_group_array(
                    json_object(
                      'id', c.id,
                      'title', c.title,
                      'slug', c.slug,
                      'chapterType', c.chapter_type,
                      'countsTowardCompletion', c.counts_toward_completion,
                      'sortOrder', c.sort_order
                    )
                  )
                  FROM (
                    SELECT c.*, ec.sort_order 
                    FROM editions_chapters ec
                    JOIN chapters c ON ec.chapters_id = c.id
                    WHERE ec.editions_id = e.id
                    ORDER BY ec.sort_order
                  ) c
                ),
                'parts', (
                  SELECT json_group_array(
                    json_object(
                      'id', p.id,
                      'title', p.title,
                      'description', p.description,
                      'sortOrder', p.sort_order,
                      'chapters', (
                        SELECT json_group_array(
                          json_object(
                            'id', c.id,
                            'title', c.title,
                            'slug', c.slug,
                            'chapterType', c.chapter_type,
                            'countsTowardCompletion', c.counts_toward_completion,
                            'sortOrder', c.sort_order
                          )
                        )
                        FROM (
                          SELECT c.*, pc.sort_order 
                          FROM parts_chapters pc
                          JOIN chapters c ON pc.chapters_id = c.id
                          WHERE pc.parts_id = p.id
                          ORDER BY pc.sort_order
                        ) c
                      )
                    )
                  )
                  FROM (
                    SELECT p.* FROM parts p
                    WHERE p.edition = e.id
                    ORDER BY p.sort_order
                  ) p
                )
              )
            )
            FROM editions e
            WHERE e.book = b.id
          ) as editions_json,
          (
            SELECT json_group_array(
              json_object(
                'id', ae.id,
                'title', ae.title,
                'slug', ae.slug,
                'language', ae.language,
                'cover', ae.cover,
                'narratorName', ae.narrator_name,
                'isComplete', ae.is_complete,
                'linkedTextEdition', ae.linked_text_edition,
                'rightsStatus', ae.rights_status,
                'audioChapters', (
                  SELECT json_group_array(
                    json_object(
                      'id', ac.id,
                      'title', ac.title,
                      'slug', ac.slug,
                      'audioFile', ac.audio_file,
                      'durationSeconds', ac.duration_seconds,
                      'linkedTextChapter', ac.linked_text_chapter,
                      'rightsStatus', ac.rights_status,
                      'sortOrder', ac.sort_order
                    )
                  )
                  FROM (
                    SELECT ac.*, ae_ac.sort_order 
                    FROM audio_editions_audio_chapters ae_ac
                    JOIN audio_chapters ac ON ae_ac.audio_chapters_id = ac.id
                    WHERE ae_ac.audio_editions_id = ae.id
                    ORDER BY ae_ac.sort_order
                  ) ac
                ),
                'parts', (
                  SELECT json_group_array(
                    json_object(
                      'id', ap.id,
                      'title', ap.title,
                      'description', ap.description,
                      'sortOrder', ap.sort_order,
                      'audioChapters', (
                        SELECT json_group_array(
                          json_object(
                            'id', ac.id,
                            'title', ac.title,
                            'slug', ac.slug,
                            'audioFile', ac.audio_file,
                            'durationSeconds', ac.duration_seconds,
                            'linkedTextChapter', ac.linked_text_chapter,
                            'rightsStatus', ac.rights_status,
                            'sortOrder', ac.sort_order
                          )
                        )
                        FROM (
                          SELECT ac.*, ap_ac.sort_order 
                          FROM audio_parts_audio_chapters ap_ac
                          JOIN audio_chapters ac ON ap_ac.audio_chapters_id = ac.id
                          WHERE ap_ac.audio_parts_id = ap.id
                          ORDER BY ap_ac.sort_order
                        ) ac
                      )
                    )
                  )
                  FROM (
                    SELECT ap.* FROM audio_parts ap
                    WHERE ap.audio_edition = ae.id
                    ORDER BY ap.sort_order
                  ) ap
                )
              )
            )
            FROM audio_editions ae
            WHERE ae.book = b.id
          ) as audio_editions_json
        FROM books b
        LEFT JOIN book_authors ba ON b.id = ba.book
        LEFT JOIN authors a ON ba.author = a.id
        WHERE b.slug = ?
        GROUP BY b.id
      `, [slug]);

      if (!record) return null;

      const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'https://cms.edumynt.org';
      const getCoverUrl = (coverId: string | null) => 
        coverId ? `${directusUrl}/assets/${coverId}` : '';

      const parseChapters = (chapters: any[]) => chapters.map((c: any) => ({
        ...c,
        countsTowardCompletion: c.countsTowardCompletion === 1
      }));

      const parseParts = (parts: any[]) => parts.map((p: any) => ({
        ...p,
        chapters: parseChapters(p.chapters || [])
      }));

      const editions = JSON.parse(record.editions_json || '[]').map((e: any) => ({
        ...e,
        cover: getCoverUrl(e.cover),
        chapters: parseChapters(e.chapters || []),
        parts: parseParts(e.parts || [])
      }));

      const audioEditions = JSON.parse(record.audio_editions_json || '[]').map((ae: any) => ({
        ...ae,
        cover: getCoverUrl(ae.cover),
        isComplete: ae.isComplete === 1
      }));

      return {
        id: record.id,
        title: record.title,
        slug: record.slug,
        author: record.author || '',
        description: record.description || '',
        coverUrl: getCoverUrl(record.cover),
        originalTitle: record.original_title,
        originalLanguage: record.original_language,
        firstPublishedYear: record.first_published_year,
        editions,
        audioEditions
      };
    } catch (e: any) {
      throw new Error(`Failed to fetch book details: ${e.message}`);
    }
  }

  async searchCatalog(query: string): Promise<Book[]> {
    // Strip special characters that break SQLite FTS5 MATCH syntax
    const safeQuery = query.replace(/['"\-*\(\)\[\]\{\}~^:]/g, ' ').trim();
    if (!safeQuery) return [];
    
    // Split into tokens and append * to each token for prefix matching
    const matchQuery = safeQuery.split(/\s+/).map(t => `${t}*`).join(' ');

    try {
      const rows = await this.db.getAll(`
        SELECT b.*, group_concat(a.name, ', ') as author 
        FROM fts_books f
        JOIN books b ON f.id = b.id
        LEFT JOIN book_authors ba ON b.id = ba.book
        LEFT JOIN authors a ON ba.author = a.id
        WHERE fts_books MATCH ?
        GROUP BY b.id
        ORDER BY rank
        LIMIT 20
      `, [matchQuery]);
      return rows.map(this.mapRecordToBook);
    } catch (e: any) {
      throw new Error(`Failed to search catalog: ${e.message}`);
    }
  }

  private mapRecordToBook = (row: any): Book => {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      author: row.author || '',
      description: row.description || '',
      coverUrl: row.cover || '',
    };
  };

  watchCuratedLists(onData: (lists: BookList[]) => void): () => void {
    const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'https://cms.edumynt.org';
    const getCoverUrl = (coverId: string | null) => 
      coverId ? `${directusUrl}/assets/${coverId}` : '';

    const sql = `
      SELECT 
        l.*,
        (
          SELECT json_group_array(
            json_object(
              'id', b.id,
              'title', b.title,
              'slug', b.slug,
              'description', b.description,
              'cover', b.cover,
              'author', (
                 SELECT group_concat(a.name, ', ')
                 FROM book_authors ba 
                 JOIN authors a ON ba.author = a.id 
                 WHERE ba.book = b.id
              )
            )
          )
          FROM (
            SELECT b.*, li.sort_order 
            FROM book_list_items li
            JOIN books b ON li.book = b.id
            WHERE li.list = l.id
            ORDER BY li.sort_order ASC
          ) b
        ) as books_json
      FROM book_lists l
      ORDER BY l.sort_order ASC
    `;

    const abortController = new AbortController();
    (async () => {
      try {
        for await (const result of this.db.watch(sql, [], { signal: abortController.signal })) {
          const rows = result.rows?._array || result.rows || result;
          const mappedLists: BookList[] = Array.from(rows).map((row: any) => {
            const books = JSON.parse(row.books_json || '[]').map((b: any) => ({
              id: b.id,
              title: b.title,
              slug: b.slug,
              description: b.description || '',
              coverUrl: getCoverUrl(b.cover),
              author: b.author || ''
            }));
            return {
              id: row.id,
              title: row.title,
              slug: row.slug,
              listType: row.list_type,
              coverUrl: getCoverUrl(row.cover),
              books
            };
          });
          onData(mappedLists);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error('watchCuratedLists error:', e);
        }
      }
    })();
    return () => abortController.abort();
  }
  async getChapter(slug: string): Promise<any | null> {
    try {
      const record = await this.db.getOptional(`
        SELECT * FROM chapters WHERE slug = ?
      `, [slug]);
      
      if (!record) return null;
      return {
        id: record.id,
        title: record.title,
        slug: record.slug,
        chapterType: record.chapter_type,
        countsTowardCompletion: record.counts_toward_completion === 1,
        content: record.content || '',
        summary: record.summary || ''
      };
    } catch (e: any) {
      throw new Error(`Failed to fetch chapter: ${e.message}`);
    }
  }

  async getChapterProgress(chapterId: string): Promise<{progressPercent: number, scrollPosition: number} | null> {
    const profileId = 'guest'; 
    try {
      const result = await this.db.getOptional(`
        SELECT progress_percent, last_position FROM chapter_progress WHERE chapter = ? AND profile = ?
      `, [chapterId, profileId]);
      
      const row = result as any;
      if (!row) return null;
      
      return {
        progressPercent: row.progress_percent as number,
        scrollPosition: row.last_position as number
      };
    } catch (e) {
      console.error('Failed to get chapter progress:', e);
      return null;
    }
  }

  async getLinkedAudioProgress(textChapterId: string): Promise<{progressPercent: number, positionSeconds: number, durationSeconds: number} | null> {
    const profileId = 'guest';
    try {
      // Find the audio chapter linked to this text chapter
      const acResult = await this.db.getOptional(`
        SELECT id, duration_seconds FROM audio_chapters WHERE linked_text_chapter = ?
      `, [textChapterId]);
      const acRow = acResult as any;
      
      if (!acRow) return null;
      const audioChapterId = acRow.id;
      const durationSeconds = acRow.duration_seconds || 0;
      
      // Get the audio progress for that chapter
      const apResult = await this.db.getOptional(`
        SELECT progress_seconds FROM audio_progress WHERE audio_chapter = ? AND profile = ?
      `, [audioChapterId, profileId]);
      const apRow = apResult as any;
      
      if (!apRow) return null;
      const progressSeconds = apRow.progress_seconds;
      
      let percent = 0;
      if (durationSeconds > 0) {
        percent = Math.round((progressSeconds / durationSeconds) * 100);
      }
      
      return {
        progressPercent: percent,
        positionSeconds: progressSeconds,
        durationSeconds: durationSeconds
      };
    } catch (e) {
      console.error('Failed to get linked audio progress:', e);
      return null;
    }
  }

  async updateChapterProgress(chapterId: string, progressPercent: number, scrollPosition: number): Promise<void> {
    try {
      // Just a dummy for now since we don't have the auth user easily accessible here yet, and we need this to not crash.
      console.log('Dummy update chapter progress', chapterId, progressPercent, scrollPosition);
    } catch (e: any) {
      console.warn('Failed to update chapter progress:', e);
    }
  }

  async getReadingPreferences(): Promise<any> {
    return {
      theme: 'system',
      fontFamily: 'serif',
      fontSize: 16,
      lineHeight: 1.5,
      layout: 'paginated'
    };
  }

  async updateReadingPreferences(prefs: any): Promise<void> {}

  async getAnnotations(chapterId: string): Promise<any[]> {
    return [];
  }

  async getAudioProgress(bookId: string, chapterId: string): Promise<any> {
    return null;
  }

  async saveAudioProgress(bookId: string, chapterId: string, positionSeconds: number): Promise<void> {
    console.log('Dummy save audio progress', bookId, chapterId, positionSeconds);
  }
}
