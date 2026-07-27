<script lang="ts">
  import { card } from '../lib/cards';
  import type { Card } from '../lib/types';
  import CardFace from './CardFace.svelte';

  /* Reading a card in hand, two ways round.

     With a mouse, hovering is free and covering the whole board to read one
     card is rude, so it floats beside the thing you are pointing at. With a
     finger there is no hover and no room alongside anything, so a tap still
     takes the screen. `hover: hover` is asked at the moment of the event
     rather than cached, because hybrid devices exist.

     Minis are rendered in half a dozen places — loadouts, satchels, the
     market — so this stays a delegated listener rather than a prop threaded
     through all of them. */

  const HOVER_W = 268;

  let tapped = $state<Card | null>(null);
  let float = $state<{ c: Card; x: number; y: number; below: boolean } | null>(null);

  const fine = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function miniAt(target: EventTarget | null): HTMLElement | null {
    let n = target as HTMLElement | null;
    while (n && n !== document.body) {
      if (n.classList?.contains('mini') && n.getAttribute('data-card')) return n;
      n = n.parentElement;
    }
    return null;
  }

  function onDocClick(e: MouseEvent) {
    if (fine()) return;
    const el = miniAt(e.target);
    if (el) tapped = card(el.getAttribute('data-card')!);
  }

  function onOver(e: PointerEvent) {
    if (!fine()) { float = null; return; }
    const el = miniAt(e.target);
    const c = el && card(el.getAttribute('data-card')!);
    if (!el || !c) { float = null; return; }

    const r = el.getBoundingClientRect();
    const half = HOVER_W / 2;
    // above the mini when there is headroom, below it when there is not
    const below = r.top < 340;
    float = {
      c,
      x: Math.min(window.innerWidth - half - 8, Math.max(half + 8, r.left + r.width / 2)),
      y: below ? r.bottom + 10 : r.top - 10,
      below
    };
  }

  const drop = () => { float = null; };
</script>

<svelte:document onclick={onDocClick} onpointerover={onOver} />
<svelte:window onscroll={drop} onblur={drop} />

{#if float}
  <div
    class="hovercard"
    class:hovercard--below={float.below}
    style="left:{float.x}px;top:{float.y}px"
    aria-hidden="true"
  >
    <div class="cardbtn cardbtn--{float.c.cls} cardbtn--{float.c.tier} cardbtn--peek">
      <CardFace c={float.c} />
    </div>
  </div>
{/if}

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="peek" class:is-on={!!tapped} aria-hidden="true" onclick={() => (tapped = null)}>
  {#if tapped}
    <div class="peek__box">
      <div class="cardbtn cardbtn--{tapped.cls} cardbtn--{tapped.tier} cardbtn--peek">
        <CardFace c={tapped} />
      </div>
      <p class="peek__close">Tap anywhere to close</p>
    </div>
  {/if}
</div>
