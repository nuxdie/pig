- multiplayer + global leaderboard: decided and staged in MULTIPLAYER.md.
  Stages 1 and 2 are done — the run is deterministic and the engine no
  longer knows it is playing a machine. Stage 3 (headless) is half done and
  carries a decision: the runes files need the Svelte compiler to run, so
  either the verifier compiles them or the turn flow moves to a plain .ts
  core. That shapes the verifier, so it wants deciding before stage 6.
  Still open before the Worker: identity, what a forfeit costs, and whether
  a versus match starts bare or brings the satchel.
