import { play } from '../audio/sfx';
import { retune, setTensionSource } from '../audio/music';
import type { Tray } from '../dice/dice3d';
import { machineValue, machineWantsRoll } from './ai';
import { card, CARDS } from './cards';
import { CIRCUIT, GOAL, MARKET, MILES, TIER_OF, WARM_CAP } from './circuit';
import { bestSlot, DICE } from './dice';
import { reduced } from './motion';
import {
  bankValue, chargeIndex, chargeUsable, consumeShield, drawKit, equip, hasCharge,
  loadoutIds, newPlayer, offerFor, partsText, pendingMilestone, usable
} from './rules';
import { clearHires, closeRun, hasRun, newRun, RUN, runState, saveRecord, saveRun } from './run.svelte';
import type {
  Card, CardId, ChargeId, EntryKind, Family, MarketItem, Milestone, Player, RuleId, Side, Tier
} from './types';

/* =====================================================================
   THE GAME
   The turn flow is deliberately still callback-and-timeout shaped: the
   pauses between a roll landing, a card firing and the pen changing
   hands are the pacing of the game, not an implementation detail.
   What changed is that mutating this state repaints the board on its
   own — there is no longer a render() to remember to call.
   ===================================================================== */

export interface Flare { key: number; who: Side; id: CardId; cls: Family; text: string; }
export interface Stamp { text: string; kind: string; n: number; }
export interface Pulse { id: CardId | null; n: number; }

export interface DraftState {
  who: Side;
  tier: Tier;
  milestone: Milestone;
  offer: Card[];
  chosen: number | null;
  done: () => void;
}

export type Screen =
  | { kind: 'intro'; back: boolean }
  | { kind: 'circuit' }
  | { kind: 'spoils' }
  | { kind: 'walked'; banked: number; cleared: boolean }
  | { kind: 'ruin'; oppName: string; lost: number; souvenirs: CardId[]; rung: number };

export interface GameState {
  p: Record<Side, Player>;
  turn: Side;
  line: number;
  rolls: number;
  lost: number | null;
  lostNote: string;
  lostGood: boolean;
  slot: number[];
  winner: Side | null;
  busy: boolean;
  over: boolean;
  draft: DraftState | null;
  log: string;
  disp: Record<Side, number>;
  stamp: Record<Side, Stamp>;
  flares: Flare[];
  pulse: Record<Side, Pulse>;
  /** Counters components watch to restart a CSS animation. */
  fx: { bump: number; drop: number; shake: number; pop: Record<Side, number> };
  screen: Screen | null;
}

function blank(): GameState {
  return {
    p: { you: newPlayer(), them: newPlayer() },
    turn: 'you', line: 0, rolls: 0, lost: null, lostNote: '', lostGood: false,
    slot: [0, 0, 0], winner: null, busy: false, over: false,
    draft: null, log: 'Your turn. Roll to open a line.',
    disp: { you: 0, them: 0 },
    stamp: { you: { text: 'VOID', kind: '', n: 0 }, them: { text: 'VOID', kind: '', n: 0 } },
    flares: [],
    pulse: { you: { id: null, n: 0 }, them: { id: null, n: 0 } },
    fx: { bump: 0, drop: 0, shake: 0, pop: { you: 0, them: 0 } },
    screen: null
  };
}

export const S: GameState = $state(blank());

/* ---- seams the UI fills in, so the engine never queries the DOM ---- */
export const ui = {
  focusRoll: () => {},
  focusAgain: () => {},
  scrollToDraft: () => {},
  scrollToVerdict: () => {}
};

let tray: Tray | null = null;

/** Registering a tray immediately fills it with whoever holds the pen, so
 *  component mount order does not matter. */
export function setTray(t: Tray | null): void {
  tray = t;
  if (t) mountTray(S.turn);
}

export function nudgeTray(on: boolean): void { tray?.nudge(on); }

setTensionSource(() => {
  let t = Math.max(S.p.you.score, S.p.them.score) / GOAL;
  if (S.line >= 18) t += 0.16;
  return Math.min(1, t);
});

/* ---------------------------- small helpers ---------------------------- */

export function say(html: string): void { S.log = html; }

export function other(who: Side): Side { return who === 'you' ? 'them' : 'you'; }

