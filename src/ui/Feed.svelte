<script lang="ts">
  import { S } from '../lib/game.svelte';
  import { reduced } from '../lib/motion';
  import type { Entry, Side } from '../lib/types';

  /* The ledger, in the spirit of a kill feed: it scrolls past the corner of
     the table, it is legible if you look, and it is gone by the time you
     next need the space. Nothing is stored and nothing can be scrolled
     back to — the balances are the record, and they are two inches away. */

  const LIFE = reduced ? 3200 : 5200;
  const MAX = 4;

  interface Item { key: number; who: Side; amt: string; bal: number; kind: string }

  let items = $state<Item[]>([]);
  let seen: Record<Side, number> = { you: 0, them: 0 };
  let key = 0;

  function amountOf(e: Entry): string {
    switch (e.kind) {
      case 'banked': return '+' + e.amt;
      case 'struck': return 'struck';
      case 'void':   return 'wiped';
      case 'saved':  return '+' + e.amt + ' saved';
      case 'taken':  return (e.amt < 0 ? String(e.amt) : '+' + e.amt) + ' levy';
      case 'start':  return '+' + e.amt + ' start';
      default:       return '+' + e.amt;
    }
  }

  function drop(k: number) {
    const i = items.findIndex((x) => x.key === k);
    if (i > -1) items.splice(i, 1);
  }

  $effect(() => {
    for (const who of ['you', 'them'] as Side[]) {
      const list = S.p[who].entries;
      // a new match hands us fresh players; forget everything and start over
      if (list.length < seen[who]) { seen[who] = 0; items = []; }
      for (let i = seen[who]; i < list.length; i++) {
        const e = list[i];
        const k = ++key;
        items.push({ key: k, who, amt: amountOf(e), bal: e.bal, kind: e.kind });
        if (items.length > MAX) items.shift();
        setTimeout(() => drop(k), LIFE);
      }
      seen[who] = list.length;
    }
  });
</script>

<div class="feed" aria-hidden="true">
  {#each items as it (it.key)}
    <div class="feed__row feed__row--{it.kind}" class:feed__row--them={it.who === 'them'}>
      <span class="feed__who">{it.who === 'you' ? 'You' : 'Them'}</span>
      <span class="feed__amt">{it.amt}</span>
      <span class="feed__bal">{it.bal}</span>
    </div>
  {/each}
</div>
