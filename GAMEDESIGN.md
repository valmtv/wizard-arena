# Vibe-Wizard Arena: Core Game Mechanics & Skills

## 1. Core Systems
* **Perspective:** 2D Side-scrolling platformer.
* **Controls:** WASD for movement, Mouse for aiming crosshair.
* **Casting Mechanic:** Player holds `SHIFT` to speak into the microphone. 
* **Casting Penalty:** While `SHIFT` is held, the player's movement speed drops to 50%.
* **Volume Scaling:** Frontend measures mic volume (1-100). 
    * 1-50 (Normal): Spell Scale/Damage = 1.0x
    * 51-85 (Yelling): Spell Scale/Damage = 1.5x
    * 86-100 (Screaming): Spell Scale/Damage = 2.0x

## 2. Core Spells (Triggered by Gemini AI JSON)
1.  **Fireball:** Travels straight towards the mouse cursor. Applies a 3-second burning DoT (Damage over Time) to the enemy.
2.  **Frostbite:** Travels in a slight arc. On hit, slows the enemy's WASD movement speed by 50% for 2.5 seconds.
3.  **Arcane Bolt:** Very fast, straight line, low damage. (Use Phaser Graphics/Particles or TypeGPU shader for visuals, not a sprite).
4.  **Arcane Nova:** A 360-degree point-blank AOE shockwave around the caster. Deals low damage but applies massive knockback.

## 3. Backfires & Anomalies (Fel Magic)
* **Backfire (Mumbling):** If Gemini detects mumbling/stuttering, the spell fails and spawns a harmful explosion directly at the caster's (x, y) coordinates.
* **Global Anomalies (Triggered randomly by AI / Timer):**
    * *Meteor Shower:* Spawns 5-15 meteors from `y=0`, falling at a 15-45 degree angle.
    * *Targeted Silence:* Randomly selects one player. Disables their ability to cast for 3 seconds.
    * *Gravity Flux:* Sets global gravity to "Iron" (heavy gravity + 20% movement slow for both players) for 8 seconds.

## 4. Map Pickups (Spawn every 15-20 seconds)
1.  **Blood Vial:** Restores 20% HP on overlap.
2.  **Demon Orb:** Grants a buff that forces the player's next spell to automatically cast at 2.0x Scale, regardless of mic volume.

## 5. Tech stack

AI / Core Logic: Gemini Live API- processes live audio into JSON game actions
Game Engine: 2D canvas in Phaser.js, scaffolded with Google Antigravity
Multiplayer: Local Node.js + Fishjam for low-latency audio/data sync between two PCs over LAN
Visuals: TypeGPU for TypeScript-based shaders on spells