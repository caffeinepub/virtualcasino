# Cpm Vegas And Arcade

## Current State
All 25 games use a single playGame backend function that randomly determines win/lose. GamePage shows a simple bet input and play button with no actual game mechanics.

## Requested Changes (Diff)

### Add
- recordGameOutcome(gameType, bet, won, winAmount) backend function: accepts frontend-determined result, updates balance/points/history
- BlackjackGame component: full IRL rules (hit/stand/double/split), dealer AI stands on 17, proper hand evaluation
- RouletteGame component: 0-36 number grid, inside/outside bets, wheel animation, proper payouts (35:1 single, 1:1 red/black)
- SlotsGame component: 3-reel machine, symbol matching, animated reels, payout table
- VideoPokerGame component: 5-card draw, hold/discard, hand rankings, proper payout table

### Modify
- GamePage.tsx: route blackjack/roulette/slots/videoPoker to dedicated game components

### Remove
- Nothing

## Implementation Plan
1. Add recordGameOutcome to backend
2. Build BlackjackGame, RouletteGame, SlotsGame, VideoPokerGame components
3. Update GamePage to render correct component per game type
