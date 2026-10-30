// Hearts against three bots. Seat 0 is the player, then clockwise 1, 2, 3.
// Cards are ints 0-51: suit = c / 13 (0 spade, 1 heart, 2 diamond, 3 club), rank = c % 13.
import { shuffled } from './logic.js';

export const suitOf = c => Math.floor(c / 13);
const high = c => (c % 13 + 12) % 13; // ace plays high
const QS = 11, TWO_CLUBS = 40;
const points = c => (c === QS ? 13 : suitOf(c) === 1 ? 1 : 0);
export const PASS = ['left', 'right', 'across', null];
const passOffset = { left: 1, right: 3, across: 2 };

export function newMatch(rng, target = 100) {
  return dealHand({ scores: [0, 0, 0, 0], hand: 0, target }, rng);
}

export function dealHand(m, rng) {
  const d = shuffled(52, rng).map(c => c.id);
  const hands = [0, 1, 2, 3].map(() => d.splice(0, 13).sort((a, b) => suitOf(a) - suitOf(b) || high(a) - high(b)));
  const s = { scores: m.scores, hand: m.hand, target: m.target || 100, hands, trick: [], taken: [0, 0, 0, 0], broken: false, tricks: 0, turn: 0, phase: 'play', t: m.t || 0 };
  if (PASS[s.hand % 4]) s.phase = 'pass';
  else startPlay(s);
  return s;
}

function startPlay(s) {
  s.phase = 'play';
  s.turn = s.hands.findIndex(h => h.includes(TWO_CLUBS));
}

// Bots shed what hurts: the queen and top spades, high hearts, then high cards.
function botPass(hand) {
  const danger = c => (c === QS ? 100 : suitOf(c) === 0 && high(c) > 10 ? 80 : suitOf(c) === 1 ? 20 + high(c) : high(c));
  return [...hand].sort((a, b) => danger(b) - danger(a)).slice(0, 3);
}

export function pass(s, mine) {
  const off = passOffset[PASS[s.hand % 4]];
  const picks = [mine, botPass(s.hands[1]), botPass(s.hands[2]), botPass(s.hands[3])];
  picks.forEach((cards, p) => {
    s.hands[p] = s.hands[p].filter(c => !cards.includes(c));
  });
  picks.forEach((cards, p) => s.hands[(p + off) % 4].push(...cards));
  s.hands.forEach(h => h.sort((a, b) => suitOf(a) - suitOf(b) || high(a) - high(b)));
  s.received = picks[(4 - off) % 4];
  startPlay(s);
}

export function legal(s, p) {
  const hand = s.hands[p];
  if (!s.trick.length) {
    if (hand.includes(TWO_CLUBS)) return [TWO_CLUBS];
    const safe = hand.filter(c => suitOf(c) !== 1);
    return s.broken || !safe.length ? hand : safe;
  }
  const led = suitOf(s.trick[0].c);
  const follow = hand.filter(c => suitOf(c) === led);
  if (follow.length) return follow;
  if (s.tricks === 0) {
    const clean = hand.filter(c => !points(c));
    if (clean.length) return clean;
  }
  return hand;
}

export function botCard(s, p) {
  const opts = legal(s, p);
  if (opts.length === 1) return opts[0];
  const byHigh = [...opts].sort((a, b) => high(a) - high(b));
  if (!s.trick.length) {
    const queenGone = !s.hands.some(h => h.includes(QS));
    const safe = byHigh.filter(c => c !== QS && (suitOf(c) !== 0 || queenGone || high(c) < 10));
    return (safe.length ? safe : byHigh)[0];
  }
  const led = suitOf(s.trick[0].c);
  if (suitOf(opts[0]) !== led) {
    if (opts.includes(QS)) return QS;
    const hearts = byHigh.filter(c => suitOf(c) === 1);
    return hearts.length ? hearts[hearts.length - 1] : byHigh[byHigh.length - 1];
  }
  const best = Math.max(...s.trick.filter(x => suitOf(x.c) === led).map(x => high(x.c)));
  const under = byHigh.filter(c => high(c) < best);
  if (under.length) return under[under.length - 1];
  // Forced to win: last seat with a clean trick takes it high, otherwise stay low.
  const clean = !s.trick.some(x => points(x.c));
  const noQueen = byHigh.filter(c => c !== QS);
  const pool = noQueen.length ? noQueen : byHigh;
  return s.trick.length === 3 && clean ? pool[pool.length - 1] : pool[0];
}

export function play(s, p, c) {
  s.hands[p].splice(s.hands[p].indexOf(c), 1);
  s.trick.push({ p, c });
  if (suitOf(c) === 1) s.broken = true;
  s.turn = (p + 1) % 4;
}

// Clears a full trick. Returns the winner and moves to 'handEnd' or 'over' when due.
export function collect(s) {
  const led = suitOf(s.trick[0].c);
  const win = s.trick.filter(x => suitOf(x.c) === led).reduce((a, b) => (high(b.c) > high(a.c) ? b : a));
  s.taken[win.p] += s.trick.reduce((n, x) => n + points(x.c), 0);
  s.trick = [];
  s.tricks++;
  s.turn = win.p;
  if (s.tricks === 13) {
    const moon = s.taken.indexOf(26);
    s.last = moon >= 0 ? s.taken.map((_, p) => (p === moon ? 0 : 26)) : s.taken.slice();
    s.moon = moon;
    s.scores = s.scores.map((v, p) => v + s.last[p]);
    // A tie for lowest plays on until one player is clear.
    const low = Math.min(...s.scores);
    const soleLow = s.scores.filter(v => v === low).length === 1;
    s.phase = Math.max(...s.scores) >= s.target && soleLow ? 'over' : 'handEnd';
  }
  return win.p;
}

export function playerWon(s) {
  return s.scores[0] === Math.min(...s.scores);
}
