# Phaser 3 Engine & Asset Rules

## Rendering & Physics
- Use `Phaser.AUTO` for rendering. Target canvas: fullscreen via `Phaser.Scale.RESIZE`.
- Enable `arcade` physics. Default gravity: `y: 480` (snappy platformer feel).
- Keep the `update()` loop lightweight — never instantiate objects inside it.

## Asset Pipeline & Styling
- The project contains a `/client/assets/` directory.
- **Preloading:** Load images in `preload()` using relative paths (e.g., `this.load.image('bg1', 'assets/bg1.png');`).
- **Fallback:** If a specific sprite is missing mid-hackathon, use Phaser's `Graphics` object styled with the project's color palette (below).
- **Sprite blend fix:** For assets with non-transparent backgrounds, use `Phaser.BlendModes.ADD` on fire/glow sprites so the backgrounds disappear. AVOID `MULTIPLY` or `SCREEN`.

## Color Palette
Extracted from uploaded dark-fantasy backgrounds:
- Background: `#07070f` / `#0a0a0e`
- Stone: `#1a1e2b` / `#252d3a`
- Toxic green glow: `#00cc55` / `#39ff88`
- Moonblue: `#6ab4ff`
- Lava orange: `#ff6a00`
- Purple magic: `#bb44ff`
- Cyan magic: `#44ddff`

## Inputs (UPDATED)
- **A / D**: Horizontal movement (left / right). Poll in `update()`.
- **SPACE**: Jump. Only if `player.body.blocked.down` (ground / platform).
- **SHIFT**: Hold to record voice spell, release to cast.
- W and S are NOT used for movement.
