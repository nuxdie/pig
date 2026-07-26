<script lang="ts">
  import { card } from '../lib/cards';
  import type { Card } from '../lib/types';
  import CardFace from './CardFace.svelte';

  /* Tap a card in either hand to read it, on any device. Minis are rendered
     in half a dozen places — loadouts, satchels, the market — so this stays
     a delegated listener rather than a prop threaded through all of them. */
  let shown = $state<Card | null>(null);

  function onDocClick(e: MouseEvent) {
    let n = e.target as HTMLElement | null;
    while (n && n !== document.body) {
      if (n.classList?.contains('mini') && n.getAttribute('data-card')) {
        shown = card(n.getAttribute('data-card')!);
        return;
      }
      n = n.parentElement;
    }
  }
</script>

<svelte:document onclick={onDocClick} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="peek" class:is-on={!!shown} aria-hidden="true" onclick={() => (shown = null)}>
  {#if shown}
    <div class="peek__box">
      <div class="cardbtn cardbtn--{shown.cls} cardbtn--{shown.tier} cardbtn--peek">
        <CardFace c={shown} />
      </div>
      <p class="peek__close">Tap anywhere to close</p>
    </div>
  {/if}
</div>
