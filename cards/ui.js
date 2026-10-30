// Card table: renders any solitaire from logic.js, plus the Hearts table.
import { GAMES, tripeaksPos, rank, suit, isRed, move, autoMove, drawStock } from './logic.js';
import * as H from './hearts.js';

import { tr, RANKS } from '../i18n.js';

const SUITS = ['♠︎', '♥︎', '♦︎', '♣︎'];
const fmt = s => `${Math.floor(s / 60)}M ${String(s % 60).padStart(2, '0')}S`;
const undoStacks = {};

export const CARD_GAMES = [
  { id: 'klondike', name: 'Klondike' },
  { id: 'spider', name: 'Spider' },
  { id: 'freecell', name: 'FreeCell' },
  { id: 'tripeaks', name: 'TriPeaks' },
  { id: 'hearts', name: 'Hearts' },
];

export const emptyCardData = () => ({ games: {}, stats: {}, opts: {} });

// Per-game options. They apply from the next new game, because they change the rules of a deal.
export const CARD_OPTIONS = {
  klondike: [{ key: 'draw', label: 'Cards drawn each time', values: [1, 3], def: 1 }],
  spider: [{ key: 'suits', label: 'Suits', values: [1, 2, 4], def: 2 }],
  freecell: [{ key: 'autoUp', label: 'Move safe cards up automatically', toggle: true, def: true }],
  tripeaks: [{ key: 'wrap', label: 'Ace and king connect', toggle: true, def: true }],
  hearts: [{ key: 'target', label: 'Match ends at', values: [50, 75, 100], def: 100 }],
};
export const optsFor = (db, id) => (db.cards.opts[id] ??= {});

export function statsFor(db, id) {
  return (db.cards.stats[id] ??= { played: 0, won: 0, bestTime: null, streak: 0, bestStreak: 0 });
}

function recordStart(db, id) {
  const st = statsFor(db, id), old = db.cards.games[id];
  if (old && !(old.moves || old.tricks || old.hand)) return; // an untouched deal was never played
  if (old) st.streak = 0;
  st.played++;
}

function recordEnd(db, id, won, t) {
  const st = statsFor(db, id);
  if (won) {
    st.won++;
    st.streak++;
    st.bestStreak = Math.max(st.bestStreak, st.streak);
    if (id !== 'hearts' && (st.bestTime === null || t < st.bestTime)) st.bestTime = t;
  } else st.streak = 0;
  db.cards.games[id] = null;
}

function faceHtml(c) {
  const r = RANKS[rank(c)], s = SUITS[suit(c)];
  return `<span class="idx">${r}<i>${s}</i></span><span class="pip">${s}</span>`;
}

// Counts ticks, not wall time, so a suspended app doesn't run the clock.
function clock(state, onTick, save) {
  const id = setInterval(() => {
    state.t++;
    if (state.t % 5 === 0) save();
    onTick();
  }, 1000);
  return () => clearInterval(id);
}

// --- Layouts: where each pile sits, in pixels. fan: how its cards spread.
function metrics(W, cols) {
  const gap = Math.max(2, W * 0.008);
  const w = (W - gap * (cols + 1)) / cols;
  return { gap, w, h: w * 1.4, col: i => gap + i * (w + gap) };
}

