# Cpm Vegas And Arcade

## Current State
- 25 games (17 casino, 8 arcade) with photo-realistic images and 3D flip card animations
- User accounts with credits balance, daily sign-up bonus, game history
- Leaderboard with today's winners, animated ticker
- Staff panel with: credit management, role assignment, per-game bet limits and win multipliers, full user directory
- Staff button in top nav visible to staff users
- Professional homescreen with distinct logged-in / logged-out views

## Requested Changes (Diff)

### Add
- **Points currency**: Separate from credits. Earned whenever a user wins a game (win amount = points earned). Displayed in nav bar and user dashboard alongside credits.
- **Points Shop page**: Accessible from nav for all logged-in users. Lists all products with name, description, point price. Users can redeem products if they have enough points.
- **Redemption system**: When a user redeems a product, a redemption request is logged with username, principal, product name, timestamp, and status (Pending / Sent).
- **Staff panel -- Products tab**: Staff can add, edit, and remove products. Each product has: name, description, category, point price.
- **Staff panel -- Redemptions tab**: Staff can view all redemption requests (user, product, timestamp, status). Staff can mark them as "Sent" after emailing the user.

### Modify
- `playGame`: Award points equal to win amount when the result is a win.
- User balance display in nav and dashboard: show points alongside credits.
- Staff panel: add Products and Redemptions tabs.
- App routing: add `/shop` route for the Points Shop page.

### Remove
- Nothing removed.

## Implementation Plan
1. Backend: Add points balances map, product store, redemption requests store.
2. Backend: New functions -- `getPointsBalance`, `addProduct`, `updateProduct`, `removeProduct`, `getAllProducts`, `redeemProduct`, `getAllRedemptions`, `updateRedemptionStatus`.
3. Backend: Modify `playGame` to award points on win.
4. Frontend: Add `PointsShopPage` with product grid and redeem flow.
5. Frontend: Update `Layout` nav to show points balance and link to shop.
6. Frontend: Update `StaffPage` with Products tab (add/edit/remove) and Redemptions tab (view + mark sent).
7. Frontend: Add `/shop` route in `App.tsx`.
8. Frontend: Update `HomePage` logged-in view to show points balance.
