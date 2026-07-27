<script lang="ts">
  import type { DieId } from '../lib/types';
  import Icon from './Icon.svelte';

  /* The card's art slot, with the actual die turning over in it. Same lazy
     deal as the tray: three.js is a separate chunk, so until it lands the
     card keeps the flat icon it always had and nothing waits on anything.

     The icon is hidden rather than removed — the preview appends its canvas
     to this element by hand, and Svelte should have no reason to touch it. */
  let { id, cls }: { id: DieId; cls: string } = $props();

  let root: HTMLSpanElement;
  let live = $state(false);

  $effect(() => {
    const which = id;
    let alive = true;
    let preview: { destroy(): void } | null = null;

    import('../dice/preview').then(({ DiePreview }) => {
      if (!alive) return;
      preview = new DiePreview(root, which);
      live = true;
    });

    return () => {
      alive = false;
      live = false;
      preview?.destroy();
    };
  });
</script>

<span class="{cls} pcard__die" class:is-live={live} bind:this={root}>
  <Icon id={id} cls="pcard__die-fall" />
</span>
