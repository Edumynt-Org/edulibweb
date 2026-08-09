import { column, Schema, Table } from '@powersync/web';

export const books = new Table(
  {
    title: column.text,
    slug: column.text,
    description: column.text,
    cover: column.text,
    original_title: column.text,
    original_language: column.text,
    first_published_year: column.integer,
  },
  {
    indexes: {
      title: ['title'],
      slug: ['slug'],
    },
  }
);

export const editions = new Table(
  {
    book: column.text,
    format: column.text,
    isbn: column.text,
    pages: column.integer,
    title: column.text,
    slug: column.text,
    language: column.text,
    cover: column.text,
  },
  {
    indexes: {
      book: ['book'],
    },
  }
);

export const authors = new Table({
  name: column.text,
  bio: column.text,
});

export const genres = new Table({
  name: column.text,
  slug: column.text,
});

export const categories = new Table({
  name: column.text,
  slug: column.text,
});

export const series = new Table({
  name: column.text,
  description: column.text,
});

// Junction tables
export const book_authors = new Table(
  {
    book: column.text,
    author: column.text,
  },
  { indexes: { book: ['book'], author: ['author'] } }
);

export const book_genres = new Table(
  {
    book: column.text,
    genre: column.text,
  },
  { indexes: { book: ['book'], genre: ['genre'] } }
);

export const book_categories = new Table(
  {
    book: column.text,
    category: column.text,
  },
  { indexes: { book: ['book'], category: ['category'] } }
);

export const series_books = new Table(
  {
    series: column.text,
    book: column.text,
    order: column.integer,
  },
  { indexes: { series: ['series'], book: ['book'] } }
);

export const parts = new Table({
  edition: column.text,
  title: column.text,
  description: column.text,
  sort_order: column.integer,
});

export const chapters = new Table({
  title: column.text,
  slug: column.text,
  chapter_type: column.text,
  counts_toward_completion: column.integer,
  content: column.text,
  summary: column.text,
});

export const editions_chapters = new Table({
  editions_id: column.text,
  chapters_id: column.text,
  sort_order: column.integer,
});

export const parts_chapters = new Table({
  parts_id: column.text,
  chapters_id: column.text,
  sort_order: column.integer,
});

export const audio_editions = new Table({
  book: column.text,
  title: column.text,
  slug: column.text,
  language: column.text,
  cover: column.text,
  narrator_name: column.text,
  is_complete: column.integer,
  linked_text_edition: column.text,
  rights_status: column.text,
});

export const audio_parts = new Table({
  audio_edition: column.text,
  title: column.text,
  description: column.text,
  sort_order: column.integer,
});

export const audio_chapters = new Table({
  title: column.text,
  slug: column.text,
  audio_file: column.text,
  duration_seconds: column.integer,
  linked_text_chapter: column.text,
  rights_status: column.text,
});

export const audio_editions_audio_chapters = new Table({
  audio_editions_id: column.text,
  audio_chapters_id: column.text,
  sort_order: column.integer,
});

export const audio_parts_audio_chapters = new Table({
  audio_parts_id: column.text,
  audio_chapters_id: column.text,
  sort_order: column.integer,
});

export const book_lists = new Table({
  title: column.text,
  slug: column.text,
  list_type: column.text,
  sort_order: column.integer,
  cover: column.text,
});

export const book_list_items = new Table(
  {
    list: column.text,
    book: column.text,
    sort_order: column.integer,
    note: column.text,
  },
  { indexes: { list: ['list'], book: ['book'] } }
);

export const chapter_progress = new Table({
  profile: column.text,
  book: column.text,
  edition: column.text,
  chapter: column.text,
  status: column.text,
  progress_percent: column.integer,
  last_position: column.integer,
  completed_at: column.text,
  last_read_at: column.text,
}, { indexes: { profile_chapter: ['profile', 'chapter'] } });

export const follows = new Table({
  follower: column.text,
  following: column.text,
  date_created: column.text,
}, { indexes: { follower: ['follower'], following: ['following'] } });

