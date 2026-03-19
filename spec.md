# Cpm Vegas And Arcade

## Current State
All 5 classic arcade games exist as functional React components:
- **SnakeGame.tsx** -- canvas-based snake on a dark grid, basic green/red colors, D-pad controls
- **SpaceShooterGame.tsx** -- canvas-based space shooter, basic visuals
- **BreakoutGame.tsx** -- canvas-based breakout/brick breaker, basic visuals
- **PacManGame.tsx** -- canvas-based Pac-Man style, basic visuals
- **WhackAMoleGame.tsx** -- emoji-based 3x3 grid with 🐭 emojis, no arcade cabinet feel

All games have proper betting flow and game mechanics but lack photorealistic arcade machine aesthetics.

## Requested Changes (Diff)

### Add
- Photorealistic arcade cabinet frame/wrapper for each game (marquee header with game name in neon, cabinet side panels, coin slot decoration, speaker grills, joystick/button panel below screen)
- Authentic visual environments per game:
  - **Snake**: Retro green-on-black phosphor CRT monitor look, scanline overlay, CRT glow effect, snake rendered as chunky neon segments with glow
  - **Space Shooter**: Dark starfield with parallax star layers, player ship as a neon fighter craft SVG, aliens as retro pixel-art style invaders, laser beams with glow
  - **Breakout**: Colorful brick rows (rainbow gradient colors), metallic paddle, glowing ball with trail effect, retro score panel
  - **Pac-Man style**: Dark maze with blue walls and neon dot trails, Pac-Man as a yellow circle with animated mouth, ghosts with distinct colors and eyes
  - **Whack-a-Mole**: Wooden carnival game board texture, dirt hole circles, moles as cartoon animal heads popping up with spring animation, mallet cursor or tap feedback

### Modify
- Each game component: wrap the canvas/game area in an arcade cabinet SVG/CSS frame with neon marquee, dark cabinet body, screen bezel
- Replace emoji-based moles in WhackAMole with CSS/SVG cartoon mole heads
- Enhance canvas rendering for Snake, SpaceShooter, Breakout, PacMan with richer visuals (gradients, glow effects, textures)
- Keep all game logic, betting flow, scoring, and backend calls exactly as-is

### Remove
- Plain dark rounded box wrapper (replace with arcade cabinet aesthetic)
- Emoji 🐭 in WhackAMole holes

## Implementation Plan
1. Create a reusable `ArcadeCabinet` wrapper component with neon marquee, cabinet panels, screen bezel, and coin slot
2. Upgrade SnakeGame: CRT phosphor look with scanlines, chunky glowing snake segments, apple-shaped food
3. Upgrade SpaceShooterGame: parallax starfield, SVG ship and aliens, laser glow effects
4. Upgrade BreakoutGame: rainbow colored bricks, metallic paddle, ball with glow trail
5. Upgrade PacManGame: blue maze walls, proper dot rendering, animated Pac-Man mouth, colored ghosts
6. Upgrade WhackAMoleGame: wooden board texture, dirt holes, CSS mole heads with pop-up animation
7. Wrap all 5 games in the ArcadeCabinet component
