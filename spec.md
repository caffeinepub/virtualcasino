# VirtualCasino

## Current State
The app has 6 games (slots, blackjack, roulette, videoPoker, dice, baccarat) all on one page in the lobby. Backend GameType enum has 6 variants. Frontend LobbyPage shows all games in a flat grid.

## Requested Changes (Diff)

### Add
- 11 new casino games: keno, scratchCards, craps, paiGowPoker, sicBo, war, caribbeanStud, letItRide, threeCardPoker, casinoHoldem, wheelOfFortune
- 8 new arcade games: coinPusher, plinko, crashGame, mines, limbo, hiLo, penaltyShootout, ballDrop
- Game categories: "Casino Games" and "Arcade Games" tabs or sections in the lobby
- Daily featured/popular games section on the home screen (random selection per day, highlight 4-6 games)

### Modify
- Backend GameType enum: add all 19 new game type variants
- Frontend LobbyPage: add category tabs (Casino / Arcade), add featured games section with daily rotation
- Frontend GamePage GAME_INFO: add entries for all new game types

### Remove
- Nothing removed

## Implementation Plan
1. Regenerate Motoko backend with expanded GameType (25 total game types)
2. Update LobbyPage with: featured daily games section, category tabs (All / Casino / Arcade), full games grid
3. Update GamePage GAME_INFO with descriptions for all new games
4. Validate and deploy
