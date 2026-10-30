import { LEVELS, PEERS, generate, nextStep, remaining, score } from './engine.js';
import { GUIDES } from './guides.js';
import { tr, isFrench } from './i18n.js';
import { CARD_GAMES, emptyCardData, CARD_OPTIONS, optsFor, statsFor, mountSolitaire, mountHearts } from './cards/ui.js';

const $app = document.getElementById('app');
const $toast = document.getElementById('toast');
const KEY = 'sudoku.v1';
const Native = () => window.Capacitor?.Plugins ?? {};

const THEMES = [
  { name: 'Moss', bg: '#363a36', given: '#5b605b', accent: '#8fb573', fg: '#f0f2ec' },
  { name: 'Ink', bg: '#14161c', given: '#2c303b', accent: '#7aa2f7', fg: '#e8eaf2' },
  { name: 'Ember', bg: '#2a2120', given: '#4a3a37', accent: '#e8935a', fg: '#f6ece6' },
  { name: 'Plum', bg: '#2b2230', given: '#483a50', accent: '#c792ea', fg: '#f2eaf6' },
  { name: 'Paper', bg: '#f5f2ea', given: '#dfdacd', accent: '#5f8f4e', fg: '#2a2c26' },
  { name: 'Sky', bg: '#eef3f8', given: '#d5dfe9', accent: '#2f7dd1', fg: '#1b2733' },
];
const ICON = {
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12.220 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.730l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.730.73l-.22.38a2 2 0 0 0 .73 2.730l.15.1a2 2 0 0 1 1 1.720v.51a2 2 0 0 1-1 1.740l-.15.09a2 2 0 0 0-.73 2.730l.22.38a2 2 0 0 0 2.730.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.730V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.730l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.730-.73l.22-.39a2 2 0 0 0-.73-2.730l-.15-.08a2 2 0 0 1-1-1.740v-.5a2 2 0 0 1 1-1.740l.15-.09a2 2 0 0 0 .73-2.730l-.22-.38a2 2 0 0 0-2.730-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.730V4a2 2 0 0 0-2-2z"/>',
  stats: '<path d="M6 20v-7M12 20V5M18 20v-11"/>',
  restart: '<path d="M20 11a8 8 0 1 0-2.300 6.300M20 5v6h-6"/>',
  hint: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.500 10.900c.6.5 1 1.200 1 2.100h5c0-.9.4-1.600 1-2.100A6 6 0 0 0 12 3Z"/>',
  pencil: '<path d="M4 20l1-4L16 5l3 3L8 19l-4 1ZM14 7l3 3"/>',
  auto: '<path d="M12 3l1.800 4.700L18.500 9.500l-4.700 1.800L12 16l-1.800-4.700L5.500 9.500l4.700-1.800L12 3ZM19 16l.8 2.200L22 19l-2.200.8L19 22l-.8-2.200L16 19l2.200-.8L19 16Z"/>',
  sudoku: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9.300 4v16M14.700 4v16M4 9.300h16M4 14.700h16"/>',
  klondike: '<rect x="4" y="3" width="7" height="10" rx="1.500"/><rect x="13" y="3" width="7" height="10" rx="1.500"/><path d="M4 16h7M13 16h7M4 20h7M13 20h7"/>',
  spider: '<circle cx="12" cy="13" r="3.500"/><path d="M12 9.500V7M9 11L5 7.500 3 8M15 11l4-3.500 2 .5M8.500 13H4l-1.500 2M15.500 13H20l1.500 2M9.500 15.500L6 19l.5 2M14.500 15.500L18 19l-.5 2"/>',
  freecell: '<rect x="3" y="3" width="8" height="8" rx="1.500"/><rect x="13" y="3" width="8" height="8" rx="1.500"/><rect x="3" y="13" width="8" height="8" rx="1.500"/><rect x="13" y="13" width="8" height="8" rx="1.500"/>',
  tripeaks: '<path d="M2 20l5-11 3.500 7L12 13l1.500 3L17 9l5 11Z"/>',
  hearts: '<path d="M12 20.500S3 15 3 8.800A4.800 4.800 0 0 1 12 6.500a4.800 4.800 0 0 1 9 2.300C21 15 12 20.500 12 20.500Z"/>',
  undo: '<path d="M9 7L4 12l5 5M4 12h11a5 5 0 0 1 5 5v1"/>',
};
const icon = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;
const fmt = s => `${Math.floor(s / 60)}M ${String(s % 60).padStart(2, '0')}S`;
const emptyStats = () => LEVELS.map(() => ({ started: 0, won: 0, bestTime: null, bestScore: 0, totalTime: 0, totalScore: 0 }));

