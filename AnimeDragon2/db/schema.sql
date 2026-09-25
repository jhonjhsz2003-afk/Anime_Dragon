CREATE TABLE IF NOT EXISTS users (

  id TEXT PRIMARY KEY,

  username TEXT NOT NULL UNIQUE,

  email TEXT NOT NULL UNIQUE,

  password_hash TEXT NOT NULL,

  password_salt TEXT NOT NULL,

  avatar_url TEXT,

  bio TEXT DEFAULT '',

  country TEXT DEFAULT 'BR',

  language TEXT DEFAULT 'pt-BR',

  plan TEXT DEFAULT 'free',

  created_at TEXT NOT NULL,

  updated_at TEXT NOT NULL

);



CREATE TABLE IF NOT EXISTS sessions (

  id TEXT PRIMARY KEY,

  user_id TEXT NOT NULL,

  expires_at TEXT NOT NULL,

  created_at TEXT NOT NULL

);



CREATE TABLE IF NOT EXISTS favorites (

  user_id TEXT NOT NULL,

  tmdb_id INTEGER NOT NULL,

  media_type TEXT NOT NULL,

  created_at TEXT NOT NULL,

  PRIMARY KEY(user_id, tmdb_id, media_type)

);



CREATE TABLE IF NOT EXISTS history (

  user_id TEXT NOT NULL,

  tmdb_id INTEGER NOT NULL,

  media_type TEXT NOT NULL,

  season INTEGER,

  episode INTEGER,

  progress_seconds INTEGER DEFAULT 0,

  duration_seconds INTEGER DEFAULT 0,

  updated_at TEXT NOT NULL,

  PRIMARY KEY(user_id, tmdb_id, media_type, season, episode)

);



CREATE TABLE IF NOT EXISTS settings (

  user_id TEXT PRIMARY KEY,

  autoplay INTEGER DEFAULT 1,

  auto_subtitles INTEGER DEFAULT 1,

  notifications INTEGER DEFAULT 1,

  dark_mode INTEGER DEFAULT 1,

  analytics INTEGER DEFAULT 0,

  language TEXT DEFAULT 'pt-BR',

  quality TEXT DEFAULT 'auto',

  updated_at TEXT NOT NULL

);



CREATE TABLE IF NOT EXISTS catalog_cache (

  tmdb_id INTEGER PRIMARY KEY,

  media_type TEXT NOT NULL,

  payload TEXT NOT NULL,

  updated_at TEXT NOT NULL

);

CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

CREATE TABLE IF NOT EXISTS auth_limits (

  id TEXT PRIMARY KEY,

  attempts INTEGER NOT NULL DEFAULT 0,

  expires_at INTEGER NOT NULL

);

CREATE INDEX IF NOT EXISTS auth_limits_expires_idx ON auth_limits(expires_at);



-- v8: community and automatic installation settings

CREATE TABLE IF NOT EXISTS app_config(key TEXT PRIMARY KEY,value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS anime_collections(user_id TEXT NOT NULL,anime_id INTEGER NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('favorite','watchlater')),created_at TEXT NOT NULL,PRIMARY KEY(user_id,anime_id,kind));

CREATE TABLE IF NOT EXISTS anime_reactions(user_id TEXT NOT NULL,anime_id INTEGER NOT NULL,value INTEGER NOT NULL CHECK(value IN (-1,1)),updated_at TEXT NOT NULL,PRIMARY KEY(user_id,anime_id));

CREATE TABLE IF NOT EXISTS anime_comments(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,anime_id INTEGER NOT NULL,season INTEGER,episode INTEGER,parent_id TEXT,body TEXT NOT NULL,spoiler INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);

CREATE INDEX IF NOT EXISTS anime_comments_order ON anime_comments(anime_id,created_at DESC,id DESC);

CREATE TABLE IF NOT EXISTS comment_reports(user_id TEXT NOT NULL,comment_id TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(user_id,comment_id));



-- v9: library, community votes, duplicate prevention and episode progress

CREATE TABLE IF NOT EXISTS anime_library(user_id TEXT NOT NULL,anime_id INTEGER NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('favorite','watchlater','watching','completed','paused','dropped')),created_at TEXT NOT NULL,PRIMARY KEY(user_id,anime_id,kind));

CREATE UNIQUE INDEX IF NOT EXISTS library_status_unique ON anime_library(user_id,anime_id) WHERE kind IN ('watching','completed','paused','dropped');

CREATE TABLE IF NOT EXISTS comment_reactions(user_id TEXT NOT NULL,comment_id TEXT NOT NULL,value INTEGER NOT NULL CHECK(value IN (-1,1)),PRIMARY KEY(user_id,comment_id));

CREATE INDEX IF NOT EXISTS comment_votes_by_comment ON comment_reactions(comment_id,value);

CREATE TABLE IF NOT EXISTS comment_keys(user_id TEXT NOT NULL,anime_id INTEGER NOT NULL,fingerprint TEXT NOT NULL,comment_id TEXT NOT NULL UNIQUE,PRIMARY KEY(user_id,anime_id,fingerprint));

CREATE TABLE IF NOT EXISTS episode_progress(user_id TEXT NOT NULL,anime_id INTEGER NOT NULL,season INTEGER NOT NULL,episode INTEGER NOT NULL,watched INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,anime_id,season,episode));



-- v9.1 public profiles (private by default)

CREATE TABLE IF NOT EXISTS profile_privacy(user_id TEXT PRIMARY KEY,visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','public')));

CREATE TABLE IF NOT EXISTS playback_activity(user_id TEXT NOT NULL,anime_id INTEGER NOT NULL,season INTEGER NOT NULL,episode INTEGER NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,anime_id));



CREATE TABLE IF NOT EXISTS user_appearance(user_id TEXT PRIMARY KEY,name_color TEXT NOT NULL DEFAULT 'ice' CHECK(name_color IN ('ice','blue','cyan','green','gold','orange','pink','violet')));


CREATE TABLE IF NOT EXISTS profile_media(user_id TEXT PRIMARY KEY,mime TEXT NOT NULL,data TEXT NOT NULL,x REAL NOT NULL DEFAULT 50,y REAL NOT NULL DEFAULT 50,zoom REAL NOT NULL DEFAULT 100);