function satchelOf(who: Side): number {
  return who === 'you' && hasRun() ? RUN().souvenirs.length : 2;
}

export function bankOf(who: Side, line: number, doubled: boolean) {
  return bankValue(S.p[who], line, doubled, satchelOf(who));
}

function addEntry(who: Side, kind: EntryKind, amt: number, bal: number, note?: string): void {
  const list = S.p[who].entries;
  list.push({ no: list.length + 1, kind, amt, bal, note: note || '' });
}

function stampIt(who: Side, text: string, kind?: string): void {
  const s = S.stamp[who];
  s.text = text; s.kind = kind || ''; s.n++;
}

function showLost(amount: number, note: string, good?: boolean): void {
  S.lost = amount;
  S.lostNote = note;
  S.lostGood = !!good;
  if (!reduced) S.fx.drop++;
}

let flareKey = 0;

/* Whenever a card actually does something it flares in the hand that owns
   it and names itself in the bay, with a sound of its own. */
function flare(who: Side, id: CardId, text?: string): void {
  const c = card(id);
  if (!c) return;
  S.pulse[who] = { id, n: S.pulse[who].n + 1 };
  play('card', id);
  if (reduced) return;
  const key = ++flareKey;
  S.flares.push({ key, who, id, cls: c.cls, text: text || '' });
  setTimeout(() => {
    const i = S.flares.findIndex((f) => f.key === key);
    if (i > -1) S.flares.splice(i, 1);
  }, 1500);
}

function mountTray(who: Side): void {
  const P = S.p[who];
  for (let i = 0; i < P.dice.length; i++) { if (S.slot[i] === undefined) S.slot[i] = 0; }
  tray?.mount(P.dice, S.slot);
}

/* ---------------------------- score tween ---------------------------- */

let raf: number | null = null;

/** Ease the printed balances towards the real ones. Kicked by an effect in
 *  App whenever a score moves. */
export function syncScores(): void {
  if (raf) return;
  const tick = () => {
    let moving = false;
    (['you', 'them'] as Side[]).forEach((k) => {
      const d = S.p[k].score - S.disp[k];
      if (Math.abs(d) > 0.4) { S.disp[k] += d * 0.16; moving = true; }
      else { S.disp[k] = S.p[k].score; }
    });
    raf = moving ? requestAnimationFrame(tick) : null;
  };
  raf = requestAnimationFrame(tick);
}

/* ---------------------------- setting up ---------------------------- */

function reset(): void {
  Object.assign(S, blank());
  S.slot = [4, 0, 2];
  mountTray('you');
}

export function startMatch(): void {
  const run = RUN();
  const opp = CIRCUIT[run.rung];
  reset();

  equip(S.p.you, run.souvenirs);
  equip(S.p.you, run.hired || []);
  if (run.head > 0) {
    S.p.you.score = run.head;
    S.disp.you = run.head;
    addEntry('you', 'start', run.head, run.head);
    MILES.forEach((m) => { if (m <= run.head) S.p.you.claimed[m] = true; });
  }

  (opp.kit || []).forEach((tier) => {
    const id = drawKit(S.p.them, tier);
    if (id) equip(S.p.them, [id]);
  });
  const fixed = card(opp.fixed);
  if (fixed && usable(fixed, S.p.them)) equip(S.p.them, [fixed.id]);

  if (opp.head > 0) {
    S.p.them.score = opp.head;
    S.disp.them = opp.head;
    addEntry('them', 'start', opp.head, opp.head);
    // a head start is compensation, not a shortcut to free drafts
    MILES.forEach((m) => { if (m <= opp.head) S.p.them.claimed[m] = true; });
  }

  mountTray('you');
  retune();
  say('Rung ' + (run.rung + 1) + ' — <b class="up">' + opp.name + '</b>. ' + opp.note);
}

/* ---------------------------- rolling ---------------------------- */