// --- Persistence. localStorage is the fast synchronous copy; native Preferences is
// the durable one, because iOS can purge web storage when a device runs low on space.
let db = { theme: { ...THEMES[0] }, showMistakes: true, showHint: false, showAuto: false, game: null, stats: emptyStats(), recent: [], cards: emptyCardData() };
let nativeTimer = 0;

function save() {
  const json = JSON.stringify(db);
  try { localStorage.setItem(KEY, json); } catch {}
  clearTimeout(nativeTimer);
  nativeTimer = setTimeout(() => Native().Preferences?.set({ key: KEY, value: JSON.stringify(db) }), 400);
}
function flush() {
  clearTimeout(nativeTimer);
  Native().Preferences?.set({ key: KEY, value: JSON.stringify(db) });
}
async function load() {
  let json = null;
  try { json = localStorage.getItem(KEY); } catch {}
  if (!json) json = (await Native().Preferences?.get({ key: KEY }))?.value ?? null;
  if (json) try { db = { ...db, ...JSON.parse(json) }; } catch {}
  db.cards = { ...emptyCardData(), ...db.cards }; // saves from older versions lack newer fields
  if (db.cards.spiderSuits) { db.cards.opts.spider = { suits: db.cards.spiderSuits }; delete db.cards.spiderSuits; }
}

function applyTheme() {
  const t = db.theme, s = document.documentElement.style;
  for (const k of ['bg', 'given', 'accent', 'fg']) s.setProperty('--' + k, t[k]);
  const lum = hex => {
    const n = parseInt(hex.slice(1), 16);
    return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  };
  s.setProperty('--on-accent', lum(t.accent) > 0.55 ? '#1d211c' : '#ffffff');
  const dark = lum(t.bg) < 0.5;
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t.bg);
  const bar = Native().StatusBar;
  bar?.setStyle({ style: dark ? 'DARK' : 'LIGHT' })?.catch?.(() => {});
  bar?.setBackgroundColor?.({ color: t.bg })?.catch?.(() => {});
}

let toastTimer = 0;
function toast(msg, ms = 2600) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $toast.classList.remove('show'), ms);
}

// --- Game state. `game` is plain JSON so it can be saved on every move.
const game = () => db.game;
let digit = 0;          // selected digit on the pad
let tool = null;        // null | 'notes' | 'erase'
let hinted = -1;
let cells = [], keys = [], cache = [], ticker = 0, tickStart = 0;

function newGame(level) {
  const { p, s } = generate(level);
  db.game = { level, p, s, v: [...p].map(Number), n: new Array(81).fill(0), t: 0, mistakes: 0, hints: 0, undo: [] };
  db.stats[level - 1].started++;
  digit = 0; tool = null; hinted = -1;
  save();
  if (location.hash === '#game') route();
  else if (location.hash === '#win') location.replace('#game');
  else location.hash = '#game';
}

const isGiven = c => game().p[c] !== '0';
const isWrong = c => game().v[c] && game().v[c] !== +game().s[c];
const locked = c => isGiven(c) || (db.showMistakes && game().v[c] && !isWrong(c));

// Applies changes to cells as one undo step: [[cell, value, notes], ...]
function commit(changes) {
  const g = game();
  g.undo.push(changes.map(([c]) => [c, g.v[c], g.n[c]]));
  if (g.undo.length > 400) g.undo.shift();
  for (const [c, v, n] of changes) { g.v[c] = v; g.n[c] = n; }
  save();
}

