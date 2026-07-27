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
    instruments.ts     five voices: pad, bass, lead, arp, bell
    song.ts            seven written themes, one per opponent, in scale degrees
    music.ts           the tracker: steps the foe's song, mixes it against play
  dice/                the tray — WebGL and rigid-body physics
    solver.ts          Rapier world, the throw, trajectory recording
    scene.ts           renderer, camera fitted to the tray, lights, floor
    dieMesh.ts         the rounded body, and the atlas laid over its faces
    faceArt.ts         every face drawn from a height field: pips, wear, marks
    materials.ts       one PBR surface per die (brass is actual metal)
    faces.ts           slot ↔ normal ↔ orientation
    dice3d.ts          the Tray: mount, throw, drag-to-inspect
    preview.ts         the die turning over on its own card
  ui/                  Svelte components
    App.svelte         top bar + board
    Scoreline.svelte   one player's balance, meter, hand, stamp
    Bay.svelte         tray, the line, controls, verdict, keyboard
    Hand.svelte        your playable cards: reach for one to read it, press to play
    Feed.svelte        scoring events, passing by
    Dev.svelte         devmode: stages, cheats, every card, every die
    Draft.svelte       the three cards on offer, over everything else
    Curtain.svelte     every screen that is not the board
    Settings.svelte    paper, volumes and full screen, behind one word
    press.ts           the buttons a turn runs through, acting on the way down
    screens/           intro, circuit, market, spoils, walked, ruin
  styles/              the original stylesheet, split by concern
    tokens.css         both palettes; nothing else may name a colour
```

### Six deliberate choices

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

**The pips are holes, not geometry.** Every face of every die is drawn at
runtime into one texture atlas, and all of it starts as a *height field* —
white is the surface, black is the bottom of the cut. Blurred a little it
gives the normal map that shapes the wall of a pit; blurred a lot it gives the
occlusion that sits in the bottom of one. Paint reaches only the floor of the
cut, never the wall, which is the difference between a pip that reads as a
hole and a pip that reads as a sticker.

That the artwork is arbitrary is the point: a devil's face costs no more to
cut than a pip does. Each die carries a mark — a hallmark struck into the
brass 1, a crown, a gouge, a devil looking back at you — and the mark always
*replaces* a pip rather than adding one, so the face is still countable.
`faceArt.ts` holds every die's palette and wear in one table.

A dice card shows that same die turning over, and you can take hold of it
there too. There can be seven of those on screen at once, so they do not get
a WebGL context each: one renderer draws them all in turn into one small
buffer and each card blits its corner into a plain 2D canvas, at most three
a frame. Geometry and atlases are shared with the tray, so a die looks the
same on its card as it does on the table and is only built once.

**The dice are not a component.** `dice/` owns its own canvas, scene graph and
animation loop. Svelte hands it an element and otherwise stays out of the way;
`Tray.svelte` is twenty lines. It is also loaded with `import()`, so three.js
and the physics wasm arrive as a separate chunk while the player is reading the
intro — and the game is fully playable before they land.

**The middle is the game.** The board was three columns — your ledger, the
table, theirs — and two of them were history. Almost nobody reads a ledger,
and it was costing two thirds of the screen. What is left is what a turn
actually needs: two balances, two meters, the dice, the line, and the two
buttons. The ledger is a feed now, over the corner of the table, gone by the
time you next need the space. Nothing that reports a number reports it twice —
and, for the same reason, nothing that shows a card shows it twice: the
scoreline holds the dice and standing rules, which are only ever status, and
everything you can actually play is dealt to your hand at the near edge.

**The stylesheets are global, not scoped.** Card faces and icons are injected
with `{@html}`, and Svelte's style scoping would silently drop any rule that
matches them. The CSS is split by concern into `styles/` and imported from
`main.ts` in cascade order.

**Seven opponents, seven tunes.** The score is a tracker, not a generator:
`song.ts` holds written patterns and `music.ts` steps through them. Each foe
has a song of their own — their own mode, harmony and melody, not the same
tune transposed — from the publican's fidgety dorian to the devil's phrygian
dominant, slow and an octave down. What they share is the vocabulary: five
voices, a pad that is always there and never in the way, and a mix that is a
read-out of the table rather than a fade — the bass pulls back when the machine
has the pen, the arp comes up as the line grows, the bell only arrives when the
match is close.

**Two sheets, one vocabulary.** Every colour is a token in `tokens.css`, named
for the job it does rather than the colour it is — a surface, a rule, an
accent, the thing printed *on* an accent. The dark ledger is a second set of
values under `[data-theme="dark"]`, not a second stylesheet, and no other file
is allowed to write a literal colour. `index.html` stamps the chosen sheet on
`<html>` before the CSS loads, so the page never opens on the wrong one.

## Playing

Space rolls, `B` banks, `1`/`2`/`3` take a card at a draft, `M` mutes.
Charges are the cards in the hand at the bottom. Reaching for one holds it out
of the fan and prints what it does underneath; pressing the card already held
out plays it. With a mouse the reaching is the hover, so it stays one click and
you have read the card before you spend it; with a finger it is two taps, which
is the right number for a one-shot gold card. Each carries its own key, printed
on it, and the key plays it outright. The word in the top bar
between full screen and sound turns the paper light, dark, or over to the
system setting.

Backtick opens devmode — jump to any rung, hand yourself any card or die,
move either score, force a draft, look at every card and every die at once.
It only exists in a dev build or on a URL carrying `?dev`.
