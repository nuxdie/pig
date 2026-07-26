import type { MarketItem, Milestone, Opponent, Tier } from './types';

export const GOAL = 100;
export const LAND_AT = 800;
export const ROLL_MS = 1000;
export const WARM_CAP = 14;

/* =====================================================================
   THE CIRCUIT
   Seven opponents. Beat one and choose: walk away with the purse, or
   play on against someone worse. Lose and the purse is gone — the same
   decision the dice ask every turn, one level up.
   ===================================================================== */
export const CIRCUIT: Opponent[] = [
  { name: 'The Publican',    note: 'Nervous. Banks the moment he is ahead.',   kit: [],                             head: 0,  purse: 10,  timid: 12 },
  { name: 'The Wheelwright', note: 'Brings one tin trick to the table.',        kit: ['tin'],                        head: 0,  purse: 18 },
  { name: 'The Reeve',       note: 'Starts with points already on the board.',  kit: ['tin'],                        head: 8,  purse: 30 },
  { name: 'The Alchemist',   note: 'Tin and silver in hand before the bell.',   kit: ['tin', 'silver'],              head: 0,  purse: 50 },
  { name: 'The Abbot',       note: 'Three cards deep, and ahead of you.',       kit: ['tin', 'silver', 'silver'],    head: 18, purse: 80 },
  { name: 'The Executioner', note: 'Two gold cards and no hurry at all.',       kit: ['silver', 'gold', 'gold'],     head: 8,  purse: 130 },
  { name: 'The Devil',       note: "A saint's die, two gold, and a lead.",      kit: ['silver', 'gold', 'gold'],     head: 25, purse: 320, fixed: 'saint' }
];

export const SATCHEL_MAX = 4;

// The purse was only ever a score. Now it buys help for the rung in front
// of you — and every coin spent is a coin you cannot walk away with.
export const MARKET: MarketItem[] = [
  { id: 'tin',    cost: 15, lab: 'A tin card',       note: 'Drawn unseen from the tin deck.' },
  { id: 'silver', cost: 35, lab: 'A silver card',    note: 'Drawn unseen from the silver deck.' },
  { id: 'gold',   cost: 70, lab: 'A gold card',      note: 'Drawn unseen from the gold deck.' },
  { id: 'head',   cost: 25, lab: 'A 12-point start', note: 'You open the match already on 12.' }
];

// Spaced like a Fibonacci run — tight early, opening out — so the gold
// tier gets three or four turns of play instead of one.
export const MILES: Milestone[] = [12, 30, 55];
export const TIER_OF: Record<Milestone, Tier> = { 12: 'tin', 30: 'silver', 55: 'gold' };
