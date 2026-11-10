'use strict';
/* ==================================================================
   My辞書 — フロントエンド（フレームワークなし）
   ・複数の辞書を左上メニューから切り替え
   ・タグ（分野）は辞書ごと。「タグで絞り込む」から選択・作成・編集
   ================================================================== */

const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray'];
const COLOR_LABEL = { red: 'レッド', orange: 'オレンジ', yellow: 'イエロー', green: 'グリーン', blue: 'ブルー', purple: 'パープル', gray: 'グレイ' };
const RESULT_LIMIT = 200;
const VERSION = '2.0';

const state = {
  dicts: loadJSON('dict.dicts', []),
  dictId: Number(loadJSON('dict.current', 0)) || null,
  words: [],
  tags: [],
  filter: new Set(),
  query: '',
  offline: false,
};

const $ = sel => document.querySelector(sel);
const els = {
  top: $('#top'), dictName: $('#dictName'), menuBtn: $('#menuBtn'), count: $('#count'), filters: $('#filters'),
  list: $('#list'), empty: $('#empty'), index: $('#index'), bubble: $('#indexBubble'), toolbar: $('#toolbar'),
  form: $('#searchForm'), q: $('#q'), clear: $('#clear'), plus: $('#plus'), scrim: $('#scrim'),
  host: $('#sheetHost'), toast: $('#toast'),
};

