<script lang="ts">
  import { applyMus, applySfx, auditionSfx, mixer } from './mixer.svelte';
</script>

<div class="mixer">
  <div class="mixer__row">
    <label for="volSfx">Sound</label>
    <input type="range" id="volSfx" min="0" max="100"
           bind:value={mixer.sfx} oninput={applySfx} onchange={auditionSfx}>
  </div>
  <div class="mixer__row">
    <label for="volMus">Music</label>
    <input type="range" id="volMus" min="0" max="100"
           bind:value={mixer.mus} oninput={applyMus}>
  </div>
  <div class="mixer__hint">M mutes</div>
</div>
