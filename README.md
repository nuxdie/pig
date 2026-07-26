# pig

Classic dice game where you roll to build points, bank your score, and race to 100 —
grown into a seven-opponent circuit with a card draft, a market, and a run you can lose.

Play it at **[nuxdie.github.io/pig](https://nuxdie.github.io/pig/)** — every push to
`main` builds and publishes there via `.github/workflows/pages.yml`.

## Running it

```sh
npm install
npm run dev      # dev server with HMR
npm run build    # production bundle into dist/
npm run preview  # serve the built bundle
npm run check    # svelte-check + TypeScript
```

## Layout

Vite + Svelte 5 (runes) + TypeScript. The split follows the seams the game
already had:

```
src/
  main.ts              bootstrap: load the run, mount, open the first screen
  lib/                 the game itself — no DOM
    types.ts           card/die/player/run vocabulary; ids are closed unions
    dice.ts            the nine dice and their faces
    cards.ts           the deck
    icons.ts           per-card SVG glyphs
    circuit.ts         seven opponents, the market, the milestones
    rules.ts           pure rules: draft legality, bank value, charge legality
    ai.ts              the machine: roll EV, draft valuation, turn policy
    storage.ts         localStorage where allowed, memory where not
    run.svelte.ts      the run and the record book (reactive)
    game.svelte.ts     the turn flow, on reactive state
    motion.ts          reduced-motion flag and animation-restart helpers
  audio/
    engine.ts          context, reverb, delay, tone/bell/knock primitives
    sfx.ts             one signature per card, built from the playing chord
    music.ts           the generative score and each foe's leitmotif
  dice/                the tray — WebGL and rigid-body physics
    solver.ts          Rapier world, the throw, trajectory recording
    scene.ts           renderer, camera, lights, shadow-catching floor
    dieMesh.ts         rounded body + real pip geometry
    materials.ts       one PBR surface per die (brass is actual metal)
    faces.ts           slot ↔ normal ↔ orientation
    dice3d.ts          the Tray: mount, throw, drag-to-inspect
  ui/                  Svelte components
    App.svelte         masthead + board
    Column.svelte      one player's ledger, meter, loadout, stamp
    Bay.svelte         tray, controls, charges, flares, verdict, keyboard
    Draft.svelte       the three cards on offer
    Curtain.svelte     every screen that is not the board
    screens/           intro, circuit, market, spoils, walked, ruin
  styles/              the original stylesheet, split by concern
```

### Three deliberate choices

**The dice are the random number generator.** A roll is one rigid-body
simulation, and whichever face comes up *is* what was rolled — nothing picks a
number and then animates towards it. The one exception is Transmute, which has
to turn 1s into a particular face; those dice are pinned by re-throwing until
the simulation agrees, and only the dice that actually rolled a 1 are pinned.

That makes fairness measurable, and it is worth knowing the result: these dice
are close to uniform but not exactly uniform — a residual bias of roughly one
to two per cent on a face, well short of what a player would notice but short
of `Math.random` too. `solver.ts` documents the measurements, what makes it
worse, and what an exact fix would cost. Re-run that check before touching the
throw, the tray, or the solver settings.

**The dice are not a component.** `dice/` owns its own canvas, scene graph and
animation loop. Svelte hands it an element and otherwise stays out of the way;
`Tray.svelte` is twenty lines. It is also loaded with `import()`, so three.js
and the physics wasm arrive as a separate chunk while the player is reading the
intro — and the game is fully playable before they land.

**The stylesheets are global, not scoped.** Card faces and icons are injected
with `{@html}`, and Svelte's style scoping would silently drop any rule that
matches them. The CSS is split by concern into `styles/` and imported from
`main.ts` in cascade order.

## Playing

Space rolls, `B` banks, `1`/`2`/`3` take a card at a draft, `M` mutes.
Charges have their own keys, printed on their buttons.
