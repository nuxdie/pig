<script lang="ts">
  import { CIRCUIT } from '../lib/circuit';
  import { S, showHelp, syncScores } from '../lib/game.svelte';
  import { replay } from '../lib/motion';
  import { RUN } from '../lib/run.svelte';
  import Bay from './Bay.svelte';
  import Column from './Column.svelte';
  import Curtain from './Curtain.svelte';
  import Dev from './Dev.svelte';
  import Fullscreen from './Fullscreen.svelte';
  import Mixer from './Mixer.svelte';
  import Peek from './Peek.svelte';

  let sheetEl: HTMLDivElement;

  const run = $derived(RUN());
  const opp = $derived(CIRCUIT[run.rung]);

  const youSub = $derived(
    run.purse ? `Purse at risk <b>${run.purse}</b>` : 'Nothing in the purse yet'
  );
  const oppSub = $derived(opp.note + (opp.head ? ` Starts on ${opp.head}.` : ''));

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
<Peek />
<Dev />

<div class="sheet" bind:this={sheetEl}>
  <header class="masthead">
    <h1>Pig</h1>
    <p class="masthead__sub">
      <span>The Circuit — rung <b>{run.rung + 1} of {CIRCUIT.length}</b></span>
      <button class="linkbtn" onclick={showHelp}>How to play</button>
      <Fullscreen />
    </p>
    <Mixer />
  </header>

  <div class="board">
    <Column side="you" name="You" sub={youSub} />
    <Bay />
    <Column side="them" name={opp.name} sub={oppSub} />
  </div>
</div>