function layoutFor(id, W, H) {
  const out = {};
  if (id === 'klondike') {
    const m = metrics(W, 7);
    for (let i = 0; i < 4; i++) out['f' + i] = { x: m.col(i), y: 0, slot: 1 };
    out.waste = { x: m.col(4), y: 0, slot: 1, fanLast3: (m.w + m.gap) * 0.45 };
    out.stock = { x: m.col(6), y: 0, slot: 1 };
    for (let i = 0; i < 7; i++) out['t' + i] = { x: m.col(i), y: m.h + m.gap * 4, fan: 1, slot: 1 };
    return { ...m, piles: out };
  }
  if (id === 'freecell') {
    const m = metrics(W, 8);
    for (let i = 0; i < 4; i++) {
      out['c' + i] = { x: m.col(i), y: 0, slot: 1 };
      out['f' + i] = { x: m.col(i + 4), y: 0, slot: 1 };
    }
    for (let i = 0; i < 8; i++) out['t' + i] = { x: m.col(i), y: m.h + m.gap * 4, fan: 1, slot: 1 };
    return { ...m, piles: out };
  }
  if (id === 'spider') {
    const m = metrics(W, 10);
    out.done = { x: m.col(0), y: 0, slot: 1 };
    out.stock = { x: m.col(9), y: 0, slot: 1 };
    for (let i = 0; i < 10; i++) out['t' + i] = { x: m.col(i), y: m.h + m.gap * 4, fan: 1, slot: 1 };
    return { ...m, piles: out };
  }
  const m = metrics(W, 10.2);
  const left = (W - (10 * m.w + 9 * m.gap)) / 2, rowH = m.h * 0.62;
  const top = Math.max(0, (H - (3 * rowH + m.h * 2.6)) / 2);
  tripeaksPos.x.forEach((x, i) => {
    out['p' + i] = { x: left + x * (m.w + m.gap), y: top + tripeaksPos.y[i] * rowH };
  });
  const y = top + 3 * rowH + m.h * 1.4;
  const big = m.w * 1.5;
  out.stock = { x: W / 2 - big - 8, y, slot: 1, scale: 1.5 };
  out.waste = { x: W / 2 + 8, y, slot: 1, scale: 1.5 };
  return { ...m, piles: out };
}

