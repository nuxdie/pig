<script lang="ts">
  import { avgOf, DICE, onesOf } from '../lib/dice';
  import { FAMILY_LABEL } from '../lib/cards';
  import type { Card } from '../lib/types';
  import FamilyMark from './FamilyMark.svelte';
  import Icon from './Icon.svelte';

  let { c }: { c: Card } = $props();

  const die = $derived(c.cls === 'dice' && c.die ? DICE[c.die] : null);
  const faces = $derived(die ? die.faces.slice().sort((a, b) => a - b) : []);
  const ones = $derived(die ? onesOf(die) : 0);
</script>

<span class="ptier">{c.tier}</span>
<span class="pcorner pcorner--tl"><FamilyMark cls={c.cls} /></span>
<span class="pcorner pcorner--br"><FamilyMark cls={c.cls} /></span>
<Icon id={c.id} cls="pcard__art" />
<span class="pcard__body">
  <span class="pcard__name">{c.name}</span>
  <span class="pcard__fam">{FAMILY_LABEL[c.cls]}</span>
  {#if die}
    <span class="pcard__faces">
      {#each faces as v, i (i)}<i class={v === 1 ? 'one' : ''}>{v}</i>{/each}
    </span>
    <span class="pcard__stat">
      avg <b>{avgOf(die).toFixed(2)}</b> · one
      <b class={ones === 0 ? 'safe' : 'risk'}>{Math.round(ones / 6 * 100)}%</b>
    </span>
  {/if}
  <span class="pcard__desc">{c.desc}</span>
</span>
