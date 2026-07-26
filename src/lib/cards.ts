import type { Card, CardId, Family } from './types';

/* ---------------------------- the deck ----------------------------
   Three tiers, drafted in order: tin at 12, silver at 30, gold at 55.
   Same three families throughout — a die, a standing rule, a charge —
   so a player learns the shape once and only the power escalates.
   ------------------------------------------------------------------ */
export const CARDS: Card[] = [
  /* ---- TIN — small edges on how much you score ---- */
  { id: 'brass', tier: 'tin', cls: 'dice', name: 'Brass die', die: 'brass', short: 'BRASS',
    desc: 'Swaps a die. Same single 1, every other face bigger.' },
  { id: 'pauper', tier: 'tin', cls: 'dice', name: "Pauper's die", die: 'pauper', short: 'PAUPER',
    desc: 'Swaps a die for a poor one — but every bank you make pays 6 extra.' },
  { id: 'momentum', tier: 'tin', cls: 'rule', name: 'Momentum', short: 'MOMENT',
    desc: 'Every roll after the first in a turn scores one extra point.' },
  { id: 'insurance', tier: 'tin', cls: 'rule', name: 'Insurance', short: 'INSURE',
    desc: 'When a 1 strikes your line, a third of it is banked instead of lost.' },
  { id: 'steady', tier: 'tin', cls: 'rule', name: 'Steady hand', short: 'STEADY',
    desc: 'Bank 20 or more in one go and take 4 points on top.' },
  { id: 'whet', tier: 'tin', cls: 'dice', name: 'Whetstone die', die: 'whet', short: 'WHET',
    desc: 'Swaps a die for a sharpened one. Same lone 1, every other face a little better.' },
  { id: 'waxseal', tier: 'tin', cls: 'rule', name: 'Wax seal', short: 'SEAL',
    desc: 'The first bank of every match pays 6 extra. Small, but it always arrives.' },
  { id: 'shield', tier: 'tin', cls: 'charge', name: 'Shield', short: 'SHIELD',
    desc: 'Held. The next strike or wipe is cancelled — your line banks instead.' },
  { id: 'quill', tier: 'tin', cls: 'charge', name: 'Quill', short: 'QUILL', key: 'Q',
    desc: 'Play it before rolling. Whatever your next roll adds to the line counts twice.' },

  /* ---- SILVER — bigger edges, and tempo ---- */
  { id: 'devil', tier: 'silver', cls: 'dice', name: "Devil's die", die: 'devil', short: 'DEVIL',
    desc: 'Swaps a die. Five sixes and a single 1. Enormous, and it still bites.' },
  { id: 'third', tier: 'silver', cls: 'rule', name: 'Third die', short: 'THIRD',
    desc: 'A chalk die joins the pair for good — no 1 on it, so it adds points without adding risk.' },
  { id: 'tithe', tier: 'silver', cls: 'rule', name: 'Tithe', short: 'TITHE',
    desc: 'Every time you bank, your opponent is docked 2 points.' },
  { id: 'habit', tier: 'silver', cls: 'rule', name: 'Ledger of habit', short: 'HABIT',
    desc: 'Grows. Your first bank pays 1 extra, the next 2, the next 3, up to 8.' },
  { id: 'levy', tier: 'silver', cls: 'charge', name: 'Levy', short: 'LEVY', key: 'L',
    desc: 'Play it to take 8 points straight off your opponent.' },
  { id: 'counting', tier: 'silver', cls: 'rule', name: 'Counting house', short: 'COUNT',
    desc: 'Every bank pays 1 extra for each card in your satchel. It grows as the run does.' },
  { id: 'memory', tier: 'silver', cls: 'rule', name: 'Long memory', short: 'MEMORY',
    desc: 'When a 1 strikes your line, your next turn opens with 6 already on it.' },
  { id: 'wind', tier: 'silver', cls: 'charge', name: 'Second wind', short: 'WIND', key: 'W',
    desc: 'Play it to bank the line and immediately take another turn.' },
  { id: 'bellows', tier: 'silver', cls: 'charge', name: 'Bellows', short: 'BELLOW', key: 'G',
    desc: 'Play it to double the line where it stands — and keep rolling.' },

  /* ---- GOLD — the tier that changes whether you survive ---- */
  { id: 'ivory', tier: 'gold', cls: 'dice', name: 'Ivory die', die: 'ivory', short: 'IVORY',
    desc: 'Swaps a die. No 1 on it anywhere, and fair numbers besides.' },
  { id: 'saint', tier: 'gold', cls: 'dice', name: "Saint's die", die: 'saint', short: 'SAINT',
    desc: 'Swaps a die. No 1, and good numbers. The finest die in the game.' },
  { id: 'warm', tier: 'gold', cls: 'rule', name: 'Warm hand', short: 'WARM',
    desc: 'The first lone 1 each turn is thrown again — while your line is still under 14. Double 1s are beyond saving.' },
  { id: 'warlord', tier: 'gold', cls: 'charge', name: "Warlord's turn", short: 'WARLORD', key: 'D',
    desc: 'Play it to double the line and bank it on the spot.' },
  { id: 'transmute', tier: 'gold', cls: 'charge', name: 'Transmute', short: 'TRANSM', key: 'T',
    desc: 'Play it before rolling. On your next roll every 1 turns into that die’s highest face.' },
  { id: 'ward', tier: 'gold', cls: 'charge', name: 'Ward', short: 'WARD', key: 'R',
    desc: 'Play it to smother your opponent’s next card. Theirs is spent and does nothing.' },
  { id: 'crown', tier: 'gold', cls: 'dice', name: 'Crown die', die: 'crown', short: 'CROWN',
    desc: 'Swaps a die. No 1, and the biggest honest numbers there are.' },
  { id: 'iron', tier: 'gold', cls: 'rule', name: 'Iron ledger', short: 'IRON',
    desc: 'You can no longer be wiped. Double 1s strike the line like any other 1.' },
  { id: 'windfall', tier: 'gold', cls: 'charge', name: 'Windfall', short: 'WINDFALL', key: 'F',
    desc: 'Play it to bank the line — and leave it standing on the table as well.' }
];

const BY_ID = new Map<string, Card>(CARDS.map((c) => [c.id, c]));

/** Chalk arrives via Third die and has no card of its own, so this returns null for it. */
export function card(id: string | undefined): Card | null {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}

export const FAMILY_LABEL: Record<Family, string> = {
  dice: 'Weighted die',
  rule: 'Standing rule',
  charge: 'Played once'
};

export function isCardId(id: string): id is CardId {
  return BY_ID.has(id);
}
