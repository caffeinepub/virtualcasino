# Cpm Vegas And Arcade

## Current State
Step 1 casino games are live: Blackjack, Roulette, Slots, Video Poker all have dedicated game components with full IRL mechanics and use `useRecordGameOutcome` hook. All other 13 casino games fall through to a generic bet-and-play panel in GamePage.tsx. The cardUtils.ts file provides card utilities (createDeck, shuffleDeck, handValue, evaluatePokerHand, etc).

## Requested Changes (Diff)

### Add
13 new dedicated game components with full IRL mechanics.

### Modify
GamePage.tsx: Import and wire all 13 new components so all casino games render dedicated components instead of the generic panel.

### Remove
Nothing.

## Implementation Plan
Create 13 new game component files, then update GamePage.tsx to render them.
