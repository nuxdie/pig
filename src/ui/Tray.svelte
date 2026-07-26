<script lang="ts">
  import { Tray } from '../dice/dice3d';
  import { canAct, doRoll, S, setTray } from '../lib/game.svelte';

  let root: HTMLDivElement;

  /* The tray owns its own DOM: a Tray instance builds the cubes and writes
     transforms straight onto them. Svelte's job here is only to hand over
     the element and keep the reference registered. */
  $effect(() => {
    const t = new Tray(root, {
      canHandle: () => canAct(),
      onTap: () => { if (canAct()) doRoll(); },
      onSlot: (i, slot) => { S.slot[i] = slot; }
    });
    setTray(t);
    return () => setTray(null);
  });
</script>

<div class="tray" data-n="2" bind:this={root}></div>
