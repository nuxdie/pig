<script lang="ts">
  import { ICONS } from '../lib/icons';

  let { id, cls }: { id: string; cls: string } = $props();
</script>

<span class={cls}>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    {@html ICONS[id] || ''}
  </svg>
</span>