// --- Solitaire view
export function mountSolitaire(id, { el, db, save, toast, icon }) {
  const def = GAMES[id];
  const undo = (undoStacks[id] ??= []);
  let s = db.cards.games[id];
  if (!s) s = newDeal();

  function newDeal() {
    recordStart(db, id);
    undo.length = 0;
    const d = def.deal(Math.random, optsFor(db, id));
    db.cards.games[id] = d;
    save();
    return d;
  }

  el.innerHTML = `
    <div class="top"><button class="icon" data-back aria-label="${tr('Back')}">${icon('back')}</button>
    <span class="timer" id="status"></span>
    <button class="icon" data-go="#settings/${id}" aria-label="${tr('Settings')}">${icon('settings')}</button></div>
    <div class="table" id="table"></div>
    <div class="tools">
      <button class="tool label" id="new">${icon('restart')}${tr('New')}</button>
      <button class="tool label" id="undo">${icon('undo')}${tr('Undo')}</button>
    </div>`;
  const table = el.querySelector('#table'), status = el.querySelector('#status');
  const cardEls = new Map(), slotEls = new Map();
  let L, drag = null, autoTimer = 0, finished = false, stopClock = () => {};
  const showStatus = () => { status.textContent = `${fmt(s.t)} · ${tr(s.moves === 1 ? '{0} move' : '{0} moves', s.moves)}`; };

  const keyOf = c => c.key ?? c.id;
  function cardEl(c) {
    let e = cardEls.get(keyOf(c));
    if (!e) {
      e = document.createElement('div');
      e.className = 'card';
      e.innerHTML = faceHtml(c);
      e.classList.toggle('red', isRed(c));
      table.appendChild(e);
      cardEls.set(keyOf(c), e);
    }
    return e;
  }

  // Fans compress so the tallest column always fits the table.
  function fanStep(pile, y, H) {
    let down = 0, up = 0;
    pile.slice(0, -1).forEach(c => (c.up ? up++ : down++));
    let dd = L.h * 0.13, du = L.h * 0.27;
    const room = H - y - L.h, need = down * dd + up * du;
    if (need > room && need > 0) { const k = Math.max(room, 0) / need; dd *= k; du *= k; }
    return c => (c.up ? du : dd);
  }

  function draw() {
    const W = table.clientWidth, Ht = table.clientHeight;
    L = layoutFor(id, W, Ht);
    table.style.setProperty('--cw', L.w + 'px');
    table.style.setProperty('--ch', L.h + 'px');
    for (const [pid, p] of Object.entries(L.piles)) {
      if (p.slot && !slotEls.has(pid)) {
        const e = document.createElement('div');
        e.className = 'slot';
        e.dataset.pile = pid;
        table.prepend(e);
        slotEls.set(pid, e);
      }
      const se = slotEls.get(pid);
      if (se) se.style.transform = `translate(${p.x}px,${p.y}px) scale(${p.scale || 1})`;
      const pile = s.piles[pid] || [];
      const step = p.fan ? fanStep(pile, p.y, Ht) : () => 0;
      let y = p.y;
      pile.forEach((c, i) => {
        const e = cardEl(c);
        e.dataset.pile = pid;
        e.dataset.i = i;
        e.classList.toggle('down', !c.up);
        e.style.zIndex = (p.fan ? 10 : pid === 'waste' || pid === 'stock' ? 40 : 5) + i;
        const x = p.x + (p.fanLast3 ? Math.max(0, i - (pile.length - 3)) * p.fanLast3 * (s.draw === 3 ? 1 : 0) : 0);
        e.style.transform = `translate(${x}px,${y}px) scale(${p.scale || 1})`;
        e._x = x; e._y = y;
        y += step(c);
      });
    }
    showStatus();
  }

  function commitAndCheck(snapshot) {
    undo.push(snapshot);
    if (undo.length > 300) undo.shift();
    save();
    draw();
    runAuto();
  }

  // Auto moves animate one at a time and share the triggering move's undo step.
  function runAuto() {
    clearTimeout(autoTimer);
    const m = def.auto(s);
    if (m && move(def, s, ...m)) {
      s.moves--; // the game's doing, not the player's
      draw();
      save();
      autoTimer = setTimeout(runAuto, 70);
      return;
    }
    if (def.won(s) && !finished) win();
  }

  function win() {
    finished = true;
    stopClock();
    const t = s.t, moves = s.moves, st = statsFor(db, id);
    const best = st.bestTime === null || t < st.bestTime;
    recordEnd(db, id, true, t);
    save();
    const o = document.createElement('div');
    o.className = 'overlay';
    o.innerHTML = `<div class="panel"><h2>${tr('{0} solved', tr(def.name))}</h2><div class="big">${fmt(t)}</div>
      ${best ? `<div class="record">${tr('New best time')}</div>` : ''}
      <div class="row"><span>${tr('Moves')}</span><span>${moves}</span></div>
      <div class="row"><span>${tr('Win streak')}</span><span>${st.streak}</span></div>
      <button class="level resume" id="again"><b>${tr('Play again')}</b></button></div>`;
    el.appendChild(o);
    o.querySelector('#again').onclick = () => { o.remove(); restart(); };
  }

  function restart() {
    finished = false;
    clearTimeout(autoTimer);
    stopClock();
    s = newDeal();
    cardEls.forEach(e => e.remove());
    cardEls.clear();
    draw();
    stopClock = clock(s, showStatus, save);
    runAuto();
  }

  // The closest pile that accepts the cards, measured to its whole column so a
  // drop anywhere on a long column counts as that column.
  function nearestTarget(x, y, from, cards) {
    let best = null, bestD = L.w * 1.3;
    for (const [pid, p] of Object.entries(L.piles)) {
      if (pid === from || !def.drop(s, cards, from, pid)) continue;
      const pile = s.piles[pid] || [];
      const lastY = pile.length ? cardEl(pile[pile.length - 1])._y : p.y;
      const d = Math.hypot(p.x - x, y - Math.min(Math.max(y, p.y), lastY));
      if (d < bestD) { best = pid; bestD = d; }
    }
    return best;
  }

  table.addEventListener('pointerdown', e => {
    if (finished) return;
    const t = e.target.closest('.card, .slot');
    if (!t) return;
    const pile = t.dataset.pile, i = +t.dataset.i;
    if (pile === 'stock') {
      const snap = JSON.stringify(s);
      if (drawStock(def, s)) commitAndCheck(snap);
      else if (id === 'spider' && s.piles.stock.length) toast(tr('Fill every column before dealing.'));
      return;
    }
    if (!t.classList.contains('card') || !def.pick(s, pile, i)) return;
    const cards = s.piles[pile].slice(i).map(cardEl);
    drag = { pile, i, cards, sx: e.clientX, sy: e.clientY, moved: false };
    table.setPointerCapture(e.pointerId);
  });

  table.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    drag.moved = true;
    drag.dx = dx; drag.dy = dy;
    drag.cards.forEach((c, k) => {
      c.classList.add('drag');
      c.style.zIndex = 500 + k;
      c.style.transform = `translate(${c._x + dx}px,${c._y + dy}px)`;
    });
  });

  const endDrag = e => {
    if (!drag) return;
    const d = drag;
    drag = null;
    d.cards.forEach(c => c.classList.remove('drag'));
    const snap = JSON.stringify(s);
    let ok;
    if (d.moved) {
      const first = d.cards[0];
      const to = e.type === 'pointerup' && nearestTarget(first._x + d.dx, first._y + d.dy, d.pile, s.piles[d.pile].slice(d.i));
      ok = to && move(def, s, d.pile, d.i, to);
    } else ok = e.type === 'pointerup' && autoMove(def, s, d.pile, d.i);
    if (ok) commitAndCheck(snap);
    else draw();
  };
  table.addEventListener('pointerup', endDrag);
  table.addEventListener('pointercancel', endDrag);

  el.querySelector('#undo').onclick = () => {
    if (finished || !undo.length) return;
    clearTimeout(autoTimer);
    const t = s.t;
    s = JSON.parse(undo.pop());
    s.t = t;
    db.cards.games[id] = s;
    stopClock();
    stopClock = clock(s, showStatus, save);
    save();
    draw();
  };
  el.querySelector('#new').onclick = () => {
    if (finished || !s.moves || confirm(tr('Start a new game? This one counts as abandoned.'))) {
      el.querySelector('.overlay')?.remove();
      restart();
    }
  };

  const onResize = () => draw();
  addEventListener('resize', onResize);
  draw();
  stopClock = clock(s, showStatus, save);
  runAuto();
  return () => {
    stopClock();
    clearTimeout(autoTimer);
    removeEventListener('resize', onResize);
    if (!finished) save();
  };
}

