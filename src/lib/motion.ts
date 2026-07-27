export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Restart a CSS animation by taking the class off, forcing a reflow, putting it back. */
export function replay(node: Element | null | undefined, cls: string): void {
  if (!node) return;
  node.classList.remove(cls);
  void (node as HTMLElement).offsetWidth;
  node.classList.add(cls);
}

/**
 * A charge leaving the hand, once it has been played. It used to stay put
 * with a red line through it, which meant a hand that only ever grew and a
 * row of cards that mostly could not be used. Now it lifts off the row, tips
 * over and goes — and only at the very end does the space it held close up,
 * so the eye has somewhere to look before the neighbours move.
 *
 * Applied to every mini, and inert on the ones that are not in a hand.
 */
export function spend(node: Element, on: boolean) {
  if (!on) return { duration: 0 };

  const w = (node as HTMLElement).offsetWidth;
  const GAP = 4;  // .side__hand's own gap, which goes with the card

  // so the flare in Scoreline does not fight the transition for the transform
  node.classList.add('is-leaving');

  return {
    duration: reduced ? 1 : 620,
    css: (t: number, u: number) => {
      const room = Math.min(1, t / 0.45);          // width holds, then closes
      const away = u * u;                          // slow to leave, then gone
      return `
        transform: translateY(${-30 * away}px) rotate(${13 * away}deg)
                   scale(${1 + 0.16 * Math.sin(Math.PI * u)});
        opacity: ${Math.min(1, t / 0.5)};
        width: ${w * room}px;
        margin-left: ${-GAP * (1 - room)}px;
        pointer-events: none;
        z-index: 3;
      `;
    }
  };
}

export function bringIntoView(node: Element | null | undefined): void {
  if (!node) return;
  if (window.innerWidth > 820 || reduced || !node.scrollIntoView) return;
  try { node.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { /* older Safari */ }
}
