import { CARDS, card } from './cards';
import { CIRCUIT, MILES, SATCHEL_MAX } from './circuit';
import { DICE } from './dice';
import {
  devHooks, S, showScreen, startMatch, syncScores, walkAway
} from './game.svelte';
import { loadoutIds } from './rules';
import { RUN, newRun, saveRun } from './run.svelte';
import type { CardId, DieId, Milestone, Side } from './types';

/* =====================================================================
   DEVMODE
   A back door for making the game do, in one click, the thing that
   otherwise takes twenty minutes of honest play: jump to the last rung,
   hand yourself a saint's die, look at every card at once, lose on
   purpose. Backtick opens it.

   It is off unless this is a dev build or the URL asks for it, so a
   stray backtick on the published game does nothing.
   ===================================================================== */

export const DEV_AVAILABLE =
  import.meta.env.DEV || new URLSearchParams(location.search).has('dev');

export type DevTab = 'stage' | 'hand' | 'cards' | 'dice';

export const dev = $state({ on: false, tab: 'stage' as DevTab });

export function toggleDev(): void {
  if (!DEV_AVAILABLE) return;
  dev.on = !dev.on;
}

/* ------------------------------ the stage ------------------------------ */

/** Drop straight into a match on any rung, kit and all. */
export function jumpToRung(rung: number): void {
  const run = RUN();
  run.rung = Math.max(0, Math.min(CIRCUIT.length - 1, rung));
  saveRun();
  S.screen = null;
  startMatch();
}

export function freshRun(): void {
  newRun();
  showScreen({ kind: 'circuit' });
}

/** Straight to the board — restarting the match if the last one is finished. */
export function toBoard(): void {
  if (S.over) startMatch();
  S.screen = null;
}

export function endMatch(winner: Side): void {
  if (S.over) return;
  devHooks.finish(winner);
}

export function forceDraft(who: Side, m: Milestone): void {
  devHooks.openDraft(who, m);
}

export const MILESTONES: readonly Milestone[] = MILES;

/* ------------------------------ the cheats ------------------------------ */

export function addScore(who: Side, n: number): void {
  const P = S.p[who];
  P.score = Math.max(0, P.score + n);
  syncScores();
}

export function setLine(n: number): void {
  S.line = Math.max(0, n);
}

export function addPurse(n: number): void {
  const run = RUN();
  run.purse = Math.max(0, run.purse + n);
  saveRun();
}

export function giveCard(who: Side, id: CardId): void {
  const c = card(id);
  if (c) devHooks.grant(who, c);
}

/** Swap a die straight into the hand, no card and no plain slot needed. */
export function giveDie(who: Side, id: DieId, slot: number): void {
  const P = S.p[who];
  if (slot < 0 || slot >= P.dice.length) return;
  P.dice[slot] = DICE[id];
  devHooks.remount(who);
}

export function refillCharges(who: Side): void {
  S.p[who].charges.forEach((ch) => { ch.spent = false; });
}

/**
 * Stuff the satchel, so the full-satchel trade is one click away. Cards in
 * hand are left out of it on purpose: the spoils offer is whatever you won
 * that you are not already carrying, and an offer of nothing tests nothing.
 */
export function fillSatchel(): void {
  const run = RUN();
  const held = loadoutIds(S.p.you);
  const pool = CARDS.filter((c) => run.souvenirs.indexOf(c.id) < 0 && held.indexOf(c.id) < 0);
  while (run.souvenirs.length < SATCHEL_MAX && pool.length) {
    run.souvenirs.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].id);
  }
  saveRun();
}

export function emptySatchel(): void {
  RUN().souvenirs = [];
  saveRun();
}

export function cashOut(): void {
  const run = RUN();
  const { banked, cleared } = walkAway(run.rung === CIRCUIT.length - 1);
  showScreen({ kind: 'walked', banked, cleared });
}

export const ALL_CARDS = CARDS;
export const ALL_DICE = Object.keys(DICE) as DieId[];