function placeDigit(c, d) {
  const g = game(), m = 1 << (d - 1);
  const changes = [[c, d, 0]];
  for (const p of PEERS[c]) if (g.n[p] & m) changes.push([p, g.v[p], g.n[p] & ~m]);
  commit(changes);
  if (db.showMistakes && d !== +g.s[c]) {
    g.mistakes++;
    save();
    navigator.vibrate?.(40);
  }
  checkWin();
}

function checkWin() {
  const g = game();
  if (g.v.includes(0)) return;
  if (g.v.every((d, c) => d === +g.s[c])) return finish();
  toast(tr('The grid is full, but something is wrong.'));
}

function tapCell(c) {
  const g = game();
  hinted = -1;
  if (tool === 'erase') {
    if (!isGiven(c) && (g.v[c] || g.n[c]) && !locked(c)) commit([[c, 0, 0]]);
    else if (g.v[c]) digit = g.v[c];
  } else if (locked(c)) {
    digit = g.v[c];
  } else if (!digit) {
    if (g.v[c]) digit = g.v[c];
  } else if (g.v[c]) {
    if (g.v[c] === digit) commit([[c, 0, 0]]);
    else placeDigit(c, digit);
  } else if (tool === 'notes') {
    commit([[c, 0, g.n[c] ^ (1 << (digit - 1))]]);
  } else {
    placeDigit(c, digit);
  }
  if (db.game) renderBoard();
}

function tapKey(k) {
  if (k === 'x') tool = tool === 'erase' ? null : 'erase';
  else {
    digit = digit === k ? 0 : k;
    if (tool === 'erase') tool = null;
  }
  hinted = -1;
  renderBoard();
}

function hint() {
  const g = game();
  const wrong = g.v.findIndex((_, c) => isWrong(c));
  if (wrong >= 0) {
    hinted = wrong;
    digit = g.v[wrong];
    toast(tr('This cell is wrong. Fix it first.'));
    return renderBoard();
  }
  const step = nextStep(g.v);
  let c, d, msg;
  if (step) {
    c = step.cell; d = step.digit;
    const why = step.kind === 'naked' ? tr('{0} is the only digit that fits this cell.', d)
      : tr('{0} has only this spot in its {1}.', d, tr(step.unit));
    msg = (step.used.length ? tr('Using {0}: ', step.used.map(u => tr(u)).join(', ').toLowerCase()) : '') + why;
  } else {
    c = g.v.indexOf(0); d = +g.s[c];
    msg = tr('No simple logic here, so this one is a gift: {0}.', d);
  }
  g.hints++;
  digit = d; hinted = c;
  toast(msg, 4500);
  placeDigit(c, d);
  if (db.game) renderBoard();
}

function autoNotes() {
  const g = game();
  const changes = [];
  for (let c = 0; c < 81; c++) {
    if (g.v[c]) continue;
    let m = 511;
    for (const p of PEERS[c]) if (g.v[p]) m &= ~(1 << (g.v[p] - 1));
    if (m !== g.n[c]) changes.push([c, 0, m]);
  }
  if (changes.length) commit(changes);
  renderBoard();
}

function undo() {
  const g = game();
  const step = g.undo.pop();
  if (!step) return;
  for (const [c, v, n] of step) { g.v[c] = v; g.n[c] = n; }
  hinted = -1;
  save();
  renderBoard();
}

function restart() {
  if (!confirm(tr('Restart this puzzle? The timer keeps running.'))) return;
  const g = game();
  g.v = [...g.p].map(Number); g.n.fill(0); g.undo = [];
  digit = 0; hinted = -1;
  save();
  renderBoard();
}

function finish() {
  const g = game();
  stopClock();
  const res = score(g.level, g.t, g.hints, g.mistakes);
  const st = db.stats[g.level - 1];
  const bestTime = st.bestTime === null || g.t < st.bestTime;
  const bestScore = res.total > st.bestScore;
  st.won++;
  st.totalTime += g.t;
  st.totalScore += res.total;
  if (bestTime) st.bestTime = g.t;
  if (bestScore) st.bestScore = res.total;
  db.recent.unshift({ level: g.level, t: g.t, score: res.total, hints: g.hints, mistakes: g.mistakes, at: Date.now() });
  db.recent.length = Math.min(db.recent.length, 20);
  lastWin = { ...res, level: g.level, t: g.t, hints: g.hints, mistakes: g.mistakes, bestTime, bestScore };
  db.game = null;
  save();
  flush();
  location.replace('#win');
}
let lastWin = null;

