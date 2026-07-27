/* Shared vocabulary. The ids here are closed unions on purpose: a typo in a
   card id used to be a silent no-op that only showed up as a card that
   quietly did nothing. */

export type Tier = 'tin' | 'silver' | 'gold';
export type Family = 'dice' | 'rule' | 'charge';
export type Side = 'you' | 'them';

export type DieId =
  | 'plain' | 'brass' | 'pauper' | 'devil' | 'chalk'
  | 'ivory' | 'saint' | 'whet' | 'crown';

export type RuleId =
  | 'momentum' | 'insurance' | 'steady' | 'warm' | 'habit'
  | 'third' | 'tithe' | 'waxseal' | 'counting' | 'memory' | 'iron';

export type ChargeId =
  | 'shield' | 'quill' | 'levy' | 'wind' | 'bellows'
  | 'warlord' | 'transmute' | 'ward' | 'windfall';

/** Every card id. Dice cards share their id with the die they install. */
export type CardId =
  | Exclude<DieId, 'plain' | 'chalk'>
  | RuleId
  | ChargeId;

export type Milestone = 12 | 30 | 55;

/** Six faces in cube-slot order: front, back, right, left, top, bottom. */
export type Faces = [number, number, number, number, number, number];

export interface Die {
  id: DieId;
  faces: Faces;
  /** Pauper's die pays this much on every bank. */
  bank?: number;
}

export interface Card {
  id: CardId;
  tier: Tier;
  cls: Family;
  name: string;
  short: string;
  desc: string;
  /** Only on `cls: 'dice'` — the die this card installs. */
  die?: DieId;
  /** Keyboard shortcut, charges only. */
  key?: string;
}

export interface Charge {
  id: ChargeId;
  spent: boolean;
}

export type EntryKind =
  | 'banked' | 'struck' | 'void' | 'saved' | 'taken' | 'start' | 'pending';

export interface Entry {
  no: number;
  kind: EntryKind;
  amt: number;
  bal: number;
  note: string;
}

export interface Player {
  score: number;
  entries: Entry[];
  dice: Die[];
  rules: Record<RuleId, boolean>;
  charges: Charge[];
  claimed: Record<Milestone, boolean>;
  warmUsed: boolean;
  habit: number;
  banks: number;
  transmute: boolean;
  warded: boolean;
  quill: boolean;
  carryOver: number;
}

/** One itemised component of a bank, so the ledger can always be accounted for. */
export interface BankPart {
  lab: string;
  amt: number;
  card?: CardId;
}

export interface BankValue {
  line: number;
  base: number;
  bonus: number;
  total: number;
  parts: BankPart[];
}

export interface Opponent {
  name: string;
  note: string;
  kit: Tier[];
  head: number;
  purse: number;
  /** Banks at this flat number instead of doing the sums. */
  timid?: number;
  /** A card this foe always carries, if it is legal for them. */
  fixed?: CardId;
}

export interface MarketItem {
  id: Tier | 'head';
  cost: number;
  lab: string;
  note: string;
}

export interface Run {
  rung: number;
  purse: number;
  souvenirs: CardId[];
  hired: CardId[];
  head: number;
  active: boolean;
  /** The sacrifice has been made. It can only be made once. */
  spent?: boolean;
}

export interface RecordBook {
  best: number;
  deepest: number;
  runs: number;
  walks: number;
  circuits: number;
}
