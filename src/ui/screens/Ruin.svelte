<script lang="ts">
  import { card } from '../../lib/cards';
  import { CIRCUIT } from '../../lib/circuit';
  import { enterCircuit, sacrifice, sacrificeStake } from '../../lib/game.svelte';
  import { newRun } from '../../lib/run.svelte';
  import type { CardId } from '../../lib/types';
  import Mini from '../Mini.svelte';
  import RecordBook from './RecordBook.svelte';

  let { oppName, lost, souvenirs, rung }:
    { oppName: string; lost: number; souvenirs: CardId[]; rung: number } = $props();

  /* The stake is read once, on the way in — the sacrifice empties the run,
     and the screen must not blink to "nothing to give" while it does. */
  const stake = sacrificeStake();
  let confirming = $state(false);

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

{#if stake > 0}
  <div class="cur__block sacrifice">
    <p class="cur__head">One thing left to sell</p>
    {#if confirming}
      <p class="cur__lede">
        Everything: the purse, the satchel, anything you hired, any head start.
        You sit down against <b>{oppName}</b> again on this same rung with nothing
        but the plain dice, and they keep all of theirs.
        <b class="bad">There is no second sacrifice.</b>
      </p>
      <div class="cur__row">
        <button class="btn btn--sacrifice" onclick={sacrifice}>Give it all up</button>
        <button class="btn" onclick={() => (confirming = false)}>Think better of it</button>
      </div>
    {:else}
      <p class="cur__lede">
        Put the whole run on the table — everything you own — for one more
        crack at {oppName}.
      </p>
      <button class="btn btn--sacrifice" onclick={() => (confirming = true)}>Sacrifice</button>
    {/if}
  </div>
{/if}

<RecordBook />

<button class="btn cur__go" onclick={again}>New run</button>
