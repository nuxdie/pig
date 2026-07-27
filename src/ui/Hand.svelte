<script lang="ts">
  import { card } from '../lib/cards';
  import { S, useCharge } from '../lib/game.svelte';
  import { chargeUsable } from '../lib/rules';
  import FamilyMark from './FamilyMark.svelte';
  import Icon from './Icon.svelte';
  import { press } from './press';

  /* Your hand, where a hand belongs: at the near edge of the table, as cards
     rather than as a row of buttons.

     They used to be both. A charge showed as a mini up in the scoreline —
     which is a read-out of what each side is holding — and again as a button
     down here, which is the thing you actually press. Two pictures of one
     card, neither of them quite a card. So the scoreline keeps the dice and
     the standing rules, which are only ever status, and everything you can
     play is dealt to you here.

     Shield is in the hand too, face up and unplayable: it is held rather than
     spent, and a card you are counting on has to be somewhere you can see. */

  let root: HTMLDivElement;
  export function el(): HTMLDivElement { return root; }

  const hand = $derived.by(() => {
    if (S.over || S.draft) return [];
    return S.p.you.charges
      .map((ch, i) => ({ ch, i, c: card(ch.id)! }))
      .filter((x) => !x.ch.spent && x.c);
  });

  const live = $derived(S.turn === 'you' && !S.busy && !S.over && !S.draft);
</script>

<div class="hand" class:is-empty={!hand.length} bind:this={root}>
  {#each hand as x (x.i)}
    {@const held = x.ch.id === 'shield'}
    {@const on = live && chargeUsable(S.p.you, x.ch, S.line, S.p.them.score)}
    <button
      class="handcard handcard--{x.c.tier}"
      class:is-held={held}
      data-charge-id={x.ch.id}
      disabled={!on}
      title="{x.c.name} — {x.c.desc}"
      use:press={() => useCharge(x.i)}
    >
      <span class="handcard__band"></span>
      <FamilyMark cls={x.c.cls} extra="fam--hand" />
      <Icon id={x.c.id} cls="handcard__art" />
      <span class="handcard__name">{x.c.name}</span>
      <span class="handcard__key">{held ? 'held' : x.c.key || ''}</span>
    </button>
  {/each}
</div>
