// @ts-nocheck
import { ILibraryRepository } from '../../domain/repositories/ILibraryRepository';
import { Book } from '../../domain/models/Book';
import { BookDetails } from '../../domain/models/BookDetails';
import { BookList } from '../../domain/models/BookList';
import { Review, ReviewDraft } from '../../domain/models/Review';
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
    const profileId = 'guest';
    try {
      const oldProgress = await this.getChapterProgress(chapterId);
      
      // Note: we should actually save the progress to chapter_progress here
      
      if (oldProgress) {
        const advancement = progressPercent - oldProgress.progressPercent;
        if (advancement >= 1) {
          await this.calculateAndSyncDailyStreak();
        }
      } else if (progressPercent >= 1) {
        await this.calculateAndSyncDailyStreak();
      }
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
    const profileId = 'guest';
    try {
      const apResult = await this.db.getOptional(`
        SELECT progress_seconds FROM audio_progress WHERE audio_chapter = ? AND profile = ?
      `, [chapterId, profileId]);
      const apRow = apResult as any;
      
      if (apRow) {
        const oldSeconds = apRow.progress_seconds;
        if (positionSeconds - oldSeconds >= 300) { // 5 minutes = 300 seconds
          await this.calculateAndSyncDailyStreak();
        }
      } else if (positionSeconds >= 300) {
        await this.calculateAndSyncDailyStreak();
      }
    } catch (e) {
      console.warn('Failed to save audio progress and check streak:', e);
    }
    console.log('Dummy save audio progress', bookId, chapterId, positionSeconds);
  }

  async updateBookStatus(bookId: string, status: string): Promise<void> {
    const profileId = 'guest'; 
    try {
      const existing = await this.db.getOptional(`
        SELECT id FROM user_books WHERE book = ? AND profile = ?
      `, [bookId, profileId]);
      
      const now = new Date().toISOString();
      const dateFinished = status === 'completed' ? now : null;

      if (existing) {
        await this.db.execute(`
          UPDATE user_books 
          SET reading_status = ?, last_activity_at = ?, date_finished = ?
          WHERE id = ?
        `, [status, now, dateFinished, existing.id]);
      } else {
        const newId = crypto.randomUUID();
        await this.db.execute(`
          INSERT INTO user_books (id, profile, book, reading_status, date_started, date_finished, last_activity_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [newId, profileId, bookId, status, now, dateFinished, now]);
      }
    } catch (e: any) {
      console.error('Failed to update book status:', e);
      throw e;
    }
  }

  async createCustomShelf(name: string, isPrivate: boolean, description?: string): Promise<any> {
    const profileId = 'guest';
    const id = crypto.randomUUID();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const now = new Date().toISOString();
    
    await this.db.execute(`
      INSERT INTO user_shelves (id, profile, name, slug, description, is_private, sort_order, date_created, date_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, profileId, name, slug, description || null, isPrivate ? 1 : 0, 0, now, now]);

    return {
      id, profileId, name, slug, description, isPrivate, sortOrder: 0, dateCreated: now, dateUpdated: now
    };
  }

  async addBookToShelf(shelfId: string, bookId: string): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const result = await this.db.getOptional('SELECT MAX(sort_order) as max_sort FROM user_shelf_items WHERE shelf = ?', [shelfId]);
    const nextSort = ((result as any)?.max_sort || 0) + 1;

    await this.db.execute(`
      INSERT INTO user_shelf_items (id, shelf, book, sort_order, date_added)
      VALUES (?, ?, ?, ?, ?)
    `, [id, shelfId, bookId, nextSort, now]);
  }

  async removeBookFromShelf(shelfId: string, bookId: string): Promise<void> {
    await this.db.execute('DELETE FROM user_shelf_items WHERE shelf = ? AND book = ?', [shelfId, bookId]);
  }

  async reorderShelf(shelfId: string, bookIds: string[]): Promise<void> {
    await this.db.writeTransaction(async (tx) => {
      for (let i = 0; i < bookIds.length; i++) {
        await tx.execute('UPDATE user_shelf_items SET sort_order = ? WHERE shelf = ? AND book = ?', [i, shelfId, bookIds[i]]);
      }
    });
  }

  async getPublicShelves(profileId: string): Promise<any[]> {
    const rows = await this.db.getAll('SELECT * FROM user_shelves WHERE profile = ? AND is_private = 0 ORDER BY sort_order', [profileId]);
    return rows.map(this.mapRecordToShelf);
  }

  async getUserShelves(): Promise<any[]> {
    const profileId = 'guest';
    const rows = await this.db.getAll('SELECT * FROM user_shelves WHERE profile = ? ORDER BY sort_order', [profileId]);
    return rows.map(this.mapRecordToShelf);
  }

  async getShelfItems(shelfId: string): Promise<any[]> {
    const rows = await this.db.getAll(`
      SELECT si.*, b.title as book_title, b.slug as book_slug, b.cover as book_cover
      FROM user_shelf_items si
      JOIN books b ON si.book = b.id
      WHERE si.shelf = ?
      ORDER BY si.sort_order
    `, [shelfId]);
    
    const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'https://cms.edumynt.org';
    const getCoverUrl = (coverId: string | null) => coverId ? `${directusUrl}/assets/${coverId}` : '';

    return rows.map(r => ({
      id: r.id,
      shelfId: r.shelf,
      bookId: r.book,
      sortOrder: r.sort_order,
      dateAdded: r.date_added,
      book: {
        id: r.book,
        title: r.book_title,
        slug: r.book_slug,
        coverUrl: getCoverUrl(r.book_cover),
        author: '',
        description: ''
      }
    }));
  }

  async createReview(review: ReviewDraft): Promise<Review> {
    if (review.rating < 0 || review.rating > 5 || !Number.isInteger(review.rating * 2)) {
      throw new Error('Ratings must be between 0 and 5 in 0.5 increments.');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const created: Review = {
      id,
      ...review,
      status: 'published',
      dateCreated: now,
      dateUpdated: now,
    };
    await this.db.execute(
      `INSERT INTO reviews (id, profile, book, rating, title, body, contains_spoilers, status, date_created, date_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, review.profileId, review.bookId, review.rating, review.title ?? null, review.body, review.containsSpoilers ? 1 : 0, 'published', now, now],
    );
    return created;
  }

  async getReviewsForBook(bookId: string): Promise<Review[]> {
    const rows = await this.db.getAll(
      'SELECT * FROM reviews WHERE book = ? AND status = ? ORDER BY date_created DESC',
      [bookId, 'published'],
    );
    return rows.map(this.mapRecordToReview);
  }

  async getReviewsByUser(profileId: string): Promise<Review[]> {
    const rows = await this.db.getAll(
      'SELECT * FROM reviews WHERE profile = ? ORDER BY date_created DESC',
      [profileId],
    );
    return rows.map(this.mapRecordToReview);
  }

  private mapRecordToShelf = (row: any) => {
    return {
      id: row.id,
      profileId: row.profile,
      name: row.name,
      slug: row.slug,
      description: row.description,
      isPrivate: row.is_private === 1,
      sortOrder: row.sort_order,
      dateCreated: row.date_created,
      dateUpdated: row.date_updated,
    };
  };

  private mapRecordToReview = (row: any): Review => ({
    id: row.id,
    profileId: row.profile,
    bookId: row.book,
    rating: Number(row.rating),
    title: row.title ?? undefined,
    body: row.body ?? '',
    containsSpoilers: Number(row.contains_spoilers) === 1,
    status: row.status ?? 'published',
    dateCreated: row.date_created,
    dateUpdated: row.date_updated,
  });

  async getDailyStreakCount(profileId: string): Promise<number> {
    try {
      const row: any = await this.db.getOptional('SELECT current_streak FROM profiles WHERE id = ?', [profileId]);
      return row ? (row.current_streak || 0) : 0;
    } catch (e) {
      return 0;
    }
  }

  async calculateAndSyncDailyStreak(): Promise<void> {
    const profileId = 'guest'; // We would ideally get the current authenticated user's ID
    try {
      const row: any = await this.db.getOptional('SELECT current_streak, last_streak_date FROM profiles WHERE id = ?', [profileId]);
      if (!row) return;
      
      const currentStreak = row.current_streak || 0;
      const lastStreakDateStr = row.last_streak_date;
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (!lastStreakDateStr) {
        await this.db.execute('UPDATE profiles SET current_streak = 1, last_streak_date = ? WHERE id = ?', [today.toISOString(), profileId]);
        return;
      }
      
      const lastDate = new Date(lastStreakDateStr);
      const lastDateMidnight = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
      
      const diffTime = Math.abs(today.getTime() - lastDateMidnight.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        // Already advanced today
        return;
      } else if (diffDays <= 3) {
        // Within 48-hour grace period (diffDays = 1, 2, or 3)
        await this.db.execute('UPDATE profiles SET current_streak = current_streak + 1, last_streak_date = ? WHERE id = ?', [today.toISOString(), profileId]);
      } else {
        // Reset streak
        await this.db.execute('UPDATE profiles SET current_streak = 1, last_streak_date = ? WHERE id = ?', [today.toISOString(), profileId]);
      }
    } catch (e) {
      console.error('Failed to update daily streak:', e);
    }
  }

  async getReadingStats(profileId: string): Promise<{
    totalBooksFinished: number;
    totalPagesRead: number;
    totalHoursListened: number;
    pagesByMonth: { month: string; pages: number }[];
    hoursByMonth: { month: string; hours: number }[];
  }> {
    // 1. Total books finished
    const booksRes = await this.db.getAll<{count: number}>(`
      SELECT COUNT(DISTINCT book) as count 
      FROM chapter_progress 
      WHERE profile = ? AND status = 'Completed'
    `, [profileId]);
    
    // Also try user_books if the table exists locally, fall back to 0 if it doesn't
    let totalBooksFinished = booksRes[0]?.count || 0;
    try {
      const userBooksRes = await this.db.getAll<{count: number}>(`
        SELECT COUNT(*) as count FROM user_books WHERE profile = ? AND reading_status = 'completed'
      `, [profileId]);
      if (userBooksRes[0]?.count > totalBooksFinished) {
        totalBooksFinished = userBooksRes[0].count;
      }
    } catch(e) {}

    // 2. Pages read
    // For simplicity we'll assume each progress_percent = 3 pages (standard 300 page book)
    const pagesRes = await this.db.getAll<{ total_progress: number, month: string }>(`
      SELECT 
        SUM(progress_percent) as total_progress,
        strftime('%Y-%m', completed_at) as month
      FROM chapter_progress
      WHERE profile = ? AND completed_at IS NOT NULL
      GROUP BY strftime('%Y-%m', completed_at)
    `, [profileId]);
    
    const pagesByMonth = pagesRes.filter(r => r.month).map(r => ({
      month: r.month,
      pages: Math.floor((r.total_progress || 0) * 3)
    }));
    const totalPagesRead = pagesByMonth.reduce((sum, item) => sum + item.pages, 0);

    // 3. Hours listened
    const hoursRes = await this.db.getAll<{ total_seconds: number, month: string }>(`
      SELECT 
        SUM(position_seconds) as total_seconds,
        strftime('%Y-%m', last_listened_at) as month
      FROM audio_progress
      WHERE profile = ? AND last_listened_at IS NOT NULL
      GROUP BY strftime('%Y-%m', last_listened_at)
    `, [profileId]);
    
    const hoursByMonth = hoursRes.filter(r => r.month).map(r => ({
      month: r.month,
      hours: Math.floor((r.total_seconds || 0) / 3600)
    }));
    const totalHoursListened = hoursByMonth.reduce((sum, item) => sum + item.hours, 0);

    return {
      totalBooksFinished,
      totalPagesRead,
      totalHoursListened,
      pagesByMonth,
      hoursByMonth
    };
  }

  async getUserAchievements(profileId: string): Promise<{
    id: string;
    achievement_id: string;
    awarded_at: string;
    name: string;
    description: string;
    badge_icon: string;
  }[]> {
    return await this.db.getAll<{
      id: string;
      achievement_id: string;
      awarded_at: string;
      name: string;
      description: string;
      badge_icon: string;
    }>(`
      SELECT ua.id, ua.achievement_id, ua.awarded_at, a.name, a.description, a.badge_icon
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.profile = ?
      ORDER BY ua.awarded_at DESC
    `, [profileId]);
  }
}
