<script lang="ts">
  import { enterCircuit, S, type Screen } from '../../lib/game.svelte';

  /* Undefined means nobody sent us here — this is the first screen of all,
     and the only way on is forward. Anything else, including null for the
     board itself, is somewhere to go back to. */
  let { from }: { from?: Screen | null } = $props();

  const returning = $derived(from !== undefined);

  function leave() {
    if (returning) S.screen = from ?? null;
    else enterCircuit();
  }
</script>

<p class="cur__eyebrow">A dice game about knowing when to stop</p>
<h1 class="cur__title">Pig</h1>

<ol class="intro__rules">
  <li><b>Roll</b> as often as you dare. Each roll adds to <b>the line</b>.</li>
  <li><b>Bank</b> and the line is yours for good.</li>
  <li>Roll a single <b class="bad">1</b> and the line is struck out — the turn passes.</li>
  <li>Roll <b class="bad">two 1s</b> and your whole balance is wiped to zero.</li>
  <li>First to <b>100</b> wins the match.</li>
</ol>

<div class="cur__block">
  <p class="cur__head">Cross a milestone, draft a card</p>
  <div class="intro__tiers">
    <span class="tierchip tierchip--tin"><b>12</b>Tin</span>
    <span class="tierchip tierchip--silver"><b>30</b>Silver</span>
    <span class="tierchip tierchip--gold"><b>55</b>Gold</span>
  </div>
  <p class="cur__note">Three on offer each time: a weighted die, a standing rule, or a charge you play once.
    Your opponent drafts too, and its hand stays face-up beside its ledger.</p>
</div>

<div class="cur__block">
  <p class="cur__head">The circuit</p>
  <p class="cur__lede">Seven opponents, each worse than the last. Win, and choose:
    <b>walk away</b> with the purse, or <b>play on</b> for more. Lose, and the purse goes with you.
    Keep one card from every match you win.</p>
</div>

<div class="cur__block">
  <p class="cur__head">Keys</p>
  <div class="intro__keys">
    <span><kbd>Space</kbd> roll</span><span><kbd>B</kbd> bank</span>
    <span><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> take a card</span><span><kbd>M</kbd> mute</span>
  </div>
</div>

<button class="btn cur__go" onclick={leave}>{returning ? 'Back' : 'To the circuit'}</button>
