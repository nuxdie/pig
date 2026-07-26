<script lang="ts">
  import { runState } from '../../lib/run.svelte';
</script>

<div class="record">
  <span>Best purse<b>{runState.record.best}</b></span>
  <span>Deepest rung<b>{runState.record.deepest}/7</b></span>
  <span>Runs<b>{runState.record.runs}</b></span>
  <span>Circuits cleared<b>{runState.record.circuits}</b></span>
</div>
