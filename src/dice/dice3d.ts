import { play } from '../audio/sfx';
import { LAND_AT, ROLL_MS } from '../lib/circuit';
import { LAND, PIPS, SLOTS } from '../lib/dice';
import { reduced, replay } from '../lib/motion';
import type { Die } from '../lib/types';

/* =====================================================================
   THE TRAY — hand-written DOM on purpose.
   These are real 3D cubes: a roll writes a transform straight onto the
   node and animation restarts lean on forced reflow. A framework's
   render pass sits badly on top of that, so this layer opts out and
   owns its own subtree.
   ===================================================================== */

export interface TrayOptions {
  /** Whether a die may currently be picked up or tapped. */
  canHandle: () => boolean;
  /** A tap (as opposed to a drag) on any die. */
  onTap: () => void;
  /** Reports the slot a die came to rest on, so state survives a remount. */
  onSlot: (i: number, slot: number) => void;
}

export class Tray {
  private cube: HTMLElement[] = [];
  private hop: HTMLElement[] = [];
  private sh: HTMLElement[] = [];
  private spin: Array<{ x: number; y: number }> = [];

  constructor(private root: HTMLElement, private opts: TrayOptions) {}

  /** The tray always holds the dice of whoever has the pen — including a
   *  third one, if they drafted it. */
  mount(dice: Die[], slots: number[]): void {
    this.root.innerHTML = '';
    this.root.setAttribute('data-n', String(dice.length));
    this.cube = []; this.hop = []; this.sh = []; this.spin = [];

    dice.forEach((d, i) => {
      const slot = document.createElement('div'); slot.className = 'slot';
      const hop = document.createElement('div'); hop.className = 'hop';
      const cube = document.createElement('div'); cube.className = 'cube d-' + d.id;
      const sh = document.createElement('div'); sh.className = 'shadow';
      hop.appendChild(cube); slot.appendChild(hop); slot.appendChild(sh);
      this.root.appendChild(slot);

      this.cube[i] = cube; this.hop[i] = hop; this.sh[i] = sh;
      this.spin[i] = { x: 0, y: 0 };

      this.buildFaces(cube, d);
      this.setCube(i, slots[i] ?? 0, true);
      this.makeHandleable(i);
    });
  }

  private buildFaces(node: HTMLElement, die: Die): void {
    node.innerHTML = '';
    SLOTS.forEach((slotCls, s) => {
      const v = die.faces[s];
      const face = document.createElement('div');
      face.className = 'face ' + slotCls;
      for (let c = 1; c <= 9; c++) {
        const cell = document.createElement('div');
        if (PIPS[v].indexOf(c) > -1) { cell.className = 'pip' + (v === 1 ? ' pip--one' : ''); }
        face.appendChild(cell);
      }
      node.appendChild(face);
    });
    // Rounded faces cut material away at every edge, so a smaller square-cornered
    // cube sits inside and fills the volume. Any sightline through a corner now
    // lands on solid material instead of the inside of the far face.
    ['c-front', 'c-back', 'c-right', 'c-left', 'c-top', 'c-bottom'].forEach((cls) => {
      const core = document.createElement('div');
      core.className = 'core ' + cls;
      node.appendChild(core);
    });
  }

  setCube(i: number, slotIdx: number, instant?: boolean): void {
    const node = this.cube[i];
    if (!node) return;
    const r = LAND[slotIdx];
    if (instant) {
      node.style.transition = 'none';
      this.spin[i].x = 0; this.spin[i].y = 0;
    } else {
      node.style.transition = '';
      this.spin[i].x += 2 + Math.floor(Math.random() * 2);
      this.spin[i].y += 2 + Math.floor(Math.random() * 3);
    }
    node.style.transform =
      'rotateX(' + (this.spin[i].x * 360 + r[0]) + 'deg) rotateY(' + (this.spin[i].y * 360 + r[1]) + 'deg)';
    if (instant) { void node.offsetWidth; node.style.transition = ''; }
    this.opts.onSlot(i, slotIdx);
  }

  /* Drag a die to turn it over and read its faces; tap it to throw.
     The drag rotates the wrapper, never the cube, so the landed face is
     never lost — let go and it springs back. */
  private makeHandleable(i: number): void {
    const hop = this.hop[i];
    let drag: { x: number; y: number; rx: number; ry: number; moved: boolean } | null = null;

    hop.addEventListener('pointerdown', (e: PointerEvent) => {
      if (!this.opts.canHandle()) return;
      drag = { x: e.clientX, y: e.clientY, rx: 0, ry: 0, moved: false };
      hop.classList.add('is-held');
      hop.style.transition = 'none';
      try { hop.setPointerCapture(e.pointerId); } catch { /* not captured, fine */ }
    });

    hop.addEventListener('pointermove', (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
      if (!drag.moved) return;
      e.preventDefault();
      drag.ry = Math.max(-160, Math.min(160, dx * 0.9));
      drag.rx = Math.max(-160, Math.min(160, -dy * 0.9));
      hop.style.transform = 'rotateX(' + drag.rx + 'deg) rotateY(' + drag.ry + 'deg)';
    });

    const release = (e: PointerEvent) => {
      if (!drag) return;
      const wasTap = !drag.moved;
      drag = null;
      hop.classList.remove('is-held');
      hop.style.transition = '';
      hop.style.transform = '';
      try { hop.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      if (wasTap) this.opts.onTap();
    };

    hop.addEventListener('pointerup', release);
    hop.addEventListener('pointercancel', release);
  }

  throw(which: number[], slots: number[], cb: () => void): void {
    if (reduced) {
      which.forEach((i) => { this.setCube(i, slots[i], true); });
      play('land');
      cb();
      return;
    }
    play('throwDice', slots.length);
    which.forEach((i, k) => {
      this.setCube(i, slots[i]);
      setTimeout(() => { replay(this.hop[i], 'is-hopping'); replay(this.sh[i], 'is-hopping'); }, k * 70);
    });
    setTimeout(() => { play('land'); }, LAND_AT);
    setTimeout(cb, ROLL_MS);
  }

  nudge(on: boolean): void {
    this.root.classList.toggle('is-nudge', on);
  }
}
