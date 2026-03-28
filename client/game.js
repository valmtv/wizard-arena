// ─── Socket.io connection ────────────────────────────────────────────────────
const socket = io();

let myPlayerId = null;   // 'Player 1' or 'Player 2'
let gameSceneRef = null; // live reference to active GameScene

socket.on('connect', () => {
    console.log('[Client]: Connected to server via socket.io');
});

socket.on('PLAYER_JOINED', ({ id, socketId }) => {
    myPlayerId = id;
    console.log(`[Client]: Assigned as ${id} (socket ${socketId})`);
    if (gameSceneRef) gameSceneRef.assignPlayers();
});

socket.on('BROADCAST_STATE', (data) => {
    if (gameSceneRef) gameSceneRef.onRemoteStateUpdate(data);
});

socket.on('BROADCAST_SPELL', (data) => {
    if (gameSceneRef) gameSceneRef.onRemoteSpell(data);
});

// ─── Audio bridge ─────────────────────────────────────────────────────────────
window.castSpellFromAudio = (result) => {
    if (gameSceneRef) gameSceneRef.castSpellFromResult(result);
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const createCircleTexture = (scene, key, radius, color) => {
    try {
        const diameter = radius * 2;
        const gfx = scene.add.graphics();
        gfx.fillStyle(color, 1);
        gfx.fillCircle(radius, radius, radius);
        gfx.generateTexture(key, diameter, diameter);
        gfx.destroy();
    } catch (err) {
        console.error('[createCircleTexture Error]:', err);
    }
};

function volumeToScale(volume) {
    if (volume <= 50) return 1.0;
    if (volume <= 85) return 1.5;
    return 2.0;
}

function createSoulsButton(scene, x, y, textStr, onClick) {
    const btnWidth = 240;
    const btnHeight = 60;
    const container = scene.add.container(x, y);

    const bg = scene.add.graphics();
    const text = scene.add.text(0, 0, textStr, {
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        color: '#aaaaaa',
        fontStyle: 'bold',
        letterSpacing: 2
    }).setOrigin(0.5);

    container.add([bg, text]);

    const draw = (isHover) => {
        bg.clear();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
        if (isHover) {
            bg.lineStyle(2, 0xffaa00, 1);
            text.setColor('#ffffff');
            text.setShadow(0, 0, '#ffaa00', 8, false, true);
        } else {
            bg.lineStyle(1, 0x555555, 0.8);
            text.setColor('#aaaaaa');
            text.setShadow(0, 0, '#000000', 0);
        }
        bg.strokeRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
    };

    draw(false);

    const zone = scene.add.zone(0, 0, btnWidth, btnHeight).setInteractive({ cursor: 'pointer' });
    container.add(zone);
    zone.on('pointerover', () => { draw(true); container.setScale(1.05); });
    zone.on('pointerout', () => { draw(false); container.setScale(1); });
    zone.on('pointerdown', onClick);

    return container;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN MENU SCENE
// ═══════════════════════════════════════════════════════════════════════════════

// MainMenuScene removed in favor of MenuScene from menu.js

// ═══════════════════════════════════════════════════════════════════════════════
//  END SCENE
// ═══════════════════════════════════════════════════════════════════════════════

class EndScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EndScene' });
        this.timeElapsed = 0;
    }

    create() {
        gameSceneRef = null;
        const { width, height } = this.scale;
        this.add.rectangle(0, 0, width, height, 0x440000, 0.5).setOrigin(0);

        this.deathText = this.add.text(width / 2, height * 0.38, 'YOU DIED', {
            fontFamily: 'Georgia, serif',
            fontSize: '140px',
            color: '#ff0000',
            fontStyle: 'bold',
            letterSpacing: 25
        }).setOrigin(0.5).setShadow(0, 0, '#000000', 20, false, true);

        this.deathText.setAlpha(0);
        this.add.tween({
            targets: this.deathText,
            alpha: 1,
            scale: { from: 0.9, to: 1 },
            duration: 3000,
            ease: 'Sine.easeOut'
        });

        createSoulsButton(this, width / 2 - 150, height * 0.7, 'Go To Lobby', () => {
            this.scene.start('MenuScene');
        });
        createSoulsButton(this, width / 2 + 150, height * 0.7, 'Restart', () => {
            this.scene.start('GameScene');
        });
    }

    update(time, delta) {
        this.timeElapsed += delta;
        this.deathText.setScale(1 + Math.sin(this.timeElapsed * 0.001) * 0.02);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GAME SCENE
// ═══════════════════════════════════════════════════════════════════════════════

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });

        // Sprites
        this.player1 = null;
        this.player2 = null;

        // Multiplayer refs — set by assignPlayers()
        this.myPlayer = null;
        this.otherPlayer = null;

        // Shared fireball pool (owner tag prevents self-hits)
        this.fireballs = null;

        // Platforms
        this.platforms = null;

        // UI
        this.playerIndicator = null;

        // Input
        this.wasd = null;

        // STATE_UPDATE throttle
        this.stateTimer = 0;
        this.STATE_INTERVAL = 50; // ms → 20 updates/sec
    }

    // ── preload ───────────────────────────────────────────────────────────────
    preload() {
        this.load.image('rogue', 'assets/rogue spritesheet calciumtrice.png', {
            frameWidth: 32,
            frameHeight: 32
        });
        
        // Delegate arena-specific assets to the selected arena
        const arena = window.ARENAS[window.selectedArena || 'ruins'];
        if (arena && arena.preload) {
            arena.preload(this);
        }
    }

    // ── create ────────────────────────────────────────────────────────────────
    create() {
        try {
            gameSceneRef = this;
            const { width, height } = this.scale;

            // ── Background ───────────────────────────────────────────────────
            const arena = window.ARENAS[window.selectedArena || 'ruins'];
            if (arena && arena.buildBackground) {
                arena.buildBackground(this);
            }

            // ── Fireball texture ──────────────────────────────────────────────
            createCircleTexture(this, 'fireball_tex', 10, 0xff8800);

            // ── Animations ───────────────────────────────────────────────────
            this.anims.create({
                key: 'rogue-idle',
                frames: this.anims.generateFrameNumbers('rogue', { start: 0, end: 9 }),
                frameRate: 10,
                repeat: -1
            });
            this.anims.create({
                key: 'rogue-cast',
                frames: this.anims.generateFrameNumbers('rogue', { start: 10, end: 19 }),
                frameRate: 15,
                repeat: 0
            });
            this.anims.create({
                key: 'rogue-run',
                frames: this.anims.generateFrameNumbers('rogue', { start: 20, end: 29 }),
                frameRate: 15,
                repeat: -1
            });

            // ── Player sprites ────────────────────────────────────────────────
            this.player1 = this.physics.add.sprite(200, height / 2, 'rogue');
            this.player1.setCollideWorldBounds(true).setScale(3.5).setImmovable(true);
            this.player1.hp = 100;
            this.player1.isInvulnerable = false;
            this.player1.hpBar = this.add.graphics();

            this.player2 = this.physics.add.sprite(width - 200, height / 2, 'rogue');
            this.player2.setCollideWorldBounds(true).setScale(3.5).setImmovable(true).setFlipX(true);
            this.player2.hp = 100;
            this.player2.isInvulnerable = false;
            this.player2.hpBar = this.add.graphics();

            // ── Platforms ────────────────────────────────────────────────────
            this.platforms = (arena && arena.buildPlatforms) 
                ? arena.buildPlatforms(this, width, height)
                : this.physics.add.staticGroup();

            this.physics.add.collider(this.player1, this.platforms);
            this.physics.add.collider(this.player2, this.platforms);

            // ── Fireball group ────────────────────────────────────────────────
            this.fireballs = this.physics.add.group({
                defaultKey: 'fireball_tex',
                // no maxSize — pool grows as needed, no exhaustion
                allowGravityY: false,
            });

            // Fireballs collide with platforms
            this.physics.add.collider(this.fireballs, this.platforms, (fb) => {
                if (fb.active) {
                    fb.disableBody(true, true);
                    fb.setPosition(-9999, -9999);
                }
            });

            // Fireballs can hit either player (owner tag prevents self-hit)
            this.physics.add.overlap(this.fireballs, this.player1, this.onFireballHit, null, this);
            this.physics.add.overlap(this.fireballs, this.player2, this.onFireballHit, null, this);

            // ── Input ─────────────────────────────────────────────────────────
            this.wasd = {
                left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
                right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
                jump: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
            };

            // Click to cast (fallback / dev mode)
            this.input.on('pointerdown', (pointer) => {
                if (this.myPlayer) this.castFireball(pointer);
            });

            // Cast animation fires on mousedown for responsiveness
            this.game.canvas.addEventListener('mousedown', () => {
                if (!this.myPlayer || this.myPlayer.isCasting) return;
                this.myPlayer.isCasting = true;
                this.myPlayer.anims.play('rogue-cast', true);
                this.myPlayer.once('animationcomplete-rogue-cast', () => {
                    this.myPlayer.isCasting = false;
                });
            });

            // ── World bounds clean-up ─────────────────────────────────────────
            this.physics.world.on('worldbounds', (body) => {
                if (body.gameObject?.active) {
                    body.gameObject.disableBody(true, true);
                    body.gameObject.setPosition(-9999, -9999);
                }
            });

            // ── Assign local/remote if ID already known ───────────────────────
            this.assignPlayers();

            console.log('[GameScene]: create() complete. myPlayerId =', myPlayerId);
        } catch (err) {
            console.error('[GameScene create Error]:', err);
        }
    }

    // ── assignPlayers ─────────────────────────────────────────────────────────
    assignPlayers() {
        if (!myPlayerId || this.myPlayer) return; // not ready or already done

        if (myPlayerId === 'Player 1') {
            this.myPlayer = this.player1;
            this.otherPlayer = this.player2;
        } else {
            this.myPlayer = this.player2;
            this.otherPlayer = this.player1;
        }

        // Local player gets physics; remote is network-driven
        this.myPlayer.setImmovable(false).setDragX(800);
        this.otherPlayer.setImmovable(true).setDragX(0);

        // Floating arrow indicator
        this.playerIndicator = this.add.text(
            this.myPlayer.x, this.myPlayer.y - 70, '▼', {
            fontSize: '28px', fill: '#ffff00',
            stroke: '#000000', strokeThickness: 4
        }
        ).setOrigin(0.5).setDepth(10);

        console.log(`[GameScene]: assignPlayers() done — I am ${myPlayerId}`);
    }

    // ── update ────────────────────────────────────────────────────────────────
    update(time, delta) {
        try {
            // Retry assignment every frame until server responds
            if (!this.myPlayer && myPlayerId) this.assignPlayers();
            if (!this.myPlayer) return;

            this.handleMyMovement();
            this.updatePlayerAnimations(this.player1);
            this.updatePlayerAnimations(this.player2);
            this.updateHealthBar(this.player1);
            this.updateHealthBar(this.player2);

            // Bobbing indicator
            if (this.playerIndicator) {
                const bob = Math.sin(time / 150) * 8;
                this.playerIndicator.setPosition(this.myPlayer.x, this.myPlayer.y - 70 + bob);
                this.playerIndicator.setVisible(this.myPlayer.active);
            }

            // Throttled STATE_UPDATE
            this.stateTimer += delta;
            if (this.stateTimer >= this.STATE_INTERVAL) {
                this.stateTimer = 0;
                socket.emit('STATE_UPDATE', {
                    x: this.myPlayer.x,
                    y: this.myPlayer.y,
                    vx: this.myPlayer.body.velocity.x,
                    vy: this.myPlayer.body.velocity.y,
                });
            }
        } catch (err) {
            console.error('[GameScene update Error]:', err);
        }
    }

    // ── handleMyMovement ─────────────────────────────────────────────────────
    handleMyMovement() {
        const speedMult = (typeof playerSpeed !== 'undefined') ? playerSpeed : 1.0;
        const speed = 400 * speedMult;
        const jumpForce = -750;
        const p = this.myPlayer;

        p.setVelocityX(0);
        if (this.wasd.left.isDown) p.setVelocityX(-speed);
        if (this.wasd.right.isDown) p.setVelocityX(speed);

        // Double-jump
        if (p.body.blocked.down || p.body.touching.down) p.jumps = 0;
        if (Phaser.Input.Keyboard.JustDown(this.wasd.jump)) {
            if (p.jumps === undefined) p.jumps = 0;
            if (p.jumps < 2) {
                p.setVelocityY(jumpForce);
                p.jumps++;
            }
        }
    }

    // ── updatePlayerAnimations ────────────────────────────────────────────────
    updatePlayerAnimations(player) {
        if (!player?.active || player.isCasting) return;
        if (Math.abs(player.body.velocity.x) > 5 || Math.abs(player.body.velocity.y) > 10) {
            player.anims.play('rogue-run', true);
        } else {
            player.anims.play('rogue-idle', true);
        }
        if (player.body.velocity.x < -5) player.setFlipX(true);
        else if (player.body.velocity.x > 5) player.setFlipX(false);
    }

    // ── updateHealthBar ───────────────────────────────────────────────────────
    updateHealthBar(player) {
        if (!player?.hpBar) return;
        player.hpBar.clear();
        if (!player.active || player.hp <= 0) return;

        const barWidth = 200, barHeight = 18;
        const x = (player === this.player1) ? 20 : this.scale.width - barWidth - 20;
        const y = 20;

        player.hpBar.fillStyle(0x000000, 1);
        player.hpBar.fillRect(x, y, barWidth, barHeight);

        const color = player.hp > 30 ? 0x00ff00 : 0xff0000;
        player.hpBar.fillStyle(color, 1);
        player.hpBar.fillRect(x + 2, y + 2, (barWidth - 4) * (player.hp / 100), barHeight - 4);
    }

    // ── castFireball (pointer click / audio bridge) ───────────────────────────
    castFireball(pointer) {
        try {
            if (!this.myPlayer) return;

            const fireball = this.fireballs.get();
            if (!fireball) { console.warn('[castFireball]: Pool exhausted.'); return; }

            fireball.enableBody(true, this.myPlayer.x, this.myPlayer.y, true, true);
            fireball.body.allowGravity = false;
            fireball.body.setCollideWorldBounds(true);
            fireball.body.onWorldBounds = true;
            fireball.owner = this.myPlayer;

            const dx = pointer.worldX - this.myPlayer.x;
            const dy = pointer.worldY - this.myPlayer.y;
            const mag = Math.sqrt(dx * dx + dy * dy) || 1;
            const speed = 450;

            fireball.body.setVelocity((dx / mag) * speed, (dy / mag) * speed);

            socket.emit('SPELL_CAST', {
                spell: 'fireball',
                x: this.myPlayer.x,
                y: this.myPlayer.y,
                targetX: pointer.worldX,
                targetY: pointer.worldY,
                angle: Math.atan2(dy, dx),
                scale: fireball.scaleX,
            });
        } catch (err) {
            console.error('[castFireball Error]:', err);
        }
    }

    // ── castSpellFromResult (called by window.castSpellFromAudio) ─────────────
    castSpellFromResult(result) {
        try {
            if (!this.myPlayer) return;

            if (result.backfire) {
                this.spawnExplosion(this.myPlayer.x, this.myPlayer.y, 0xff0000);
                // Self-damage on backfire
                this.myPlayer.hp = Math.max(0, this.myPlayer.hp - 15);
                console.log('[castSpellFromResult]: BACKFIRE! Self-damage.');
                return;
            }

            const scale = volumeToScale(result.volume);

            // Aim at the cursor position if available, otherwise at opponent
            const targetX = this.input.activePointer.worldX || (this.otherPlayer?.x ?? this.scale.width / 2);
            const targetY = this.input.activePointer.worldY || (this.otherPlayer?.y ?? this.scale.height / 2);

            const fireball = this.fireballs.get();
            if (!fireball) return;

            fireball.enableBody(true, this.myPlayer.x, this.myPlayer.y, true, true);
            fireball.setScale(scale);
            fireball.body.allowGravity = false;
            fireball.body.setCollideWorldBounds(true);
            fireball.body.onWorldBounds = true;
            fireball.owner = this.myPlayer;

            const dx = targetX - this.myPlayer.x;
            const dy = targetY - this.myPlayer.y;
            const mag = Math.sqrt(dx * dx + dy * dy) || 1;
            const speed = 450;

            fireball.body.setVelocity((dx / mag) * speed, (dy / mag) * speed);

            socket.emit('SPELL_CAST', {
                spell: result.spell,
                x: this.myPlayer.x,
                y: this.myPlayer.y,
                targetX: targetX,
                targetY: targetY,
                angle: Math.atan2(dy, dx),
                scale: scale,
            });
        } catch (err) {
            console.error('[castSpellFromResult Error]:', err);
        }
    }

    // ── spawnExplosion ────────────────────────────────────────────────────────
    spawnExplosion(x, y, color = 0xff8800) {
        try {
            const circle = this.add.graphics();
            circle.fillStyle(color, 0.85);
            circle.fillCircle(0, 0, 40);
            circle.setPosition(x, y);
            this.add.tween({
                targets: circle,
                alpha: 0, scaleX: 3, scaleY: 3,
                duration: 400, ease: 'Power2',
                onComplete: () => circle.destroy()
            });
        } catch (err) {
            console.error('[spawnExplosion Error]:', err);
        }
    }

    // ── onFireballHit ─────────────────────────────────────────────────────────
    onFireballHit(obj1, obj2) {
        try {
            const isPlayer = (o) => o === this.player1 || o === this.player2;
            const player = isPlayer(obj1) ? obj1 : obj2;
            const fireball = isPlayer(obj1) ? obj2 : obj1;

            if (!fireball.active) return;
            if (fireball.owner === player) return; // no self-hits

            fireball.disableBody(true, true);
            fireball.setPosition(-9999, -9999);

            if (!player.active || player.isInvulnerable) return;

            player.hp = Math.max(0, player.hp - 10);
            player.isInvulnerable = true;
            this.time.delayedCall(100, () => { player.isInvulnerable = false; });

            // Flash tint
            player.setTint(0xff0000);
            this.time.delayedCall(200, () => { player.clearTint(); });

            if (player.hp <= 0) {
                console.log('[GameScene]:', player === this.myPlayer ? 'I died!' : 'Opponent died!');
                player.setActive(false).setVisible(false);
                player.body.setVelocity(0, 0);
                if (player.hpBar) player.hpBar.clear();

                // Respawn after 3 seconds
                this.time.delayedCall(3000, () => {
                    player.hp = 100;
                    player.setActive(true).setVisible(true);
                    const spawnX = (player === this.player1) ? 200 : this.scale.width - 200;
                    player.setPosition(spawnX, this.scale.height / 2);
                });
            } else {
                console.log('[GameScene]:', player === this.myPlayer
                    ? `I was hit! HP: ${player.hp}`
                    : `Hit opponent! HP: ${player.hp}`);
            }
        } catch (err) {
            console.error('[onFireballHit Error]:', err);
        }
    }

    // ── onRemoteStateUpdate (socket BROADCAST_STATE) ──────────────────────────
    onRemoteStateUpdate(data) {
        try {
            if (!this.otherPlayer) return;
            this.otherPlayer.setPosition(data.x, data.y);
            if (data.vx !== undefined) this.otherPlayer.setVelocity(data.vx, data.vy);
        } catch (err) {
            console.error('[onRemoteStateUpdate Error]:', err);
        }
    }

    // ── onRemoteSpell (socket BROADCAST_SPELL) ────────────────────────────────
    onRemoteSpell(data) {
        try {
            const fireball = this.fireballs.get();
            if (!fireball) { console.warn('[onRemoteSpell]: Pool exhausted.'); return; }

            fireball.enableBody(true, data.x, data.y, true, true);
            fireball.setScale(data.scale || 1.0);
            fireball.body.allowGravity = false;
            fireball.body.setCollideWorldBounds(true);
            fireball.body.onWorldBounds = true;
            fireball.owner = this.otherPlayer; // tag so it can't hit the sender

            const dx = data.targetX - data.x;
            const dy = data.targetY - data.y;
            const mag = Math.sqrt(dx * dx + dy * dy) || 1;
            const speed = 450;

            fireball.body.setVelocity((dx / mag) * speed, (dy / mag) * speed);
        } catch (err) {
            console.error('[onRemoteSpell Error]:', err);
        }
    }
}

// ─── Phaser Game Config ───────────────────────────────────────────────────────

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1500 },
            debug: false,
        },
    },
    scene: [MenuScene, GameScene, EndScene],
};

const game = new Phaser.Game(config);