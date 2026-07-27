<script lang="ts">
  import { card } from '../lib/cards';
  import { MILES } from '../lib/circuit';
  import { bankOf, S } from '../lib/game.svelte';
  import { replay } from '../lib/motion';
  import type { RuleId, Side } from '../lib/types';
  import Mini from './Mini.svelte';

  /* One side of the race, and nothing else. The ledger that used to live
     here is a feed now: almost nobody read the history, and it was taking
     a third of the screen away from the dice. What survives is what every
     single turn depends on — the balance, how close it is to 100, whose
     pen it is, and what that player is holding. */

  let { side, name }: { side: Side; name: string } = $props();

  const P = $derived(S.p[side]);
  const disp = $derived(S.disp[side]);
  const active = $derived(S.turn === side && !S.over);

  /** What banking right now would be worth — shown against the balance. */
  const pending = $derived(active && S.line > 0 ? bankOf(side, S.line, false) : null);

  const fill = $derived(Math.min(100, disp));
  const ghost = $derived(Math.min(100 - fill, pending ? pending.total : 0));

  const hand = $derived.by(() => {
    const out: Array<{ key: string; id: string }> = [];
    // chalk arrives via Third die and has no card of its own
    P.dice.forEach((d, i) => { if (card(d.id)) out.push({ key: 'd' + i, id: d.id }); });
    (Object.keys(P.rules) as RuleId[]).forEach((r) => {
      if (P.rules[r] && card(r)) out.push({ key: 'r' + r, id: r });
    });
    // A charge drops out of the hand the moment it is played. What is left is
    // what can still be reached for, which is the only question the hand is
    // ever asked — a spent card sitting there crossed out answered nothing.
    P.charges.forEach((ch, i) => { if (!ch.spent && card(ch.id)) out.push({ key: 'c' + i, id: ch.id }); });
    return out;
  });

  let numEl: HTMLElement;
  let stampEl: HTMLElement;
  let handEl: HTMLElement;

  /* These restart a CSS animation, so they must not fire on mount — only
     when the counter behind them actually moves. */
  $effect(() => {
    if (S.fx.pop[side] > 0 && numEl) replay(numEl, 'is-pop');
  });

  $effect(() => {
    if (S.stamp[side].n > 0 && stampEl) replay(stampEl, 'is-on');
  });

  $effect(() => {
    const p = S.pulse[side];
    if (!p.id || p.n === 0 || !handEl) return;
    // a card on its way out is already saying it did something
    replay(handEl.querySelector(`[data-card="${p.id}"]:not(.is-leaving)`), 'is-flare');
  });
</script>

<div class="side side--{side}" class:is-active={active} class:is-off={!active && !S.over}>
  <div class="side__name">
    {#if side === 'them'}<span class="side__pen" aria-hidden="true">◀</span>{/if}
    <span>{name}</span>
    {#if side === 'you'}<span class="side__pen" aria-hidden="true">▶</span>{/if}
  </div>

  <div class="side__figures">
    <span class="side__num" bind:this={numEl}>{Math.round(disp)}</span>
    <span class="side__gain" class:is-on={!!pending}>{pending ? '+' + pending.total : ''}</span>
  </div>

  <div class="meter">
    <div class="meter__fill" style="width:{fill}%"></div>
    <div class="meter__ghost" style="left:{fill}%;width:{ghost}%"></div>
    {#each MILES as m (m)}
      <div class="notch notch--{m === 12 ? 'tin' : m === 30 ? 'silver' : 'gold'}"
           class:is-hit={P.claimed[m]} style="left:{m}%"></div>
    {/each}
  </div>

  <div class="side__hand" bind:this={handEl}>
    {#each hand as item (item.key)}
      <Mini c={card(item.id)!} withTier leaves />
    {/each}
  </div>

  <div class="stamp {S.stamp[side].kind ? 'stamp--' + S.stamp[side].kind : ''}" bind:this={stampEl}>
    {S.stamp[side].text}
  </div>
</div>
