<script lang="ts">
  /* iPhone Safari has no element fullscreen at all — only video — so the
     button has to earn its place rather than sit there doing nothing. */
  interface Legacy {
    webkitFullscreenEnabled?: boolean;
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void>;
  }
  interface LegacyEl { webkitRequestFullscreen?: () => Promise<void> }

  const doc = document as Document & Legacy;
  const supported = !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);

  let on = $state(false);

  const read = () => { on = !!(document.fullscreenElement || doc.webkitFullscreenElement); };

  // Safari still only fires the prefixed event, and Svelte has no typed
  // attribute for it, so both are bound by hand.
  $effect(() => {
    for (const e of ['fullscreenchange', 'webkitfullscreenchange']) {
      document.addEventListener(e, read);
    }
    read();
    return () => {
      for (const e of ['fullscreenchange', 'webkitfullscreenchange']) {
        document.removeEventListener(e, read);
      }
    };
  });

  async function toggle() {
    const el = document.documentElement as HTMLElement & LegacyEl;
    try {
      if (on) await (doc.exitFullscreen ?? doc.webkitExitFullscreen)?.call(document);
      else await (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el);
    } catch { /* refused — the state listener will put the label right */ }
  }
</script>

{#if supported}
  <button class="linkbtn" onclick={toggle} aria-pressed={on}>
    {on ? 'Exit full screen' : 'Full screen'}
  </button>
{/if}