/* ------------------------------------------------------------------ 小道具 */
function loadJSON(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } }
function saveJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* 容量不足などは無視 */ } }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const svgIcon = (path, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}>${path}</svg>`;
const ICON = {
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  word: '<path d="M4 19.5V5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2.5Z"/><path d="M8 7h6M8 11h4"/>',
  book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2.5Z"/>',
  csv: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 13h6M9 17h6"/>',
  download: '<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.6"/>',
  upload: '<path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="m6 6 12 12M18 6 6 18" stroke="currentColor" fill="none" stroke-linecap="round"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  more: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
};

let toastTimer;
function toast(msg, isError = false) {
  els.toast.textContent = msg;
  els.toast.classList.toggle('error', isError);
  els.toast.hidden = false;
  requestAnimationFrame(() => els.toast.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.remove('show');
    setTimeout(() => { els.toast.hidden = true; }, 260);
  }, isError ? 3800 : 2200);
}

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `通信エラー（${res.status}）`);
  return data;
}
const dictUrl = (sub = '') => `api/dictionaries/${state.dictId}${sub}`;
const currentDict = () => state.dicts.find(d => d.id === state.dictId);

/* ------------------------------------------------------------------ 正規化（検索エンジンの土台）
   全角/半角・大文字/小文字・カタカナ/ひらがな の違いを吸収する */
function norm(s) {
  return String(s ?? '').normalize('NFKC').toLowerCase()
    .replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
}
// 正規化後の位置 → 元の文字列の位置 の対応表つき（ハイライト用）
function normMap(s) {
  s = String(s ?? '');
  let n = ''; const start = []; const end = [];
  for (let i = 0; i < s.length;) {
    const cp = s.codePointAt(i); const ch = String.fromCodePoint(cp); const len = ch.length;
    const piece = norm(ch);
    for (let k = 0; k < piece.length; k++) { start.push(i); end.push(i + len); }
    n += piece; i += len;
  }
  return { n, start, end };
}

const KANJI = /[㐀-䶿一-鿿豈-﫿々〆ヶ]/;
const KANA_ROWS = [
  ['あ', 'あいうえおぁぃぅぇぉゔ'], ['か', 'かきくけこがぎぐげごゕゖ'], ['さ', 'さしすせそざじずぜぞ'],
  ['た', 'たちつてとだぢづでどっ'], ['な', 'なにぬねの'], ['は', 'はひふへほばびぶべぼぱぴぷぺぽ'],
  ['ま', 'まみむめも'], ['や', 'やゆよゃゅょ'], ['ら', 'らりるれろ'], ['わ', 'わをんゐゑゎ'],
];
const SECTION_ORDER = [...KANA_ROWS.map(r => r[0]), ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'];
const collator = new Intl.Collator('ja', { sensitivity: 'base', numeric: true });

function sectionOf(key) {
  const c = key.charAt(0);
  for (const [head, chars] of KANA_ROWS) if (chars.includes(c)) return head;
  if (c >= 'a' && c <= 'z') return c.toUpperCase();
  return '#';
}

function prepare(w) {
  w._w = norm(w.word); w._r = norm(w.reading); w._m = norm(w.meaning);
  w._key = w._r || w._w;
  w._sec = sectionOf(w._key);
  w._secIdx = SECTION_ORDER.indexOf(w._sec);
  return w;
}
function compareWords(a, b) {
  return a._secIdx - b._secIdx || collator.compare(a._key, b._key) || collator.compare(a.word, b.word) || a.id - b.id;
}

/* ------------------------------------------------------------------ 検索エンジン
   ・スペース区切りで AND 検索
   ・一致の種類で点数をつけて並べ替え（完全一致 > 前方一致 > 部分一致 > 意味の中）
   ・どこにも無いときは1〜2文字違いまで「あいまい一致」で拾う */
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

function scoreTerm(w, t) {
  if (w._w === t) return 100;
  if (w._r && w._r === t) return 95;
  if (w._w.startsWith(t)) return 80 - Math.min(10, w._w.length - t.length) * 0.5;
  if (w._r.startsWith(t)) return 75 - Math.min(10, w._r.length - t.length) * 0.5;
  if (w._w.includes(t)) return 60;
  if (w._r.includes(t)) return 55;
  const mi = w._m.indexOf(t);
  if (mi >= 0) return mi < 20 ? 34 : 28;
  if (t.length >= 3) {
    const max = t.length >= 6 ? 2 : 1;
    for (const f of [w._w, w._r]) {
      if (!f) continue;
      if (editDistance(t, f, max) <= max) return 18;
      if (f.length > t.length && editDistance(t, f.slice(0, t.length), max) <= max) return 14;
    }
  }
  return 0;
}

function search(words, query) {
  const terms = norm(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return null;
  const out = [];
  for (const w of words) {
    let total = 0; let fuzzy = false;
    for (const t of terms) {
      const s = scoreTerm(w, t);
      if (!s) { total = 0; break; }
      if (s < 20) fuzzy = true;
      total += s;
    }
    if (total) out.push({ w, score: total, fuzzy });
  }
  out.sort((a, b) => b.score - a.score || compareWords(a.w, b.w));
  return { terms, results: out };
}

function highlight(text, terms, { snippet = false } = {}) {
  text = String(text ?? '');
  if (!terms || !terms.length) return esc(text);
  const { n, start, end } = normMap(text);
  const ranges = [];
  for (const t of terms) {
    let from = 0, i;
    while (t && (i = n.indexOf(t, from)) !== -1) {
      ranges.push([start[i], end[i + t.length - 1]]);
      from = i + t.length;
    }
  }
  if (!ranges.length) return esc(snippet ? text.slice(0, 120) : text);
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [ranges[0]];
  for (const r of ranges.slice(1)) {
    const last = merged[merged.length - 1];
    if (r[0] <= last[1]) last[1] = Math.max(last[1], r[1]); else merged.push(r);
  }
  let offset = 0; let prefix = '';
  if (snippet && merged[0][0] > 24) { offset = merged[0][0] - 16; prefix = '…'; }
  let html = prefix; let pos = offset;
  for (const [a, b] of merged) {
    if (b <= pos) continue;
    html += esc(text.slice(pos, Math.max(pos, a))) + '<mark>' + esc(text.slice(Math.max(pos, a), b)) + '</mark>';
    pos = b;
  }
  html += esc(text.slice(pos, snippet ? pos + 160 : undefined));
  return html;
}

/* ------------------------------------------------------------------ データ読み込み */
const cacheKey = () => `dict.cache.${state.dictId}`;
function saveCache() {
  saveJSON(cacheKey(), { words: state.words.map(stripPrivate), tags: state.tags });
  saveJSON('dict.dicts', state.dicts);
}
function stripPrivate(w) { const o = {}; for (const k in w) if (k[0] !== '_') o[k] = w[k]; return o; }
function loadFilter() {
  state.filter = new Set(loadJSON(`dict.filter.${state.dictId}`, []));
}
function saveFilter() { saveJSON(`dict.filter.${state.dictId}`, [...state.filter]); }

async function loadAll() {
  try {
    state.dicts = await api('GET', 'api/dictionaries');
    if (!state.dicts.some(d => d.id === state.dictId)) state.dictId = state.dicts[0]?.id ?? null;
    saveJSON('dict.current', state.dictId);
    loadFilter();
    renderHeader();
    const [words, tags] = await Promise.all([api('GET', dictUrl('/words')), api('GET', dictUrl('/tags'))]);
    state.words = words.map(prepare);
    state.tags = tags;
    state.offline = false;
    saveCache();
  } catch (e) {
    if (!state.dictId && state.dicts.length) state.dictId = state.dicts[0].id;
    const cache = loadJSON(cacheKey(), null);
    if (cache) {
      state.words = cache.words.map(prepare);
      state.tags = cache.tags;
      state.offline = true;
      loadFilter();
      toast('サーバーに接続できません。保存済みのデータを表示しています', true);
    } else {
      state.words = []; state.tags = [];
      toast(e.message, true);
    }
  }
  const valid = new Set(state.tags.map(t => t.id));
  for (const id of [...state.filter]) if (!valid.has(id)) state.filter.delete(id);
  render();
}

async function switchDict(id) {
  if (id === state.dictId) return;
  state.dictId = id;
  saveJSON('dict.current', id);
  state.query = ''; els.q.value = ''; els.clear.hidden = true;
  const cache = loadJSON(cacheKey(), null);
  state.words = cache ? cache.words.map(prepare) : [];
  state.tags = cache ? cache.tags : [];
  loadFilter();
  render();
  window.scrollTo({ top: 0 });
  await loadAll();
}

function upsertLocal(word) {
  prepare(word);
  const i = state.words.findIndex(w => w.id === word.id);
  if (i >= 0) state.words[i] = word; else state.words.push(word);
  syncDictCount();
  saveCache();
}
function syncDictCount() {
  const d = currentDict();
  if (d) { d.wordCount = state.words.length; d.tagCount = state.tags.length; }
}
const tagById = id => state.tags.find(t => t.id === id);
const sortedTags = () => [...state.tags].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
function tagCounts() {
  const c = new Map();
  for (const w of state.words) for (const id of w.tagIds) c.set(id, (c.get(id) || 0) + 1);
  return c;
}

async function createTag(name, color) {
  const t = await api('POST', dictUrl('/tags'), color ? { name, color } : { name });
  state.tags.push(t);
  syncDictCount(); saveCache(); renderFilters();
  return t;
}

/* ------------------------------------------------------------------ 画面描画 */
function render() {
  renderHeader();
  renderFilters();
  renderList();
}

function renderHeader() {
  const d = currentDict();
  els.dictName.textContent = d ? d.name : '辞書';
  document.title = d ? `${d.name} - My辞書` : 'My辞書';
}

function renderFilters() {
  const picked = sortedTags().filter(t => state.filter.has(t.id));
  const n = picked.length;
  let html = `<button class="chip select ${n ? 'active' : ''}" data-act="pick" aria-haspopup="dialog">${svgIcon(ICON.tag)}${n ? `タグ ${n}` : 'タグで絞り込む'}</button>`;
  for (const t of picked) {
    html += `<span class="chip picked"><span class="dot c-${t.color}"></span>${esc(t.name)}<button class="x" data-remove="${t.id}" aria-label="${esc(t.name)}の絞り込みを外す">${svgIcon(ICON.x)}</button></span>`;
  }
  if (n > 1) html += '<button class="chip clear-all" data-act="clear">解除</button>';
  els.filters.innerHTML = html;
}

els.filters.addEventListener('click', e => {
  const rm = e.target.closest('[data-remove]');
  if (rm) { state.filter.delete(Number(rm.dataset.remove)); saveFilter(); renderFilters(); renderList(); return; }
  const a = e.target.closest('[data-act]')?.dataset.act;
  if (a === 'pick') openTagSheet('filter');
  if (a === 'clear') { state.filter.clear(); saveFilter(); renderFilters(); renderList(); }
});

function filtered() {
  if (!state.filter.size) return state.words;
  return state.words.filter(w => w.tagIds.some(id => state.filter.has(id)));
}

function tagDots(w) {
  const ts = w.tagIds.map(tagById).filter(Boolean).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  if (!ts.length) return '';
  return `<span class="tagdots" aria-label="タグ: ${esc(ts.map(t => t.name).join('、'))}">${ts.slice(0, 5).map(t => `<span class="dot c-${t.color}"></span>`).join('')}</span>`;
}

function rowHTML(w, terms) {
  const reading = w.reading ? `<span class="r">${highlight(w.reading, terms)}</span>` : '';
  const meaning = terms ? highlight(w.meaning.replace(/\s+/g, ' '), terms, { snippet: true }) : esc(w.meaning.replace(/\s+/g, ' '));
  return `<button class="row" data-id="${w.id}">
    <div class="row-main">
      <div class="row-word"><span class="w">${highlight(w.word, terms)}</span>${reading}</div>
      <div class="row-meaning">${meaning}</div>
    </div>${tagDots(w)}</button>`;
}

function renderList() {
  const base = filtered();
  const offline = state.offline ? '<span class="offline-badge">オフライン</span>' : '';
  els.count.innerHTML = `${base.length.toLocaleString()} 語${offline}`;
  const s = search(base, state.query);
  els.list.classList.toggle('results', !!s);

  if (s) {
    els.index.innerHTML = '';
    if (!s.results.length) return showEmpty('search');
    els.empty.hidden = true;
    const shown = s.results.slice(0, RESULT_LIMIT);
    const fuzzyOnly = s.results.every(r => r.fuzzy);
    els.list.innerHTML =
      `<div class="results-head"><b>${s.results.length.toLocaleString()}</b> 件${fuzzyOnly ? '<span class="hint">あいまい一致</span>' : ''}${s.results.length > RESULT_LIMIT ? `<span class="hint">上位${RESULT_LIMIT}件を表示</span>` : ''}</div>` +
      `<div class="section"><div class="group">${shown.map(r => rowHTML(r.w, s.terms)).join('')}</div></div>`;
    return;
  }

  if (!base.length) { els.index.innerHTML = ''; return showEmpty(state.words.length ? 'filter' : 'first'); }
  els.empty.hidden = true;
  const sorted = [...base].sort(compareWords);
  let html = ''; let cur = null; const secs = [];
  for (const w of sorted) {
    if (w._sec !== cur) {
      if (cur !== null) html += '</div></section>';
      cur = w._sec; secs.push(cur);
      html += `<section class="section" id="sec-${encodeURIComponent(cur)}" data-sec="${esc(cur)}"><div class="section-head">${esc(cur === '#' ? '#（数字・記号・読み未入力）' : cur)}</div><div class="group">`;
    }
    html += rowHTML(w, null);
  }
  html += '</div></section>';
  els.list.innerHTML = html;
  els.index.innerHTML = secs.map(s => `<span data-sec="${esc(s)}">${esc(s)}</span>`).join('');
}

function showEmpty(kind) {
  els.list.innerHTML = '';
  els.empty.hidden = false;
  const name = currentDict()?.name || 'この辞書';
  if (kind === 'search') {
    els.empty.innerHTML = `<div class="big">🔍</div><h2>見つかりませんでした</h2><p>「${esc(state.query)}」に一致する単語は「${esc(name)}」にありません</p><button class="btn" data-act="add-q">「${esc(state.query.slice(0, 20))}」を追加</button>`;
  } else if (kind === 'filter') {
    els.empty.innerHTML = `<div class="big">🏷️</div><h2>このタグの単語はありません</h2><p>単語を開いてタグをタップすると付けられます</p>`;
  } else {
    els.empty.innerHTML = `<div class="big">📖</div><h2>「${esc(name)}」はまだ空です</h2><p>右下の ＋ から単語を追加するか、CSVで一括インポートできます</p><button class="btn" data-act="add">単語を追加</button><br><button class="btn secondary" data-act="csv">CSVからインポート</button>`;
  }
}
els.empty.addEventListener('click', e => {
  const a = e.target.closest('[data-act]')?.dataset.act;
  if (a === 'add-q') openWordForm(null, { word: state.query.trim() });
  if (a === 'add') openWordForm();
  if (a === 'csv') openImport();
});

els.list.addEventListener('click', e => {
  const row = e.target.closest('.row'); if (!row) return;
  const w = state.words.find(x => x.id === Number(row.dataset.id));
  if (w) openDetail(w);
});

/* ------------------------------------------------------------------ 検索バー */
let searchTimer;
els.q.addEventListener('input', () => {
  els.clear.hidden = !els.q.value;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.query = els.q.value;
    renderList();
    window.scrollTo({ top: 0 });
  }, 60);
});
els.form.addEventListener('submit', e => { e.preventDefault(); els.q.blur(); });
els.clear.addEventListener('click', () => {
  els.q.value = ''; state.query = ''; els.clear.hidden = true;
  renderList(); els.q.focus();
});
els.form.addEventListener('click', () => { els.toolbar.classList.remove('compact'); });

// キーボードが出たとき、検索バーをキーボードのすぐ上に移動（iOS Safari対策）
if (window.visualViewport) {
  const vv = window.visualViewport;
  const onVV = () => {
    const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    els.toolbar.style.transform = kb > 40 ? `translateY(${-kb}px)` : '';
    els.toolbar.style.paddingBottom = kb > 40 ? '10px' : '';
  };
  vv.addEventListener('resize', onVV);
  vv.addEventListener('scroll', onVV);
}

// Safari と同じく、下へスクロールすると検索バーが小さくなる
let lastY = window.scrollY;
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  els.top.classList.toggle('scrolled', y > 4);
  if (document.activeElement === els.q) { lastY = y; return; }
  const atBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 30;
  if (y - lastY > 12 && y > 80 && !atBottom) els.toolbar.classList.add('compact');
  else if (lastY - y > 12 || atBottom || y < 40) els.toolbar.classList.remove('compact');
  if (Math.abs(y - lastY) > 12) lastY = y;
}, { passive: true });

// ヘッダーの高さ → 見出しの吸着位置
new ResizeObserver(([entry]) => {
  document.documentElement.style.setProperty('--head-h', Math.round(entry.borderBoxSize?.[0]?.blockSize ?? els.top.offsetHeight) + 'px');
}).observe(els.top);

/* ------------------------------------------------------------------ 右端の索引 */
let bubbleTimer;
function jumpFromTouch(clientY) {
  const spans = [...els.index.children]; if (!spans.length) return;
  let target = spans[0];
  for (const s of spans) { const r = s.getBoundingClientRect(); if (clientY >= r.top) target = s; }
  const sec = target.dataset.sec;
  const el = document.getElementById('sec-' + encodeURIComponent(sec));
  if (!el) return;
  const headH = els.top.offsetHeight;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - headH + 1 });
  if (els.bubble.textContent !== sec) navigator.vibrate?.(4);
  els.bubble.textContent = sec; els.bubble.hidden = false;
  clearTimeout(bubbleTimer);
}
els.index.addEventListener('pointerdown', e => {
  els.index.setPointerCapture(e.pointerId);
  jumpFromTouch(e.clientY);
});
els.index.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') jumpFromTouch(e.clientY); });
const hideBubble = () => { bubbleTimer = setTimeout(() => { els.bubble.hidden = true; els.bubble.textContent = ''; }, 350); };
els.index.addEventListener('pointerup', hideBubble);
els.index.addEventListener('pointercancel', hideBubble);

/* ------------------------------------------------------------------ 重ねて表示する画面（シート・メニュー）
   Androidの戻るボタンでも閉じられるよう履歴と連動 */
const stack = [];
const popResolvers = [];

function syncScrim() {
  const open = stack.length > 0;
  if (open) { els.scrim.hidden = false; requestAnimationFrame(() => els.scrim.classList.add('show')); }
  else { els.scrim.classList.remove('show'); setTimeout(() => { if (!stack.length) els.scrim.hidden = true; }, 260); }
  document.body.style.overflow = open ? 'hidden' : '';
}

function pushLayer(el, onClose) {
  const layer = { el, onClose };
  el.style.zIndex = 60 + stack.length * 2;
  els.scrim.style.zIndex = 59 + stack.length * 2;
  stack.push(layer);
  els.host.appendChild(el);
  history.pushState({ dictLayer: stack.length }, '');
  syncScrim();
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
  return layer;
}

function destroyTop() {
  const layer = stack.pop(); if (!layer) return;
  layer.el.classList.remove('show');
  setTimeout(() => layer.el.remove(), 330);
  els.scrim.style.zIndex = 59 + Math.max(0, stack.length - 1) * 2;
  syncScrim();
  layer.onClose?.();
}

function closeTop() {
  return new Promise(resolve => {
    if (!stack.length) return resolve();
    popResolvers.push(resolve);
    history.back();
  });
}
window.addEventListener('popstate', () => {
  destroyTop();
  const r = popResolvers.shift(); r?.();
});
els.scrim.addEventListener('click', () => closeTop());

function openSheet({ title, left, right, body, onClose }) {
  const el = document.createElement('div');
  el.className = 'sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', title || '');
  el.innerHTML = `<div class="grabber"></div>
    <div class="sheet-head">
      <div class="left">${left ? `<button class="link" data-h="left">${esc(left.label)}</button>` : ''}</div>
      <h2>${esc(title || '')}</h2>
      <div class="right">${right ? `<button class="link ${right.strong ? 'strong' : ''}" data-h="right">${esc(right.label)}</button>` : ''}</div>
    </div>
    <div class="sheet-body"></div>`;
  const bodyEl = el.querySelector('.sheet-body');
  if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
  el.querySelector('[data-h="left"]')?.addEventListener('click', () => (left.onClick ? left.onClick() : closeTop()));
  el.querySelector('[data-h="right"]')?.addEventListener('click', () => (right.onClick ? right.onClick() : closeTop()));
  enableDragToClose(el);
  pushLayer(el, onClose);
  return { el, body: bodyEl, leftBtn: el.querySelector('[data-h="left"]'), rightBtn: el.querySelector('[data-h="right"]'), titleEl: el.querySelector('h2') };
}

function enableDragToClose(el) {
  let startY = null, dy = 0;
  const handles = [el.querySelector('.grabber'), el.querySelector('.sheet-head')];
  handles.forEach(h => {
    h.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      startY = e.clientY; dy = 0; el.classList.add('dragging'); h.setPointerCapture(e.pointerId);
    });
    h.addEventListener('pointermove', e => {
      if (startY === null) return;
      dy = Math.max(0, e.clientY - startY);
      el.style.transform = `translateY(${dy}px)`;
    });
    const end = () => {
      if (startY === null) return;
      el.classList.remove('dragging'); el.style.transform = '';
      if (dy > 110) closeTop();
      startY = null;
    };
    h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
  });
}

/* ------------------------------------------------------------------ 左上メニュー（ドロワー） */
els.menuBtn.addEventListener('click', () => openMenu());

function openMenu() {
  const el = document.createElement('aside');
  el.className = 'drawer'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'メニュー');
  syncDictCount();
  const cur = currentDict();
  const dictRows = state.dicts.map(d => `
    <div class="menu-item ${d.id === state.dictId ? 'current' : ''}" role="button" tabindex="0" data-dict="${d.id}">
      <span class="mi ${d.id === state.dictId ? 'book' : ''}">${svgIcon(ICON.book)}</span>
      <span class="label">${esc(d.name)}</span>
      <span class="num">${(d.wordCount ?? 0).toLocaleString()}</span>
      <button class="more" data-dict-settings="${d.id}" aria-label="${esc(d.name)}の設定">${svgIcon(ICON.more)}</button>
    </div>`).join('');
  el.innerHTML = `
    <div class="drawer-head"><img src="icon.svg" alt=""><b>My辞書</b></div>
    <div class="drawer-body">
      <div class="group-title">辞書</div>
      <div class="menu-group">
        ${dictRows}
        <button class="menu-item add" data-m="new-dict"><span class="mi">${svgIcon(ICON.plus)}</span><span class="label">新しい辞書を作る</span></button>
      </div>
      <div class="group-title">「${esc(cur?.name || '')}」</div>
      <div class="menu-group">
        <button class="menu-item" data-m="add"><span class="mi">${svgIcon(ICON.word)}</span><span class="label">単語を追加</span></button>
        <button class="menu-item" data-m="csv"><span class="mi">${svgIcon(ICON.csv)}</span><span class="label">CSVからインポート</span></button>
        <button class="menu-item" data-m="export"><span class="mi">${svgIcon(ICON.download)}</span><span class="label">CSVにエクスポート</span></button>
        <button class="menu-item" data-m="tags"><span class="mi">${svgIcon(ICON.tag)}</span><span class="label">タグ（分野）を管理</span><span class="num">${state.tags.length}</span></button>
        <button class="menu-item" data-m="settings"><span class="mi">${svgIcon(ICON.gear)}</span><span class="label">辞書の名前・削除</span></button>
      </div>
      <p class="drawer-foot">データは自分のサーバーに保存されています · v${VERSION}</p>
    </div>`;

  el.addEventListener('click', async e => {
    const s = e.target.closest('[data-dict-settings]');
    if (s) { e.stopPropagation(); const d = state.dicts.find(x => x.id === Number(s.dataset.dictSettings)); await closeTop(); if (d) openDictSettings(d); return; }
    const dRow = e.target.closest('[data-dict]');
    if (dRow) { const id = Number(dRow.dataset.dict); await closeTop(); switchDict(id); return; }
    const m = e.target.closest('[data-m]')?.dataset.m; if (!m) return;
    await closeTop();
    if (m === 'new-dict') openNewDict();
    if (m === 'add') openWordForm();
    if (m === 'csv') openImport();
    if (m === 'export') location.href = dictUrl('/export');
    if (m === 'tags') openTagSheet('manage');
    if (m === 'settings' && cur) openDictSettings(cur);
  });
  el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-dict]')) e.target.click(); });

  // 左へスワイプで閉じる
  let sx = null, dx = 0, sy = 0, dragging = false;
  el.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; dx = 0; dragging = false; }, { passive: true });
  el.addEventListener('touchmove', e => {
    if (sx === null) return;
    dx = Math.min(0, e.touches[0].clientX - sx);
    if (!dragging && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(e.touches[0].clientY - sy)) { dragging = true; el.classList.add('dragging'); }
    if (dragging) el.style.transform = `translateX(${dx}px)`;
  }, { passive: true });
  el.addEventListener('touchend', () => {
    if (dragging) { el.classList.remove('dragging'); el.style.transform = ''; if (dx < -70) closeTop(); }
    sx = null; dragging = false;
  });
  pushLayer(el);
}

/* ------------------------------------------------------------------ 辞書の作成・設定 */
function openNewDict() {
  const body = document.createElement('form');
  body.innerHTML = `
    <div class="field-group"><div class="field"><label for="d-name">辞書の名前</label><input id="d-name" maxlength="60" placeholder="例：応用情報辞書、英単語、Java用語" enterkeyhint="done" autocomplete="off"></div></div>
    <p class="note">タグ（分野）は辞書ごとに作ります。作った辞書は左上のメニューから切り替えられます。</p>
    <button class="btn" type="submit">作成</button>`;
  const input = body.querySelector('#d-name');
  const create = async () => {
    const name = input.value.trim();
    if (!name) { toast('辞書の名前を入力してください', true); input.focus(); return; }
    try {
      const d = await api('POST', 'api/dictionaries', { name });
      state.dicts.push(d); saveJSON('dict.dicts', state.dicts);
      await closeTop();
      await switchDict(d.id);
      toast(`「${d.name}」を作りました`);
    } catch (err) { toast(err.message, true); }
  };
  body.addEventListener('submit', e => { e.preventDefault(); create(); });
  openSheet({ title: '新しい辞書', left: { label: 'キャンセル' }, right: { label: '作成', strong: true, onClick: create }, body });
  setTimeout(() => input.focus(), 350);
}

function openDictSettings(d) {
  const body = document.createElement('form');
  const only = state.dicts.length <= 1;
  body.innerHTML = `
    <div class="field-group"><div class="field"><label for="d-name">辞書の名前</label><input id="d-name" maxlength="60" value="${esc(d.name)}" enterkeyhint="done" autocomplete="off"></div></div>
    <div class="stat"><div><b>${(d.wordCount ?? 0).toLocaleString()}</b><span>単語</span></div><div><b>${d.tagCount ?? 0}</b><span>タグ</span></div></div>
    <button class="btn" type="submit">保存</button>
    <button class="btn danger" type="button" data-a="del" ${only ? 'disabled' : ''}>この辞書を削除</button>
    ${only ? '<p class="note">辞書が1つしかないときは削除できません</p>' : '<p class="note">削除すると、中の単語とタグもすべて消えます。必要なら先に CSV にエクスポートしてください。</p>'}`;
  const input = body.querySelector('#d-name');
  const save = async () => {
    const name = input.value.trim();
    if (!name) { toast('辞書の名前を入力してください', true); return; }
    try {
      const saved = await api('PUT', `api/dictionaries/${d.id}`, { name });
      Object.assign(d, saved); saveJSON('dict.dicts', state.dicts); renderHeader();
      await closeTop(); toast('保存しました');
    } catch (err) { toast(err.message, true); }
  };
  body.addEventListener('submit', e => { e.preventDefault(); save(); });
  body.querySelector('[data-a="del"]').addEventListener('click', async () => {
    if (!confirm(`辞書「${d.name}」を削除しますか？\n${(d.wordCount ?? 0).toLocaleString()}語とタグがすべて消え、元に戻せません。`)) return;
    try {
      await api('DELETE', `api/dictionaries/${d.id}`);
      try { localStorage.removeItem(`dict.cache.${d.id}`); localStorage.removeItem(`dict.filter.${d.id}`); } catch { /* 無視 */ }
      state.dicts = state.dicts.filter(x => x.id !== d.id); saveJSON('dict.dicts', state.dicts);
      await closeTop();
      if (state.dictId === d.id) await switchDict(state.dicts[0].id); else renderHeader();
      toast('辞書を削除しました');
    } catch (err) { toast(err.message, true); }
  });
  openSheet({ title: '辞書の設定', left: { label: 'キャンセル' }, right: { label: '保存', strong: true, onClick: save }, body });
}

/* ------------------------------------------------------------------ ＋メニュー（アクションシート） */
els.plus.addEventListener('click', () => openActionSheet());

function openActionSheet() {
  const el = document.createElement('div');
  el.className = 'action-sheet'; el.setAttribute('role', 'menu');
  el.innerHTML = `<div class="action-group">
      <div class="action-title">「${esc(currentDict()?.name || '')}」に追加</div>
      <button class="action" data-a="one" role="menuitem"><span class="ico">${svgIcon(ICON.word)}</span><span>単語を1つ追加<span class="sub">単語・読み・意味を入力</span></span></button>
      <button class="action" data-a="csv" role="menuitem"><span class="ico">${svgIcon(ICON.csv)}</span><span>CSVからインポート<span class="sub">まとめて取り込む</span></span></button>
      <button class="action" data-a="export" role="menuitem"><span class="ico">${svgIcon(ICON.download)}</span><span>CSVにエクスポート<span class="sub">バックアップ・Excelで編集</span></span></button>
    </div>
    <div class="action-group"><button class="action cancel" data-a="cancel">キャンセル</button></div>`;
  el.addEventListener('click', async e => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    await closeTop();
    if (a === 'one') openWordForm();
    if (a === 'csv') openImport();
    if (a === 'export') location.href = dictUrl('/export');
  });
  pushLayer(el);
}

/* ------------------------------------------------------------------ タグを選択・作成・編集するシート
   mode = 'filter'：一覧の絞り込み用 / 'manage'：名前・色の編集用 */
function newTagForm(onCreated, initialName = '') {
  const wrap = document.createElement('div');
  wrap.className = 'new-tag';
  let color = COLORS[state.tags.length % COLORS.length];
  wrap.innerHTML = `
    <div class="new-tag-row">
      <input placeholder="タグ名（例：ハードウェア）" maxlength="40" enterkeyhint="done" autocomplete="off" value="${esc(initialName)}">
      <button type="button" class="mini-btn">作成</button>
    </div>
    <div class="palette">${COLORS.map(c => `<button type="button" data-color="${c}" class="${c === color ? 'on' : ''}" aria-label="${COLOR_LABEL[c]}"><span class="dot c-${c}"></span></button>`).join('')}</div>`;
  const input = wrap.querySelector('input'); const btn = wrap.querySelector('.mini-btn');
  const sync = () => { btn.disabled = !input.value.trim(); };
  input.addEventListener('input', sync); sync();
  wrap.querySelector('.palette').addEventListener('click', e => {
    const b = e.target.closest('[data-color]'); if (!b) return;
    color = b.dataset.color;
    wrap.querySelectorAll('.palette button').forEach(x => x.classList.toggle('on', x === b));
  });
  const submit = async () => {
    const name = input.value.trim(); if (!name) return;
    btn.disabled = true;
    try { const t = await createTag(name, color); onCreated(t); }
    catch (err) { toast(err.message, true); btn.disabled = false; }
  };
  btn.addEventListener('click', submit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); submit(); } });
  return { el: wrap, focus: () => input.focus() };
}

function openTagSheet(mode = 'filter') {
  let editing = mode === 'manage';
  let q = '';
  let showNew = false;
  let openPalette = null;
  const body = document.createElement('div');
  body.innerHTML = `
    <label class="tag-search">${svgIcon(ICON.search)}<input type="search" placeholder="タグを検索" enterkeyhint="search" autocomplete="off"></label>
    <div data-slot="list"></div>`;
  const searchInput = body.querySelector('input');
  const listEl = body.querySelector('[data-slot="list"]');
  searchInput.addEventListener('input', () => { q = norm(searchInput.value.trim()); draw(); });

  const draw = () => {
    const counts = tagCounts();
    const tags = sortedTags().filter(t => !q || norm(t.name).includes(q));
    const nSel = state.filter.size;
    let html = '';
    if (!editing) {
      html += `<p class="note" style="padding:0 4px 8px;display:flex;justify-content:space-between;gap:8px"><span>選んだタグのどれかが付いた単語を表示</span>${nSel ? '<button class="link" data-a="clear" style="padding:0;font-size:14px">すべて解除</button>' : ''}</p>`;
    } else {
      html += '<p class="note" style="padding:0 4px 8px">色の丸で色を、名前をタップで名前を変更できます。</p>';
    }
    html += '<div class="field-group">';
    if (!state.tags.length) {
      html += '<div class="empty-tags">まだタグがありません。<br>分野ごとにタグを作りましょう<br><span style="color:var(--text3);font-size:13px">例：ハードウェア・ソフトウェア・経営</span></div>';
    } else if (!tags.length) {
      html += '<div class="empty-tags">一致するタグはありません</div>';
    }
    for (const t of tags) {
      if (editing) {
        html += `<div class="tag-edit-row" data-id="${t.id}">
          <button class="color-btn" data-a="color" aria-label="色を変更（今は${COLOR_LABEL[t.color]}）"><span class="dot c-${t.color}"></span></button>
          <input value="${esc(t.name)}" maxlength="40" data-a="name" aria-label="タグ名" enterkeyhint="done">
          <span class="tag-count">${counts.get(t.id) || 0}</span>
          <button class="del-btn" data-a="del" aria-label="${esc(t.name)}を削除">${svgIcon(ICON.trash)}</button>
        </div>
        ${openPalette === t.id ? `<div class="palette" data-id="${t.id}">${COLORS.map(c => `<button data-a="pick" data-color="${c}" class="${t.color === c ? 'on' : ''}" aria-label="${COLOR_LABEL[c]}"><span class="dot c-${c}"></span></button>`).join('')}</div>` : ''}`;
      } else {
        const on = state.filter.has(t.id);
        html += `<button class="tag-row" data-a="toggle" data-id="${t.id}" aria-pressed="${on}">
          <span class="dot c-${t.color}"></span><span class="name">${esc(t.name)}</span>
          <span class="tag-count">${counts.get(t.id) || 0}</span>
          <span class="check">${on ? svgIcon(ICON.check) : ''}</span></button>`;
      }
    }
    html += `<button class="tag-row add" data-a="new"><span class="plus-ico">${svgIcon(ICON.plus)}</span><span class="name">新しいタグを作成</span></button>`;
    html += '<div data-slot="new"></div></div>';
    listEl.innerHTML = html;
    if (showNew) {
      const f = newTagForm(t => {
        showNew = false; searchInput.value = ''; q = '';
        if (!editing) { state.filter.add(t.id); saveFilter(); renderFilters(); renderList(); }
        draw(); toast(`タグ「${t.name}」を作りました`);
      }, searchInput.value.trim());
      listEl.querySelector('[data-slot="new"]').appendChild(f.el);
      listEl.querySelector('.tag-row.add').hidden = true;
      setTimeout(f.focus, 50);
    }
  };

  const saveTag = async (t, patch) => {
    try {
      const saved = await api('PUT', `api/tags/${t.id}`, { name: t.name, color: t.color, ...patch });
      Object.assign(t, saved); saveCache(); renderFilters(); renderList();
    } catch (err) { toast(err.message, true); }
    draw();
  };

  listEl.addEventListener('click', async e => {
    const el = e.target.closest('[data-a]'); if (!el) return;
    const a = el.dataset.a;
    const id = Number(el.closest('[data-id]')?.dataset.id);
    const t = tagById(id);
    if (a === 'toggle' && t) {
      state.filter.has(id) ? state.filter.delete(id) : state.filter.add(id);
      saveFilter(); navigator.vibrate?.(3);
      draw(); renderFilters(); renderList();
    }
    if (a === 'clear') { state.filter.clear(); saveFilter(); draw(); renderFilters(); renderList(); }
    if (a === 'new') { showNew = true; draw(); }
    if (a === 'color') { openPalette = openPalette === id ? null : id; draw(); }
    if (a === 'pick' && t) { openPalette = null; await saveTag(t, { color: el.dataset.color }); }
    if (a === 'del' && t) {
      const n = tagCounts().get(t.id) || 0;
      if (!confirm(`タグ「${t.name}」を削除しますか？${n ? `\n（${n}語からこのタグが外れます。単語は消えません）` : ''}`)) return;
      try {
        await api('DELETE', `api/tags/${t.id}`);
        state.tags = state.tags.filter(x => x.id !== t.id);
        state.words.forEach(w => { w.tagIds = w.tagIds.filter(x => x !== t.id); });
        state.filter.delete(t.id); saveFilter(); syncDictCount(); saveCache();
        draw(); renderFilters(); renderList();
      } catch (err) { toast(err.message, true); }
    }
  });
  listEl.addEventListener('change', e => {
    if (e.target.dataset.a !== 'name') return;
    const t = tagById(Number(e.target.closest('[data-id]').dataset.id));
    const name = e.target.value.trim();
    if (!t) return;
    if (!name) { e.target.value = t.name; return; }
    if (name !== t.name) saveTag(t, { name });
  });
  listEl.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.a === 'name' && !e.isComposing) e.target.blur(); });

  const sheet = openSheet({
    title: editing ? 'タグ（分野）を管理' : 'タグで絞り込む',
    left: mode === 'filter' ? { label: '編集', onClick: () => {
      editing = !editing; openPalette = null; showNew = false;
      sheet.leftBtn.textContent = editing ? '戻る' : '編集';
      sheet.titleEl.textContent = editing ? 'タグを編集' : 'タグで絞り込む';
      document.activeElement?.blur?.();
      draw();
    } } : null,
    right: { label: '完了', strong: true, onClick: () => { document.activeElement?.blur?.(); closeTop(); } },
    body,
  });
  draw();
}

/* ------------------------------------------------------------------ 単語に付けるタグの選択UI */
function tagPicker(selected, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'tag-picker';
  let adding = false;
  const draw = () => {
    wrap.innerHTML = sortedTags().map(t => `<button type="button" class="tag-toggle ${selected.has(t.id) ? 'on' : ''}" data-id="${t.id}" aria-pressed="${selected.has(t.id)}">
      <span class="dot c-${t.color}">${svgIcon(ICON.check)}</span>${esc(t.name)}</button>`).join('') +
      (adding
        ? '<span class="tag-inline"><input placeholder="タグ名" maxlength="40" enterkeyhint="done" autocomplete="off"><button type="button" data-a="create">作成</button></span>'
        : '<button type="button" class="tag-toggle new" data-a="new">＋ 新しいタグ</button>');
    if (adding) setTimeout(() => wrap.querySelector('.tag-inline input')?.focus(), 30);
  };
  const create = async () => {
    const input = wrap.querySelector('.tag-inline input');
    const name = input?.value.trim();
    if (!name) { adding = false; draw(); return; }
    try {
      const existing = state.tags.find(t => t.name === name);
      const t = existing || await createTag(name);
      selected.add(t.id); adding = false; draw(); onChange?.(selected);
    } catch (err) { toast(err.message, true); }
  };
  wrap.addEventListener('click', e => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'new') { adding = true; draw(); return; }
    if (a === 'create') { create(); return; }
    const b = e.target.closest('.tag-toggle'); if (!b || !b.dataset.id) return;
    const id = Number(b.dataset.id);
    selected.has(id) ? selected.delete(id) : selected.add(id);
    navigator.vibrate?.(3);
    draw(); onChange?.(selected);
  });
  wrap.addEventListener('keydown', e => {
    if (e.target.matches('.tag-inline input') && e.key === 'Enter' && !e.isComposing) { e.preventDefault(); create(); }
  });
  draw();
  return wrap;
}

/* ------------------------------------------------------------------ 単語の詳細 */
function openDetail(w) {
  const body = document.createElement('div');
  const draw = () => {
    body.innerHTML = `
      <div class="detail-word">${esc(w.word)}</div>
      <div class="detail-reading">${w.reading ? esc(w.reading) : '&nbsp;'}</div>
      <div class="group-title">タグ（分野）</div>
      <div data-slot="tags"></div>
      <div class="group-title">意味</div>
      <div class="detail-meaning">${esc(w.meaning)}</div>
      <div class="detail-meta">更新：${esc((w.updatedAt || '').replace('T', ' ').slice(0, 16))}</div>
      <div class="btn-row">
        <button class="btn secondary" data-a="edit">編集</button>
        <button class="btn danger" data-a="del">削除</button>
      </div>`;
    const selected = new Set(w.tagIds);
    body.querySelector('[data-slot="tags"]').appendChild(tagPicker(selected, async sel => {
      const prev = w.tagIds;
      w.tagIds = [...sel];
      renderList();
      try {
        const saved = await api('PUT', `api/words/${w.id}`, { word: w.word, reading: w.reading, meaning: w.meaning, tagIds: w.tagIds });
        Object.assign(w, saved); upsertLocal(w); renderList();
      } catch (err) { w.tagIds = prev; renderList(); draw(); toast(err.message, true); }
    }));
  };
  draw();
  body.addEventListener('click', async e => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'edit') openWordForm(w, null, updated => { Object.assign(w, updated); draw(); });
    if (a === 'del') {
      if (!confirm(`「${w.word}」を削除しますか？`)) return;
      try {
        await api('DELETE', `api/words/${w.id}`);
        state.words = state.words.filter(x => x.id !== w.id);
        syncDictCount(); saveCache();
        await closeTop(); renderList(); toast('削除しました');
      } catch (err) { toast(err.message, true); }
    }
  });
  openSheet({ title: '', left: { label: '閉じる' }, body });
}

/* ------------------------------------------------------------------ 単語の追加・編集 */
function openWordForm(existing = null, preset = null, onSaved = null) {
  const v = existing || { word: preset?.word || '', reading: '', meaning: '', tagIds: [...state.filter] };
  const selected = new Set(v.tagIds);
  const body = document.createElement('form');
  body.noValidate = true;
  body.innerHTML = `
    <div class="field-group">
      <div class="field"><label for="f-word">単語 <span class="req">*</span></label><input id="f-word" name="word" maxlength="200" autocomplete="off" enterkeyhint="next" value="${esc(v.word)}"></div>
      <div class="field"><label for="f-reading">読み（ひらがな・カタカナ）</label><input id="f-reading" name="reading" maxlength="200" autocomplete="off" enterkeyhint="next" placeholder="例：げんしせい" value="${esc(v.reading)}"></div>
    </div>
    <p class="note" data-slot="hint"></p>
    <div class="field-group">
      <div class="field"><label for="f-meaning">意味 <span class="req">*</span></label><textarea id="f-meaning" name="meaning" maxlength="10000" rows="5">${esc(v.meaning)}</textarea></div>
    </div>
    <div class="group-title">タグ（分野）</div>
    <div data-slot="tags"></div>
    <button class="btn" type="submit">${existing ? '保存' : `「${esc(currentDict()?.name || '辞書')}」に追加`}</button>`;
  body.querySelector('[data-slot="tags"]').appendChild(tagPicker(selected));
  const word = body.querySelector('#f-word'), reading = body.querySelector('#f-reading'), meaning = body.querySelector('#f-meaning');
  const hint = body.querySelector('[data-slot="hint"]');
  const updateHint = () => {
    const nw = norm(word.value.trim());
    const dup = nw && state.words.find(x => x._w === nw && x.id !== existing?.id);
    if (dup) { hint.className = 'note warn'; hint.textContent = `「${dup.word}」はすでにこの辞書にあります（同じ単語でも追加はできます）`; }
    else if (KANJI.test(word.value) && !reading.value.trim()) { hint.className = 'note warn'; hint.textContent = '漢字を含む単語は「読み」を入れると、50音の正しい位置に並びます'; }
    else { hint.className = 'note'; hint.textContent = '50音順は「読み」で並びます。読みが空なら単語そのもので並びます。'; }
  };
  word.addEventListener('input', updateHint); reading.addEventListener('input', updateHint); updateHint();
  word.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); reading.focus(); } });
  reading.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); meaning.focus(); } });

  let saving = false;
  const save = async () => {
    if (saving) return;
    const payload = { word: word.value.trim(), reading: reading.value.trim(), meaning: meaning.value.trim(), tagIds: [...selected] };
    if (!payload.word) { toast('単語を入力してください', true); word.focus(); return; }
    if (!payload.meaning) { toast('意味を入力してください', true); meaning.focus(); return; }
    saving = true;
    try {
      const saved = existing
        ? await api('PUT', `api/words/${existing.id}`, payload)
        : await api('POST', dictUrl('/words'), payload);
      upsertLocal(saved);
      await closeTop();
      renderList();
      onSaved?.(saved);
      toast(existing ? '保存しました' : `「${saved.word}」を追加しました`);
    } catch (err) { toast(err.message, true); }
    finally { saving = false; }
  };
  body.addEventListener('submit', e => { e.preventDefault(); save(); });
  openSheet({ title: existing ? '単語を編集' : '単語を追加', left: { label: 'キャンセル' }, right: { label: existing ? '保存' : '追加', strong: true, onClick: save }, body });
  if (!existing) setTimeout(() => (v.word ? meaning : word).focus(), 350);
}

/* ------------------------------------------------------------------ CSVインポート */
function decodeCsv(buf) {
  const b = new Uint8Array(buf);
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return { text: new TextDecoder('utf-8').decode(b.subarray(3)), enc: 'UTF-8（BOM付き）' };
  if (b[0] === 0xff && b[1] === 0xfe) return { text: new TextDecoder('utf-16le').decode(b.subarray(2)), enc: 'UTF-16' };
  if (b[0] === 0xfe && b[1] === 0xff) return { text: new TextDecoder('utf-16be').decode(b.subarray(2)), enc: 'UTF-16' };
  try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(b), enc: 'UTF-8' }; }
  catch { return { text: new TextDecoder('shift_jis').decode(b), enc: 'Shift_JIS（Excel形式）' }; }
}

function parseCsv(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const delim = (firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length ? '\t' : ',';
  const rows = []; let row = []; let cell = ''; let q = false; let line = 1; let rowLine = 1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else { if (c === '\n') line++; cell += c; }
      continue;
    }
    if (c === '"' && cell === '') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\r') { /* CRLFのCRは無視 */ }
    else if (c === '\n') { row.push(cell); rows.push({ line: rowLine, cells: row }); row = []; cell = ''; line++; rowLine = line; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push({ line: rowLine, cells: row }); }
  return rows.filter(r => r.cells.some(c => c.trim() !== ''));
}

const HEADER_ALIASES = {
  word: ['単語', '用語', '見出し', '見出し語', 'word', 'term', 'ことば', '言葉'],
  reading: ['読み', 'よみ', 'ヨミ', '読み方', 'ふりがな', 'フリガナ', 'reading', 'yomi', 'kana'],
  meaning: ['意味', '説明', '解説', '定義', 'meaning', 'definition', 'description'],
  tags: ['タグ', '分野', 'カテゴリ', 'カテゴリー', 'tags', 'tag', 'category'],
};

function rowsToEntries(parsed) {
  if (!parsed.length) return { entries: [], errors: [], header: false };
  const head = parsed[0].cells.map(c => norm(c.trim()));
  const col = {};
  for (const [key, names] of Object.entries(HEADER_ALIASES)) {
    const idx = head.findIndex(h => names.some(n => norm(n) === h));
    if (idx >= 0) col[key] = idx;
  }
  const hasHeader = col.word !== undefined && col.meaning !== undefined;
  let data = parsed;
  if (hasHeader) data = parsed.slice(1);
  else {
    const n = parsed[0].cells.length;
    if (n <= 2) Object.assign(col, { word: 0, meaning: 1 });
    else if (n === 3) Object.assign(col, { word: 0, reading: 1, meaning: 2 });
    else Object.assign(col, { word: 0, reading: 1, meaning: 2, tags: 3 });
  }
  const entries = []; const errors = [];
  for (const r of data) {
    const get = k => (col[k] !== undefined ? (r.cells[col[k]] ?? '') : '').trim();
    const e = {
      line: r.line, word: get('word'), reading: get('reading'), meaning: get('meaning'),
      tags: get('tags').split(/[;；|｜]/).map(s => s.trim()).filter(Boolean),
    };
    if (!e.word) errors.push(`${r.line}行目：単語が空です`);
    else if (!e.meaning) errors.push(`${r.line}行目：「${e.word}」の意味が空です`);
    else entries.push(e);
  }
  return { entries, errors, header: hasHeader };
}

const CSV_HELP = `<details style="margin-top:14px">
  <summary class="group-title" style="cursor:pointer;padding-left:4px">CSVの書き方</summary>
  <div class="code">単語,読み,意味,タグ
