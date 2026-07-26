<script lang="ts">
  import type { Card } from '../lib/types';
  import FamilyMark from './FamilyMark.svelte';
  import Icon from './Icon.svelte';

  let {
    c,
    spent = false,
    withTier = false
  }: { c: Card; spent?: boolean; withTier?: boolean } = $props();

  const title = $derived(
    withTier ? `${c.name} (${c.tier}) — ${c.desc}` : `${c.name} — ${c.desc}`
  );
</script>

<span
  class="mini mini--{c.cls} mini--{c.tier}"
  class:mini--spent={spent}
  data-card={c.id}
  {title}
>
  <span class="mini__band"></span>
  <FamilyMark cls={c.cls} extra="fam--mini" />
  <Icon id={c.id} cls="mini__art" />
  <span class="mini__lab">{c.short}</span>
</span>
