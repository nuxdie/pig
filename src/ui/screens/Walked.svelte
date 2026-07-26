<script lang="ts">
  import { enterCircuit } from '../../lib/game.svelte';
  import { newRun } from '../../lib/run.svelte';
  import RecordBook from './RecordBook.svelte';

  let { banked, cleared }: { banked: number; cleared: boolean } = $props();

  function again() {
    newRun();
    enterCircuit();
  }
</script>

<p class="cur__eyebrow">{cleared ? 'Circuit cleared' : 'Run closed'}</p>
<h1 class="cur__title win">{cleared ? 'All seven' : 'Banked'}</h1>
<p class="cur__lede">
  You walk away with <b class="good">{banked}</b>.
  {cleared ? ' Nobody was left standing.' : ' The dice never got the chance to take it back.'}
</p>

<RecordBook />

<button class="btn cur__go" onclick={again}>New run</button>
