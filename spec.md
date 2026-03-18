# Cpm Vegas And Arcade

## Current State
Full-stack casino + arcade app with 25 games, user accounts, daily credits, game history, leaderboard, and staff panel. Current theme is a dark casino/purple/gold aesthetic with Bricolage Grotesque + Figtree fonts. Site name in header shows "ONYX CASINO".

## Requested Changes (Diff)

### Add
- Neon Vegas + modern arcade visual identity throughout
- Scanline/glow effects, neon text glows on headings
- Bright neon color palette: hot pink, electric purple, cyan, gold, on deep dark backgrounds
- Animated ticker / marquee on home page showing daily winners cycling through
- "Most Popular Today" games section (random daily selection, shown prominently)
- Daily winners section on home page with random order and refresh each visit
- Pixel-style or bold block font for headings to reinforce arcade feel
- Neon border glow effects on game cards, buttons, nav
- Retro scoreboard / leaderboard style with neon colors

### Modify
- Site name: "VIRTUAL CASINO" -> "CPM VEGAS AND ARCADE" everywhere (header logo, hero, page titles, footer)
- index.css: full color token redesign -- neon pink primary, electric purple/cyan accents, deep dark black backgrounds
- Layout.tsx: header restyled with neon glows, logo updated, nav links with neon hover effects
- LobbyPage.tsx: hero banner updated to neon arcade Vegas style, "Featured Today" -> "Most Popular Today" with more visual punch, daily winners shown as animated ticker/cards
- LeaderboardPage.tsx: scoreboard style with neon rank badges
- GamePage, HistoryPage, AuthPage, StaffPage: apply neon arcade theming consistently

### Remove
- Purple/muted existing color palette replaced entirely
- "ONYX CASINO" branding removed

## Implementation Plan
1. Redesign index.css with neon Vegas/arcade OKLCH color tokens (hot pink, electric purple, cyan, deep black)
2. Update Layout.tsx with new branding "CPM VEGAS AND ARCADE" and neon-styled header/footer
3. Redesign LobbyPage.tsx: arcade hero banner, "Most Popular Today" section, animated daily winners ticker
4. Redesign LeaderboardPage.tsx: arcade scoreboard style
5. Update AuthPage, GamePage, HistoryPage, StaffPage to match new theme
6. Add CSS animations: neon pulse glow, scanline overlay, marquee ticker
