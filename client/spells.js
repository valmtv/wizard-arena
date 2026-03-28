// client/spells.js — SpellCaster
// Owns: textures, casting, hit effects, debuffs, remote spell rendering.
// GameScene calls sc.init(scene) once, then sc.cast(result) / sc.onRemoteSpell(data).
// ─────────────────────────────────────────────────────────────────────────────

class SpellCaster {

    // ── Config ─────────────────────────────────────────────────────────────────

    static SPELLS = {
        fireball: { color: 0xff8800, radius: 10, speed: 450, damage: 10, gravity: false },
        frostbite: { color: 0x44ddff, radius: 10, speed: 420, damage: 8, gravity: true },
        bolt: { color: 0xffee22, radius: 6, speed: 900, damage: 5, gravity: false },
        nova: { color: 0xbb44ff, radius: 10, speed: 0, damage: 8, gravity: false },
    };

    // ── Init ───────────────────────────────────────────────────────────────────

    init(scene, ballGroup) {
        this.scene = scene;
        this.balls = ballGroup; // Phaser physics group owned by GameScene
        this._buildTextures();
    }

    _buildTextures() {
        Object.entries(SpellCaster.SPELLS).forEach(([key, { color, radius }]) => {
            createCircleTexture(this.scene, `spell_${key}`, radius, color); // eslint-disable-line no-undef
        });
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Cast a spell for the local player based on a Gemini result object.
     * @param {{ spell, volume, backfire }} result
     * @param {Phaser.GameObjects.Sprite} caster   — myPlayer
     * @param {Phaser.GameObjects.Sprite} target   — otherPlayer
     * @param {{ worldX, worldY }}        pointer  — current mouse position
     */
    cast(result, caster, target, pointer) {
        try {
            if (!caster) return;

            if (result.backfire) {
                this._handleBackfire(caster);
                return;
            }

            const scale = volumeToScale(result.volume); // eslint-disable-line no-undef
            const targetX = (pointer?.worldX > 0) ? pointer.worldX : (target?.x ?? this.scene.scale.width / 2);
            const targetY = (pointer?.worldY > 0) ? pointer.worldY : (target?.y ?? this.scene.scale.height / 2);

            this._playCastAnim(caster);

            switch (result.spell) {
                case 'fireball': return this._launchBall(caster, 'fireball', scale, targetX, targetY);
                case 'frostbite': return this._launchBall(caster, 'frostbite', scale, targetX, targetY - 180);
                case 'bolt': return this._launchBall(caster, 'bolt', scale * 0.6, targetX, targetY);
                case 'nova': this._castNova(caster, target, scale); break;
                default:
                    console.warn('[SpellCaster]: Unknown spell:', result.spell);
                    this._launchBall(caster, 'fireball', scale, targetX, targetY);
            }

            // --- Network Notification ---
            if (caster === window.gameSceneRef?.myPlayer && window.fishjam) {
                window.fishjam.castSpell({
                    spell: result.spell,
                    x: caster.x,
                    y: caster.y,
                    targetX,
                    targetY,
                    scale
                });
            }
            return true;
        } catch (err) {
            console.error('[SpellCaster.cast Error]:', err);
        }
    }

    /**
     * Render and apply a spell received over the network.
     * @param {object} data — BROADCAST_SPELL payload
     * @param {Phaser.GameObjects.Sprite} remoteCaster — otherPlayer reference
     * @param {Phaser.GameObjects.Sprite} localPlayer  — myPlayer reference
     */
    onRemoteSpell(data, remoteCaster, localPlayer) {
        try {
            const { spell: spellType, x, y, targetX, targetY, scale = 1.0 } = data;

            if (spellType === 'nova') {
                this._spawnNovaRing(x, y, 220 * scale);
                this._applyNovaHit(x, y, 220 * scale, scale, localPlayer);
                return;
            }

            const fb = this._getFreshBall(x, y, spellType, scale);
            if (!fb) return;
            fb.owner = remoteCaster;
            fb.body.allowGravity = SpellCaster.SPELLS[spellType]?.gravity ?? false;

            const speed = spellType === 'bolt' ? 900 : 450;
            this._aim(fb, x, y, targetX, targetY, speed);
        } catch (err) {
            console.error('[SpellCaster.onRemoteSpell Error]:', err);
        }
    }

    /**
     * Process a collision between a ball and a player.
     * Returns the damage dealt (0 if no hit registered).
     */
    onHit(ball, player, myPlayer) {
        try {
            if (!ball.active || ball.owner === player) return 0;

            const spellType = ball.spellType || 'fireball';
            const scale = ball.scaleX || 1.0;
            this._destroyBall(ball);

            const cfg = SpellCaster.SPELLS[spellType] ?? SpellCaster.SPELLS.fireball;
            const dmg = Math.round(cfg.damage * scale);

            // Visual + debuffs (client-side feel)
            this.spawnExplosion(player.x, player.y, cfg.color);
            if (spellType === 'frostbite') this._applySlow(player, scale);
            if (spellType === 'fireball') this._applyBurnVfx(player, scale);

            const tag = player === myPlayer ? 'I was hit' : 'Hit opponent';
            console.log(`[Hit]: ${tag} with ${spellType}, dmg=${dmg}`);

            return dmg;
        } catch (err) {
            console.error('[SpellCaster.onHit Error]:', err);
            return 0;
        }
    }

    // ── Spell implementations ─────────────────────────────────────────────────

    _handleBackfire(caster) {
        console.log('[SpellCaster]: BACKFIRE!');
        this.spawnExplosion(caster.x, caster.y, 0xff0000);
        this._playCastAnim(caster);
        // Caller (GameScene) handles HP deduction via server
        return -15; // signal: self-damage
    }

    _launchBall(caster, spellType, scale, targetX, targetY) {
        const fb = this._getFreshBall(caster.x, caster.y, spellType, scale);
        if (!fb) return;
        fb.owner = caster;
        fb.body.allowGravity = SpellCaster.SPELLS[spellType]?.gravity ?? false;
        this._aim(fb, caster.x, caster.y, targetX, targetY,
            SpellCaster.SPELLS[spellType]?.speed ?? 450);
    }

    _castNova(caster, target, scale) {
        const radius = 220 * scale;
        this._spawnNovaRing(caster.x, caster.y, radius);
        this._applyNovaHit(caster.x, caster.y, radius, scale, target);
    }

    _applyNovaHit(ox, oy, radius, scale, hitTarget) {
        if (!hitTarget?.active) return;
        const dist = Phaser.Math.Distance.Between(ox, oy, hitTarget.x, hitTarget.y); // eslint-disable-line no-undef
        if (dist >= radius) return;

        const angle = Math.atan2(hitTarget.y - oy, hitTarget.x - ox);
        hitTarget.setVelocity(
            Math.cos(angle) * 700 * scale,
            Math.sin(angle) * 700 * scale - 200
        );
        console.log(`[Nova]: In-range hit at dist ${Math.round(dist)}px`);
        // Damage is resolved server-side via SPELL_CAST event
    }

    // ── Pool & physics helpers ────────────────────────────────────────────────

    _getFreshBall(x, y, spellType, scale) {
        const key = `spell_${spellType}`;
        const fb = this.balls.get(x, y, this.scene.textures.exists(key) ? key : 'spell_fireball');
        if (!fb) { console.warn('[SpellCaster]: Ball pool exhausted.'); return null; }

        fb.enableBody(true, x, y, true, true);
        fb.setScale(scale);
        fb.body.collideWorldBounds = true;
        fb.body.onWorldBounds = true;
        fb.spellType = spellType;

        if (spellType === 'fireball' && this.scene.textures.exists('fireball_fancy')) {
            fb.setTexture('fireball_fancy');
            fb.play('fireball-fancy', true);
        } else {
            fb.setTexture(key);
        }

        return fb;
    }

    _aim(fb, fromX, fromY, toX, toY, speed) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const mag = Math.sqrt(dx * dx + dy * dy) || 1;
        fb.body.setVelocity((dx / mag) * speed, (dy / mag) * speed);
    }

