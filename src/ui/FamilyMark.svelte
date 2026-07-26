<script lang="ts">
  import { FAMILY } from '../lib/icons';
  import type { Family } from '../lib/types';

  let { cls, extra = '' }: { cls: Family; extra?: string } = $props();
</script>

<span class="fam {extra}">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    {@html FAMILY[cls]}
  </svg>
</span>
