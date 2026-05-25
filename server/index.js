require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

const app = express();
const db = new Database(path.join(__dirname, 'playlists.db'));

app.use(cors());
app.use(express.json());

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    youtube_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'Unknown Video',
    thumbnail TEXT NOT NULL DEFAULT '',
    viewed INTEGER NOT NULL DEFAULT 0,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
  );
`);

// --- Playlists ---

app.get('/api/playlists', (req, res) => {
  const playlists = db.prepare(`
    SELECT p.*,
      COUNT(v.id) as video_count,
      COALESCE(SUM(v.viewed), 0) as viewed_count
    FROM playlists p
    LEFT JOIN videos v ON v.playlist_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all();
  res.json(playlists);
});

app.post('/api/playlists', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  const result = db.prepare('INSERT INTO playlists (name) VALUES (?)').run(name.trim());
  const playlist = db.prepare(`
    SELECT p.*, 0 as video_count, 0 as viewed_count
    FROM playlists p WHERE p.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(playlist);
});

app.patch('/api/playlists/:id', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  db.prepare('UPDATE playlists SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
  const playlist = db.prepare(`
    SELECT p.*, COUNT(v.id) as video_count, COALESCE(SUM(v.viewed), 0) as viewed_count
    FROM playlists p LEFT JOIN videos v ON v.playlist_id = p.id
    WHERE p.id = ? GROUP BY p.id
  `).get(req.params.id);
  res.json(playlist);
});

app.delete('/api/playlists/:id', (req, res) => {
  db.prepare('DELETE FROM playlists WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// --- Videos ---

app.get('/api/playlists/:id/videos', (req, res) => {
  const videos = db.prepare(
    'SELECT * FROM videos WHERE playlist_id = ? ORDER BY added_at DESC'
  ).all(req.params.id);
  res.json(videos);
});

app.post('/api/playlists/:id/videos', (req, res) => {
  const { youtube_id, title, thumbnail } = req.body;
  if (!youtube_id) return res.status(400).json({ error: 'youtube_id is required' });

  const existing = db.prepare(
    'SELECT id FROM videos WHERE playlist_id = ? AND youtube_id = ?'
  ).get(req.params.id, youtube_id);
  if (existing) return res.status(409).json({ error: 'Video already in this playlist' });

  const result = db.prepare(
    'INSERT INTO videos (playlist_id, youtube_id, title, thumbnail) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, youtube_id, title || 'Unknown Video', thumbnail || '');

  const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(video);
});

app.patch('/api/videos/:id', (req, res) => {
  const { viewed } = req.body;
  db.prepare('UPDATE videos SET viewed = ? WHERE id = ?').run(viewed ? 1 : 0, req.params.id);
  const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  res.json(video);
});

app.delete('/api/videos/:id', (req, res) => {
  db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// --- YouTube search via Invidious (no API key required) ---

// Tested and working instances first; add more from https://invidious.io/instances.json
const INVIDIOUS_INSTANCES = process.env.INVIDIOUS_INSTANCES
  ? process.env.INVIDIOUS_INSTANCES.split(',').map(s => s.trim())
  : [
      'https://y.com.sb',
      'https://invidious.nerdvpn.de',
      'https://inv.riverside.rocks',
      'https://yt.artemislena.eu',
    ];

async function invidiousSearch(query, page) {
  const params = new URLSearchParams({ q: query, type: 'video', page });
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${instance}/api/v1/search?${params}`, {
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data)) continue;
      return data;
    } catch {
      continue;
    }
  }
  throw new Error('Search unavailable — all fallback instances unreachable. Try again shortly.');
}

app.get('/api/youtube/search', async (req, res) => {
  const { q, pageToken } = req.query;
  if (!q?.trim()) return res.status(400).json({ error: 'Query is required' });

  const page = pageToken ? parseInt(pageToken, 10) : 1;

  try {
    const raw = await invidiousSearch(q.trim(), page);
    const videos = raw.filter(item => item.type === 'video');

    res.json({
      items: videos.map(item => ({
        youtube_id: item.videoId,
        title: item.title || item.videoId,
        thumbnail: `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`,
        channelTitle: item.author || '',
        publishedAt: item.published ? new Date(item.published * 1000).toISOString() : null,
      })),
      nextPageToken: videos.length > 0 ? String(page + 1) : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Search failed' });
  }
});

// --- YouTube info proxy (no API key needed via oEmbed) ---

app.get('/api/youtube/info', async (req, res) => {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'videoId is required' });

  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('oEmbed request failed');
    const data = await response.json();
    res.json({
      title: data.title,
      thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    });
  } catch {
    res.json({
      title: videoId,
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    });
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
