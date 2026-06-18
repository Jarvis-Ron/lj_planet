const express = require('express');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// ===== Database =====
const db = new Database(path.join(__dirname, 'data.db'));
db.pragma('journal_mode=WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, display_name TEXT);
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, username TEXT);
  CREATE TABLE IF NOT EXISTS anniversaries (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, date TEXT, text TEXT DEFAULT '', images TEXT DEFAULT '[]', tags TEXT DEFAULT '', created_by TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS places (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, date TEXT, text TEXT DEFAULT '', images TEXT DEFAULT '[]', created_by TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME);
  CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT, category TEXT DEFAULT '日常', images TEXT DEFAULT '[]', created_by TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME);
  CREATE TABLE IF NOT EXISTS story_nodes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, date TEXT, text TEXT DEFAULT '', type TEXT DEFAULT 'milestone', images TEXT DEFAULT '[]', created_by TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME);
  CREATE TABLE IF NOT EXISTS wishes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, completed INTEGER DEFAULT 0, completed_date TEXT, category TEXT DEFAULT '近期', created_by TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
`);

// ===== Seed Users =====
function ensureUsers() {
  const users = [
    { username: 'L', display: 'Lyra' },
    { username: 'J', display: 'Jarvis' }
  ];
  for (const u of users) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(u.username);
    if (!existing) {
      const pwd = process.env['USER_' + u.username + '_PASSWORD'] || u.username.toLowerCase() + '123';
      const hash = bcrypt.hashSync(pwd, 10);
      db.prepare('INSERT INTO users (username, password, display_name) VALUES (?, ?, ?)').run(u.username, hash, u.display);
      console.log('User ' + u.username + ' created (default password: ' + (process.env['USER_' + u.username + '_PASSWORD'] ? 'from .env' : pwd) + ')');
    }
  }
}
ensureUsers();

// ===== JWT Auth =====
const JWT_SECRET = process.env.JWT_SECRET || 'lj-planet-dev-secret';

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: '未登录' });
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET);
    req.user = decoded;
    next();
  } catch(e) { res.status(401).json({ error: '登录已过期' }); }
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '请输入用户名和密码' });
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toUpperCase());
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: '用户名或密码错误' });
  const token = jwt.sign({ id: user.id, username: user.username, display_name: user.display_name }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { username: user.username, display_name: user.display_name } });
});

app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// ===== Generic CRUD Routes =====
function crudRoutes(table, fields) {
  const cols = fields.join(', ');
  const placeholders = fields.map(f => '@' + f).join(', ');
  const updates = fields.map(f => f + '=@' + f).join(', ');

  app.get('/api/' + table, authMiddleware, (req, res) => {
    const rows = db.prepare('SELECT * FROM ' + table + ' ORDER BY created_at DESC').all();
    res.json(rows.map(r => ({ ...r, images: JSON.parse(r.images || '[]') })));
  });

  app.post('/api/' + table, authMiddleware, (req, res) => {
    const data = { ...req.body, images: JSON.stringify(req.body.images || []), created_by: req.user.username };
    const result = db.prepare('INSERT INTO ' + table + ' (' + cols + ', created_by) VALUES (' + placeholders + ', @created_by)').run(data);
    res.json({ id: result.lastInsertRowid });
  });

  app.put('/api/' + table + '/:id', authMiddleware, (req, res) => {
    const data = { ...req.body, id: req.params.id, images: JSON.stringify(req.body.images || []), updated_at: new Date().toISOString() };
    db.prepare('UPDATE ' + table + ' SET ' + updates + ', updated_at=@updated_at WHERE id=@id').run(data);
    res.json({ ok: true });
  });

  app.delete('/api/' + table + '/:id', authMiddleware, (req, res) => {
    db.prepare('DELETE FROM ' + table + ' WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });
}

// ===== Apply CRUD routes =====
crudRoutes('anniversaries', ['title', 'date', 'text', 'images', 'tags']);
crudRoutes('places', ['name', 'date', 'text', 'images']);
crudRoutes('notes', ['content', 'category', 'images']);
crudRoutes('story_nodes', ['title', 'date', 'text', 'type', 'images']);
crudRoutes('wishes', ['title', 'completed', 'completed_date', 'category']);

// ===== Settings (custom routes) =====
app.get('/api/settings', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const result = {};
  for (const r of rows) result[r.key] = r.value;
  res.json(result);
});

app.put('/api/settings', authMiddleware, (req, res) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const tx = db.transaction((data) => {
    for (const [key, value] of Object.entries(data)) upsert.run(key, String(value));
  });
  tx(req.body);
  res.json({ ok: true });
});

// ===== Toggle wish (custom route) =====
app.put('/api/wishes/:id/toggle', authMiddleware, (req, res) => {
  const { completed, completed_date } = req.body;
  db.prepare('UPDATE wishes SET completed=?, completed_date=? WHERE id=?').run(completed ? 1 : 0, completed_date || null, req.params.id);
  res.json({ ok: true });
});

// ===== Export / Import =====
app.get('/api/export', authMiddleware, (req, res) => {
  const tables = ['settings', 'anniversaries', 'places', 'notes', 'story_nodes', 'wishes'];
  const result = {};
  for (const t of tables) {
    result[t] = db.prepare('SELECT * FROM ' + t).all().map(r => ({ ...r, images: typeof r.images === 'string' ? JSON.parse(r.images) : r.images }));
  }
  res.json(result);
});

app.post('/api/import', authMiddleware, (req, res) => {
  const tx = db.transaction((data) => {
    for (const [table, rows] of Object.entries(data)) {
      if (!Array.isArray(rows) || rows.length === 0) continue;
      db.prepare('DELETE FROM ' + table).run();
      for (const row of rows) {
        const keys = Object.keys(row).filter(k => k !== 'id' || table === 'settings');
        const vals = keys.map(k => {
          if (k === 'images' && Array.isArray(row[k])) return JSON.stringify(row[k]);
          return row[k];
        });
        const placeholders = keys.map(() => '?').join(', ');
        db.prepare('INSERT INTO ' + table + ' (' + keys.join(',') + ') VALUES (' + placeholders + ')').run(...vals);
      }
    }
  });
  tx(req.body);
  res.json({ ok: true });
});

// ===== Serve frontend =====
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ===== Start =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('L&J Planet 服务已启动，端口: ' + PORT));