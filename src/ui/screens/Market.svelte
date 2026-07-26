<script lang="ts">
  import { card } from '../../lib/cards';
  import { MARKET } from '../../lib/circuit';
  import { buy, canAffordAnything } from '../../lib/game.svelte';
  import { RUN } from '../../lib/run.svelte';
  import Mini from '../Mini.svelte';

  const run = $derived(RUN());
  const hired = $derived(run.hired || []);
  const affordable = $derived(canAffordAnything());

  /* Nothing to show when the purse cannot reach anything and nothing has
     been hired yet — the block collapses rather than teasing. */
  const show = $derived(affordable || hired.length > 0);
</script>

{#if show}
  <div class="cur__block">
    <p class="cur__head">The market — purse {run.purse}</p>
    <p class="cur__note">Everything here is for this rung only, and every coin spent is a coin you cannot walk away with.</p>
    <div class="market">
      {#each MARKET as m (m.id)}
        <button
          class="buybtn"
          disabled={!(run.purse >= m.cost && !(m.id === 'head' && run.head > 0))}
          onclick={() => buy(m.id)}
        >
          <span class="buybtn__lab">{m.lab}</span>
          <span class="buybtn__cost">{m.cost}</span>
          <span class="buybtn__note">{m.note}</span>
        </button>
      {/each}
    </div>
    {#if hired.length || run.head}
      <p class="cur__head">Hired for this rung</p>
      <div class="satchel">
        {#each hired as id, i (i)}<Mini c={card(id)!} />{/each}
        {#if run.head}
          <span class="mini mini--none"><span class="mini__lab">+{run.head} start</span></span>
        {/if}
      </div>
    {/if}
  </div>
{:else if run.purse}
  <p class="cur__note">The market wants more than the {run.purse} in your purse. Win another rung first.</p>
{/if}
