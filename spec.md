# VirtualCasino

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- User registration and login with role-based access (player, staff, admin)
- Virtual currency system: 10 credits on sign-up, 5 free credits claimable once per day
- Staff panel: staff and admins can add credits to any user account
- Casino games: Slots, Blackjack, Roulette, Video Poker, Dice, Baccarat
- Game history per user (each round: game, result, amount won/lost, timestamp)
- Daily winners leaderboard: players who won credits that day, shown in randomized order, resets daily

### Modify
N/A

### Remove
N/A

## Implementation Plan
1. Use authorization component for user accounts and roles (player, staff, admin)
2. Backend actor manages:
   - User balances and credit operations
   - Daily bonus claim tracking (once per day per user)
   - Staff credit-add function (staff/admin only)
   - Game logic for all 6 games (Slots, Blackjack, Roulette, Video Poker, Dice, Baccarat)
   - Game history records per user
   - Daily winners list (users who had a net win that day), randomized on retrieval
3. Frontend pages:
   - Landing / login / register
   - Lobby (game selection, balance display, daily bonus button)
   - Each game page with betting UI
   - Game history page
   - Leaderboard page (today's winners)
   - Staff panel (search users, add credits)