原子性,げんしせい,全部実行か全く実行しないか,データベース
DHCP,,IPアドレスを自動で貸し出す仕組み,ネットワーク
"RAID 5","",パリティを分散して記録,ハードウェア;頻出</div>
  <p class="note">・1行目は見出し（単語,読み,意味,タグ）<br>・読み・タグは空でもOK。意味に「,」や改行を入れるときは "" で囲む<br>・タグ（分野）は「;」区切りで複数可。無い名前はこの辞書に自動で作成<br>・文字コードは UTF-8 / Shift_JIS（Excel）どちらでもOK</p>
  <a class="link" href="samples/template.csv" download style="display:inline-block;padding-left:4px">テンプレートCSVをダウンロード</a>
</details>`;

function openImport() {
  const body = document.createElement('div');
  const dictName = currentDict()?.name || '';
  let entries = null; let mode = 'skip';
  body.innerHTML = `
    <p class="note" style="padding:0 4px 10px">取り込み先：<b style="color:var(--text)">${esc(dictName)}</b></p>
    <label class="drop" for="csvFile">
      ${svgIcon(ICON.upload)}
      <strong>CSVファイルを選ぶ</strong>
      <span style="font-size:13px">ファイル・iCloud Drive・Google Drive から選べます</span>
    </label>
    <input type="file" id="csvFile" accept=".csv,.tsv,.txt,text/csv,text/plain" hidden>
    <div data-slot="result"></div>
    <p class="note" style="padding-top:12px">お試し用：<a class="link" href="#" data-a="sample" style="padding:0">基本情報の用語まとめ（304語）</a>を読み込む</p>
    ${CSV_HELP}`;
  const result = body.querySelector('[data-slot="result"]');

  const show = (fileName, enc, parsed) => {
    const { entries: es, errors, header } = rowsToEntries(parsed);
    entries = es;
    const exist = new Set(state.words.map(w => w._w + '\u0000' + w._r));
    const dups = es.filter(e => exist.has(norm(e.word) + '\u0000' + norm(e.reading))).length;
    const known = new Set(state.tags.map(t => t.name));
    const newTags = [...new Set(es.flatMap(e => e.tags))].filter(t => !known.has(t));
    result.innerHTML = `
      <div class="group-title">${esc(fileName)}（${esc(enc)}${header ? '' : '・見出し行なし'}）</div>
      <div class="stat">
        <div><b>${es.length}</b><span>取り込める行</span></div>
        <div><b>${dups}</b><span>辞書と重複</span></div>
        <div><b>${errors.length}</b><span>エラー</span></div>
      </div>
      ${errors.length ? `<ul class="errors">${errors.slice(0, 8).map(e => `<li>${esc(e)}</li>`).join('')}${errors.length > 8 ? `<li>ほか${errors.length - 8}件</li>` : ''}</ul>` : ''}
      ${newTags.length ? `<p class="note" style="padding:8px 4px 0">新しく作られるタグ：${newTags.map(esc).join('、')}</p>` : ''}
      ${dups ? `<div class="group-title">重複したときは</div>
      <div class="segment" data-slot="mode">
        <button type="button" data-m="skip" class="on">スキップ</button>
        <button type="button" data-m="overwrite">上書き</button>
        <button type="button" data-m="append">両方残す</button>
      </div>` : ''}
      <div class="group-title">プレビュー</div>
      <div class="preview">${es.slice(0, 5).map(e => `<div class="preview-row"><b>${esc(e.word)}</b> <span style="color:var(--text2)">${esc(e.reading)}</span>${e.tags.length ? ` <span style="color:var(--text3);font-size:12px">#${e.tags.map(esc).join(' #')}</span>` : ''}<div class="m">${esc(e.meaning)}</div></div>`).join('') || '<div class="preview-row">取り込める行がありません</div>'}</div>
      ${es.length > 5 ? `<p class="note" style="padding:6px 4px 0">ほか ${es.length - 5} 件</p>` : ''}
      <button class="btn" data-a="import" ${es.length ? '' : 'disabled'}>「${esc(dictName)}」に ${es.length} 件をインポート</button>`;
    mode = 'skip';
  };

  const readFile = async file => {
    try {
      const { text, enc } = decodeCsv(await file.arrayBuffer());
      show(file.name, enc, parseCsv(text));
    } catch (e) { toast('ファイルを読み込めませんでした：' + e.message, true); }
  };
  body.querySelector('#csvFile').addEventListener('change', e => { const f = e.target.files[0]; if (f) readFile(f); e.target.value = ''; });

  body.addEventListener('click', async e => {
    const m = e.target.closest('[data-m]');
    if (m) { mode = m.dataset.m; m.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === m)); return; }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'sample') {
      e.preventDefault();
      try {
        const res = await fetch('samples/fe_terms.csv');
        const { text, enc } = decodeCsv(await res.arrayBuffer());
        show('fe_terms.csv', enc, parseCsv(text));
      } catch (err) { toast(err.message, true); }
    }
    if (a === 'import' && entries?.length) {
      const btn = e.target.closest('button'); btn.disabled = true; btn.textContent = 'インポート中…';
      try {
        const r = await api('POST', dictUrl('/import'), { rows: entries, mode });
        await loadAll();
        await closeTop();
        const parts = [`${r.added}件追加`];
        if (r.updated) parts.push(`${r.updated}件上書き`);
        if (r.skipped) parts.push(`${r.skipped}件スキップ`);
        toast('インポート完了：' + parts.join('・'));
      } catch (err) { toast(err.message, true); btn.disabled = false; btn.textContent = 'もう一度インポート'; }
    }
  });
  openSheet({ title: 'CSVからインポート', left: { label: '閉じる' }, body });
}

/* ------------------------------------------------------------------ 起動 */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
if (state.dictId) {
  const cache = loadJSON(cacheKey(), null);
  if (cache) { state.words = cache.words.map(prepare); state.tags = cache.tags; }
  loadFilter();
}
render();
loadAll();
