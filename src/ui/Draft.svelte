<script lang="ts">
  import { chooseDraft, S } from '../lib/game.svelte';
  import CardFace from './CardFace.svelte';
  import { press } from './press';

  /* The draft takes the screen. It used to open inside the bay, above the
     tray, which meant three cards and a set of dice competing for the same
     band of a phone — and the dice were unusable anyway, because nothing
     continues until a card is taken. So it stops pretending to share. */

  const d = $derived(S.draft);

  /** The first card takes focus, so the whole draft is reachable by keyboard. */
  function autofocus(node: HTMLElement, active: boolean) {
    if (active) node.focus();
  }
</script>

<div
  class="draft" class:is-on={!!d}
  role="dialog" aria-modal="true" aria-label="Milestone draft"
>
  {#if d}
    <div class="draft__box">
      <p class="draft__head {d.tier}">
        {d.who === 'you' ? 'You crossed ' : 'The machine crossed '}{d.milestone} — {d.tier}
      </p>
      <p class="draft__sub">
        {d.who === 'you'
          ? 'Take one card. It is yours for the rest of the game.'
          : 'It is taking a card.'}
      </p>
      <div class="draft__cards">
        {#each d.offer as c, i (c.id)}
          <div class="draftslot">
            <button
              class="cardbtn cardbtn--{c.cls} cardbtn--{c.tier}"
              class:is-taken={d.chosen === i}
              class:is-dropped={d.chosen !== null && d.chosen !== i}
              disabled={d.who !== 'you' || d.chosen !== null}
              use:autofocus={i === 0 && d.who === 'you'}
              use:press={() => chooseDraft(i)}
            >
              <CardFace {c} />
            </button>
            {#if d.who === 'you'}
              <span class="draftkey"><kbd>{i + 1}</kbd><span>to take</span></span>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
