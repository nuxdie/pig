<script lang="ts">
  import { card } from '../../lib/cards';
  import { CIRCUIT } from '../../lib/circuit';
  import { enterCircuit } from '../../lib/game.svelte';
  import { newRun } from '../../lib/run.svelte';
  import type { CardId } from '../../lib/types';
  import Mini from '../Mini.svelte';
  import RecordBook from './RecordBook.svelte';

  let { oppName, lost, souvenirs, rung }:
    { oppName: string; lost: number; souvenirs: CardId[]; rung: number } = $props();

  function again() {
    newRun();
    enterCircuit();
  }
</script>

<p class="cur__eyebrow">Rung {rung + 1} of {CIRCUIT.length}</p>
<h1 class="cur__title loss">Ruin</h1>
<p class="cur__lede">
  {oppName} takes the match{#if lost}, and the <b class="bad">{lost}</b> you were carrying goes with it.{:else}. You were carrying nothing, at least.{/if}
</p>

{#if souvenirs.length}
  <div class="cur__block">
    <p class="cur__head">Left on the table</p>
    <div class="satchel">
      {#each souvenirs as id, i (i)}<Mini c={card(id)!} />{/each}
    </div>
  </div>
{/if}

<RecordBook />

<button class="btn cur__go" onclick={again}>New run</button>
