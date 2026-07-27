<script lang="ts">
  import { CIRCUIT } from '../lib/circuit';
  import { S, showHelp, syncScores } from '../lib/game.svelte';
  import { replay } from '../lib/motion';
  import { RUN } from '../lib/run.svelte';
  import Bay from './Bay.svelte';
  import Curtain from './Curtain.svelte';
  import Dev from './Dev.svelte';
  import Draft from './Draft.svelte';
  import Peek from './Peek.svelte';
  import Scoreline from './Scoreline.svelte';
  import Settings from './Settings.svelte';

  /* One column, and the dice at the middle of it. Everything a turn needs
     is between the two balances and the two buttons; everything else was
     asked to leave. */

  let sheetEl: HTMLDivElement;

  const run = $derived(RUN());
  const opp = $derived(CIRCUIT[run.rung]);

  /* Ease the printed balances whenever a real one moves. */
  $effect(() => {
    S.p.you.score; S.p.them.score;
    syncScores();
  });

  $effect(() => {
    if (S.fx.shake > 0 && sheetEl) replay(sheetEl, 'is-shaking');
  });
</script>

<Curtain />
<Draft />
<Peek />
<Dev />

<div class="sheet" bind:this={sheetEl}>
  <header class="topbar">
    <h1>Pig</h1>
    <span class="topbar__where">
      Rung <b>{run.rung + 1}</b>/{CIRCUIT.length}
      {#if run.purse}<span class="topbar__purse">purse <b>{run.purse}</b></span>{/if}
    </span>
    <span class="topbar__gap"></span>
    <button class="linkbtn" onclick={showHelp}>How to play</button>
    <Settings />
  </header>

  <div class="board">
    <div class="score">
      <Scoreline side="you" name="You" />
      <span class="score__goal">100</span>
      <Scoreline side="them" name={opp.name} />
    </div>
    <Bay />
  </div>
</div>
