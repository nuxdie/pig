/* ---- the fast press ----
   A button that waits for `click` waits for the finger to come back up, and
   over a whole run those tens of milliseconds are the difference between dice
   that answer you and dice that think about it first. The buttons a turn
   actually runs through — roll, bank, the charges, the three cards at a draft
   — act on the way down instead.

   Keyboard activation has no pointer behind it and arrives as a click with a
   `detail` of 0, which is what tells the two apart: no flags, no timers, and
   no way for one press to count twice. Programmatic `.click()` looks the same
   as the keyboard, which is what the game's own shortcuts want anyway.

   The tray is deliberately not on this: the same gesture is drag-to-inspect,
   and nothing can know a tap from a drag until the pointer lifts. */

export function press(node: HTMLElement, run: () => void) {
  let go = run;

  const down = (e: PointerEvent) => {
    if (e.button > 0) return;                            // right and middle never act
    if ((node as HTMLButtonElement).disabled) return;    // Safari still dispatches these
    go();
  };

  const click = (e: MouseEvent) => { if (e.detail === 0) go(); };

  node.addEventListener('pointerdown', down);
  node.addEventListener('click', click);

  return {
    update(next: () => void) { go = next; },
    destroy() {
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('click', click);
    }
  };
}
