<script lang="ts">
  import { card } from '../lib/cards';
  import { CIRCUIT } from '../lib/circuit';
  import {
    bankOf, chooseDraft, doBank, doRoll, enterRuin, enterSpoils, nudgeTray,
    S, tryCharge, ui
  } from '../lib/game.svelte';
  import { bringIntoView, reduced, replay } from '../lib/motion';
  import { RUN } from '../lib/run.svelte';
  import type { ChargeId } from '../lib/types';
  import Feed from './Feed.svelte';
  import Hand from './Hand.svelte';
  import Icon from './Icon.svelte';
  import Tray from './Tray.svelte';
  import { toggleMute } from './mixer.svelte';
  import { press } from './press';

  let btnRoll: HTMLButtonElement;
  let btnBank: HTMLButtonElement;
  let btnAgain: HTMLButtonElement;
  let verdictEl: HTMLDivElement;
  let totalEl: HTMLDivElement;
  let handEl: ReturnType<typeof Hand>;

  ui.focusRoll = () => btnRoll?.focus();
  ui.focusAgain = () => btnAgain?.focus();
  ui.scrollToVerdict = () => bringIntoView(verdictEl);

  const mine = $derived(S.turn === 'you' && !S.busy && !S.over && !S.draft);
  const oppName = $derived(CIRCUIT[RUN().rung].name);

  const note = $derived.by(() => {
    if (S.lost !== null) return S.lostNote;
    if (S.line <= 0) return 'Unbanked. Worth nothing yet.';
    const bv = bankOf(S.turn, S.line, false);
    if (bv.bonus) return 'Banks for ' + bv.total + ' with your cards. A 1 takes it all.';
    return S.p[S.turn].dice.length > 2
      ? 'Unbanked. Two 1s wipe everything.'
      : 'Unbanked. A single 1 wipes it.';
  });

  $effect(() => {
    if (S.fx.bump > 0 && totalEl) replay(totalEl, 'is-bump');
  });
  $effect(() => {
    if (S.fx.drop > 0 && totalEl) replay(totalEl, 'is-drop');
  });

  /** Flash a button as though it had been clicked, for keyboard shortcuts. */
  function tap(btn: HTMLElement | null | undefined) {
    if (!btn) return;
    btn.classList.add('is-pressed');
    setTimeout(() => btn.classList.remove('is-pressed'), 110);
  }

  function again() {
    if (!S.over) return;
    S.winner === 'you' ? enterSpoils() : enterRuin();
  }

  const CHARGE_KEYS: Array<[string, string, number, ChargeId]> = [
    ['KeyL', 'l', 76, 'levy'],
    ['KeyW', 'w', 87, 'wind'],
    ['KeyD', 'd', 68, 'warlord'],
    ['KeyT', 't', 84, 'transmute'],
    ['KeyR', 'r', 82, 'ward'],
    ['KeyQ', 'q', 81, 'quill'],
    ['KeyG', 'g', 71, 'bellows'],
    ['KeyF', 'f', 70, 'windfall']
  ];

  // Matched on physical key position, so every shortcut survives Cyrillic,
  // AZERTY and Dvorak layouts alike.
  function onKeydown(e: KeyboardEvent) {
    const t = (e.target as HTMLElement).tagName;
    if (t === 'INPUT' || t === 'TEXTAREA') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const code = e.code || '';
    const key = (e.key || '').toLowerCase();
    const kc = e.keyCode;
    const onButton = t === 'BUTTON';
    const is = (c: string, k: string, n: number) => code === c || key === k || kc === n;

    if (S.screen) return;

    if (is('KeyM', 'm', 77)) { e.preventDefault(); toggleMute(); return; }

    if (S.draft) {
      if (S.draft.who !== 'you' || S.draft.chosen !== null) return;
      const idx = is('Digit1', '1', 49) ? 0 : is('Digit2', '2', 50) ? 1 : is('Digit3', '3', 51) ? 2 : -1;
      if (idx >= 0) { e.preventDefault(); chooseDraft(idx); }
      return;
    }

    if (S.over) {
      if (is('KeyN', 'n', 78) || (!onButton && code === 'Enter')) {
        e.preventDefault(); tap(btnAgain); again();
      }
      return;
    }

    if (is('KeyB', 'b', 66)) { e.preventDefault(); tap(btnBank); if (!btnBank.disabled) doBank(); return; }

    for (const [c, k, n, id] of CHARGE_KEYS) {
      if (is(c, k, n)) {
        e.preventDefault();
        tap(handEl?.el().querySelector<HTMLElement>(`[data-charge-id="${id}"]:not(.is-off)`));
        tryCharge(id);
        return;
      }
    }

    if (code === 'Space' || key === ' ' || kc === 32) {
      if (onButton) return;
      e.preventDefault();
      tap(btnRoll);
      if (!btnRoll.disabled) doRoll();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<section class="bay" class:is-theirs={S.turn === 'them' && !S.over}>
  <Feed />

  <div class="verdict {S.over ? 'is-on verdict--' + (S.winner === 'you' ? 'win' : 'loss') : ''}"
       role="status" bind:this={verdictEl}>
    <p class="verdict__line">
      {#if S.over}
        {#if S.winner === 'you'}
          <strong>You beat {oppName}</strong> {S.p.you.score} to {S.p.them.score}.<em>Rung cleared</em>
        {:else}
          <strong>{oppName} wins</strong> {S.p.them.score} to {S.p.you.score}.<em>Run over</em>
        {/if}
      {/if}
    </p>
    <button class="btn btn--again" bind:this={btnAgain} onclick={again}>Continue</button>
  </div>

  <Tray />

  <div class="flares" aria-hidden="true">
    {#each S.flares as f (f.key)}
      <div class="flare flare--{f.cls}" class:flare--them={f.who === 'them'}>
        <Icon id={f.id} cls="flare__art" />
        <span class="flare__name">{card(f.id)?.name}</span>
        {#if f.text}<span class="flare__val">{f.text}</span>{/if}
      </div>
    {/each}
  </div>

  <div class="online">
    <div
      class="online__num {S.lost !== null
        ? (S.lostGood ? 'is-saved' : 'is-lost')
        : (S.line > 0 && !S.over ? (S.turn === 'you' ? 'is-you' : 'is-them') : '')}"
      bind:this={totalEl}
    >{S.lost !== null ? S.lost : S.line}</div>
    <div class="online__lab">on the line</div>
    <div class="online__note">{note}</div>
  </div>

  <div class="controls">
    <button
      class="btn" bind:this={btnRoll} disabled={!mine} use:press={doRoll}
      onmouseenter={() => { if (mine && !reduced) nudgeTray(true); }}
      onmouseleave={() => nudgeTray(false)}
    >Roll<small>space</small></button>
    <button class="btn btn--bank" bind:this={btnBank} disabled={!mine || S.line === 0} use:press={doBank}>
      Bank<small>b</small>
    </button>
  </div>

  <p class="log" role="status" aria-live="polite">{@html S.log}</p>

  <Hand bind:this={handEl} />
</section>
