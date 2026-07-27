<script lang="ts">
  import { play } from '../../audio/sfx';
  import { card } from '../../lib/cards';
  import { CIRCUIT, SATCHEL_MAX } from '../../lib/circuit';
  import { playOn, showScreen, spoilsOffer, walkAway } from '../../lib/game.svelte';
  import { RUN } from '../../lib/run.svelte';
  import CardFace from '../CardFace.svelte';

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
  /* A full satchel does not mean you cannot take anything — it means taking
     costs you something. Say that, in those words, and show the trade. */
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

  const prompt = $derived.by(() => {
    if (!offer.length) return 'Nothing new to keep from this one.';
    if (skip) return 'Leaving the table empty-handed.';
    if (chosen === null) {
      return full
        ? `Your satchel is full at ${SATCHEL_MAX}. Pick what you want anyway — you will trade for it.`
        : 'Choose a card to keep before you move on.';
    }
    if (full && dropping === null) return `Now pick what ${taking!.name} replaces.`;
    return `Keeping ${taking!.name}.`;
  });

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
  {opp.name} is beaten. <b class="good">+{opp.purse}</b> to the purse,
  which now stands at <b class="good">{run.purse}</b>.
  {last ? ' There is no one left to play.' : ' Lose the next and all of it goes.'}
</p>

{#if offer.length}
  <div class="cur__block">
    <p class="cur__head">Keep one from the match</p>

    <div class="satchel satchel--cards">
      {#each offer as id, i (id)}
        <button
          class="cardbtn cardbtn--{card(id)!.cls} cardbtn--{card(id)!.tier} cardbtn--pick"
          class:is-chosen={chosen === i}
          class:is-dim={chosen !== null && chosen !== i}
          onclick={() => take(i)}
        >
          <CardFace c={card(id)!} />
        </button>
      {/each}
    </div>

    <button class="linkbtn" onclick={() => { skip = !skip; if (skip) { chosen = null; dropping = null; } }}>
      {skip ? 'Actually, let me choose' : 'Keep nothing from this match'}
    </button>
  </div>
{/if}

<div class="cur__block">
  <p class="cur__head">
    Satchel — {run.souvenirs.length}/{SATCHEL_MAX}{#if full && !skip}, and full{/if}
  </p>

  {#if trading}
    <p class="swap">
      <b>{taking!.name}</b>
      <span class="swap__arrow" aria-label="in exchange for">⇄</span>
      {#if leaving}<b>{leaving.name}</b>{:else}<em>pick one to leave behind</em>{/if}
    </p>
  {/if}

  {#if run.souvenirs.length}
    <div class="satchel satchel--cards" class:is-picking={trading}>
      {#each run.souvenirs as id, i (i)}
        <button
          class="cardbtn cardbtn--{card(id)!.cls} cardbtn--{card(id)!.tier} cardbtn--pick"
          class:is-drop={dropping === i}
          disabled={!trading}
          onclick={() => drop(i)}
        >
          <CardFace c={card(id)!} />
        </button>
      {/each}
    </div>
  {:else}
    <p class="satchel__empty">nothing yet</p>
  {/if}
</div>

<p class="cur__prompt" class:is-ok={ready}>{prompt}</p>

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

<p class="cur__note">The run is saved after every rung, so you can close this and come back.</p>
