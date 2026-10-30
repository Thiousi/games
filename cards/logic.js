// Solitaire rules. No DOM. A state is { piles: { id: [{ id, up }] }, moves, t }.
// Card ids: id % 52 identifies the card, so Spider's two decks use 0-103.
// Suits: 0 spade, 1 heart, 2 diamond, 3 club. Ranks: 0 ace ... 12 king.

export const rank = c => c.id % 13;
export const suit = c => Math.floor((c.id % 52) / 13);
export const isRed = c => suit(c) === 1 || suit(c) === 2;
const top = p => p[p.length - 1];
const range = (pre, n) => Array.from({ length: n }, (_, i) => pre + i);

export function shuffled(n, rng = Math.random) {
  const a = Array.from({ length: n }, (_, i) => ({ id: i, up: false }));
  for (let i = n - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const flipTops = (s, ids) => { for (const id of ids) { const c = top(s.piles[id]); if (c) c.up = true; } };
const toFoundation = (cards, pile) =>
  cards.length === 1 && rank(cards[0]) === pile.length && (!pile.length || suit(pile[0]) === suit(cards[0]));
const alternating = (card, on) => isRed(card) !== isRed(on) && rank(card) === rank(on) - 1;

const FOUND = range('f', 4), T7 = range('t', 7), T8 = range('t', 8), T10 = range('t', 10);

export const klondike = {
  id: 'klondike', name: 'Klondike',
  deal(rng, opts = {}) {
    const d = shuffled(52, rng), piles = { stock: [], waste: [] };
    FOUND.forEach(f => (piles[f] = []));
    T7.forEach((t, i) => {
      piles[t] = d.splice(0, i + 1);
      top(piles[t]).up = true;
    });
    piles.stock = d;
    return { piles, moves: 0, t: 0, draw: opts.draw || 1 };
  },
  pick(s, from, i) {
    const p = s.piles[from];
    if (from === 'stock' || !p[i]?.up) return false;
    return from[0] === 't' || i === p.length - 1;
  },
  drop(s, cards, from, to) {
    const p = s.piles[to];
    if (to[0] === 'f') return toFoundation(cards, p);
    if (to[0] !== 't') return false;
    return p.length ? top(p).up && alternating(cards[0], top(p)) : rank(cards[0]) === 12;
  },
  targets: () => [...FOUND, ...T7],
  stock(s) {
    const { stock, waste } = s.piles;
    if (stock.length) {
      for (let n = s.draw || 1; n > 0 && stock.length; n--) { const c = stock.pop(); c.up = true; waste.push(c); }
      return true;
    }
    if (!waste.length) return false;
    s.piles.stock = waste.reverse().map(c => ({ ...c, up: false }));
    s.piles.waste = [];
    return true;
  },
  after: s => flipTops(s, T7),
  // Once everything is face up, the rest plays itself.
  auto(s) {
    if (s.piles.stock.length || s.piles.waste.length || T7.some(t => s.piles[t].some(c => !c.up))) return null;
    for (const t of T7) {
      const c = top(s.piles[t]);
      if (!c) continue;
      for (const f of FOUND) if (toFoundation([c], s.piles[f])) return [t, s.piles[t].length - 1, f];
    }
    return null;
  },
  won: s => FOUND.every(f => s.piles[f].length === 13),
};

const freeCells = s => ['c0', 'c1', 'c2', 'c3'].filter(c => !s.piles[c].length).length;

export const freecell = {
  id: 'freecell', name: 'FreeCell',
  deal(rng, opts = {}) {
    const d = shuffled(52, rng), piles = {};
    d.forEach(c => (c.up = true));
    ['c0', 'c1', 'c2', 'c3', ...FOUND].forEach(k => (piles[k] = []));
    T8.forEach((t, i) => (piles[t] = d.splice(0, i < 4 ? 7 : 6)));
    return { piles, moves: 0, t: 0, manual: opts.autoUp === false };
  },
  pick(s, from, i) {
    const p = s.piles[from];
    if (!p[i]) return false;
    if (from[0] !== 't') return from[0] === 'c' && i === p.length - 1;
    for (let k = i + 1; k < p.length; k++) if (!alternating(p[k], p[k - 1])) return false;
    return true;
  },
  drop(s, cards, from, to) {
    const p = s.piles[to];
    if (to[0] === 'f') return toFoundation(cards, p);
    if (to[0] === 'c') return cards.length === 1 && !p.length;
    if (to[0] !== 't') return false;
    if (p.length && !alternating(cards[0], top(p))) return false;
    const emptyCols = T8.filter(t => t !== from && t !== to && !s.piles[t].length).length;
    return cards.length <= (freeCells(s) + 1) * 2 ** emptyCols;
  },
  // Real stacks before empty columns, and cells last.
  targets: s => [...FOUND, ...T8.filter(t => s.piles[t].length), ...T8.filter(t => !s.piles[t].length), 'c0', 'c1', 'c2', 'c3'],
  after() {},
  // Moves a card up only when no remaining card could still need it.
  auto(s) {
    if (s.manual) return null;
    const height = su => s.piles[FOUND.find(f => s.piles[f][0] && suit(s.piles[f][0]) === su)]?.length ?? 0;
    const safe = c => {
      const others = [0, 1, 2, 3].filter(o => (o === 1 || o === 2) !== isRed(c)).map(height);
      return rank(c) <= Math.min(...others);
    };
    for (const from of [...T8, 'c0', 'c1', 'c2', 'c3']) {
      const c = top(s.piles[from]);
      if (!c || !safe(c)) continue;
      for (const f of FOUND) if (toFoundation([c], s.piles[f])) return [from, s.piles[from].length - 1, f];
    }
    return null;
  },
  won: s => FOUND.every(f => s.piles[f].length === 13),
};

// With fewer suits, the two decks are remapped: ids stay unique, suits repeat.
const SPIDER_SUITS = { 1: [0, 0, 0, 0], 2: [0, 1, 0, 1], 4: [0, 1, 2, 3] };

export const spider = {
  id: 'spider', name: 'Spider',
  deal(rng, opts = {}) {
    const suits = opts.suits || 2;
    const d = shuffled(104, rng), piles = { stock: [], done: [] };
    for (const c of d) {
      c.id = SPIDER_SUITS[suits][suit(c)] * 13 + rank(c);
    }
    uniqueKeys(d);
    T10.forEach((t, i) => {
      piles[t] = d.splice(0, i < 4 ? 6 : 5);
      top(piles[t]).up = true;
    });
    piles.stock = d;
    return { piles, moves: 0, t: 0, suits };
  },
  pick(s, from, i) {
    const p = s.piles[from];
    if (from[0] !== 't' || !p[i]?.up) return false;
    for (let k = i + 1; k < p.length; k++) {
      if (suit(p[k]) !== suit(p[i]) || rank(p[k]) !== rank(p[k - 1]) - 1) return false;
    }
    return true;
  },
  drop(s, cards, from, to) {
    if (to[0] !== 't') return false;
    const t = top(s.piles[to]);
    return !t || rank(cards[0]) === rank(t) - 1;
  },
  targets(s, from, i) {
    const c = s.piles[from][i];
    const score = t => {
      const o = top(s.piles[t]);
      return !o ? 1 : suit(o) === suit(c) ? 3 : 2;
    };
    return T10.filter(t => t !== from).sort((a, b) => score(b) - score(a));
  },
  stock(s) {
    if (!s.piles.stock.length || T10.some(t => !s.piles[t].length)) return false;
    for (const t of T10) { const c = s.piles.stock.pop(); c.up = true; s.piles[t].push(c); }
    return true;
  },
  after(s) {
    for (const t of T10) {
      const p = s.piles[t];
      if (p.length >= 13) {
        const run = p.slice(-13);
        if (run.every((c, k) => c.up && rank(c) === 12 - k && suit(c) === suit(run[0]))) {
          p.length -= 13;
          s.piles.done.push(...run);
        }
      }
    }
    flipTops(s, T10);
  },
  auto: () => null,
  won: s => s.piles.done.length === 104,
};

// With fewer than 4 suits, Spider repeats a card up to 8 times, so `key` tells copies apart on screen.
function uniqueKeys(cards) {
  const seen = {};
  for (const c of cards) {
    const k = c.id % 52;
    seen[k] = (seen[k] || 0) + 1;
    c.key = k + '-' + seen[k];
  }
}

// TriPeaks: 28 cards in piles p0-p27. COVERS[i] lists the cards resting on card i.
const COVERS = (() => {
  const c = Array.from({ length: 28 }, () => []);
  for (let i = 0; i < 3; i++) c[i] = [3 + 2 * i, 4 + 2 * i];
  for (let i = 0; i < 6; i++) { const k = i + (i >> 1); c[3 + i] = [9 + k, 10 + k]; }
  for (let i = 0; i < 9; i++) c[9 + i] = [18 + i, 19 + i];
  return c;
})();
const P = range('p', 28);
export const tripeaksPos = (() => {
  const x = new Array(28), y = new Array(28);
  for (let i = 0; i < 10; i++) { x[18 + i] = i; y[18 + i] = 3; }
  for (let i = 17; i >= 0; i--) {
    x[i] = (x[COVERS[i][0]] + x[COVERS[i][1]]) / 2;
    y[i] = i < 3 ? 0 : i < 9 ? 1 : 2;
  }
  return { x, y };
})();

export const tripeaks = {
  id: 'tripeaks', name: 'TriPeaks',
  deal(rng, opts = {}) {
    const d = shuffled(52, rng), piles = {};
    P.forEach(p => (piles[p] = [d.pop()]));
    piles.waste = [d.pop()];
    piles.waste[0].up = true;
    piles.stock = d;
    const s = { piles, moves: 0, t: 0, noWrap: opts.wrap === false };
    this.after(s);
    return s;
  },
  pick: (s, from, i) => from[0] === 'p' && !!s.piles[from][i]?.up,
  drop(s, cards, from, to) {
    if (to !== 'waste') return false;
    const d = Math.abs(rank(cards[0]) - rank(top(s.piles.waste)));
    return d === 1 || (d === 12 && !s.noWrap);
  },
  targets: () => ['waste'],
  stock(s) {
    const c = s.piles.stock.pop();
    if (!c) return false;
    c.up = true;
    s.piles.waste.push(c);
    return true;
  },
  after(s) {
    P.forEach((p, i) => {
      const c = s.piles[p][0];
      if (c) c.up = COVERS[i].every(k => !s.piles[P[k]].length);
    });
  },
  auto: () => null,
  won: s => P.every(p => !s.piles[p].length),
};

export const GAMES = { klondike, spider, freecell, tripeaks };

export function move(def, s, from, i, to) {
  if (from === to || !def.pick(s, from, i)) return false;
  const src = s.piles[from], cards = src.slice(i);
  if (!def.drop(s, cards, from, to)) return false;
  src.length = i;
  s.piles[to].push(...cards);
  s.moves++;
  def.after(s);
  return true;
}

// A tap sends the card to its best legal destination.
export function autoMove(def, s, from, i) {
  if (!def.pick(s, from, i)) return false;
  // Skip moves that change nothing: foundation to foundation, or a whole column to an empty one.
  const pointless = to => (from[0] === 'f' && to[0] === 'f') ||
    (from[0] === 't' && i === 0 && to[0] === 't' && !s.piles[to].length);
  return def.targets(s, from, i).some(to => !pointless(to) && move(def, s, from, i, to));
}

export function drawStock(def, s) {
  if (!def.stock?.(s)) return false;
  s.moves++;
  def.after(s);
  return true;
}
