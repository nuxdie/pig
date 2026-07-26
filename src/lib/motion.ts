export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Restart a CSS animation by taking the class off, forcing a reflow, putting it back. */
export function replay(node: Element | null | undefined, cls: string): void {
  if (!node) return;
  node.classList.remove(cls);
  void (node as HTMLElement).offsetWidth;
  node.classList.add(cls);
}

export function bringIntoView(node: Element | null | undefined): void {
  if (!node) return;
  if (window.innerWidth > 820 || reduced || !node.scrollIntoView) return;
  try { node.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { /* older Safari */ }
}