export const reviews = new Table({
  profile: column.text,
  book: column.text,
  rating: column.real,
  title: column.text,
  body: column.text,
  contains_spoilers: column.integer,
  status: column.text,
  date_created: column.text,
  date_updated: column.text,
}, { indexes: { book: ['book'], profile: ['profile'] } });

export const reading_preferences = new Table({
  profile: column.text,
  font_family: column.text,
  font_size_px: column.integer,
  line_spacing: column.text,
  theme: column.text,
  margins: column.text,
}, { indexes: { profile: ['profile'] } });

export const annotations = new Table({
  profile: column.text,
  chapter_id: column.text,
  annotation_type: column.text, // 'highlight', 'bookmark', 'note'
  color: column.text,
  selected_text: column.text,
  note_text: column.text,
  start_position: column.text, // CSS selector / Markdown node ref
  end_position: column.text,
  created_at: column.text,
}, { indexes: { profile_chapter: ['profile', 'chapter_id'] } });

export const dictionary_cache = new Table({
  word: column.text,
  definition_json: column.text,
  timestamp: column.text,
}, { indexes: { word: ['word'] } });

export const audio_progress = new Table({
  profile: column.text, // nullable for guests
  book: column.text,
  audio_chapter: column.text,
  position_seconds: column.integer,
  duration_seconds: column.integer,
  status: column.text,
  completed_at: column.text,
  last_listened_at: column.text,
}, { indexes: { profile_chapter: ['profile', 'audio_chapter'] } });

export const profiles = new Table({
  user: column.text,
  status: column.text,
  username: column.text,
  display_name: column.text,
  avatar: column.text,
  bio: column.text,
  website_url: column.text,
  location: column.text,
  is_verified: column.integer,
  current_streak: column.integer,
  last_streak_date: column.text,
});

export const achievements = new Table({
  name: column.text,
  description: column.text,
  criteria_type: column.text,
  threshold: column.integer,
  badge_icon: column.text,
});

export const user_achievements = new Table({
  profile: column.text,
  achievement_id: column.text,
  awarded_at: column.text,
}, { indexes: { profile: ['profile'] } });

export const userShelves = new Table(
  {
    profile_id: column.text,
    name: column.text,
    slug: column.text,
    description: column.text,
    is_private: column.integer,
    sort_order: column.integer,
    date_created: column.text,
    date_updated: column.text,
  },
  {
    indexes: {
      profile_id: ['profile_id'],
      slug: ['slug'],
    },
  }
);

export const userShelfItems = new Table(
  {
    shelf_id: column.text,
    book_id: column.text,
    date_created: column.text,
  },
  {
    indexes: {
      shelf_id: ['shelf_id'],
      book_id: ['book_id'],
    },
  }
);

export const userAchievements = new Table(
  {
    profile_id: column.text,
    achievement_id: column.text,
    date_created: column.text,
  },
  {
    indexes: {
      profile_id: ['profile_id'],
    },
  }
);

export const AppSchema = new Schema({
  books,
  editions,
  authors,
  genres,
  categories,
  series,
  book_authors,
  book_genres,
  book_categories,
  series_books,
  parts,
  chapters,
  editions_chapters,
  parts_chapters,
  audio_editions,
  audio_parts,
  audio_chapters,
  audio_editions_audio_chapters,
  audio_parts_audio_chapters,
  book_lists,
  book_list_items,
  chapter_progress,
  reading_preferences,
  annotations,
  dictionary_cache,
  audio_progress,
  follows,
  reviews,
  profiles,
  achievements,
  user_achievements: userAchievements,
  user_shelves: userShelves,
  user_shelf_items: userShelfItems,
});

export type Database = (typeof AppSchema)['types'];
export type BookRecord = Database['books'];
export type EditionRecord = Database['editions'];
export type AuthorRecord = Database['authors'];
export type GenreRecord = Database['genres'];
export type CategoryRecord = Database['categories'];
export type SeriesRecord = Database['series'];
export type ChapterProgressRecord = Database['chapter_progress'];
