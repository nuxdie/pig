<script lang="ts">
  import { audio } from '../audio/engine';
  import { startMusic } from '../audio/music';
  import { S, ui } from '../lib/game.svelte';
  import Circuit from './screens/Circuit.svelte';
  import Intro from './screens/Intro.svelte';
  import Ruin from './screens/Ruin.svelte';
  import Spoils from './screens/Spoils.svelte';
  import Walked from './screens/Walked.svelte';

  let sheet: HTMLDivElement;

  /* Every screen that is not the board. The first time the curtain lifts is
     also the first gesture-backed moment we are allowed to start audio. */
  let armed = false;

  $effect(() => {
    const s = S.screen;
    if (s) {
      if (sheet) {
        sheet.scrollTop = 0;
        sheet.querySelector<HTMLElement>('.cur__go, .btn')?.focus();
      }
      return;
    }
    if (!armed) { armed = true; audio(); startMusic(); }
    if (!S.over && S.turn === 'you' && !S.busy) ui.focusRoll();
  });
</script>

<div class="curtain" class:is-on={!!S.screen}>
  <div class="curtain__sheet" bind:this={sheet}>
    {#if S.screen}
      {#key S.screen}
        {#if S.screen.kind === 'intro'}
          <Intro from={S.screen.from} />
        {:else if S.screen.kind === 'circuit'}
          <Circuit />
        {:else if S.screen.kind === 'spoils'}
          <Spoils />
        {:else if S.screen.kind === 'walked'}
          <Walked banked={S.screen.banked} cleared={S.screen.cleared} />
        {:else if S.screen.kind === 'ruin'}
          <Ruin oppName={S.screen.oppName} lost={S.screen.lost}
                souvenirs={S.screen.souvenirs} rung={S.screen.rung} />
        {/if}
      {/key}
    {/if}
  </div>
</div>
