<script lang="ts">
  import { play } from '../../audio/sfx';
  import { card } from '../../lib/cards';
  import { CIRCUIT, SATCHEL_MAX } from '../../lib/circuit';
  import { playOn, showScreen, spoilsOffer, walkAway } from '../../lib/game.svelte';
  import { RUN } from '../../lib/run.svelte';
  import CardFace from '../CardFace.svelte';
  import Mini from '../Mini.svelte';

  /* Two taps is the whole screen: pick a card, play on. Everything here is
     laid out for that, and anything that is not part of it has been made
     small or made conditional.

     The satchel used to sit here as a second wall of full-size cards on every
     single rung, which put the button you actually came for below the fold.
     It is a row of minis now, and only opens back up into cards on the one
     occasion it is a decision — a full satchel, with something chosen, where
     taking costs you a trade. */

  const run = $derived(RUN());
  const opp = $derived(CIRCUIT[run.rung]);
  const last = $derived(run.rung === CIRCUIT.length - 1);

  /* The offer is fixed the moment the screen opens — it must not reshuffle
     as the satchel is edited underneath it. */
  const offer = spoilsOffer();

  let chosen = $state<number | null>(null);
  let dropping = $state<number | null>(null);
  let skip = $state(false);

  const full = $derived(run.souvenirs.length >= SATCHEL_MAX);
  const trading = $derived(full && !skip && chosen !== null);

  const ready = $derived.by(() => {
    if (!offer.length) return true;                        // nothing to take
    if (skip) return true;                                 // said so out loud
    if (chosen === null) return false;
    if (full && dropping === null) return false;
    return true;
  });

  const taking = $derived(chosen === null ? null : card(offer[chosen])!);
  const leaving = $derived(dropping === null ? null : card(run.souvenirs[dropping])!);

  /* Only ever shown while something is still owed. Once the screen is ready
     the buttons say the rest themselves. */
  const owed = $derived(
    chosen === null
      ? 'Choose a card to keep, or say you want none.'
      : `Now pick what ${taking!.name} replaces.`
  );

  function commit() {
    if (skip || chosen === null) return;
    const id = offer[chosen];
    if (run.souvenirs.length >= SATCHEL_MAX && dropping !== null) run.souvenirs.splice(dropping, 1);
    if (run.souvenirs.length < SATCHEL_MAX) run.souvenirs.push(id);
  }

  function take(i: number) {
    chosen = chosen === i ? null : i;
    if (chosen === null) dropping = null;
    skip = false;
    play('take');
  }

  function drop(i: number) {
    if (!trading) return;
    dropping = dropping === i ? null : i;
    play('pass');
  }

  function onWalk() {
    commit();
    const { banked, cleared } = walkAway(last);
    showScreen({ kind: 'walked', banked, cleared });
  }

  function onPlayOn() {
    commit();
    playOn();
  }
</script>

<p class="cur__eyebrow">Rung {run.rung + 1} of {CIRCUIT.length} cleared</p>
<h1 class="cur__title win">{last ? 'The Devil pays' : 'You take it'}</h1>

<p class="cur__lede">
  {opp.name} is beaten. <b class="good">+{opp.purse}</b> to the purse —
  <b class="good">{run.purse}</b> in hand.
</p>

{#if offer.length && !trading}
  <div class="cur__block">
    <div class="cur__bar">
      <p class="cur__head">Keep one from the match</p>
      <button
        class="linkbtn"
        onclick={() => { skip = !skip; if (skip) { chosen = null; dropping = null; } }}
      >{skip ? 'let me choose' : 'or keep nothing'}</button>
    </div>

    <div class="satchel satchel--cards">
      {#each offer as id, i (id)}
        <button
          class="cardbtn cardbtn--{card(id)!.cls} cardbtn--{card(id)!.tier} cardbtn--pick"
          class:is-chosen={chosen === i}
          class:is-dim={(chosen !== null && chosen !== i) || skip}
          onclick={() => take(i)}
        >
          <CardFace c={card(id)!} />
        </button>
      {/each}
    </div>
  </div>
{/if}

{#if trading}
  <div class="cur__block">
    <div class="cur__bar">
      <p class="cur__head">Leave one behind</p>
      <button class="linkbtn" onclick={() => { chosen = null; dropping = null; }}>
        keep something else
      </button>
    </div>

    <p class="swap">
      <b>{taking!.name}</b>
      <span class="swap__arrow" aria-label="in exchange for">⇄</span>
      {#if leaving}<b>{leaving.name}</b>{:else}<em>pick one to leave behind</em>{/if}
    </p>

    <div class="satchel satchel--cards is-picking">
      {#each run.souvenirs as id, i (i)}
        <button
          class="cardbtn cardbtn--{card(id)!.cls} cardbtn--{card(id)!.tier} cardbtn--pick"
          class:is-drop={dropping === i}
          onclick={() => drop(i)}
        >
          <CardFace c={card(id)!} />
        </button>
      {/each}
    </div>
  </div>
{:else if run.souvenirs.length}
  <div class="cur__block">
    <div class="cur__bar">
      <p class="cur__head">Carrying</p>
      <span class="cur__count">
        {run.souvenirs.length}/{SATCHEL_MAX}{#if full}, full{/if}
      </span>
    </div>
    <div class="satchel">
      {#each run.souvenirs as id, i (i)}<Mini c={card(id)!} withTier />{/each}
    </div>
  </div>
{/if}

<div class="cur__foot">
  <div class="cur__row">
    {#if last}
      <button class="btn cur__go" disabled={!ready} onclick={onWalk}>Walk away with {run.purse}</button>
    {:else}
      <button class="btn cur__go" disabled={!ready} onclick={onPlayOn}>
        On to {CIRCUIT[run.rung + 1].name}
      </button>
      <button class="btn" disabled={!ready} onclick={onWalk}>Walk away with {run.purse}</button>
    {/if}
  </div>

  {#if ready}
    <p class="cur__why">
      {#if last}
        There is no one left to play. The purse is yours.
      {:else}
        Play on and lose, and the whole {run.purse} goes with it. Walk, and it is yours.
      {/if}
    </p>
  {:else}
    <p class="cur__prompt">{owed}</p>
  {/if}
</div>
