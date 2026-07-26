<script lang="ts">
  import { card } from '../../lib/cards';
  import { CIRCUIT, SATCHEL_MAX } from '../../lib/circuit';
  import { hideScreen, showScreen, startMatch } from '../../lib/game.svelte';
  import { closeRun, newRun, RUN } from '../../lib/run.svelte';
  import { STORE } from '../../lib/storage';
  import Mini from '../Mini.svelte';
  import Ladder from './Ladder.svelte';
  import Market from './Market.svelte';
  import RecordBook from './RecordBook.svelte';

  const run = $derived(RUN());
  const opp = $derived(CIRCUIT[run.rung]);
  const resuming = $derived(run.rung > 0 || run.purse > 0);

  function begin() {
    hideScreen();
    startMatch();
  }

  function abandon() {
    closeRun();
    newRun();
    showScreen({ kind: 'circuit' });
  }
</script>

<p class="cur__eyebrow">
  {resuming ? `Rung ${run.rung + 1} of ${CIRCUIT.length} — spend before you sit down` : 'A run of seven'}
</p>
<h1 class="cur__title">{resuming ? opp.name : 'The Circuit'}</h1>

<p class="cur__lede">
  Next up: <b>{opp.name}</b>. {opp.note}
  {#if run.purse}
    Your purse stands at <b class="good">{run.purse}</b> — lose and it is gone.
  {/if}
</p>

<Ladder />
<Market />

<div class="cur__block">
  <p class="cur__head">Satchel — {run.souvenirs.length}/{SATCHEL_MAX}</p>
  {#if run.souvenirs.length}
    <div class="satchel">
      {#each run.souvenirs as id, i (i)}<Mini c={card(id)!} />{/each}
    </div>
  {:else}
    <p class="satchel__empty">nothing yet</p>
  {/if}
</div>

<button class="btn cur__go" onclick={begin}>
  {resuming ? 'Face ' + opp.name : 'Begin the circuit'}
</button>

<div class="cur__row">
  <button class="btn" onclick={() => showScreen({ kind: 'intro', back: true })}>How to play</button>
  {#if resuming}
    <button class="btn" onclick={abandon}>Abandon run</button>
  {/if}
</div>

<RecordBook />

{#if !STORE.live}
  <p class="cur__note">This browser is blocking storage, so the run will not survive a reload.</p>
{/if}
