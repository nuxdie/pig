<script lang="ts">
  import { canAct, doRoll, S, setTray } from '../lib/game.svelte';

  let root: HTMLDivElement;

  /* The tray owns its own DOM and its own renderer: three.js and the physics
     engine are the heaviest thing here by far, so they load as a separate
     chunk while the player is still reading the intro. Until it arrives the
     game is fully playable — rolls fall back to a plain draw. */
  $effect(() => {
    let live = true;
    let tray: { destroy(): void } | null = null;

    import('../dice/dice3d').then(({ Tray }) => {
      if (!live) return;
      tray = new Tray(root, {
        canHandle: () => canAct(),
        onTap: () => { if (canAct()) doRoll(); },
        onSlot: (i, slot) => { S.slot[i] = slot; }
      });
      setTray(tray as never);
    });

    return () => {
      live = false;
      setTray(null);
      tray?.destroy();
    };
  });
</script>

<div class="tray" bind:this={root}></div>