function rollDice(who: Side, cb: (vals: number[]) => void): void {
  const P = S.p[who];
  const n = P.dice.length;
  const slots: number[] = [];
  for (let i = 0; i < n; i++) { slots.push(Math.floor(Math.random() * 6)); }

  // Transmute is resolved before the dice land, so no 1 ever shows.
  if (P.transmute) {
    P.transmute = false;
    let changed = false;
    for (let j = 0; j < n; j++) {
      if (P.dice[j].faces[slots[j]] === 1) { slots[j] = bestSlot(P.dice[j]); changed = true; }
    }
    play('transmute');
    say('<b class="up">Transmute</b> — ' + (changed ? 'the 1s turn to gold.' : 'nothing to turn; the roll was clean.'));
  }

  const all: number[] = [];
  for (let q = 0; q < n; q++) all.push(q);

  tray?.throw(all, slots, () => {
    const vals = slots.map((s, i) => P.dice[i].faces[s]);
    const ones: number[] = [];
    vals.forEach((v, i) => { if (v === 1) ones.push(i); });

    // A reprieve for a lone 1 only, and only while the line is still small.
    // Uncapped it was worth +12.7 points a turn — more than double any
    // other card — because it licensed rolling forever behind a net.
    if (P.rules.warm && !P.warmUsed && S.line < WARM_CAP && ones.length === 1) {
      P.warmUsed = true;
      play('warm');
      const idx = ones[0];
      say('<b class="up">Warm hand</b> — that 1 goes again.');
      setTimeout(() => {
        slots[idx] = Math.floor(Math.random() * 6);
        tray?.throw([idx], slots, () => {
          cb(slots.map((s, i) => P.dice[i].faces[s]));
        });
      }, 620);
      return;
    }
    cb(vals);
  });
}

/* ---------------------------- the draft ---------------------------- */

function grant(who: Side, c: Card): void {
  const P = S.p[who];
  if (c.cls === 'dice') {
    let idx = -1;
    for (let i = 0; i < P.dice.length; i++) { if (P.dice[i].id === 'plain') { idx = i; break; } }
    if (idx < 0) return;                 // nothing plain left to replace
    P.dice[idx] = DICE[c.die!];
    if (S.turn === who) mountTray(who);
  } else if (c.cls === 'rule') {
    P.rules[c.id as RuleId] = true;
    if (c.id === 'third') {
      P.dice.push(DICE.chalk);
      if (S.turn === who) mountTray(who);
    }
  } else {
    P.charges.push({ id: c.id as ChargeId, spent: false });
  }
}

function openDraft(who: Side, milestone: Milestone, done: () => void): void {
  const P = S.p[who];
  const tier = TIER_OF[milestone];
  const offer = offerFor(P, tier);
  if (!offer.length) { done(); return; }

  play('milestone');
  stampIt(who, String(milestone), 'blue');
  S.draft = { who, tier, milestone, offer, chosen: null, done };
  ui.scrollToDraft();

  if (who === 'them') {
    let pick = offer[0];
    let best = -1e9;
    offer.forEach((c) => {
      const v = machineValue(c, P, S.p.you);
      if (v > best) { best = v; pick = c; }
    });
    setTimeout(() => { chooseDraft(offer.indexOf(pick)); }, 1600);
  }
}

export function chooseDraft(i: number): void {
  const d = S.draft;
  if (!d || d.chosen !== null) return;
  const c = d.offer[i];
  if (!c) return;

  d.chosen = i;
  play('take');
  grant(d.who, c);
  say((d.who === 'you' ? 'You take ' : 'The machine takes ') + '<b class="up">' + c.name + '</b>. ' + c.desc);

  setTimeout(() => {
    S.draft = null;
    d.done();
  }, 1200);
}

function afterScore(who: Side, next: () => void): void {
  const m = pendingMilestone(S.p[who], MILES);
  if (m === null) { next(); return; }
  openDraft(who, m, () => { afterScore(who, next); });
}

/* ---------------------------- turn flow ---------------------------- */

