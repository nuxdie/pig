# pig

Classic dice game where you roll to build points, bank your score, and race to 100 —
grown into a seven-opponent circuit with a card draft, a market, and a run you can lose.

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
  dice/
    dice3d.ts          the tray — hand-written DOM, deliberately not a component
  ui/                  Svelte components
    App.svelte         masthead + board
    Column.svelte      one player's ledger, meter, loadout, stamp
    Bay.svelte         tray, controls, charges, flares, verdict, keyboard
    Draft.svelte       the three cards on offer
    Curtain.svelte     every screen that is not the board
    screens/           intro, circuit, market, spoils, walked, ruin
  styles/              the original stylesheet, split by concern
```

### Two deliberate choices

**The dice are not a component.** `dice/dice3d.ts` builds real 3D cubes and
writes transforms straight onto the nodes, leaning on forced reflow to restart
landing animations. A render pass on top of that fights it, so that subtree
opts out of Svelte and owns itself. `Tray.svelte` only hands over the element.

**The stylesheets are global, not scoped.** Card faces and icons are injected
with `{@html}`, and Svelte's style scoping would silently drop any rule that
matches them. The CSS is split by concern into `styles/` and imported from
`main.ts` in cascade order.

## Playing

Space rolls, `B` banks, `1`/`2`/`3` take a card at a draft, `M` mutes.
Charges have their own keys, printed on their buttons.
