// Sudoku engine: solver, human-technique grader, generator. No DOM, no dependencies.
// Grids are arrays of 81 ints, 0 = empty. Candidates are 9-bit masks (bit 0 = digit 1).

export const LEVELS = [
  { id: 1, name: 'Easy', minClues: 36 },
  { id: 2, name: 'Medium', minClues: 28 },
  { id: 3, name: 'Hard', minClues: 0 },
  { id: 4, name: 'Expert', minClues: 0 },
];

const ROWS = [], COLS = [], BOXES = [];
for (let i = 0; i < 9; i++) {
  ROWS.push([]); COLS.push([]); BOXES.push([]);
}
for (let c = 0; c < 81; c++) {
  const r = (c / 9) | 0, k = c % 9;
  ROWS[r].push(c); COLS[k].push(c); BOXES[((r / 3) | 0) * 3 + ((k / 3) | 0)].push(c);
}
const UNITS = [...ROWS, ...COLS, ...BOXES];
const unitName = u => (u < 9 ? 'row' : u < 18 ? 'column' : 'box');
export const boxOf = c => (((c / 9) | 0) / 3 | 0) * 3 + ((c % 9) / 3 | 0);
export const PEERS = Array.from({ length: 81 }, (_, c) => {
  const s = new Set([...ROWS[(c / 9) | 0], ...COLS[c % 9], ...BOXES[boxOf(c)]]);
  s.delete(c);
  return [...s];
});

const bit = d => 1 << (d - 1);
const popcount = m => { let n = 0; while (m) { m &= m - 1; n++; } return n; };
const digitOf = m => 32 - Math.clz32(m);
const digitsOf = m => { const a = []; for (let d = 1; d <= 9; d++) if (m & bit(d)) a.push(d); return a; };

function shuffle(a, rng = Math.random) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Backtracking search with most-constrained-cell selection. Fills `out` with the
// first solution found and returns the number of solutions, stopping at `limit`.
export function countSolutions(grid, limit = 2, out = null, rng = null) {
  const g = grid.slice();
  const row = new Int32Array(9), col = new Int32Array(9), box = new Int32Array(9);
  const empty = [];
  for (let c = 0; c < 81; c++) {
    const d = g[c];
    if (!d) { empty.push(c); continue; }
    const m = bit(d), r = (c / 9) | 0, k = c % 9, b = boxOf(c);
    if ((row[r] | col[k] | box[b]) & m) return 0;
    row[r] |= m; col[k] |= m; box[b] |= m;
  }
  let found = 0;
  const search = n => {
    if (n === empty.length) {
      if (out && !found) for (let i = 0; i < 81; i++) out[i] = g[i];
      found++;
      return found >= limit;
    }
    let best = n, bestCount = 10;
    for (let i = n; i < empty.length; i++) {
      const c = empty[i];
      const cnt = popcount(~(row[(c / 9) | 0] | col[c % 9] | box[boxOf(c)]) & 511);
      if (cnt < bestCount) { best = i; bestCount = cnt; if (cnt < 2) break; }
    }
    if (!bestCount) return false;
    [empty[n], empty[best]] = [empty[best], empty[n]];
    const c = empty[n], r = (c / 9) | 0, k = c % 9, b = boxOf(c);
    let opts = digitsOf(~(row[r] | col[k] | box[b]) & 511);
    if (rng) shuffle(opts, rng);
    for (const d of opts) {
      const m = bit(d);
      g[c] = d; row[r] |= m; col[k] |= m; box[b] |= m;
      const done = search(n + 1);
      g[c] = 0; row[r] ^= m; col[k] ^= m; box[b] ^= m;
      if (done) return true;
    }
    return false;
  };
  search(0);
  return found;
}

export function solve(grid) {
  const out = new Array(81).fill(0);
  return countSolutions(grid, 2, out) === 1 ? out : null;
}

export function candidatesOf(grid) {
  const cand = new Array(81).fill(0);
  for (let c = 0; c < 81; c++) {
    if (grid[c]) continue;
    let m = 511;
    for (const p of PEERS[c]) if (grid[p]) m &= ~bit(grid[p]);
    cand[c] = m;
  }
  return cand;
}

function place(grid, cand, c, d) {
  grid[c] = d;
  cand[c] = 0;
  const m = ~bit(d);
  for (const p of PEERS[c]) cand[p] &= m;
}

