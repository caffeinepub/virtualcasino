# Cpm Vegas And Arcade

## Current State
Mini-Batch 1B Part 1 is live with Asteroids, Centipede, and Dig Dug. The GameType enum in backend.d.ts has entries up to `digDug`. GamePage.tsx renders each game with its own component and has a FEATURED_GAMES set. LobbyPage.tsx has an ARCADE_GAMES array.

## Requested Changes (Diff)

### Add
- `skeeBall` and `pinball` to the GameType enum in backend.d.ts
- SkeeBallGame component: photorealistic wooden skee-ball lane with ramp, ball rolling up, scoring rings with point values (10/20/30/40/100), ticket dispenser; earns points on win
- PinballGame component: photorealistic pinball machine with flippers (Z/X or tap), bumpers, ball physics, score display, drain detection; earns points on win
- Both games added to GAME_CONFIG in GamePage.tsx, FEATURED_GAMES set, and game render block
- Both games added to ARCADE_GAMES array in LobbyPage.tsx
- Points note in game UI (these games award points)

### Modify
- backend.d.ts: add `skeeBall = "skeeBall"` and `pinball = "pinball"` to GameType enum

### Remove
- Nothing

## Implementation Plan
1. Update backend.d.ts GameType enum with skeeBall and pinball
2. Create SkeeBallGame.tsx component with photorealistic lane, rolling ball mechanic, ring targets, ticket/points award
3. Create PinballGame.tsx component with photorealistic table, flipper controls, bumpers, scoring
4. Update GamePage.tsx: add to GAME_CONFIG, FEATURED_GAMES, and render conditionals
5. Update LobbyPage.tsx: add to ARCADE_GAMES array