    _destroyBall(fb) {
        if (!fb.active) return;
        fb.disableBody(true, true);
        fb.setPosition(-9999, -9999);
    }

    // ── Debuffs ───────────────────────────────────────────────────────────────

    _applySlow(player, scale) {
        if (player.activeDebuffs?.slow) return;
        player.activeDebuffs = player.activeDebuffs || {};
        player.activeDebuffs.slow = true;
        player.setTint(0x44ddff);
        this.scene.time.delayedCall(2500, () => {
            if (player.activeDebuffs) player.activeDebuffs.slow = false;
            player.clearTint();
        });
    }

    _applyBurnVfx(player, scale) {
        if (player.activeDebuffs?.burn) return;
        player.activeDebuffs = player.activeDebuffs || {};
        player.activeDebuffs.burn = true;
        let ticks = 0;
        const ev = this.scene.time.addEvent({
            delay: 1000,
            repeat: 2,
            callback: () => {
                ticks++;
                this.spawnExplosion(player.x, player.y, 0xff4400);
                if (ticks >= 3) {
                    if (player.activeDebuffs) player.activeDebuffs.burn = false;
                    ev.remove();
                }
            },
        });
    }

    // ── VFX ───────────────────────────────────────────────────────────────────

    spawnExplosion(x, y, color = 0xff8800) {
        try {
            const circle = this.scene.add.graphics();
            circle.fillStyle(color, 0.85);
            circle.fillCircle(0, 0, 40);
            circle.setPosition(x, y);
            this.scene.add.tween({
                targets: circle,
                alpha: 0, scaleX: 3, scaleY: 3,
                duration: 400, ease: 'Power2',
                onComplete: () => circle.destroy(),
            });
        } catch (err) {
            console.error('[spawnExplosion Error]:', err);
        }
    }

    _spawnNovaRing(x, y, radius) {
        try {
            const ring = this.scene.add.graphics();
            ring.lineStyle(4, 0xbb44ff, 1);
            ring.strokeCircle(0, 0, 10);
            ring.setPosition(x, y);
            this.scene.add.tween({
                targets: ring,
                scaleX: radius / 10, scaleY: radius / 10, alpha: 0,
                duration: 500, ease: 'Power2',
                onComplete: () => ring.destroy(),
            });

            const flash = this.scene.add.graphics();
            flash.fillStyle(0xbb44ff, 0.25).fillCircle(x, y, radius);
            this.scene.add.tween({
                targets: flash, alpha: 0, duration: 300, ease: 'Power2',
                onComplete: (tw, targets) => targets[0].destroy(),
            });
        } catch (err) {
            console.error('[_spawnNovaRing Error]:', err);
        }
    }

    // ── Animation helper ──────────────────────────────────────────────────────

    _playCastAnim(player) {
        if (!player || player.isCasting) return;
        player.isCasting = true;
        player.anims.play('rogue-cast', true);
        player.once('animationcomplete-rogue-cast', () => {
            player.isCasting = false;
        });
    }
}

// Singleton — GameScene reads window.spellCaster
window.spellCaster = new SpellCaster();