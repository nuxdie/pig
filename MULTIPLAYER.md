# Multiplayer, and a leaderboard worth believing

Two humans at the same table, and a global board that ranks both the circuit
run and the head-to-head. The decisions are made; this is what follows from
them.

**The trade.** The original ask was "no server." What is being built instead is
a Cloudflare Worker — code you deploy, not a box you keep alive. No VPS, no
uptime, no patching, and it scales to nothing when nobody is playing. What it
buys is the only thing a static client cannot: a leaderboard whose numbers mean
something, because the server can check them.

## What the shape of the game already gives us

Three properties of the existing code do most of the work, and they are worth
stating plainly because every decision below leans on them.

**Only one player can act at a time.** Every action — [doRoll](src/lib/game.svelte.ts#L748),
[doBank](src/lib/game.svelte.ts#L759), [useCharge](src/lib/game.svelte.ts#L662),
[chooseDraft](src/lib/game.svelte.ts#L364) — refuses unless it is your turn, and
even the cards that hit the other side (Ward, Levy) are played on your own turn.
There is no concurrent input anywhere in the game. That means a **command relay**,
not rollback netcode: no prediction, no reconciliation, no rewind. The four verbs
above are the entire wire protocol.

**`Side` is perspective-relative.** `'you' | 'them'` is not a seat, it is a point
of view. Each client renders itself as `you`, and the swap happens once, at the
network boundary. The engine, every component in `ui/`, the audio mixer that reads
the table — none of it knows the difference between a machine opponent and a
person in another country.

**A match is a pure function of a seed and a command log.** It was already nearly
true — the throw takes a seed ([solver.ts](src/dice/solver.ts#L235)) — and it is
now true outright: `lib/rng.ts` puts the draft shuffle, the kit draw, the market
stock, the machine's tie-break jitter and every throw seed on one stream. This is
the property the whole leaderboard rests on.

## The pieces

```
browser                        Cloudflare
─────────                      ──────────
lib/game.svelte.ts   ──cmd──▶  Durable Object (one per match)
lib/net.ts           ◀─cmd──   authoritative turn + seed
  ('them' driver)                    │
                                     ▼ on finish
                               Queue ──▶ verifier Worker
                                            │ re-runs lib/ headless
                                            ▼
                                          D1 (two boards)
```

One Durable Object per match holds the seed, whose turn it is, and the command
log. It is authoritative for exactly two things — the run seed and turn order —
which is all the authority needed, because everything else follows from them.

## Why the client cannot choose its dice

This is the part that makes verification cheap, and it fell out of the seeding
work rather than being designed in.

The server issues the run seed. Every table draw follows from it, and every
throw seed is one of those draws. So the entire sequence of dice for the whole
run is fixed the moment the run opens, before the player has done anything. A
client cannot *pick* a roll. It can only **lie about** one — and a lie is caught
by re-running the throw.

That reframes verification. The verifier does not have to re-simulate an entire
run's physics to be safe; a cheater has to get *every* throw consistent, so
re-simulating a random handful catches them with high probability at a fraction
of the cost. Spot-check three throws and a run that faked a single roll survives
with probability `(1 − 3/n)`. Fake enough rolls to matter and it is hopeless.

This matters because **Cloudflare's free-tier CPU budget will not absorb a full
physics replay.** A throw is up to 280 solver steps and may retry up to 40 times
for a cocked die. Verifying every roll of a long run is seconds of CPU. The
rules — scores, drafts, card effects, milestones — are pure arithmetic and cost
nothing, so:

- **Re-run the rules for the whole run.** Cheap, total, catches every invented
  score, illegal card, and impossible bank.
- **Re-simulate a sample of throws.** Expensive, partial, catches invented dice.

## Two wrinkles that are not obvious

**The re-throw is coupled to the render.** `throwDice` builds its `resting` map
from where the dice physically lie ([dice3d.ts](src/dice/dice3d.ts#L143)) so a
re-thrown die can knock against them. For a normal throw every die is in the air,
`resting` is empty, and the throw is a pure function of `(count, from, seed)` —
trivially reproducible headless. Only **Warm Hand**, which re-throws a single 1,
populates it. The verifier therefore has to mirror `captureRest()` to check a
Warm Hand re-throw, or skip sampling those throws. Skipping is fine: they are a
small minority and still bound by the rules pass.

**Both clients must run identical code.** The card tables are part of the rules,
so a stale tab desyncs. Every push to `main` redeploys Pages, and a player who
opened the game an hour ago is on old code. The handshake carries a build hash
and the Durable Object refuses a mismatch, with a "reload to play" rather than a
silent divergence.

## The ordering contract

`rng.ts` is a positional stream: the *order* of draws is part of the rules. Two
clients that call `rnd()` in a different order are playing different games. This
is not fragile in practice — both sides run the same code on the same state — but
it does mean **a new draw inserted mid-turn changes every draft after it and
invalidates every replay recorded before the change.** Leaderboard rows carry a
rules version for exactly this reason, and a bump retires the old board rather
than pretending the scores are comparable.

Devmode deliberately stays on `Math.random` — a cheat that consumed table draws
would shift the deal downstream, and devmode runs are not submissible anyway.

## Staging

**1 — Determinism.** `lib/rng.ts`; the draft, kit, market, AI jitter and throw
seeds all off one stream; seed and draw count persisted with the run so a reload
lands back on the same deal. *Done, and verified: same seed reproduces exactly,
different seed diverges, restore-by-fast-forward lands on the page it left.*

**2 — Prise the engine off the circuit.** *Done.* `beginMatch(setup)` seats two
`SideSetup`s and knows nothing about where either came from; `startMatch()` builds
one from the run and `startVersusMatch()` from a lobby and a seed. The satchel and
both names are per-side state now, so Counting House scores correctly for whoever
is sitting there and the bay calls people what they are called. The
`machineOpen`/`machineStep` hand-off became a `Driver` — `MACHINE` plays the
circuit, `REMOTE` is all no-ops because the person on the far end drives their own
turn. `Bay` and `App` no longer reach for `RUN()` to find out who they are playing.

*Verified:* across all seven rungs × three loadouts × four seeds, the new seating
deals a byte-identical loadout and leaves the stream on the same draw as the old
code. Seating order (`you` then `them`) is load-bearing and commented as such — a
foe's kit draws off the table stream.

**3 — Headless run.** Half done. The pure modules — `rng`, `rules`, `cards`,
`dice`, `circuit` — already run under bare Node with nothing but a resolver hook
for extensionless imports, which is how stage 2 was checked. What is left is the
runes: `game.svelte.ts` and `run.svelte.ts` need the Svelte compiler to execute,
so the verifier either compiles them or the turn flow moves to a plain `.ts` core
with the reactive wrapper on top. **Decide this before stage 6** — the verifier has
to run this code, so the shape of it is the shape of the verifier.

Then prove a seed plus a command log reproduces a match exactly. This is the
load-bearing test for the entire leaderboard, and it is worth writing before any
network code.

**4 — The Worker.** Durable Object per match, join codes, command relay, the build
hash handshake, D1 schema for the two boards.

**5 — Disconnects.** The genuinely fiddly part, and where the schedule actually
goes. Reconnect inside a grace window and replay the log; past it, forfeit. Decide
what a forfeit does to a ladder rating before writing any of it.

**6 — Verification.** Rules replay for the whole run, sampled physics for the
dice, then the boards go live.

**7 — Surface.** Lobby screen, two leaderboard screens. `screens/` and the
`Curtain` already hold everything of this shape.

## Open, and worth deciding before stage 4

- **Identity.** A ladder needs stable players. Anonymous device id is the cheapest
  thing that works and is lost on a cache clear; anything better means accounts.
- **Forfeit.** Does a rage-quit count as a loss? It has to, or the ladder is
  farmable — but a real disconnect is indistinguishable from a rage-quit.
- **Versus loadouts.** Does a PvP match start bare and draft from scratch, or do
  you bring your run's satchel? Bare is fairer and far less work; brought is the
  more interesting game and needs matchmaking to care about loadout strength.
