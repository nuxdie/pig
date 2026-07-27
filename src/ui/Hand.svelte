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

     READING ONE WITHOUT PLAYING IT. A card face this size cannot carry what
     the card does, and these are one-shot cards — a tap that both explains
     and spends is no good. So there are two states, and the same gesture
     moves between them: reaching for a card lifts it out of the fan and
     prints what it does underneath; pressing the card that is already out
     plays it.

     On a mouse the reaching is the hover, which is free, so it stays one
     click and you have read the card before you make it. With a finger there
     is no hover, so it is two taps — which is the right number for spending a
     gold card by accident.

     Nothing here uses `disabled`, because a card you cannot play yet is
     exactly the one you want to read. They lift and explain themselves like
     any other; they just will not go. */

  let root: HTMLDivElement;
  export function el(): HTMLDivElement { return root; }

  /** The card held out of the fan, by its index into the player's charges. */
  let out = $state<number | null>(null);

  const hand = $derived.by(() => {
    if (S.over || S.draft) return [];
    return S.p.you.charges
      .map((ch, i) => ({ ch, i, c: card(ch.id)! }))
      .filter((x) => !x.ch.spent && x.c);
  });

  const live = $derived(S.turn === 'you' && !S.busy && !S.over && !S.draft);

  const playable = (x: (typeof hand)[number]) =>
    live && chargeUsable(S.p.you, x.ch, S.line, S.p.them.score);

  /** Asked at the moment of the event rather than cached — hybrids exist. */
  const fine = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const read = $derived(hand.find((x) => x.i === out) ?? null);

  /* The pen changing hands puts the cards back down. */
  $effect(() => {
    S.turn; S.over; S.draft;
    out = null;
  });

  function reach(i: number) {
    if (fine()) out = i;
  }

  function push(x: (typeof hand)[number]) {
    if (out !== x.i) { out = x.i; return; }   // first: hold it out, and read it
    if (playable(x)) useCharge(x.i);          // second: play the one in your hand
  }

  function away(e: MouseEvent) {
    if (out !== null && root && !root.contains(e.target as Node)) out = null;
  }
</script>

<svelte:document onclick={away} />

<div
  class="hand" class:is-empty={!hand.length} bind:this={root}
  role="group" aria-label="Your hand"
  onpointerleave={() => { if (fine()) out = null; }}
>
  <div class="hand__fan">
    {#each hand as x (x.i)}
      {@const held = x.ch.id === 'shield'}
      {@const on = playable(x)}
      <button
        class="handcard handcard--{x.c.tier}"
        class:is-out={out === x.i}
        class:is-off={!on}
        class:is-held={held}
        data-charge-id={x.ch.id}
        aria-disabled={!on}
        onpointerover={() => reach(x.i)}
        onfocus={() => (out = x.i)}
        use:press={() => push(x)}
      >
        <span class="handcard__band"></span>
        <FamilyMark cls={x.c.cls} extra="fam--hand" />
        <Icon id={x.c.id} cls="handcard__art" />
        <span class="handcard__name">{x.c.name}</span>
        <span class="handcard__key">
          {#if out === x.i && on}play{:else if held}held{:else}{x.c.key || ''}{/if}
        </span>
      </button>
    {/each}
  </div>

  {#if hand.length}
    <p class="hand__read" aria-live="polite">
      {#if read}<b>{read.c.name}</b> {read.c.desc}{/if}
    </p>
  {/if}
</div>