function resolve(who: Side, vals: number[], after?: () => void): void {
  const P = S.p[who];
  const name = who === 'you' ? 'You' : 'The machine';
  const verb = who === 'you' ? 'roll' : 'rolls';
  let ones = 0;
  let sum = 0;
  vals.forEach((v) => { if (v === 1) ones++; sum += v; });
  const shown = vals.join(', ').replace(/, ([^,]*)$/, ' and $1');

  if (ones > 0 && consumeShield(P)) {
    const kept = S.line;
    P.score += kept;
    addEntry(who, 'saved', kept, P.score);
    S.line = 0; S.rolls = 0;
    play('shield');
    stampIt(who, 'HELD', 'good');
    say('<b class="up">Shield</b> absorbs it — ' + kept + ' banked instead of lost.');
    showLost(kept, 'Shielded. Banked instead.', true);
    if (P.score >= GOAL) { setTimeout(() => { finish(who); }, 900); return; }
    setTimeout(() => { afterScore(who, () => { pass(who); after?.(); }); }, 1500);
    return;
  }

  if (ones >= 2 && P.rules.iron) {
    // the ledger is iron: a double 1 can only strike, never wipe
    flare(who, 'iron', 'held');
    const ironLine = S.line;
    const ironSaved = P.rules.insurance ? Math.floor(ironLine / 3) : 0;
    if (ironSaved > 0) P.score += ironSaved;
    if (P.rules.memory) P.carryOver = 6;
    addEntry(who, 'struck', ironLine, P.score);
    S.line = 0; S.rolls = 0;
    play('struck');
    say(name + ' ' + verb + ' ' + shown + ' — the <b class="up">iron ledger</b> holds. The line is struck, the balance stands.');
    showLost(ironLine, 'Struck, but not wiped.');
    setTimeout(() => { afterScore(who, () => { pass(who); after?.(); }); }, 1400);
    return;
  }

  if (ones >= 2) {
    const gone = P.score + S.line;
    addEntry(who, 'void', gone, 0);
    P.score = 0; S.line = 0; S.rolls = 0;
    stampIt(who, 'VOID');
    play('wipe');
    if (!reduced) S.fx.shake++;
    say(name + ' ' + verb + ' <b>' + (ones > 2 ? ones + ' ones' : 'double 1s') + '</b>. Everything is voided — ' + gone + ' points gone.');
    showLost(gone, 'Balance wiped to zero.');
    setTimeout(() => { pass(who); after?.(); }, 1700);
    return;
  }

  if (ones === 1) {
    const line = S.line;
    const saved = P.rules.insurance ? Math.floor(line / 3) : 0;
    if (saved > 0) { P.score += saved; flare(who, 'insurance', '+' + saved); }
    if (P.rules.memory) { P.carryOver = 6; flare(who, 'memory', '+6 next'); }
    addEntry(who, 'struck', line, P.score);
    S.line = 0; S.rolls = 0;
    play('struck');
    say(name + ' ' + verb + ' ' + shown + '. The line is struck — ' + line + ' lost' +
        (saved ? ', <b class="up">insurance</b> banks ' + saved : '') + '.');
    showLost(line, saved ? 'Struck. ' + saved + ' recovered.' : 'Struck out. Turn over.');
    if (P.score >= GOAL) { setTimeout(() => { finish(who); }, 900); return; }
    setTimeout(() => {
      if (saved > 0) afterScore(who, () => { pass(who); after?.(); });
      else { pass(who); after?.(); }
    }, 1300);
    return;
  }

  const bonus = (P.rules.momentum && S.rolls > 0) ? 1 : 0;
  if (bonus) flare(who, 'momentum', '+1');
  let gain = sum + bonus;
  if (P.quill) { P.quill = false; gain *= 2; flare(who, 'quill', '×2'); }
  S.line += gain;
  S.rolls++;
  play('add', S.rolls);
  say(name + ' ' + verb + ' ' + shown + '. ' + gain +
      (bonus ? ' with <b class="up">momentum</b>' : '') + ' added — the line stands at ' + S.line + '.');
  if (!reduced) S.fx.bump++;
  after?.();
}

interface BankOpts { double?: boolean; again?: boolean; }

