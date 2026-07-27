<script lang="ts">
  import { CIRCUIT } from '../lib/circuit';
  import {
    addPurse, addScore, ALL_CARDS, ALL_DICE, cashOut, dev, DEV_AVAILABLE, emptySatchel,
    endMatch, fillSatchel, forceDraft, freshRun, giveCard, giveDie, jumpToRung,
    MILESTONES, refillCharges, setLine, toBoard, toggleDev, type DevTab
  } from '../lib/dev.svelte';
  import { S, showScreen } from '../lib/game.svelte';
  import { RUN, runState } from '../lib/run.svelte';
  import type { DieId, Side } from '../lib/types';
  import CardFace from './CardFace.svelte';
  import DieBadge from './DieBadge.svelte';

  /* Backtick anywhere but a text field. Nothing else in the game uses it. */
  function onKey(e: KeyboardEvent) {
    if (e.key !== '`' && e.key !== '~') return;
    const t = e.target as HTMLElement | null;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    e.preventDefault();
    toggleDev();
  }

  const TABS: { id: DevTab; lab: string }[] = [
    { id: 'stage', lab: 'Stage' },
    { id: 'hand', lab: 'Hand' },
    { id: 'cards', lab: 'All cards' },
    { id: 'dice', lab: 'All dice' }
  ];

  const SIDES: Side[] = ['you', 'them'];
  let side = $state<Side>('you');
  let dieSlot = $state(0);

  const run = $derived(runState.run ? RUN() : null);
</script>

<svelte:window onkeydown={onKey} />

{#if DEV_AVAILABLE && dev.on}
  <div class="dev">
    <header class="dev__bar">
      <b class="dev__mark">DEV</b>
      {#each TABS as t (t.id)}
        <button class="dev__tab" class:is-on={dev.tab === t.id}
                onclick={() => (dev.tab = t.id)}>{t.lab}</button>
      {/each}
      <span class="dev__spacer"></span>
      <span class="dev__read">
        you {S.p.you.score} · them {S.p.them.score} · line {S.line}
        {#if run}· purse {run.purse} · rung {run.rung + 1}{/if}
      </span>
      <button class="dev__tab" onclick={toggleDev} title="backtick">close</button>
    </header>

    <div class="dev__body">
      {#if dev.tab === 'stage'}
        <div class="dev__group">
          <span class="dev__lab">Jump to rung</span>
          {#each CIRCUIT as o, i (o.name)}
            <button class="dev__btn" class:is-on={run?.rung === i}
                    onclick={() => jumpToRung(i)}>{i + 1} {o.name}</button>
          {/each}
        </div>

        <div class="dev__group">
          <span class="dev__lab">Screen</span>
          <button class="dev__btn" onclick={() => showScreen({ kind: 'intro', from: null })}>intro</button>
          <button class="dev__btn" onclick={() => showScreen({ kind: 'circuit' })}>circuit</button>
          <button class="dev__btn" onclick={() => showScreen({ kind: 'spoils' })}>spoils</button>
          <button class="dev__btn" onclick={() => showScreen({ kind: 'walked', banked: 99, cleared: false })}>walked</button>
          <button class="dev__btn" onclick={() => endMatch('them')}>lose → ruin</button>
          <button class="dev__btn" onclick={() => endMatch('you')}>win → spoils</button>
          <button class="dev__btn" onclick={toBoard}>board</button>
        </div>

        <div class="dev__group">
          <span class="dev__lab">Run</span>
          <button class="dev__btn" onclick={freshRun}>new run</button>
          <button class="dev__btn" onclick={cashOut}>walk away</button>
          <button class="dev__btn" onclick={() => addPurse(50)}>purse +50</button>
          <button class="dev__btn" onclick={() => addPurse(-9999)}>purse 0</button>
          <button class="dev__btn" onclick={fillSatchel}>fill satchel</button>
          <button class="dev__btn" onclick={emptySatchel}>empty satchel</button>
          <button class="dev__btn" onclick={() => { if (run) { run.spent = false; } }}>un-spend sacrifice</button>
        </div>
      {/if}

      {#if dev.tab === 'hand'}
        <div class="dev__group">
          <span class="dev__lab">Acting on</span>
          {#each SIDES as sd (sd)}
            <button class="dev__btn" class:is-on={side === sd}
                    onclick={() => (side = sd)}>{sd}</button>
          {/each}
        </div>

        <div class="dev__group">
          <span class="dev__lab">Score</span>
          {#each [1, 10, 25, 50] as n (n)}
            <button class="dev__btn" onclick={() => addScore(side, n)}>+{n}</button>
          {/each}
          <button class="dev__btn" onclick={() => addScore(side, -9999)}>0</button>
          <button class="dev__btn" onclick={() => addScore(side, 99 - S.p[side].score)}>99</button>
          <span class="dev__lab">Line</span>
          {#each [5, 20] as n (n)}
            <button class="dev__btn" onclick={() => setLine(S.line + n)}>+{n}</button>
          {/each}
          <button class="dev__btn" onclick={() => setLine(0)}>0</button>
          <button class="dev__btn" onclick={() => refillCharges(side)}>recharge</button>
        </div>

        <div class="dev__group">
          <span class="dev__lab">Force a draft</span>
          {#each MILESTONES as m (m)}
            <button class="dev__btn" onclick={() => forceDraft(side, m)}>{m}</button>
          {/each}
        </div>

        <div class="dev__group">
          <span class="dev__lab">Die into slot</span>
          {#each S.p[side].dice as _d, i (i)}
            <button class="dev__btn" class:is-on={dieSlot === i}
                    onclick={() => (dieSlot = i)}>{i}</button>
          {/each}
          {#each ALL_DICE as id (id)}
            <button class="dev__btn" onclick={() => giveDie(side, id as DieId, dieSlot)}>{id}</button>
          {/each}
        </div>

        <div class="dev__group dev__group--wrap">
          <span class="dev__lab">Grant card</span>
          {#each ALL_CARDS as c (c.id)}
            <button class="dev__btn dev__btn--{c.cls}" onclick={() => giveCard(side, c.id)}>{c.short}</button>
          {/each}
        </div>
      {/if}

      {#if dev.tab === 'cards'}
        <div class="dev__gallery">
          {#each ALL_CARDS as c (c.id)}
            <div class="cardbtn cardbtn--{c.cls} cardbtn--{c.tier} cardbtn--peek">
              <CardFace {c} />
            </div>
          {/each}
        </div>
      {/if}

      {#if dev.tab === 'dice'}
        <div class="dev__dice">
          {#each ALL_DICE as id (id)}
            <figure class="dev__die">
              <DieBadge id={id as DieId} cls="dev__dieart" />
              <figcaption>{id}</figcaption>
            </figure>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}
