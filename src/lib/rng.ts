/* =====================================================================
   THE TABLE'S RANDOMNESS
   Everything the game rolls that is not a die: which three cards a draft
   offers, which card a foe's kit draws, what the market has in stock, and
   the jitter that breaks the machine's ties at a draft.

   All of it comes off one stream, and the stream is seeded. That is the
   whole point. A match is then a pure function of its seed and the
   commands played into it, which buys two things at once:

     - two clients can run the same match without exchanging state, only
       intent, and arrive at the same table;
     - a finished match can be re-run from its seed and its command log by
       something that was not there, which is what makes a leaderboard
       score checkable rather than merely claimed.

   THE ORDERING CONTRACT
   Because the stream is shared and positional, *the order of draws is
   part of the rules*. Two clients that call these in a different order
   have different games. In practice that is not fragile — both sides run
   the same code on the same state — but it does mean a new call to rnd()
   inserted in the middle of a turn changes every draft after it, and
   invalidates any replay recorded before the change. Draws are cheap;
   moving one is not.

   Anything outside a match must NOT draw from here. Devmode hands out
   cards with plain Math.random on purpose (dev.svelte.ts) — a cheat that
   consumed table draws would shift the deal for everyone downstream, and
   devmode runs are not replayable anyway.
   ===================================================================== */

/**
 * mulberry32. Small, fast, and good enough for card order — this is not a
 * cryptographic PRNG and does not need to be.
 *
 * The solver has its own copy of this seeded per throw (solver.ts), which
 * is deliberate: the physics stream and the table stream must not be able
 * to pull each other out of step. This one deals the cards; that one
 * throws the dice.
 */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let stream: () => number = mulberry32((Math.random() * 0x7fffffff) | 0);
let seed = 0;
let draws = 0;

/**
 * Open a fresh stream. A run seeds once and keeps drawing across matches,
 * markets and drafts — the run is the replayable unit, not the match, so
 * the market's stock is as much a part of the record as any roll.
 */
export function seedTable(s: number): void {
  seed = s | 0;
  draws = 0;
  stream = mulberry32(seed);
}

/**
 * Where the stream is now. Persisted with the run so a reload lands back
 * on the same deal — see restoreTable.
 */
export function tablePosition(): { seed: number; draws: number } {
  return { seed, draws };
}

/**
 * Put the stream back where it was. Fast-forwarding beats storing the
 * generator's internals: mulberry32 is a few instructions, a long run is
 * some thousands of draws, and it costs well under a millisecond to walk
 * back to the right place.
 */
export function restoreTable(s: number, n: number): void {
  seedTable(s);
  for (let i = 0; i < n; i++) stream();
  draws = n;
}

/** A fresh seed for a new run, off the host's own entropy. */
export function freshSeed(): number {
  return (Math.random() * 0x7fffffff) | 0;
}

export function rnd(): number {
  draws++;
  return stream();
}

export function int(n: number): number {
  return Math.floor(rnd() * n);
}

export function pick<T>(a: readonly T[]): T {
  return a[int(a.length)];
}

/** Fisher-Yates, off the table stream. */
export function shuffle<T>(a: readonly T[]): T[] {
  const out = a.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = int(i + 1);
    const t = out[i]; out[i] = out[j]; out[j] = t;
  }
  return out;
}

/**
 * A seed for one throw. The dice get their randomness from the table so
 * that a replay throws the same dice — but they spend it in a stream of
 * their own, inside the solver, so that a re-throw for a cocked die costs
 * the table nothing.
 */
export function throwSeed(): number {
  return (rnd() * 0x7fffffff) | 0;
}