function bank(who: Side, opts: BankOpts = {}): void {
  const P = S.p[who];
  const v = bankOf(who, S.line, !!opts.double);
  if (P.rules.habit) P.habit = Math.min(P.habit + 1, 8);
  v.parts.forEach((pt) => { if (pt.card) flare(who, pt.card, '+' + pt.amt); });
  P.banks++;
  const extras = v.parts.map((pt) => '<b class="up">' + pt.lab + '</b> +' + pt.amt);

  P.score += v.total;
  addEntry(who, 'banked', v.total, P.score, partsText(v));

  if (P.rules.tithe) {
    const foeSide = other(who);
    const F = S.p[foeSide];
    const docked = Math.min(2, F.score);
    if (docked > 0) {
      F.score -= docked;
      addEntry(foeSide, 'taken', -docked, F.score, 'tithe');
      extras.push('<b class="up">tithe</b> −' + docked + ' to them');
      flare(who, 'tithe', '−' + docked);
    }
  }

  S.line = 0; S.rolls = 0;
  play(opts.double ? 'warlord' : 'bank');
  if (!reduced) S.fx.pop[who]++;
  const name = who === 'you' ? 'You' : 'The machine';

  if (P.score >= GOAL) { finish(who); return; }

  say(name + ' bank' + (who === 'you' ? '' : 's') + ' ' + v.line +
      (extras.length ? ' — ' + extras.join(', ') : '') +
      ' — for <b class="up">' + v.total + '</b>. Balance ' + P.score + '.');

  setTimeout(() => {
    afterScore(who, () => {
      if (opts.again) {
        S.busy = false; P.warmUsed = false; S.lost = null;
        say(name + ' take' + (who === 'you' ? '' : 's') + ' another turn.');
        if (who === 'them') setTimeout(machineStep, 700);
      } else { pass(who); }
    });
  }, 850);
}

function pass(who: Side): void {
  if (S.over) return;
  S.turn = other(who);
  S.line = 0; S.lost = null; S.rolls = 0;
  const N = S.p[S.turn];
  N.warmUsed = false;
  if (N.carryOver > 0) {
    S.line = N.carryOver;
    N.carryOver = 0;
    flare(S.turn, 'memory', '+' + S.line);
  }
  play('pass');
  mountTray(S.turn);

  if (S.turn === 'them') {
    S.busy = true;
    setTimeout(() => {
      say('The machine takes the pen.');
      setTimeout(machineOpen, 800);
    }, 420);
  } else {
    S.busy = false;
    setTimeout(() => { say('Your turn. Roll to open a line.'); }, 480);
  }
}

function finish(winner: Side): void {
  S.over = true; S.busy = false; S.winner = winner; S.lost = null; S.draft = null;
  play(winner === 'you' ? 'win' : 'lose');
  stampIt(winner, 'SETTLED', 'good');
  say(winner === 'you' ? 'You reached 100 first.' : 'The machine reached 100 first.');
  ui.scrollToVerdict();
  ui.focusAgain();
  setTimeout(() => {
    if (!S.screen) { winner === 'you' ? enterSpoils() : enterRuin(); }
  }, 2200);
}

/* ---------------------------- charges ---------------------------- */

