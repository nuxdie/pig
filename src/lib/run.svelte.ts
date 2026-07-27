import { CIRCUIT, SATCHEL_MAX } from './circuit';
import { isCardId } from './cards';
import { freshSeed, restoreTable, seedTable, tablePosition } from './rng';
import { KEY_REC, KEY_RUN, STORE } from './storage';
import type { CardId, RecordBook, Run } from './types';

/* The run and the record book outlive any single match, so they live here
   rather than in the game state. Both are reactive: the circuit screen, the
   masthead and the run bar all read them directly. */

interface RunState {
  run: Run | null;
  record: RecordBook;
}

export const runState: RunState = $state({
  run: null,
  record: { best: 0, deepest: 0, runs: 0, walks: 0, circuits: 0 }
});

/** The active run. Only call where a run is known to exist — the board and
 *  every curtain screen are mounted behind that guarantee. */
export function RUN(): Run {
  if (!runState.run) throw new Error('no active run');
  return runState.run;
}

export function hasRun(): boolean {
  return !!runState.run;
}

/**
 * The stream's position rides along with the run, so it is written down
 * wherever the run is. Note what this buys and what it costs: a match is only
 * ever saved *before* it starts, so reloading mid-match re-deals it from the
 * same page of the stream rather than a fresh one. The same cards come back.
 * That is deliberate — it takes reload-scumming off the table.
 */
export function saveRun(): void {
  if (!runState.run) return;
  runState.run.draws = tablePosition().draws;
  STORE.set(KEY_RUN, JSON.stringify(runState.run));
}

export function saveRecord(): void {
  STORE.set(KEY_REC, JSON.stringify(runState.record));
}

export function newRun(): void {
  const seed = freshSeed();
  seedTable(seed);
  runState.run = {
    rung: 0, purse: 0, souvenirs: [], hired: [], head: 0, active: true,
    seed, draws: 0
  };
  runState.record.runs++;
  saveRun();
  saveRecord();
}

export function closeRun(): void {
  if (runState.run) runState.run.active = false;
  STORE.del(KEY_RUN);
}

export function clearHires(): void {
  const r = RUN();
  r.hired = [];
  r.head = 0;
}

const RECORD_KEYS = ['best', 'deepest', 'runs', 'walks', 'circuits'] as const;

export function loadSaved(): void {
  try {
    const r = JSON.parse(STORE.get(KEY_REC) || 'null');
    if (r && typeof r === 'object') {
      RECORD_KEYS.forEach((k) => {
        if (typeof r[k] === 'number') runState.record[k] = r[k];
      });
    }
  } catch { /* a corrupt record book is not worth a crash */ }

  try {
    const run = JSON.parse(STORE.get(KEY_RUN) || 'null');
    if (run && run.active && typeof run.rung === 'number' &&
        run.rung >= 0 && run.rung < CIRCUIT.length &&
        Array.isArray(run.souvenirs)) {
      run.souvenirs = (run.souvenirs as string[])
        .filter((id): id is CardId => isCardId(id))
        .slice(0, SATCHEL_MAX);
      run.purse = Number(run.purse) || 0;
      run.hired = (Array.isArray(run.hired) ? run.hired as string[] : [])
        .filter((id): id is CardId => isCardId(id));
      run.head = Number(run.head) || 0;
      run.spent = !!run.spent;
      // A run saved before the table was seeded gets a seed now. It loses
      // nothing it ever had; it simply becomes replayable from here on.
      run.seed = Number.isFinite(run.seed) ? (run.seed | 0) : freshSeed();
      run.draws = Number(run.draws) || 0;
      restoreTable(run.seed, run.draws);
      runState.run = run as Run;
    }
  } catch { runState.run = null; }
}
