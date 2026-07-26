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

  const ready = $derived.by(() => {
    if (!offer.length) return true;                        // nothing to take
    if (skip) return true;                                 // said so out loud
    if (chosen === null) return false;
    if (full && dropping === null) return false;
    return true;
  });

  const prompt = $derived.by(() => {
    if (!offer.length) return 'Nothing new to keep from this one.';
    if (skip) return 'Leaving the table empty-handed.';
    if (chosen === null) return 'Choose a card to keep before you move on.';
    if (full && dropping === null) return 'Satchel full — choose one to leave behind.';
    return 'Keeping ' + card(offer[chosen])!.name + '.';
  });

  function commit() {
    if (skip || chosen === null) return;
    const id = offer[chosen];
    if (run.souvenirs.length >= SATCHEL_MAX && dropping !== null) run.souvenirs.splice(dropping, 1);
    if (run.souvenirs.length < SATCHEL_MAX) run.souvenirs.push(id);
  }

  function take(i: number) {
    chosen = chosen === i ? null : i;
    skip = false;
    play('take');
  }

  function drop(i: number) {
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

<div class="cur__block">
  <p class="cur__head">Keep one — satchel {run.souvenirs.length}/{SATCHEL_MAX}</p>

  <div class="satchel {offer.length ? 'satchel--cards' : ''}">
    {#each offer as id, i (id)}
      <button
        class="cardbtn cardbtn--{card(id)!.cls} cardbtn--{card(id)!.tier} cardbtn--pick"
        class:is-chosen={chosen === i}
        disabled={full && dropping === null}
        onclick={() => take(i)}
      >
        <CardFace c={card(id)!} />
      </button>
    {:else}
      <p class="satchel__empty">nothing new to keep</p>
    {/each}
  </div>

  {#if full}
    <p class="cur__note">Satchel full. Tap one below to leave it behind.</p>
  {/if}

  <p class="cur__head">Carried</p>
  <div class="satchel {run.souvenirs.length ? 'satchel--cards' : ''}">
    {#each run.souvenirs as id, i (i)}
      <button
        class="cardbtn cardbtn--{card(id)!.cls} cardbtn--{card(id)!.tier} cardbtn--pick"
        class:is-drop={dropping === i}
        onclick={() => drop(i)}
      >
        <CardFace c={card(id)!} />
      </button>
    {:else}
      <p class="satchel__empty">nothing yet</p>
    {/each}
  </div>
</div>

<p class="cur__prompt" class:is-ok={ready}>{prompt}</p>

{#if offer.length}
  <button class="linkbtn" onclick={() => { skip = !skip; if (skip) chosen = null; }}>
    {skip ? 'Actually, let me choose' : 'Keep nothing from this match'}
  </button>
{/if}

<div class="cur__row">
  <button class="btn cur__go" disabled={!ready} onclick={onWalk}>Walk away with {run.purse}</button>
  {#if !last}
    <button class="btn btn--bank" disabled={!ready} onclick={onPlayOn}>
      On to {CIRCUIT[run.rung + 1].name}
    </button>
  {/if}
</div>

<p class="cur__note">The run is saved after every rung, so you can close this and come back.</p>
