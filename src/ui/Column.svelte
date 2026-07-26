<script lang="ts">
  import { card } from '../lib/cards';
  import { GOAL, MILES } from '../lib/circuit';
  import { bankOf, S } from '../lib/game.svelte';
  import { replay } from '../lib/motion';
  import { partsText } from '../lib/rules';
  import type { Entry, RuleId, Side } from '../lib/types';
  import Mini from './Mini.svelte';

  let { side, name, sub }: { side: Side; name: string; sub: string } = $props();

  const P = $derived(S.p[side]);
  const disp = $derived(S.disp[side]);

  /* The line only shows on the column whose turn it is. */
  const live = $derived((S.turn === side && S.line > 0 && !S.over) ? S.line : 0);
  const pending = $derived(live > 0 ? bankOf(side, live, false) : null);

  const fill = $derived(Math.min(100, disp));
  const ghostWidth = $derived(Math.min(100 - fill, live));

  const loadout = $derived.by(() => {
    const out: Array<{ key: string; id: string; spent: boolean }> = [];
    // chalk arrives via Third die and has no card of its own
    P.dice.forEach((d, i) => { if (card(d.id)) out.push({ key: 'd' + i, id: d.id, spent: false }); });
    (Object.keys(P.rules) as RuleId[]).forEach((r) => {
      if (P.rules[r] && card(r)) out.push({ key: 'r' + r, id: r, spent: false });
    });
    P.charges.forEach((ch, i) => { if (card(ch.id)) out.push({ key: 'c' + i, id: ch.id, spent: ch.spent }); });
    return out;
  });

  function amountOf(e: Entry): string {
    switch (e.kind) {
      case 'banked': return '+' + e.amt;
      case 'struck': return String(e.amt);
      case 'void':   return '−' + e.amt + ' void';
      case 'saved':  return '+' + e.amt + ' saved';
      case 'taken':  return (e.amt < 0 ? String(e.amt) : '+' + e.amt) + ' levy';
      case 'start':  return '+' + e.amt + ' start';
      default:       return '+' + e.amt + '…';
    }
  }

  /** New rows arrive with a one-shot highlight. */
  function fresh(node: HTMLElement) {
    node.classList.add('entry--fresh');
    const t = setTimeout(() => node.classList.remove('entry--fresh'), 700);
    return { destroy: () => clearTimeout(t) };
  }

  let linesEl: HTMLUListElement;
  let scoreEl: HTMLElement;
  let stampEl: HTMLElement;
  let loadEl: HTMLElement;

  $effect(() => {
    P.entries.length; live;                      // rerun as the ledger grows
    if (linesEl) linesEl.scrollTop = linesEl.scrollHeight;
  });

  /* These three restart a CSS animation, so they must not fire on mount —
     only when the counter behind them actually moves. */
  $effect(() => {
    if (S.fx.pop[side] > 0 && scoreEl) replay(scoreEl, 'is-pop');
  });

  $effect(() => {
    if (S.stamp[side].n > 0 && stampEl) replay(stampEl, 'is-on');
  });

  $effect(() => {
    const p = S.pulse[side];
    if (!p.id || p.n === 0 || !loadEl) return;
    replay(loadEl.querySelector(`[data-card="${p.id}"]`), 'is-flare');
  });
</script>

<section
  class="col col--{side === 'you' ? 'you' : 'them'}"
  class:is-active={S.turn === side && !S.over}
  class:is-off={S.turn !== side && !S.over}
>
  <div class="col__name"><span>{name}</span><span class="col__turnflag">Rolling</span></div>
  <p class="col__sub">{@html sub}</p>

  <div class="col__head"><span>No.</span><span>Entry</span><span>Bal.</span></div>

  <ul class="lines" bind:this={linesEl}>
    {#if !P.entries.length}
      <li class="lines__empty">No lines yet.</li>
    {/if}
    {#each P.entries as e (e.no)}
      <li class="entry entry--{e.kind}" use:fresh>
        <span class="entry__no">{e.no}</span>
        <span class="entry__cell">
          <span class="entry__amt">{amountOf(e)}</span>
          {#if e.note}<span class="entry__note">{e.note}</span>{/if}
        </span>
        <span class="entry__bal">{e.bal}</span>
      </li>
    {/each}
    {#if pending}
      <li class="entry entry--pending">
        <span class="entry__no">{P.entries.length + 1}</span>
        <span class="entry__cell">
          <span class="entry__amt">+{pending.total}…</span>
          {#if pending.parts.length}
            <span class="entry__note">{partsText(pending)}</span>
          {/if}
        </span>
        <span class="entry__bal">{P.score + pending.total}</span>
      </li>
    {/if}
  </ul>

  <div class="col__total">
    <div class="col__totalrow">
      <span class="col__totallab">Balance</span>
      <span class="col__figures">
        <span class="col__totalnum" bind:this={scoreEl}>{Math.round(disp)}</span><span class="col__goal">/{GOAL}</span>
        <span class="col__pending" class:is-on={!!pending}>
          {#if pending}
            +{pending.total} → {P.score + pending.total}{#if pending.bonus}<em>{pending.line} + {pending.bonus}</em>{/if}
          {/if}
        </span>
      </span>
    </div>

    <div class="meter">
      <div class="meter__fill" style="width:{fill}%"></div>
      <div class="meter__ghost" style="left:{fill}%;width:{ghostWidth}%"></div>
      {#each MILES as m (m)}
        <div class="notch notch--{m === 12 ? 'tin' : m === 30 ? 'silver' : 'gold'}"
             class:is-hit={P.claimed[m]} style="left:{m}%"></div>
      {/each}
    </div>

    <div class="milelab">
      <span class="t" style="left:12%">12</span><span class="s" style="left:30%">30</span>
      <span class="g" style="left:55%">55</span><span style="left:100%">100</span>
    </div>

    <div class="loadout" bind:this={loadEl}>
      {#each loadout as item (item.key)}
        <Mini c={card(item.id)!} spent={item.spent} withTier />
      {:else}
        <span class="mini mini--none"><span class="mini__lab">no cards</span></span>
      {/each}
    </div>
  </div>

  <div class="stamp {S.stamp[side].kind ? 'stamp--' + S.stamp[side].kind : ''}" bind:this={stampEl}>
    {S.stamp[side].text}
  </div>
</section>