// --- Clock
function startClock() {
  stopClock();
  tickStart = performance.now();
  const base = game().t;
  ticker = setInterval(() => {
    const g = game();
    if (!g) return stopClock();
    g.t = base + Math.floor((performance.now() - tickStart) / 1000);
    const el = document.querySelector('.timer');
    if (el) el.textContent = fmt(g.t);
    if (g.t % 5 === 0) save();
  }, 1000);
}
function stopClock() { clearInterval(ticker); ticker = 0; }

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { stopClock(); save(); flush(); }
  else if (location.hash === '#game' && game()) startClock();
});

// --- Views
function renderHub() {
  const entry = (go, name, busy) => `<button class="level" data-go="${go}"><span class="game-name">${icon(go === '#sudoku' ? 'sudoku' : go.slice(6))}<b>${name}</b></span><small>${busy ? tr('In progress') : ''}</small></button>`;
  $app.innerHTML = `
    <div class="top"><button class="icon" data-go="#stats" aria-label="${tr('Scores')}">${icon('stats')}</button>
    <button class="icon" data-go="#settings" aria-label="${tr('Settings')}">${icon('settings')}</button></div>
    <div class="home"><h2>${tr('Games')}</h2>
    ${entry('#sudoku', 'Sudoku', game())}
    ${CARD_GAMES.map(c => entry('#card/' + c.id, tr(c.name), db.cards.games[c.id])).join('')}</div>`;
}

function renderHome() {
  const g = game();
  $app.innerHTML = `
    <div class="top"><button class="icon" data-back aria-label="${tr('Back')}">${icon('back')}</button>
    <button class="icon" data-go="#settings/sudoku" aria-label="${tr('Settings')}">${icon('settings')}</button></div>
    <div class="home"><h2>Sudoku</h2>
    ${g ? `<button class="level resume" data-go="#game"><b>${tr('Continue')}</b><small>${tr(LEVELS[g.level - 1].name)} · ${fmt(g.t)}</small></button>` : ''}
    ${LEVELS.map(l => {
      const best = db.stats[l.id - 1].bestTime;
      return `<button class="level" data-new="${l.id}"><b>${tr(l.name)}</b><small>${best === null ? '' : tr('Best {0}', fmt(best))}</small></button>`;
    }).join('')}</div>`;
}

