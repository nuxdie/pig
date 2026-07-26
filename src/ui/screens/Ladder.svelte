<script lang="ts">
  import { CIRCUIT } from '../../lib/circuit';
  import { RUN } from '../../lib/run.svelte';

  const rung = $derived(RUN().rung);
</script>

<ol class="ladder">
  {#each CIRCUIT as o, i (o.name)}
    <li class="ladder__row {i < rung ? 'is-done' : i === rung ? 'is-now' : 'is-locked'}">
      <span class="ladder__n">{i < rung ? '✓' : i + 1}</span>
      <span class="ladder__name">{o.name}<em>{o.note}</em></span>
      <span class="ladder__kit">
        {#each o.kit as t, k (k)}<span class="kitdot kitdot--{t}"></span>{/each}
        {#if o.head}<span class="kithead">+{o.head}</span>{/if}
      </span>
      <span class="ladder__purse">+{o.purse}</span>
    </li>
  {/each}
</ol>
