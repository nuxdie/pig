import { A } from '../audio/engine';
import { startMusic, stopMusic } from '../audio/music';
import { play } from '../audio/sfx';

/** Slider positions, 0–100. The audio rig reads its levels from here. */
export const mixer = $state({ sfx: 80, mus: 50 });

export function applySfx(): void {
  A.sfxLevel = mixer.sfx / 100;
  if (A.sfx) A.sfx.gain.setTargetAtTime(A.sfxLevel, A.ctx!.currentTime, 0.01);
}

export function applyMus(): void {
  A.musLevel = mixer.mus / 100;
  if (A.mus) A.mus.gain.setTargetAtTime(A.musLevel, A.ctx!.currentTime, 0.05);
  if (A.musLevel > 0 && !A.playing) startMusic();
  if (A.musLevel === 0 && A.playing) stopMusic();
}

/** A preview blip when the sound slider is let go. */
export function auditionSfx(): void {
  if (A.sfxLevel > 0) play('add', 3);
}

let muted = false;
let preMute: { s: number; m: number } | null = null;

export function toggleMute(): void {
  if (!muted) {
    preMute = { s: mixer.sfx, m: mixer.mus };
    mixer.sfx = 0; mixer.mus = 0;
  } else {
    mixer.sfx = preMute ? preMute.s : 80;
    mixer.mus = preMute ? preMute.m : 50;
  }
  muted = !muted;
  applySfx();
  applyMus();
}
