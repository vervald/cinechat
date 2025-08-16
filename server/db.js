// server/db.js
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.db'));

// Init schema
db.exec(`
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  movie_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  parent_id TEXT,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_movie ON messages(movie_id, created_at);

CREATE TABLE IF NOT EXISTS ratings (
  movie_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  value INTEGER NOT NULL CHECK (value BETWEEN 1 AND 10),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (movie_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_movie ON ratings(movie_id);
`);

module.exports = db;