function playCharge(who: Side, i: number): boolean {
  const P = S.p[who];
  const O = S.p[other(who)];
  const ch = P.charges[i];
  if (!ch || ch.spent) return false;
  const c = card(ch.id)!;

  if (P.warded) {
    P.warded = false; ch.spent = true;
    play('ward');
    say((who === 'you' ? 'Your ' : "The machine's ") + '<b>' + c.name + '</b> is warded — spent, and nothing happens.');
    S.busy = true;
    setTimeout(() => { S.busy = false; if (who === 'them') machineStep(); }, 1100);
    return true;
  }

  ch.spent = true;
  const name = who === 'you' ? 'You' : 'The machine';

  if (ch.id === 'levy') {
    const take = Math.min(8, O.score);
    O.score -= take; P.score += take;
    addEntry(other(who), 'taken', -take, O.score);
    addEntry(who, 'taken', take, P.score);
    play('levy');
    say('<b class="up">Levy</b> — ' + name.toLowerCase() + ' take' + (who === 'you' ? '' : 's') + ' ' + take + ' points off the other side.');
    S.busy = true;
    if (P.score >= GOAL) { setTimeout(() => { finish(who); }, 900); return true; }
    setTimeout(() => {
      afterScore(who, () => { S.busy = false; if (who === 'them') machineStep(); });
    }, 1000);
    return true;
  }

  if (ch.id === 'ward') {
    O.warded = true;
    play('ward');
    say('<b class="up">Ward</b> — the next card the other side plays will do nothing.');
    S.busy = true;
    setTimeout(() => { S.busy = false; if (who === 'them') machineStep(); }, 1000);
    return true;
  }

  if (ch.id === 'quill') {
    P.quill = true;
    flare(who, 'quill', 'set');
    say('<b class="up">Quill</b> is inked. The next roll counts twice.');
    if (who === 'them') setTimeout(machineStep, 700);
    return true;
  }

  if (ch.id === 'bellows') {
    const before = S.line;
    S.line = before * 2;
    flare(who, 'bellows', '×2');
    say('<b class="up">Bellows</b> — the line swells from ' + before + ' to ' + S.line + '. Still unbanked.');
    if (!reduced) S.fx.bump++;
    if (who === 'them') setTimeout(machineStep, 800);
    return true;
  }

  if (ch.id === 'windfall') {
    const wv = bankOf(who, S.line, false);
    P.score += wv.total;
    P.banks++;
    addEntry(who, 'banked', wv.total, P.score, partsText(wv) + ' windfall');
    flare(who, 'windfall', '+' + wv.total);
    say('<b class="up">Windfall</b> — ' + wv.total + ' banked, and the line still stands at ' + S.line + '.');
    S.busy = true;
    if (P.score >= GOAL) { setTimeout(() => { finish(who); }, 900); return true; }
    setTimeout(() => {
      afterScore(who, () => { S.busy = false; if (who === 'them') machineStep(); });
    }, 1000);
    return true;
  }

  if (ch.id === 'transmute') {
    P.transmute = true;
    play('transmute');
    say('<b class="up">Transmute</b> is set. On the next roll every 1 becomes a highest face.');
    if (who === 'them') setTimeout(machineStep, 700);
    return true;
  }

  if (ch.id === 'warlord') {
    S.busy = true;
    say('<b class="up">Warlord’s turn</b> — the line is doubled.');
    bank(who, { double: true });
    return true;
  }

  if (ch.id === 'wind') {
    S.busy = true;
    play('take');
    say('<b class="up">Second wind</b> — banking, then going again.');
    bank(who, { again: true });
    return true;
  }

  return false;
}

export function useCharge(i: number): void {
  const P = S.p.you;
  const ch = P.charges[i];
  if (!ch || S.busy || S.over || S.draft || S.turn !== 'you') return;
  if (!chargeUsable(P, ch, S.line, S.p.them.score)) return;
  playCharge('you', i);
}

/** Play a held charge by id — the keyboard shortcuts. */
export function tryCharge(id: ChargeId): void {
  const P = S.p.you;
  for (let i = 0; i < P.charges.length; i++) {
    if (P.charges[i].id === id && !P.charges[i].spent) {
      if (chargeUsable(P, P.charges[i], S.line, S.p.them.score) && !S.busy) useCharge(i);
      return;
    }
  }
}

/* ---------------------------- the machine ---------------------------- */

function machineOpen(): void {
  if (S.over || S.turn !== 'them') return;
  const P = S.p.them;
  const opp = S.p.you;

  // ward first: it is only worth anything while they still hold a card
  if (hasCharge(P, 'ward') && opp.charges.some((x) => !x.spent && x.id !== 'shield')) {
    const wi = chargeIndex(P, 'ward');
    if (wi >= 0) { playCharge('them', wi); return; }
  }
  if (hasCharge(P, 'levy') && opp.score >= 24 && opp.score >= P.score) {
    const li = chargeIndex(P, 'levy');
    if (li >= 0) { playCharge('them', li); return; }
  }
  machineStep();
}

