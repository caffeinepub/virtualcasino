# Cpm Vegas And Arcade

## Current State
Full-stack casino/arcade gaming platform with 25 games, user accounts, virtual credits, daily bonuses, leaderboard, and a basic staff panel (add credits, assign roles). The nav has a Staff Panel link visible only to staff.

## Requested Changes (Diff)

### Add
- Backend: `GameSettings` type with minBet, maxBet, and winMultiplier per game
- Backend: `setGameSettings(gameType, settings)` - admin only, stores settings per game
- Backend: `getGameSettings(gameType)` - public query returning settings for a game
- Backend: `getAllGameSettings()` - returns all game settings as array
- Backend: `UserSummary` type with principal, name, balance, role, joinDate, totalGamesPlayed, totalCreditsWon
- Backend: `getAllUsers()` - admin only, returns array of UserSummary for every registered user
- Frontend: Staff button in top nav (both Layout.tsx and PublicLayout.tsx) visible only to staff, styled as neon arcade button
- Frontend: "Game Controls" tab in StaffPage - table/list of all 25 games with editable minBet, maxBet, winMultiplier fields and save per row
- Frontend: "User Directory" tab in StaffPage - full table of all users with all data columns

### Modify
- StaffPage: Add tab navigation ("Overview", "Game Controls", "User Directory")
- Backend: `playGame` should apply winMultiplier when calculating balance change on win
- Backend: track joinDate (first time initializeBalance is called) and store per user

### Remove
- Nothing removed

## Implementation Plan
1. Generate updated Motoko backend with GameSettings, getAllUsers, setGameSettings, getGameSettings, getAllGameSettings, joinDate tracking, winMultiplier applied in playGame
2. Update frontend hooks for new backend functions
3. Update Layout.tsx and PublicLayout.tsx to show Staff button in top nav for staff users
4. Rebuild StaffPage with tabs: existing controls + Game Controls + User Directory
