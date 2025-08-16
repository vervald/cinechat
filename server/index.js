// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./db');

const PORT = process.env.PORT || 4000;
const ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_LANG = process.env.TMDB_LANG || 'ru-RU';
if (!TMDB_API_KEY) {
  console.warn('⚠️  No TMDB_API_KEY set. Search/movie endpoints will fail until provided.');
}

const app = express();
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: ORIGIN, credentials: true }));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ORIGIN, credentials: true }
});

// Helpers
const animals = ['Otter','Fox','Hedgehog','Lynx','Panda','Falcon','Wolf','Dolphin','Badger','Owl','Bear','Hawk'];
const adjs = ['Curious','Bold','Silent','Lucky','Witty','Calm','Brave','Swift','Mellow','Sunny','Cosmic','Electric'];
const makeHandle = () => `${adjs[Math.floor(Math.random()*adjs.length)]}-${animals[Math.floor(Math.random()*animals.length)]}`;

function ensureSession(req, res, next) {
  let sid = req.cookies['sid'];
  if (!sid) {
    sid = uuidv4();
    const handle = makeHandle();
    const now = Date.now();
    db.prepare('INSERT INTO users (id, handle, created_at) VALUES (?, ?, ?)')
      .run(sid, handle, now);
    res.cookie('sid', sid, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    req.user = { id: sid, handle };
  } else {
    const row = db.prepare('SELECT id, handle FROM users WHERE id = ?').get(sid);
    if (!row) {
      const handle = makeHandle();
      db.prepare('INSERT INTO users (id, handle, created_at) VALUES (?, ?, ?)')
        .run(sid, handle, Date.now());
      req.user = { id: sid, handle };
    } else {
      req.user = row;
    }
  }
  next();
}

app.use(ensureSession);

// Session info
app.get('/api/session', (req, res) => {
  res.json({ user: req.user });
});

// TMDB proxy
const tmdbCache = new Map(); // key -> { ts, data }
const TMDB_TTL_MS = 60 * 1000; // 60s
app.get('/api/search', async (req, res) => {
  const q = String(req.query.q || '');
  const page = Number(req.query.page || 1);
  try {
    let url;
    if (q) {
      url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&language=${TMDB_LANG}&query=${encodeURIComponent(q)}&page=${page}`;
    } else {
      url = `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}&language=${TMDB_LANG}&page=${page}`;
    }
    const key = `search:${url}`;
    const now = Date.now();
    const cached = tmdbCache.get(key);
    if (cached && now - cached.ts < TMDB_TTL_MS) {
      return res.json(cached.data);
    }
    const r = await fetch(url);
    const data = await r.json();
    tmdbCache.set(key, { ts: now, data });
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'tmdb_failed' });
  }
});

app.get('/api/movie/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}&language=${TMDB_LANG}`;
    const key = `movie:${id}`;
    const now = Date.now();
    const cached = tmdbCache.get(key);
    if (cached && now - cached.ts < TMDB_TTL_MS) {
      return res.json(cached.data);
    }
    const r = await fetch(url);
    const data = await r.json();
    tmdbCache.set(key, { ts: now, data });
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'tmdb_failed' });
  }
});

// Ratings
const stmtRatingsAgg = db.prepare('SELECT COUNT(*) AS cnt, AVG(value) AS avg FROM ratings WHERE movie_id = ?');
const stmtRatingMine = db.prepare('SELECT value FROM ratings WHERE movie_id = ? AND user_id = ?');
const stmtUpsertRating = db.prepare(`INSERT INTO ratings (movie_id, user_id, value, updated_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(movie_id, user_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`);
const stmtInsertMsg = db.prepare('INSERT INTO messages (id, movie_id, user_id, parent_id, content, created_at) VALUES (?, ?, ?, ?, ?, ?)');
const stmtListMsgs = db.prepare('SELECT m.id, m.parent_id, m.content, m.created_at, u.handle FROM messages m JOIN users u ON u.id = m.user_id WHERE m.movie_id = ? ORDER BY m.created_at DESC LIMIT 200');

app.get('/api/rating/:movieId', (req, res) => {
  const movieId = Number(req.params.movieId);
  const row = stmtRatingsAgg.get(movieId);
  const mine = stmtRatingMine.get(movieId, req.user.id);
  res.json({ count: row.cnt || 0, average: row.avg || 0, mine: mine ? mine.value : null });
});

app.post('/api/rating/:movieId', (req, res) => {
  const movieId = Number(req.params.movieId);
  const value = Number(req.body.value);
  if (!(value >= 1 && value <= 10)) return res.status(400).json({ error: 'bad_value' });
  stmtUpsertRating.run(movieId, req.user.id, value, Date.now());
  const row = stmtRatingsAgg.get(movieId);
  io.to(`movie:${movieId}`).emit('rating:update', { movieId, count: row.cnt || 0, average: row.avg || 0 });
  res.json({ ok: true });
});

// Messages (REST for history)
app.get('/api/chat/:movieId/messages', (req, res) => {
  const movieId = Number(req.params.movieId);
  const rows = stmtListMsgs.all(movieId);
  res.json({ messages: rows });
});

app.post('/api/chat/:movieId/messages', (req, res) => {
  const movieId = Number(req.params.movieId);
  const { content, parentId } = req.body || {};
  if (typeof content !== 'string' || !content.trim()) return res.status(400).json({ error: 'empty' });
  const id = uuidv4();
  const created_at = Date.now();
  stmtInsertMsg.run(id, movieId, req.user.id, parentId || null, content.trim(), created_at);
  const msg = { id, movieId, parent_id: parentId || null, content: content.trim(), created_at, handle: req.user.handle };
  io.to(`movie:${movieId}`).emit('chat:new', msg);
  res.json({ ok: true, message: msg });
});

// Socket.IO
io.on('connection', (socket) => {
  socket.on('join', ({ movieId }) => {
    const room = `movie:${movieId}`;
    socket.join(room);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server on http://localhost:${PORT}`);
});
