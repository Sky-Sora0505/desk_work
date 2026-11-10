'use strict';
/**
 * My辞書 - サーバー
 * Node.js 標準機能のみ（http + node:sqlite）で動く、依存パッケージなしのAPIサーバー。
 * 複数の辞書を持てて、タグ（分野）は辞書ごとに管理する。
 *
 *   GET    /api/dictionaries                 辞書一覧（単語数・タグ数つき）
 *   POST   /api/dictionaries                 辞書を作成   {name}
 *   PUT    /api/dictionaries/:id             名前を変更   {name}
 *   DELETE /api/dictionaries/:id             辞書を削除（中の単語・タグも削除）
 *
 *   GET    /api/dictionaries/:id/words       その辞書の全単語（タグID付き）
 *   POST   /api/dictionaries/:id/words       単語を追加   {word, reading, meaning, tagIds}
 *   GET    /api/dictionaries/:id/tags        その辞書のタグ一覧
 *   POST   /api/dictionaries/:id/tags        タグを追加   {name, color}
 *   POST   /api/dictionaries/:id/import      CSVインポート {rows:[{word,reading,meaning,tags:[名前]}], mode}
 *   GET    /api/dictionaries/:id/export      CSVエクスポート（UTF-8 BOM付き）
 *
 *   PUT    /api/words/:id    DELETE /api/words/:id
 *   PUT    /api/tags/:id     DELETE /api/tags/:id
 *   GET    /api/health
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_BODY = 20 * 1024 * 1024; // 20MB
const FIRST_DICTIONARY = '基本情報辞書';
// 初回起動時に「基本情報辞書」へ入れる用語（SEED=0 で無効）
const SEED_FILE = path.join(__dirname, 'public', 'samples', 'fe_terms.csv');
const SEED_TAG_STYLE = [ // [タグ名, 色] … この順に並ぶ
  ['ネットワーク', 'blue'], ['セキュリティ', 'red'], ['データベース', 'yellow'], ['ハードウェア', 'green'],
  ['ソフトウェア', 'purple'], ['クラウド', 'blue'], ['プロジェクトマネジメント', 'orange'], ['システム監査', 'orange'],
  ['経営', 'gray'],
];

// Finder と同じ7色（並び順もFinderと同じ）
const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray'];

// ---------------------------------------------------------------- DB
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'dictionary.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

function migrate() {
  const version = db.prepare('PRAGMA user_version').get().user_version;
  if (version >= 2) return false;
  const hasOld = !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'tags'").get();

  db.exec('PRAGMA foreign_keys = OFF; BEGIN;');
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS dictionaries (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );`);
    db.prepare('INSERT INTO dictionaries(id, name, sort_order) VALUES (1, ?, 0)').run(FIRST_DICTIONARY);

    if (hasOld) {
      // v1（辞書が1つだけの版）→ v2：今までの単語・タグはすべて「基本情報辞書」へ
      db.exec(`
        ALTER TABLE words ADD COLUMN dictionary_id INTEGER NOT NULL DEFAULT 1;
        CREATE TABLE tags_v2 (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          dictionary_id INTEGER NOT NULL,
          name          TEXT NOT NULL,
          color         TEXT NOT NULL,
          sort_order    INTEGER NOT NULL DEFAULT 0,
          UNIQUE (dictionary_id, name)
        );
        INSERT INTO tags_v2(id, dictionary_id, name, color, sort_order)
          SELECT id, 1, name, color, sort_order FROM tags;
        DROP TABLE tags;
        ALTER TABLE tags_v2 RENAME TO tags;
        -- 色の名前だけの初期タグ（レッド等）で、どの単語にも使われていないものは削除
        DELETE FROM tags WHERE name IN ('レッド','オレンジ','イエロー','グリーン','ブルー','パープル','グレイ')
          AND id NOT IN (SELECT tag_id FROM word_tags);
      `);
    } else {
      db.exec(`
        CREATE TABLE words (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          word          TEXT NOT NULL,
          reading       TEXT NOT NULL DEFAULT '',
          meaning       TEXT NOT NULL,
          created_at    TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
          dictionary_id INTEGER NOT NULL DEFAULT 1
        );
        CREATE TABLE tags (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          dictionary_id INTEGER NOT NULL,
          name          TEXT NOT NULL,
          color         TEXT NOT NULL,
          sort_order    INTEGER NOT NULL DEFAULT 0,
          UNIQUE (dictionary_id, name)
        );
        CREATE TABLE word_tags (
          word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
          tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
          PRIMARY KEY (word_id, tag_id)
        );`);
    }
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_words_dict ON words(dictionary_id);
      CREATE INDEX IF NOT EXISTS idx_words_word ON words(dictionary_id, word);
      CREATE INDEX IF NOT EXISTS idx_tags_dict  ON tags(dictionary_id);
      PRAGMA user_version = 2;
      COMMIT;`);
    if (hasOld) console.log(`🔄 データを新しい形式に移行しました（今までの単語は「${FIRST_DICTIONARY}」に入っています）`);
    return !hasOld; // まっさらな状態から作ったときだけ true
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  } finally {
    db.exec('PRAGMA foreign_keys = ON;');
  }
}
const freshInstall = migrate();

const WORD_COLS = 'id, dictionary_id AS dictionaryId, word, reading, meaning, created_at AS createdAt, updated_at AS updatedAt';
const TAG_COLS = 'id, dictionary_id AS dictionaryId, name, color, sort_order AS sortOrder';
const stmt = {
  allDicts: db.prepare(`SELECT d.id, d.name, d.sort_order AS sortOrder,
      (SELECT COUNT(*) FROM words w WHERE w.dictionary_id = d.id) AS wordCount,
      (SELECT COUNT(*) FROM tags t WHERE t.dictionary_id = d.id) AS tagCount
    FROM dictionaries d ORDER BY d.sort_order, d.id`),
  getDict: db.prepare('SELECT id, name, sort_order AS sortOrder FROM dictionaries WHERE id = ?'),
  countDicts: db.prepare('SELECT COUNT(*) AS n FROM dictionaries'),
  maxDictOrder: db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM dictionaries'),
  insDict: db.prepare('INSERT INTO dictionaries(name, sort_order) VALUES (?, ?)'),
  updDict: db.prepare('UPDATE dictionaries SET name = ? WHERE id = ?'),
  delDict: db.prepare('DELETE FROM dictionaries WHERE id = ?'),
  delDictWords: db.prepare('DELETE FROM words WHERE dictionary_id = ?'),
  delDictTags: db.prepare('DELETE FROM tags WHERE dictionary_id = ?'),

  dictWords: db.prepare(`SELECT ${WORD_COLS} FROM words WHERE dictionary_id = ?`),
  dictWordTags: db.prepare('SELECT wt.word_id AS w, wt.tag_id AS t FROM word_tags wt JOIN words w ON w.id = wt.word_id WHERE w.dictionary_id = ?'),
  getWord: db.prepare(`SELECT ${WORD_COLS} FROM words WHERE id = ?`),
  wordTags: db.prepare('SELECT tag_id AS t FROM word_tags WHERE word_id = ?'),
  insWord: db.prepare('INSERT INTO words(dictionary_id, word, reading, meaning) VALUES (?, ?, ?, ?)'),
  updWord: db.prepare("UPDATE words SET word = ?, reading = ?, meaning = ?, updated_at = datetime('now') WHERE id = ?"),
  delWord: db.prepare('DELETE FROM words WHERE id = ?'),
  findDup: db.prepare('SELECT id FROM words WHERE dictionary_id = ? AND word = ? AND reading = ? LIMIT 1'),
  clearWordTags: db.prepare('DELETE FROM word_tags WHERE word_id = ?'),
  addWordTag: db.prepare('INSERT OR IGNORE INTO word_tags(word_id, tag_id) VALUES (?, ?)'),

  dictTags: db.prepare(`SELECT ${TAG_COLS} FROM tags WHERE dictionary_id = ? ORDER BY sort_order, id`),
  getTag: db.prepare(`SELECT ${TAG_COLS} FROM tags WHERE id = ?`),
  tagByName: db.prepare('SELECT id FROM tags WHERE dictionary_id = ? AND name = ?'),
  countTags: db.prepare('SELECT COUNT(*) AS n, COALESCE(MAX(sort_order), -1) AS m FROM tags WHERE dictionary_id = ?'),
  insTag: db.prepare('INSERT INTO tags(dictionary_id, name, color, sort_order) VALUES (?, ?, ?, ?)'),
  updTag: db.prepare('UPDATE tags SET name = ?, color = ? WHERE id = ?'),
  delTag: db.prepare('DELETE FROM tags WHERE id = ?'),
};

function tx(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

function wordWithTags(id) {
  const w = stmt.getWord.get(id);
  if (!w) return null;
  return { ...w, tagIds: stmt.wordTags.all(id).map(r => r.t) };
}

// ---------------------------------------------------------------- 入力チェック
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

const clean = (v, max) => String(v ?? '').replace(/\r\n?/g, '\n').trim().slice(0, max);

function needDict(id) {
  const d = stmt.getDict.get(id);
  if (!d) throw new HttpError(404, '辞書が見つかりません');
  return d;
}

function validateWord(body) {
  const word = clean(body.word, 200);
  const reading = clean(body.reading, 200);
  const meaning = clean(body.meaning, 10000);
  if (!word) throw new HttpError(400, '単語を入力してください');
  if (!meaning) throw new HttpError(400, '意味を入力してください');
  const tagIds = Array.isArray(body.tagIds) ? [...new Set(body.tagIds.map(Number).filter(Number.isInteger))] : [];
  return { word, reading, meaning, tagIds };
}

function validateTag(body) {
  const name = clean(body.name, 40);
  const color = COLORS.includes(body.color) ? body.color : 'gray';
  if (!name) throw new HttpError(400, 'タグ名を入力してください');
  return { name, color };
}

function validateDictName(body) {
  const name = clean(body.name, 60).replace(/\n/g, ' ');
  if (!name) throw new HttpError(400, '辞書の名前を入力してください');
  return name;
}

// 同じ辞書のタグだけを付ける
function setWordTags(wordId, dictId, tagIds) {
  stmt.clearWordTags.run(wordId);
  for (const t of tagIds) {
    const tag = stmt.getTag.get(t);
    if (tag && tag.dictionaryId === dictId) stmt.addWordTag.run(wordId, t);
  }
}

function createTag(dictId, name, color) {
  const { n, m } = stmt.countTags.get(dictId);
  const c = COLORS.includes(color) ? color : COLORS[n % COLORS.length];
  return Number(stmt.insTag.run(dictId, name, c, m + 1).lastInsertRowid);
}

// CSVのタグ名 → タグID（無ければその辞書に作る）
function resolveTagName(dictId, raw, created) {
  const name = clean(raw, 40);
  if (!name) return null;
  const hit = stmt.tagByName.get(dictId, name);
  if (hit) return hit.id;
  created.push(name);
  return createTag(dictId, name);
}

// ---------------------------------------------------------------- CSV出力
function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function exportCsv(dictId) {
  const tags = new Map(stmt.dictTags.all(dictId).map(t => [t.id, t.name]));
  const wt = new Map();
  for (const { w, t } of stmt.dictWordTags.all(dictId)) {
    if (!wt.has(w)) wt.set(w, []);
    wt.get(w).push(tags.get(t));
  }
  const lines = ['単語,読み,意味,タグ'];
  for (const w of stmt.dictWords.all(dictId)) {
    lines.push([w.word, w.reading, w.meaning, (wt.get(w.id) || []).join(';')].map(csvCell).join(','));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

// ---------------------------------------------------------------- API
function importRows(dictId, body) {
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const mode = ['skip', 'overwrite', 'append'].includes(body.mode) ? body.mode : 'skip';
  if (rows.length === 0) throw new HttpError(400, '取り込むデータがありません');
  if (rows.length > 50000) throw new HttpError(400, '一度に取り込めるのは50,000件までです');
  const result = { added: 0, updated: 0, skipped: 0, errors: [], createdTags: [] };
  tx(() => {
    rows.forEach((r, i) => {
      const word = clean(r.word, 200), reading = clean(r.reading, 200), meaning = clean(r.meaning, 10000);
      if (!word || !meaning) { result.errors.push({ row: r.line ?? i + 1, message: !word ? '単語が空です' : '意味が空です' }); return; }
      const tagIds = (Array.isArray(r.tags) ? r.tags : [])
        .map(n => resolveTagName(dictId, n, result.createdTags)).filter(x => x != null);
      const dup = mode === 'append' ? null : stmt.findDup.get(dictId, word, reading);
      if (dup && mode === 'skip') { result.skipped++; return; }
      if (dup && mode === 'overwrite') {
        stmt.updWord.run(word, reading, meaning, dup.id);
        setWordTags(dup.id, dictId, tagIds);
        result.updated++;
        return;
      }
      const nid = Number(stmt.insWord.run(dictId, word, reading, meaning).lastInsertRowid);
      setWordTags(nid, dictId, tagIds);
      result.added++;
    });
  });
  return result;
}

async function api(req, res, url) {
  const p = url.pathname.split('/').filter(Boolean).slice(1); // ['dictionaries', '1', 'words']
  const m = req.method;
  const num = s => {
    if (s === undefined) return undefined;
    const n = Number(s);
    if (!Number.isInteger(n)) throw new HttpError(400, 'IDが不正です');
    return n;
  };

  if (p[0] === 'health') return send(res, 200, { ok: true });

  // ---- 辞書
  if (p[0] === 'dictionaries') {
    const id = num(p[1]);
    const sub = p[2];

    if (id === undefined) {
      if (m === 'GET') return send(res, 200, stmt.allDicts.all());
      if (m === 'POST') {
        const name = validateDictName(await readJson(req));
        const nid = Number(stmt.insDict.run(name, stmt.maxDictOrder.get().m + 1).lastInsertRowid);
        return send(res, 201, stmt.allDicts.all().find(d => d.id === nid));
      }
    }

    if (id !== undefined && sub === undefined) {
      if (m === 'PUT') {
        needDict(id);
        stmt.updDict.run(validateDictName(await readJson(req)), id);
        return send(res, 200, stmt.allDicts.all().find(d => d.id === id));
      }
      if (m === 'DELETE') {
        needDict(id);
        if (stmt.countDicts.get().n <= 1) throw new HttpError(400, '最後の1つの辞書は削除できません');
        tx(() => { stmt.delDictWords.run(id); stmt.delDictTags.run(id); stmt.delDict.run(id); });
        return send(res, 204);
      }
    }

    if (id !== undefined && sub === 'words') {
      needDict(id);
      if (m === 'GET') {
        const wt = new Map();
        for (const { w, t } of stmt.dictWordTags.all(id)) {
          if (!wt.has(w)) wt.set(w, []);
          wt.get(w).push(t);
        }
        return send(res, 200, stmt.dictWords.all(id).map(w => ({ ...w, tagIds: wt.get(w.id) || [] })));
      }
      if (m === 'POST') {
        const v = validateWord(await readJson(req));
        const nid = tx(() => {
          const wid = Number(stmt.insWord.run(id, v.word, v.reading, v.meaning).lastInsertRowid);
          setWordTags(wid, id, v.tagIds);
          return wid;
        });
        return send(res, 201, wordWithTags(nid));
      }
    }

    if (id !== undefined && sub === 'tags') {
      needDict(id);
      if (m === 'GET') return send(res, 200, stmt.dictTags.all(id));
      if (m === 'POST') {
        const body = await readJson(req);
        const v = validateTag({ color: COLORS[stmt.countTags.get(id).n % COLORS.length], ...body });
        if (stmt.tagByName.get(id, v.name)) throw new HttpError(409, '同じ名前のタグがあります');
        return send(res, 201, stmt.getTag.get(createTag(id, v.name, v.color)));
      }
    }

    if (id !== undefined && sub === 'import' && m === 'POST') {
      needDict(id);
      return send(res, 200, importRows(id, await readJson(req)));
    }

    if (id !== undefined && sub === 'export' && m === 'GET') {
      const d = needDict(id);
      const date = new Date().toISOString().slice(0, 10);
      const fname = `${d.name}-${date}.csv`;
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="dictionary-${date}.csv"; filename*=UTF-8''${encodeURIComponent(fname)}`,
        'Cache-Control': 'no-store',
      });
      return res.end(exportCsv(id));
    }
  }

  // ---- 単語（IDで操作）
  if (p[0] === 'words' && p[1] !== undefined && p.length === 2) {
    const id = num(p[1]);
    const cur = stmt.getWord.get(id);
    if (m === 'PUT') {
      if (!cur) throw new HttpError(404, '単語が見つかりません');
      const v = validateWord(await readJson(req));
      tx(() => { stmt.updWord.run(v.word, v.reading, v.meaning, id); setWordTags(id, cur.dictionaryId, v.tagIds); });
      return send(res, 200, wordWithTags(id));
    }
    if (m === 'DELETE') { stmt.delWord.run(id); return send(res, 204); }
  }

  // ---- タグ（IDで操作）
  if (p[0] === 'tags' && p[1] !== undefined && p.length === 2) {
    const id = num(p[1]);
    const cur = stmt.getTag.get(id);
    if (m === 'PUT') {
      if (!cur) throw new HttpError(404, 'タグが見つかりません');
      const v = validateTag({ name: cur.name, color: cur.color, ...(await readJson(req)) });
      const same = stmt.tagByName.get(cur.dictionaryId, v.name);
      if (same && same.id !== id) throw new HttpError(409, '同じ名前のタグがあります');
      stmt.updTag.run(v.name, v.color, id);
      return send(res, 200, stmt.getTag.get(id));
    }
    if (m === 'DELETE') { stmt.delTag.run(id); return send(res, 204); }
  }

  throw new HttpError(404, 'APIが見つかりません');
}

// ---------------------------------------------------------------- HTTP基盤
function send(res, status, data) {
  if (status === 204) { res.writeHead(204); return res.end(); }
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(new HttpError(413, 'データが大きすぎます（上限20MB）')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch { reject(new HttpError(400, 'JSONの形式が不正です')); }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.csv': 'text/csv; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      return fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, html) => {
        if (e2) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
        res.end(html);
      });
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method Not Allowed');
    serveStatic(req, res, url);
  } catch (e) {
    let status = e.status || 500;
    let msg = e.message;
    if (status === 500 && /UNIQUE constraint/.test(e.message)) { status = 409; msg = '同じ名前のタグがあります'; }
    if (status === 500) { console.error(e); msg = 'サーバーエラーが発生しました'; }
    if (!res.headersSent) send(res, status, { error: msg });
  }
});

// ---------------------------------------------------------------- 初期データ
function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
      continue;
    }
    if (c === '"' && cell === '') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\r') { /* skip */ }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

function seedFirstDictionary() {
  if (!freshInstall || process.env.SEED === '0' || !fs.existsSync(SEED_FILE)) return;
  const [, ...data] = parseCsv(fs.readFileSync(SEED_FILE, 'utf8'));
  const rows = data.map(([word, reading, meaning, tags], i) => ({
    line: i + 2, word, reading, meaning, tags: String(tags || '').split(';').map(t => t.trim()).filter(Boolean),
  }));
  const r = importRows(1, { rows, mode: 'append' });
  SEED_TAG_STYLE.forEach(([name, color], i) => {
    const t = stmt.tagByName.get(1, name);
    if (t) db.prepare('UPDATE tags SET color = ?, sort_order = ? WHERE id = ?').run(color, i, t.id);
  });
  console.log(`📚 「${FIRST_DICTIONARY}」に初期データ ${r.added} 語を入れました`);
}
seedFirstDictionary();

server.listen(PORT, HOST, () => console.log(`📖 My辞書: http://${HOST}:${PORT}  (data: ${DATA_DIR})`));

function shutdown() { server.close(() => { db.close(); process.exit(0); }); setTimeout(() => process.exit(0), 3000); }
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