function machineStep(): void {
  if (S.over || S.turn !== 'them' || S.draft) return;
  const P = S.p.them;

  // a guaranteed clean roll is worth most when the line is already fat
  if (S.line >= 18 && hasCharge(P, 'transmute') && !P.transmute) {
    const ti = chargeIndex(P, 'transmute');
    if (ti >= 0) { playCharge('them', ti); return; }
  }
  if (S.line >= 12 && hasCharge(P, 'quill') && !P.quill) {
    const qi = chargeIndex(P, 'quill');
    if (qi >= 0) { playCharge('them', qi); return; }
  }
  if (S.line >= 16 && hasCharge(P, 'bellows')) {
    const bi = chargeIndex(P, 'bellows');
    if (bi >= 0) { playCharge('them', bi); return; }
  }

  if (!machineWantsRoll(P, S.p.you, S.line, S.rolls, CIRCUIT[RUN().rung].timid)) {
    if (S.line >= 14 && hasCharge(P, 'windfall')) {
      const fi = chargeIndex(P, 'windfall');
      if (fi >= 0) { playCharge('them', fi); return; }
    }
    if (S.line >= 16 && hasCharge(P, 'warlord')) {
      const di = chargeIndex(P, 'warlord');
      if (di >= 0) { playCharge('them', di); return; }
    }
    if (S.line >= 14 && hasCharge(P, 'wind') && P.score + S.line < GOAL) {
      const ni = chargeIndex(P, 'wind');
      if (ni >= 0) { playCharge('them', ni); return; }
    }
    bank('them');
    return;
  }

  rollDice('them', (vals) => {
    resolve('them', vals, () => {
      if (S.turn === 'them' && !S.over && !S.draft) { setTimeout(machineStep, 800); }
    });
  });
}

/* ---------------------------- player actions ---------------------------- */

export function canAct(): boolean {
  return S.turn === 'you' && !S.busy && !S.over && !S.draft && !S.screen;
}

export function doRoll(): void {
  if (S.busy || S.over || S.draft || S.turn !== 'you') return;
  tray?.nudge(false);
  S.busy = true; S.lost = null;
  rollDice('you', (vals) => {
    resolve('you', vals, () => {
      if (S.turn === 'you' && !S.over && !S.draft) { S.busy = false; }
    });
  });
}

export function doBank(): void {
  if (S.busy || S.over || S.draft || S.turn !== 'you' || S.line === 0) return;
  S.busy = true;
  bank('you');
}

/* ---------------------------- screens ---------------------------- */

export function showScreen(s: Screen): void { S.screen = s; }

export function hideScreen(): void { S.screen = null; }

export function enterCircuit(): void {
  if (!hasRun() || !RUN().active) newRun();
  S.screen = { kind: 'circuit' };
}

export function enterSpoils(): void {
  const run = RUN();
  const opp = CIRCUIT[run.rung];
  clearHires();
  run.purse += opp.purse;
  if (run.rung + 1 > runState.record.deepest) runState.record.deepest = run.rung + 1;
  saveRecord();
  S.screen = { kind: 'spoils' };
}

export function enterRuin(): void {
  const run = RUN();
  const opp = CIRCUIT[run.rung];
  const lost = run.purse;
  const souvenirs = run.souvenirs.slice();
  const rung = run.rung;
  clearHires();
  closeRun();
  S.screen = { kind: 'ruin', oppName: opp.name, lost, souvenirs, rung };
}

/** Cards from this win that are not already in the satchel. */
export function spoilsOffer(): CardId[] {
  const carried = RUN().souvenirs;
  return loadoutIds(S.p.you).filter((id) => carried.indexOf(id) < 0);
}

export function walkAway(last: boolean): { banked: number; cleared: boolean } {
  const run = RUN();
  runState.record.walks++;
  if (run.purse > runState.record.best) runState.record.best = run.purse;
  if (last) runState.record.circuits++;
  saveRecord();
  const banked = run.purse;
  closeRun();
  return { banked, cleared: last };
}

export function playOn(): void {
  RUN().rung++;
  saveRun();
  S.screen = { kind: 'circuit' };   // the market sits here, before the bell
}

/* ---------------------------- the market ---------------------------- */

export function canAffordAnything(): boolean {
  const run = RUN();
  return MARKET.some((m) => !(m.id === 'head' && run.head > 0) && run.purse >= m.cost);
}

export function buy(what: MarketItem['id']): void {
  const run = RUN();
  const m = MARKET.find((x) => x.id === what);
  if (!m || run.purse < m.cost) return;

  if (m.id === 'head') {
    if (run.head > 0) return;
    run.purse -= m.cost;
    run.head = 12;
  } else {
    // the same equip logic, run against a throwaway player to test legality
    const probe = newPlayer();
    equip(probe, run.souvenirs.concat(run.hired || []));
    const pool = CARDS.filter((c) => c.tier === m.id && usable(c, probe));
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    run.purse -= m.cost;
    run.hired = (run.hired || []).concat([pick.id]);
  }
  play('take');
  saveRun();
}