function renderGame() {
  cache = [];
  $app.innerHTML = `
    <div class="top"><button class="icon" data-back aria-label="${tr('Back')}">${icon('back')}</button>
    <span class="timer">${fmt(game().t)}</span>
    <button class="icon" data-go="#settings/sudoku" aria-label="${tr('Settings')}">${icon('settings')}</button></div>
    <div class="game">
      <div class="board" id="board">${'<div class="cell"></div>'.repeat(81)}</div>
      <div class="pad" id="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button class="key" data-k="${d}"><b>${d}</b><small></small></button>`).join('')}
        <button class="key" data-k="x" aria-label="${tr('Erase')}"><b>X</b></button></div>
      <div class="tools">
        <button class="tool" data-a="restart" aria-label="${tr('Restart')}">${icon('restart')}</button>
        ${db.showHint ? `<button class="tool" data-a="hint" aria-label="${tr('Hint')}">${icon('hint')}<i id="hints"></i></button>` : ''}
        <button class="tool" data-a="notes" id="notes" aria-label="${tr('Notes')}">${icon('pencil')}</button>
        ${db.showAuto ? `<button class="tool" data-a="auto" aria-label="${tr('Fill in all notes')}">${icon('auto')}</button>` : ''}
        <button class="tool" data-a="undo" aria-label="${tr('Undo')}">${icon('undo')}</button>
      </div>
    </div>`;
  cells = [...document.getElementById('board').children];
  keys = [...document.getElementById('pad').children];
  const board = document.getElementById('board');
  // pointerdown rather than click: no touch-up delay, and it never misses a quick tap.
  board.addEventListener('pointerdown', e => {
    const c = cells.indexOf(e.target.closest('.cell'));
    if (c >= 0) tapCell(c);
  });
  document.getElementById('pad').addEventListener('pointerdown', e => {
    const k = e.target.closest('.key');
    if (k) tapKey(k.dataset.k === 'x' ? 'x' : +k.dataset.k);
  });
  renderBoard();
  startClock();
}

// Only touches the DOM for cells whose look actually changed.
function renderBoard() {
  const g = game();
  const counts = remaining(g.v);
  for (let c = 0; c < 81; c++) {
    const v = g.v[c], n = g.n[c];
    const wrong = db.showMistakes && isWrong(c);
    const cls = 'cell' + (v ? (isGiven(c) ? ' given' : ' user') : '') +
      (v && v === digit ? ' same' : '') + (wrong ? ' wrong' : '') + (c === hinted ? ' hinted' : '');
    const lit = !v && digit && n & (1 << (digit - 1)) ? digit : 0;
    const key = `${cls}|${v}|${v ? 0 : n}|${lit}`;
    if (cache[c] === key) continue;
    cache[c] = key;
    const el = cells[c];
    el.className = cls;
    if (v) el.innerHTML = `<div class="val">${v}</div>`;
    else if (n) {
      let h = '<div class="notes">';
      for (let d = 1; d <= 9; d++) h += `<span${d === lit ? ' class="on"' : ''}>${n & (1 << (d - 1)) ? d : ''}</span>`;
      el.innerHTML = h + '</div>';
    } else el.textContent = '';
  }
  keys.forEach((el, i) => {
    if (i === 9) { el.className = 'key' + (tool === 'erase' ? ' sel' : ''); return; }
    const d = i + 1;
    el.className = 'key' + (d === digit ? ' sel' : '') + (counts[d] <= 0 ? ' done' : '');
    el.lastChild.textContent = counts[d] > 0 ? counts[d] : '';
  });
  document.getElementById('notes').classList.toggle('on', tool === 'notes');
  const hints = document.getElementById('hints');
  if (hints) hints.textContent = g.hints || '';
}

function renderSettings() {
  const th = db.theme;
  const labels = { bg: 'Background', given: 'Given cells', accent: 'Accent', fg: 'Text' };
  $app.innerHTML = `
    <div class="top"><button class="icon" data-back aria-label="${tr('Back')}">${icon('back')}</button><h1>${tr('Colors')}</h1><span class="icon"></span></div>
    <div class="page">
      <h3>${tr('Themes')}</h3>
      <div class="swatches">${THEMES.map((x, i) => {
        const on = ['bg', 'given', 'accent', 'fg'].every(k => x[k] === th[k]);
        return `<button class="swatch${on ? ' sel' : ''}" data-theme="${i}" style="background:${x.bg};color:${x.fg}">
          <div><em style="background:${x.given}"></em><em style="background:${x.accent}"></em></div>${tr(x.name)}</button>`;
      }).join('')}</div>
      <h3>${tr('Custom colors')}</h3>
      ${Object.entries(labels).map(([k, l]) => `<label class="row"><span>${tr(l)}</span><input type="color" data-color="${k}" value="${th[k]}"></label>`).join('')}
    </div>`;
  $app.querySelectorAll('[data-color]').forEach(el => el.addEventListener('input', () => {
    db.theme = { ...db.theme, [el.dataset.color]: el.value };
    applyTheme(); save();
    $app.querySelectorAll('.swatch').forEach(s => s.classList.remove('sel'));
  }));
}

function renderGameSettings(id) {
  const name = id === 'sudoku' ? tr('Sudoku') : tr(CARD_GAMES.find(c => c.id === id).name);
  const toggle = (attr, key, label, on) => `<label class="row"><span>${label}</span><input type="checkbox" ${attr}="${key}"${on ? ' checked' : ''}></label>`;
  const opts = id === 'sudoku' ? '' : optsFor(db, id);
  const rows = id === 'sudoku'
    ? toggle('data-opt', 'showMistakes', tr('Show mistakes right away'), db.showMistakes) +
      toggle('data-opt', 'showHint', tr('Show hint button'), db.showHint) +
      toggle('data-opt', 'showAuto', tr('Show auto-notes button'), db.showAuto)
    : CARD_OPTIONS[id].map(o => o.toggle
      ? toggle('data-copt', o.key, tr(o.label), opts[o.key] ?? o.def)
      : `<label class="row"><span>${tr(o.label)}</span><select data-copt="${o.key}">${o.values.map(v => `<option value="${v}"${(opts[o.key] ?? o.def) === v ? ' selected' : ''}>${v}</option>`).join('')}</select></label>`).join('');
  $app.innerHTML = `
    <div class="top"><button class="icon" data-back aria-label="${tr('Back')}">${icon('back')}</button><h1>${name}</h1><span class="icon"></span></div>
    <div class="page">
      <h3>${tr('How to play')}</h3>
      <ul class="guide">${GUIDES[id].map(g => `<li>${g}</li>`).join('')}</ul>
      <h3>${tr('Settings')}</h3>
      ${rows}
      ${id === 'sudoku' ? '' : `<small class="note">${tr('These apply from your next new game.')}</small>`}
      ${id === 'hearts' && db.cards.games.hearts ? `<button class="link" data-a="newmatch">${tr('Abandon this match')}</button>` : ''}
      <h3>${tr('Appearance')}</h3>
      <button class="row wide" data-go="#settings"><span>${tr('Colors')}</span><span>›</span></button>
    </div>`;
  $app.querySelectorAll('[data-opt]').forEach(el => el.addEventListener('change', () => { db[el.dataset.opt] = el.checked; save(); }));
  $app.querySelectorAll('[data-copt]').forEach(el => el.addEventListener('change', () => {
    opts[el.dataset.copt] = el.type === 'checkbox' ? el.checked : +el.value;
    save();
  }));
}

function renderStats() {
  const total = db.stats.reduce((a, s) => a + s.totalScore, 0);
  const won = db.stats.reduce((a, s) => a + s.won, 0);
  $app.innerHTML = `
    <div class="top"><button class="icon" data-back aria-label="${tr('Back')}">${icon('back')}</button><h1>${tr('Scores')}</h1><span class="icon"></span></div>
    <div class="page">
      <div class="big">${total.toLocaleString()}</div><small style="color:var(--muted)">${tr('Sudoku points · {0} solved', won)}</small>
      <h3>Sudoku</h3>
      <div class="grid4 head"><span></span><span>${tr('Solved')}</span><span>${tr('Best time')}</span><span>${tr('Best score')}</span></div>
      ${LEVELS.map(l => {
        const s = db.stats[l.id - 1];
        return `<div class="grid4"><span>${tr(l.name)}</span><span>${s.won}/${s.started}</span><span>${s.bestTime === null ? '–' : fmt(s.bestTime)}</span><span>${s.bestScore || '–'}</span></div>`;
      }).join('')}
      <h3>${tr('Cards')}</h3>
      <div class="grid4 head"><span></span><span>${tr('Won')}</span><span>${tr('Best time')}</span><span>${tr('Best streak')}</span></div>
      ${CARD_GAMES.map(c => {
        const s = statsFor(db, c.id);
        return `<div class="grid4"><span>${tr(c.name)}</span><span>${s.won}/${s.played}</span><span>${s.bestTime === null ? '–' : fmt(s.bestTime)}</span><span>${s.bestStreak || '–'}</span></div>`;
      }).join('')}
      ${db.recent.length ? `<h3>${tr('Recent Sudoku')}</h3>${db.recent.map(r => `
        <div class="row"><span>${tr(LEVELS[r.level - 1].name)} <small>· ${fmt(r.t)}${r.hints ? ` · ${tr(r.hints > 1 ? '{0} hints' : '{0} hint', r.hints)}` : ''}${r.mistakes ? ` · ${tr(r.mistakes > 1 ? '{0} mistakes' : '{0} mistake', r.mistakes)}` : ''}</small></span><span>${r.score}</span></div>`).join('')}
` : ''}
      <button class="link" data-a="reset">${tr('Reset scores')}</button>
    </div>`;
}

function renderWin() {
  const w = lastWin;
  if (!w) return location.replace('#');
  $app.innerHTML = `
    <div class="win">
      <h2>${tr('{0} solved in {1}', tr(LEVELS[w.level - 1].name), fmt(w.t))}</h2>
      <div class="big">${w.total.toLocaleString()}</div>
      ${w.bestScore || w.bestTime ? `<div class="record">${w.bestScore && w.bestTime ? tr('New best score and time') : w.bestScore ? tr('New best score') : tr('New best time')}</div>` : ''}
      <div class="row"><span>${tr('Level')}</span><span>+${w.base}</span></div>
      <div class="row"><span>${tr('Speed bonus')}</span><span>+${w.speed}</span></div>
      <div class="row"><span>${tr(w.hints === 1 ? '{0} hint' : '{0} hints', w.hints)}, ${tr(w.mistakes === 1 ? '{0} mistake' : '{0} mistakes', w.mistakes)}</span><span>−${w.penalty}</span></div>
      <button class="level resume" data-new="${w.level}"><b>${tr('Next {0} puzzle', tr(LEVELS[w.level - 1].name))}</b></button>
      <button class="home-link" data-back>${tr('Change level')}</button>
    </div>`;
}

let unmountCards = null;

function route() {
  stopClock();
  unmountCards?.();
  unmountCards = null;
  if (game()) save();
  const h = location.hash;
  if (h === '#game' && game()) renderGame();
  else if (h === '#sudoku') renderHome();
  else if (h.startsWith('#card/')) {
    const id = h.slice(6);
    $app.innerHTML = '<div class="view"></div>';
    const ctx = { el: $app.firstChild, db, save, toast, icon };
    unmountCards = id === 'hearts' ? mountHearts(ctx) : mountSolitaire(id, ctx);
  }
  else if (h === '#settings') renderSettings();
  else if (h.startsWith('#settings/')) renderGameSettings(h.slice(10));
  else if (h === '#stats') renderStats();
  else if (h === '#win') renderWin();
  else renderHub();
}

// Navigation and tool buttons, all delegated from one listener.
$app.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  const d = b.dataset;
  if (d.new) {
    if (game() && !confirm(tr('Replace your Sudoku game in progress?'))) return;
    return newGame(+d.new);
  }
  if (d.go !== undefined) { location.hash = d.go; return; }
  if ('back' in d) return history.back();
  if (d.theme !== undefined) {
    db.theme = { ...THEMES[+d.theme] };
    applyTheme(); save(); renderSettings();
    return;
  }
  switch (d.a) {
    case 'restart': return restart();
    case 'hint': return hint();
    case 'notes': tool = tool === 'notes' ? null : 'notes'; return renderBoard();
    case 'auto': return autoNotes();
    case 'undo': return undo();
    case 'newmatch':
      if (confirm(tr('Abandon this match?'))) { statsFor(db, 'hearts').streak = 0; db.cards.games.hearts = null; save(); history.back(); }
      return;
    case 'reset':
      if (confirm(tr('Erase all scores?'))) { db.stats = emptyStats(); db.recent = []; db.cards.stats = {};
        if (game()) db.stats[game().level - 1].started = 1;
        CARD_GAMES.forEach(c => { if (db.cards.games[c.id]) statsFor(db, c.id).played = 1; });
        save(); renderStats(); }
  }
});
addEventListener('hashchange', route);

document.documentElement.lang = isFrench ? 'fr' : 'en';
document.title = tr('Games');
// Web version only: the native apps have their own install and storage.
if (!window.Capacitor?.isNativePlatform?.()) {
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = isFrench ? 'manifest-fr.webmanifest' : 'manifest.webmanifest';
  document.head.appendChild(link);
  navigator.serviceWorker?.register('sw.js').catch(() => {});
  navigator.storage?.persist?.().catch(() => {}); // asks the browser not to clear saved games
}
await load();
applyTheme();
if (location.hash !== '#game' || !game()) history.replaceState(null, '', location.pathname);
route();
