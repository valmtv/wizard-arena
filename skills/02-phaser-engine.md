# Phaser 3 Engine Rules

## Rendering & Physics
- Use `Phaser.AUTO` for rendering. Target canvas size: 800x600.
- Enable `arcade` physics. Set default gravity to `y: 300` unless specified otherwise.
- Keep the `update()` loop as lightweight as possible. Do not instantiate objects inside the update loop.

## Assets
- **CRITICAL:** Do NOT attempt to load external `.png` or `.jpg` assets. We do not have them.
- Use Phaser's built-in `Graphics` object for all entities.
  - Player 1: Blue rectangle.
  - Player 2: Red rectangle.
  - Spells: Circles of varying colors and radii.

## Inputs
- WASD for movement. 
- Ensure input polling happens in the `update()` loop.
