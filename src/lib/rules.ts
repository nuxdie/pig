import { card, CARDS } from './cards';
import { DICE, keepsAOne } from './dice';
import type {
  BankPart, BankValue, Card, CardId, Charge, ChargeId, Milestone, Player, RuleId, Tier
} from './types';

export function newPlayer(): Player {
  return {
    score: 0,
    entries: [],
    dice: [DICE.plain, DICE.plain],
    rules: {
      momentum: false, insurance: false, steady: false, warm: false, habit: false,
      third: false, tithe: false, waxseal: false, counting: false, memory: false, iron: false
    },
    charges: [],
    claimed: { 12: false, 30: false, 55: false },
    warmUsed: false, habit: 0, banks: 0, transmute: false, warded: false,
    quill: false, carryOver: 0
  };
}

/** Index of the first plain die, or -1 when there is nothing left to swap. */
function plainSlot(P: Player): number {
  for (let i = 0; i < P.dice.length; i++) { if (P.dice[i].id === 'plain') return i; }
  return -1;
}

/* =====================================================================
   THE DRAFT — tin at 12, silver at 30, gold at 55
   ===================================================================== */
export function usable(c: Card, P: Player): boolean {
  if (c.cls === 'rule') {
    if (c.id === 'third') {
      return !P.rules.third && P.dice.length < 3 && keepsAOne(P.dice);
    }
    return !P.rules[c.id as RuleId];
  }
  if (c.cls === 'charge') return P.charges.filter((x) => !x.spent).length < 2;
  if (c.cls === 'dice') {
    const idx = plainSlot(P);
    if (idx < 0) return false;
    // At least one die must keep a 1. Without that the turn can never end:
    // no strike is possible, so a player would simply roll to 100.
    const after = P.dice.slice();
    after[idx] = DICE[c.die!];
    return keepsAOne(after);
  }
  return true;
}

/** Install cards into a loadout. Used for souvenirs, hires, and for
 *  probing legality against a throwaway player. */
export function equip(P: Player, ids: CardId[]): void {
  ids.forEach((id) => {
    const c = card(id);
    if (!c) return;
    if (c.cls === 'dice') {
      const idx = plainSlot(P);
      if (idx < 0) return;
      const after = P.dice.slice();
      after[idx] = DICE[c.die!];
      if (!keepsAOne(after)) return;   // a hand with no 1 could never end a turn
      P.dice[idx] = DICE[c.die!];
    } else if (c.cls === 'rule') {
      const r = c.id as RuleId;
      if (P.rules[r]) return;
      P.rules[r] = true;
      if (r === 'third' && P.dice.length < 3) P.dice.push(DICE.chalk);
    } else {
      P.charges.push({ id: c.id as ChargeId, spent: false });
    }
  });
}

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/** Three on offer. Falls back down the tiers when this one is exhausted. */
export function offerFor(P: Player, tier: Tier): Card[] {
  const order: Tier[] = ['tin', 'silver', 'gold'];
  const idx = order.indexOf(tier);
  let out = shuffled(CARDS.filter((c) => c.tier === tier && usable(c, P))).slice(0, 3);
  for (let t = idx - 1; t >= 0 && out.length < 3; t--) {
    const lower = shuffled(CARDS.filter((c) => c.tier === order[t] && usable(c, P) && out.indexOf(c) < 0));
    out = out.concat(lower.slice(0, 3 - out.length));
  }
  return out;
}

export function drawKit(P: Player, tier: Tier): CardId | null {
  const pool = CARDS.filter((c) => c.tier === tier && usable(c, P));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

/** Every card id currently showing in a loadout, for the spoils screen. */
export function loadoutIds(P: Player): CardId[] {
  const out: CardId[] = [];
  const add = (id: string) => {
    const c = card(id);
    if (c && out.indexOf(c.id) < 0) out.push(c.id);
  };
  P.dice.forEach((d) => { if (d.id !== 'plain') add(d.id); });
  (Object.keys(P.rules) as RuleId[]).forEach((r) => { if (P.rules[r]) add(r); });
  P.charges.forEach((c) => add(c.id));
  return out;
}

/* Every card that touches a bank, itemised — so the ledger never shows a
   total you cannot account for. */
export function bankValue(P: Player, line: number, doubled: boolean, satchel: number): BankValue {
  const base = line * (doubled ? 2 : 1);
  const parts: BankPart[] = [];
  let bonus = 0;

  if (doubled) parts.push({ lab: 'doubled', amt: line });
  if (P.rules.waxseal && P.banks === 0) { bonus += 6; parts.push({ lab: 'seal', amt: 6, card: 'waxseal' }); }
  if (P.rules.counting && satchel > 0) { bonus += satchel; parts.push({ lab: 'counting', amt: satchel, card: 'counting' }); }
  if (P.rules.steady && base >= 20) { bonus += 4; parts.push({ lab: 'steady', amt: 4, card: 'steady' }); }
  if (P.rules.habit) {
    const hb = Math.min(P.habit + 1, 8);
    bonus += hb; parts.push({ lab: 'habit', amt: hb, card: 'habit' });
  }
  let db = 0;
  P.dice.forEach((d) => { if (d.bank) db += d.bank; });
  if (db) { bonus += db; parts.push({ lab: 'pauper', amt: db, card: 'pauper' }); }

  return { line, base, bonus, total: base + bonus, parts };
}

export function partsText(v: BankValue): string {
  if (!v.parts.length) return '';
  return String(v.line) + v.parts.map((p) => ' +' + p.amt + ' ' + p.lab).join('');
}

export function hasCharge(P: Player, id: ChargeId): boolean {
  return P.charges.some((c) => c.id === id && !c.spent);
}

export function chargeIndex(P: Player, id: ChargeId): number {
  let found = -1;
  P.charges.forEach((c, i) => { if (c.id === id && !c.spent) found = i; });
  return found;
}

export function consumeShield(P: Player): boolean {
  for (const ch of P.charges) {
    if (ch.id === 'shield' && !ch.spent) { ch.spent = true; return true; }
  }
  return false;
}

/** Whether a held charge can legally be played right now. */
export function chargeUsable(P: Player, ch: Charge, line: number, oppScore: number): boolean {
  if (ch.spent || ch.id === 'shield') return false;
  if (ch.id === 'levy')      return oppScore > 0;
  if (ch.id === 'wind')      return line > 0;
  if (ch.id === 'warlord')   return line > 0;
  if (ch.id === 'bellows')   return line > 0;
  if (ch.id === 'windfall')  return line > 0;
  if (ch.id === 'transmute') return !P.transmute;
  if (ch.id === 'quill')     return !P.quill;
  if (ch.id === 'ward')      return true;
  return false;
}

/** The next milestone this player has crossed but not yet drafted on. Claims it. */
export function pendingMilestone(P: Player, miles: Milestone[]): Milestone | null {
  for (const m of miles) {
    if (!P.claimed[m] && P.score >= m) { P.claimed[m] = true; return m; }
  }
  return null;
}
