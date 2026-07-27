<script lang="ts">
  import { spend } from '../lib/motion';
  import type { Card } from '../lib/types';
  import FamilyMark from './FamilyMark.svelte';
  import Icon from './Icon.svelte';

  /* `leaves` is for the minis in a hand, which are the only ones that ever go
     away on their own — a charge, the moment it is played. */
  let {
    c,
    withTier = false,
    leaves = false
  }: { c: Card; withTier?: boolean; leaves?: boolean } = $props();

  const title = $derived(
    withTier ? `${c.name} (${c.tier}) — ${c.desc}` : `${c.name} — ${c.desc}`
  );
</script>

<span
  class="mini mini--{c.cls} mini--{c.tier}"
  data-card={c.id}
  {title}
  out:spend={leaves}
>
  <span class="mini__band"></span>
  <FamilyMark cls={c.cls} extra="fam--mini" />
  <Icon id={c.id} cls="mini__art" />
  <span class="mini__lab">{c.short}</span>
</span>