// --- Hearts view
const SEATS = ['You', 'West', 'North', 'East'].map(n => tr(n));
let picks = []; // kept here so a trip to Settings doesn't lose your selection

export function mountHearts({ el, db, save, toast, icon }) {
  let s = db.cards.games.hearts;
  const startMatch = () => H.newMatch(Math.random, optsFor(db, 'hearts').target || 100);
  if (!s) { recordStart(db, 'hearts'); s = startMatch(); db.cards.games.hearts = s; save(); }
  let timer = 0;

  el.innerHTML = `
    <div class="top"><button class="icon" data-back aria-label="${tr('Back')}">${icon('back')}</button>
    <span class="timer" id="status"></span>
    <button class="icon" data-go="#settings/hearts" aria-label="${tr('Settings')}">${icon('settings')}</button></div>
    <div class="hearts">
      <div class="seat n" id="s2"></div>
      <div class="mid"><div class="seat w" id="s1"></div><div class="trick" id="trick"></div><div class="seat e" id="s3"></div></div>
      <div class="seat me" id="s0"></div>
      <button class="level resume passbtn" id="pass"></button>
      <div class="hand" id="hand"></div>
    </div>`;
  const $ = q => el.querySelector(q);

  function cardHtml(c, cls = '', style = '') {
    const obj = { id: c };
    return `<div class="card ${isRed(obj) ? 'red' : ''} ${cls}" data-c="${c}" style="${style}">${faceHtml(obj)}</div>`;
  }

  function render() {
    const handEl = $('#hand'), W = handEl.clientWidth;
    const gap = 4, w = Math.min((W - gap * 8) / 7, 72), h = w * 1.4;
    el.style.setProperty('--cw', w + 'px');
    el.style.setProperty('--ch', h + 'px');
    for (let p = 0; p < 4; p++) {
      const seat = $('#s' + p);
      seat.innerHTML = `<b>${SEATS[p]}</b> <span>${s.scores[p]}${s.taken[p] ? ` +${s.taken[p]}` : ''}</span>`;
      seat.classList.toggle('turn', s.phase === 'play' && s.turn === p && s.trick.length < 4);
    }
    const passDir = H.PASS[s.hand % 4];
    $('#status').textContent = s.phase === 'pass' ? tr(`Pass 3 cards ${passDir}`) : `${tr('Hand {0}', s.hand + 1)}${passDir ? '' : ' · ' + tr('no passing')} · ${tr('to {0}', s.target || 100)}`;
    const pos = { 0: 'b', 1: 'l', 2: 't', 3: 'r' };
    $('#trick').innerHTML = s.trick.map(x => cardHtml(x.c, 'tc ' + pos[x.p])).join('');
    const mine = s.hands[0], ok = s.phase === 'play' && s.turn === 0 && s.trick.length < 4 ? H.legal(s, 0) : [];
    // Two rows without overlap: every card stays readable and easy to tap.
    const perRow = 7, rows = Math.ceil(mine.length / perRow) || 1;
    handEl.style.height = 2 * (h + gap) + 10 + 'px';
    handEl.innerHTML = mine.map((c, i) => {
      const row = Math.floor(i / perRow), inRow = row < rows - 1 ? perRow : mine.length - row * perRow;
      const x = (W - (inRow * w + (inRow - 1) * gap)) / 2 + (i % perRow) * (w + gap);
      const y = 10 + row * (h + gap) - (picks.includes(c) ? 9 : 0);
      const cls = picks.includes(c) ? 'picked' : s.phase === 'pass' || ok.includes(c) ? '' : 'dim';
      return cardHtml(c, cls, `transform:translate(${x}px,${y}px)`);
    }).join('');
    const btn = $('#pass');
    btn.style.display = s.phase === 'pass' ? '' : 'none';
    btn.innerHTML = `<b>${picks.length === 3 ? tr(`Pass ${passDir}`) : tr('Select {0} more', 3 - picks.length)}</b>`;
    btn.disabled = picks.length !== 3;
  }

  function endPanel() {
    const over = s.phase === 'over';
    const won = H.playerWon(s);
    if (over) { recordEnd(db, 'hearts', won, s.t); save(); }
    const o = document.createElement('div');
    o.className = 'overlay';
    const moon = s.moon >= 0 ? `<div class="record">${tr('{0} shot the moon', SEATS[s.moon])}</div>` : '';
    o.innerHTML = `<div class="panel"><h2>${over ? (won ? tr('You won the match') : tr('Match over')) : tr('Hand {0} done', s.hand + 1)}</h2>${moon}
      ${SEATS.map((n, p) => `<div class="row"><span>${n}</span><span>+${s.last[p]} · <b>${s.scores[p]}</b></span></div>`).join('')}
      <button class="level resume" id="next"><b>${over ? tr('New match') : tr('Next hand')}</b></button></div>`;
    el.appendChild(o);
    o.querySelector('#next').onclick = () => {
      o.remove();
      if (over) { recordStart(db, 'hearts'); s = startMatch(); }
      else s = H.dealHand({ scores: s.scores, hand: s.hand + 1, target: s.target });
      db.cards.games.hearts = s;
      picks = [];
      save();
      step();
    };
  }

  function step() {
    clearTimeout(timer);
    render();
    if (s.phase === 'handEnd' || s.phase === 'over') return endPanel();
    if (s.phase !== 'play') return;
    if (s.trick.length === 4) {
      timer = setTimeout(() => { H.collect(s); save(); step(); }, 750);
    } else if (s.turn !== 0) {
      timer = setTimeout(() => { H.play(s, s.turn, H.botCard(s, s.turn)); save(); step(); }, 320);
    }
  }

  $('#hand').addEventListener('pointerdown', e => {
    const t = e.target.closest('.card');
    if (!t) return;
    const c = +t.dataset.c;
    if (s.phase === 'pass') {
      if (picks.includes(c)) picks = picks.filter(x => x !== c);
      else if (picks.length < 3) picks.push(c);
      render();
    } else if (s.phase === 'play' && s.turn === 0 && s.trick.length < 4) {
      const ok = H.legal(s, 0);
      if (!ok.includes(c)) {
        const led = s.trick.length && H.suitOf(s.trick[0].c);
        toast(ok.includes(40) ? tr('The 2 of clubs leads.')
          : !s.trick.length ? tr('Hearts are not broken yet.')
          : s.hands[0].some(x => H.suitOf(x) === led) ? tr('Follow suit.')
          : tr('No points on the first trick.'));
        return;
      }
      H.play(s, 0, c);
      save();
      step();
    }
  });
  $('#pass').onclick = () => {
    if (picks.length !== 3) return;
    H.pass(s, picks);
    picks = [];
    toast(tr('You received {0}', s.received.map(c => RANKS[c % 13] + SUITS[H.suitOf(c)]).join('  ')), 3500);
    save();
    step();
  };

  addEventListener('resize', render);
  step();
  return () => { clearTimeout(timer); removeEventListener('resize', render); save(); };
}
