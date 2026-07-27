<script lang="ts">
  import { cycleTheme, theme } from './theme.svelte';

  /* One word in the top bar, like Sound next to it: it says which sheet you
     are on, and pressing it deals the next one. */

  const label = $derived(
    theme.pick === 'auto' ? 'Auto' : theme.pick === 'dark' ? 'Dark' : 'Light'
  );

  const said = $derived(
    theme.pick === 'auto' ? `following the system, currently ${theme.sheet}` : `${theme.pick} paper`
  );
  const next = $derived(
    theme.pick === 'light' ? 'dark paper' : theme.pick === 'dark' ? 'the system setting' : 'light paper'
  );
</script>

<button class="linkbtn" onclick={cycleTheme} aria-label="Paper: {said}. Switch to {next}.">
  {label}
</button>