function findSingle(cand) {
  for (let c = 0; c < 81; c++) {
    if (cand[c] && !(cand[c] & (cand[c] - 1))) return { cell: c, digit: digitOf(cand[c]), kind: 'naked' };
  }
  // Boxes first: they are what people scan first.
  for (const u of [18, 19, 20, 21, 22, 23, 24, 25, 26, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]) {
    for (let d = 1; d <= 9; d++) {
      let at = -1, n = 0;
      for (const c of UNITS[u]) if (cand[c] & bit(d)) { at = c; n++; }
      if (n === 1) return { cell: at, digit: d, kind: 'hidden', unit: unitName(u) };
    }
  }
  return null;
}

function removeFrom(cand, cells, mask) {
  let changed = false;
  for (const c of cells) if (cand[c] & mask) { cand[c] &= ~mask; changed = true; }
  return changed;
}

function lockedCandidates(cand) {
  for (let b = 18; b < 27; b++) {
    for (let d = 1; d <= 9; d++) {
      const m = bit(d);
      const cells = UNITS[b].filter(c => cand[c] & m);
      if (cells.length < 2) continue;
      for (const line of [(c => (c / 9) | 0), (c => 9 + c % 9)]) {
        const u = line(cells[0]);
        if (cells.every(c => line(c) === u) &&
            removeFrom(cand, UNITS[u].filter(c => !cells.includes(c)), m)) return 'Pointing pair';
      }
    }
  }
  for (let u = 0; u < 18; u++) {
    for (let d = 1; d <= 9; d++) {
      const m = bit(d);
      const cells = UNITS[u].filter(c => cand[c] & m);
      if (cells.length < 2) continue;
      const b = boxOf(cells[0]);
      if (cells.every(c => boxOf(c) === b) &&
          removeFrom(cand, BOXES[b].filter(c => !cells.includes(c)), m)) return 'Box-line reduction';
    }
  }
  return null;
}

function nakedSubsets(cand, size) {
  for (const unit of UNITS) {
    const cells = unit.filter(c => cand[c] && popcount(cand[c]) <= size);
    const pick = (start, chosen, mask) => {
      if (popcount(mask) > size) return false;
      if (chosen.length === size) {
        return popcount(mask) === size && removeFrom(cand, unit.filter(c => !chosen.includes(c)), mask);
      }
      for (let i = start; i < cells.length; i++) {
        if (pick(i + 1, [...chosen, cells[i]], mask | cand[cells[i]])) return true;
      }
      return false;
    };
    if (pick(0, [], 0)) return size === 2 ? 'Naked pair' : 'Naked triple';
  }
  return null;
}

function hiddenPairs(cand) {
  for (const unit of UNITS) {
    const where = {};
    for (let d = 1; d <= 9; d++) {
      const cells = unit.filter(c => cand[c] & bit(d));
      if (cells.length === 2) where[d] = cells;
    }
    const ds = Object.keys(where).map(Number);
    for (let i = 0; i < ds.length; i++) {
      for (let j = i + 1; j < ds.length; j++) {
        const a = where[ds[i]], b = where[ds[j]];
        if (a[0] !== b[0] || a[1] !== b[1]) continue;
        const keep = bit(ds[i]) | bit(ds[j]);
        let changed = false;
        for (const c of a) if (cand[c] & ~keep) { cand[c] &= keep; changed = true; }
        if (changed) return 'Hidden pair';
      }
    }
  }
  return null;
}

function fish(cand, size) {
  for (const [bases, covers] of [[ROWS, COLS], [COLS, ROWS]]) {
    const across = c => (bases === ROWS ? c % 9 : (c / 9) | 0);
    for (let d = 1; d <= 9; d++) {
      const m = bit(d);
      const lines = [];
      for (let i = 0; i < 9; i++) {
        let pos = 0;
        for (const c of bases[i]) if (cand[c] & m) pos |= 1 << across(c);
        const n = popcount(pos);
        if (n >= 2 && n <= size) lines.push({ i, pos });
      }
      const pick = (start, chosen, pos) => {
        if (popcount(pos) > size) return false;
        if (chosen.length === size) {
          if (popcount(pos) !== size) return false;
          let changed = false;
          for (let x = 0; x < 9; x++) {
            if (!(pos & (1 << x))) continue;
            for (const c of covers[x]) {
              const line = bases === ROWS ? (c / 9) | 0 : c % 9;
              if (!chosen.includes(line) && removeFrom(cand, [c], m)) changed = true;
            }
          }
          return changed;
        }
        for (let k = start; k < lines.length; k++) {
          if (pick(k + 1, [...chosen, lines[k].i], pos | lines[k].pos)) return true;
        }
        return false;
      };
      if (pick(0, [], 0)) return size === 2 ? 'X-wing' : 'Swordfish';
    }
  }
  return null;
}

