<script lang="ts">
  import Fullscreen from './Fullscreen.svelte';
  import { applyMus, applySfx, auditionSfx, mixer } from './mixer.svelte';
  import { setTheme, theme, type Theme } from './theme.svelte';

  /* Everything that is a preference rather than a move, behind one word. The
     top bar had grown a button per setting, which on a phone wrapped onto a
     second line and pushed the game down to make room for things nobody
     touches twice a session. */

  let open = $state(false);
  let root: HTMLDivElement;

  const quiet = $derived(mixer.sfx === 0 && mixer.mus === 0);

  const SHEETS: Array<{ id: Theme; lab: string }> = [
    { id: 'light', lab: 'Light' },
    { id: 'dark', lab: 'Dark' },
    { id: 'auto', lab: 'Auto' }
  ];

  function away(e: MouseEvent) {
    if (open && root && !root.contains(e.target as Node)) open = false;
  }

  function onKeydown(e: KeyboardEvent) {
    if (open && e.key === 'Escape') { open = false; e.stopPropagation(); }
  }
</script>

<svelte:document onclick={away} onkeydown={onKeydown} />

<div class="settings" bind:this={root}>
  <button class="linkbtn" aria-expanded={open} onclick={() => (open = !open)}>
    Settings{#if quiet}<span class="settings__flag"> · muted</span>{/if}
  </button>

  {#if open}
    <div class="settings__pop">
      <div class="settings__row">
        <span class="settings__lab" id="paperLab">Paper</span>
        <div class="settings__seg" role="group" aria-labelledby="paperLab">
          {#each SHEETS as s (s.id)}
            <button
              class="settings__opt" class:is-on={theme.pick === s.id}
              aria-pressed={theme.pick === s.id}
              onclick={() => setTheme(s.id)}
            >{s.lab}</button>
          {/each}
        </div>
      </div>

      <div class="settings__row">
        <label class="settings__lab" for="volSfx">Effects</label>
        <input type="range" id="volSfx" min="0" max="100"
               bind:value={mixer.sfx} oninput={applySfx} onchange={auditionSfx}>
      </div>

      <div class="settings__row">
        <label class="settings__lab" for="volMus">Music</label>
        <input type="range" id="volMus" min="0" max="100"
               bind:value={mixer.mus} oninput={applyMus}>
      </div>

      <div class="settings__row settings__row--wide">
        <Fullscreen />
      </div>

      <p class="settings__hint"><kbd>M</kbd> mutes everything</p>
    </div>
  {/if}
</div>
