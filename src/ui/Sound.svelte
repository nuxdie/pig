<script lang="ts">
  import { applyMus, applySfx, auditionSfx, mixer } from './mixer.svelte';

  /* Two sliders that get touched once a session do not deserve a permanent
     place in the top bar. They live behind a word instead. */
  let open = $state(false);
  let root: HTMLDivElement;

  const quiet = $derived(mixer.sfx === 0 && mixer.mus === 0);

  function away(e: MouseEvent) {
    if (open && root && !root.contains(e.target as Node)) open = false;
  }
</script>

<svelte:document onclick={away} />

<div class="sound" bind:this={root}>
  <button class="linkbtn" aria-expanded={open} onclick={() => (open = !open)}>
    {quiet ? 'Muted' : 'Sound'}
  </button>
  {#if open}
    <div class="sound__pop">
      <div class="sound__row">
        <label for="volSfx">Effects</label>
        <input type="range" id="volSfx" min="0" max="100"
               bind:value={mixer.sfx} oninput={applySfx} onchange={auditionSfx}>
      </div>
      <div class="sound__row">
        <label for="volMus">Music</label>
        <input type="range" id="volMus" min="0" max="100"
               bind:value={mixer.mus} oninput={applyMus}>
      </div>
      <p class="sound__hint"><kbd>M</kbd> mutes everything</p>
    </div>
  {/if}
</div>