function yWing(cand) {
  const pairs = [];
  for (let c = 0; c < 81; c++) if (popcount(cand[c]) === 2) pairs.push(c);
  for (const pivot of pairs) {
    const wings = PEERS[pivot].filter(c => popcount(cand[c]) === 2 && popcount(cand[c] & cand[pivot]) === 1);
    for (let i = 0; i < wings.length; i++) {
      for (let j = i + 1; j < wings.length; j++) {
        const a = wings[i], b = wings[j];
        const shared = cand[a] & cand[b];
        if (popcount(shared) !== 1 || shared & cand[pivot]) continue;
        if ((cand[a] | cand[b]) !== (cand[pivot] | shared)) continue;
        const targets = PEERS[a].filter(c => c !== b && c !== pivot && PEERS[b].includes(c));
        if (removeFrom(cand, targets, shared)) return 'Y-wing';
      }
    }
  }
  return null;
}

const TECHNIQUES = [
  { grade: 3, run: lockedCandidates },
  { grade: 3, run: c => nakedSubsets(c, 2) },
  { grade: 3, run: hiddenPairs },
  { grade: 3, run: c => nakedSubsets(c, 3) },
  { grade: 4, run: c => fish(c, 2) },
  { grade: 4, run: yWing },
  { grade: 4, run: c => fish(c, 3) },
];

// Solves like a person would. Grade: 1 = singles only, 3 = needs subsets or locked
// candidates, 4 = needs fish or wings, 5 = those techniques are not enough.
export function grade(puzzle) {
  const g = puzzle.slice();
  const cand = candidatesOf(g);
  let result = 1;
  for (;;) {
    const s = findSingle(cand);
    if (s) { place(g, cand, s.cell, s.digit); continue; }
    if (g.every(Boolean)) return result;
    let applied = false;
    for (const t of TECHNIQUES) {
      if (t.run(cand)) { result = Math.max(result, t.grade); applied = true; break; }
    }
    if (!applied) return 5;
  }
}

// The next logical placement from a position, with the techniques it relied on.
export function nextStep(grid) {
  const cand = candidatesOf(grid);
  const used = [];
  for (;;) {
    const s = findSingle(cand);
    if (s) return { ...s, used };
    let name = null;
    for (const t of TECHNIQUES) {
      name = t.run(cand);
      if (name) break;
    }
    if (!name) return null;
    if (!used.includes(name)) used.push(name);
  }
}

function fullGrid(rng) {
  const out = new Array(81).fill(0);
  countSolutions(new Array(81).fill(0), 1, out, rng);
  return out;
}

function dig(solution, minClues, rng) {
  const g = solution.slice();
  let clues = 81;
  // Remove in rotationally symmetric pairs, as printed puzzles do.
  for (const c of shuffle(Array.from({ length: 41 }, (_, i) => i), rng)) {
    const o = 80 - c;
    const n = c === o ? 1 : 2;
    if (clues - n < minClues) continue;
    const a = g[c], b = g[o];
    g[c] = 0; g[o] = 0;
    if (countSolutions(g, 2) === 1) clues -= n;
    else { g[c] = a; g[o] = b; }
  }
  return g;
}

const fits = (level, g) => (level <= 2 ? g === 1 : g === level);

export function generate(level, rng = Math.random, budgetMs = 4000) {
  const { minClues } = LEVELS[level - 1];
  const start = Date.now();
  let backup = null;
  for (;;) {
    const solution = fullGrid(rng);
    const puzzle = dig(solution, minClues, rng);
    const g = grade(puzzle);
    if (fits(level, g)) return { p: puzzle.join(''), s: solution.join('') };
    // Expert falls back to a harder puzzle, Hard to the nearest one, rather than stalling.
    if (level >= 3 && g >= level) backup = { p: puzzle.join(''), s: solution.join('') };
    if (backup && Date.now() - start > budgetMs) return backup;
  }
}

// How many of each digit (index 1-9) are still to be placed, going by what is on the board.
export function remaining(values) {
  const left = new Array(10).fill(9);
  for (const v of values) if (v) left[v]--;
  return left;
}

export function score(level, seconds, hints, mistakes) {
  const base = [1000, 2000, 4000, 8000][level - 1];
  const par = [480, 900, 1500, 2400][level - 1];
  const speed = Math.round(base * Math.max(0, 1 - seconds / par));
  const penalty = Math.round(base * (0.1 * hints + 0.05 * mistakes));
  return { base, speed, penalty, total: Math.max(Math.round(base * 0.1), base + speed - penalty) };
}
