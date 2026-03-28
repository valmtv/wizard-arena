class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this._hoveredArena = null;
    }

    // ── preload ───────────────────────────────────────────────────────────────
    preload() {
        // Always preload the mountain bg for the menu background
        this.load.image('bg1', 'assets/parallax_mountain_pack/layers/parallax-mountain-bg.png');
        this.load.image('bg2', 'assets/parallax_mountain_pack/layers/parallax-mountain-montain-far.png');
        this.load.image('bg3', 'assets/parallax_mountain_pack/layers/parallax-mountain-mountains.png');
        this.load.image('bg4', 'assets/parallax_mountain_pack/layers/parallax-mountain-trees.png');
        this.load.image('bg5', 'assets/parallax_mountain_pack/layers/parallax-mountain-foreground-trees.png');
        this.load.spritesheet('rogue', 'assets/rogue spritesheet calciumtrice.png', {
            frameWidth: 32,
            frameHeight: 32
        });
    }

    // ── create ────────────────────────────────────────────────────────────────
    create() {
        const { width, height } = this.scale;

        // ── Parallax background ────────────────────────────────────────────
        this.add.image(width / 2, height / 2, 'bg1').setDisplaySize(width, height).setDepth(-5);
        this.add.image(width / 2, height / 2, 'bg2').setDisplaySize(width, height).setDepth(-4);
        this.add.image(width / 2, height / 2, 'bg3').setDisplaySize(width, height).setDepth(-3);
        this.add.image(width / 2, height / 2, 'bg4').setDisplaySize(width, height).setDepth(-2);
        this.add.image(width / 2, height / 2, 'bg5').setDisplaySize(width, height).setDepth(-1);

        // Dark overlay for readability
        const overlay = this.add.graphics().setDepth(0);
        overlay.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.0, 0.0, 0.65, 0.65);
        overlay.fillRect(0, 0, width, height);

        // ── Animations (guard against re-create on scene restart) ─────────
        if (!this.anims.exists('menu-idle')) {
            this.anims.create({ key: 'menu-idle', frames: this.anims.generateFrameNumbers('rogue', { start: 0, end: 9 }), frameRate: 10, repeat: -1 });
        }
        if (!this.anims.exists('menu-run')) {
            this.anims.create({ key: 'menu-run', frames: this.anims.generateFrameNumbers('rogue', { start: 20, end: 29 }), frameRate: 15, repeat: -1 });
        }

        // ── Title ─────────────────────────────────────────────────────────
        const titleFontSize = Math.round(width * 0.085);
        this.add.text(width / 2, height * 0.13, 'WIZARD ARENA', {
            fontSize: `${titleFontSize}px`,
            fontFamily: '"Courier New", monospace',
            color: '#f5d87a',
            stroke: '#2a1040',
            strokeThickness: 10,
            shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 0, fill: true }
        }).setOrigin(0.5).setDepth(3);

        this.add.text(width / 2, height * 0.22, 'CHOOSE YOUR ARENA', {
            fontSize: `${Math.round(width * 0.022)}px`,
            fontFamily: '"Courier New", monospace',
            color: '#c8b0d8',
            stroke: '#1a0030',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(3);

        // ── Arena cards ───────────────────────────────────────────────────
        const cardW = width * 0.36;
        const cardH = height * 0.44;
        const cardY = height * 0.53;
        const gap = width * 0.05;
        const card1X = width / 2 - cardW / 2 - gap / 2;
        const card2X = width / 2 + cardW / 2 + gap / 2;

        this._buildArenaCard('ruins', card1X, cardY, cardW, cardH);
        this._buildArenaCard('crypt', card2X, cardY, cardW, cardH);

        // ── Controls hint ─────────────────────────────────────────────────
        this.add.text(width / 2, height * 0.94, 'WASD / SPACE to move  ·  Click to cast fireball', {
            fontSize: `${Math.round(width * 0.016)}px`,
            fontFamily: '"Courier New", monospace',
            color: '#604878',
            stroke: '#1a0030',
            strokeThickness: 3,
        }).setOrigin(0.5).setDepth(3);

        // ── Decorative rogues flanking the title ──────────────────────────
        const rogueL = this.add.sprite(width * 0.08, height * 0.14, 'rogue').setScale(3.5).setDepth(2);
        rogueL.play('menu-idle');
        const rogueR = this.add.sprite(width * 0.92, height * 0.14, 'rogue').setScale(3.5).setFlipX(true).setDepth(2);
        rogueR.play('menu-idle');
    }

    // ── _buildArenaCard ───────────────────────────────────────────────────────
    _buildArenaCard(arenaKey, cx, cy, cardW, cardH) {
        const arena = window.ARENAS[arenaKey];
        const isRuins = arenaKey === 'ruins';
        const accentCol = isRuins ? 0xf5d87a : 0x9060d0;  // gold vs purple
        const accentHex = isRuins ? '#f5d87a' : '#b080f0';
        const bgBase = isRuins ? 0x1e1030 : 0x0a0520;
        const bgHover = isRuins ? 0x2e1a40 : 0x180838;
        const x0 = cx - cardW / 2;
        const y0 = cy - cardH / 2;

        // Card background
        const cardBg = this.add.graphics().setDepth(4);
        const draw = (shade, borderAlpha = 0.9) => {
            cardBg.clear();
            cardBg.fillStyle(shade, 0.9);
            cardBg.fillRect(x0, y0, cardW, cardH);
            cardBg.lineStyle(3, accentCol, borderAlpha);
            cardBg.strokeRect(x0, y0, cardW, cardH);
            // Corner accents
            const cs = 12;
            cardBg.lineStyle(5, accentCol, 1);
            [[x0, y0], [x0 + cardW, y0], [x0, y0 + cardH], [x0 + cardW, y0 + cardH]].forEach(([px, py]) => {
                cardBg.beginPath();
                cardBg.moveTo(px + (px === x0 ? cs : -cs), py);
                cardBg.lineTo(px, py);
                cardBg.lineTo(px, py + (py === y0 ? cs : -cs));
                cardBg.strokePath();
            });
        };
        draw(bgBase);

        // Arena name
        this.add.text(cx, y0 + cardH * 0.1, arena.name.toUpperCase(), {
            fontSize: `${Math.round(cardW * 0.12)}px`,
            fontFamily: '"Courier New", monospace',
            color: accentHex,
            stroke: '#1a0030',
            strokeThickness: 6,
        }).setOrigin(0.5).setDepth(5);

        // Mini preview bg strip
        const previewH = cardH * 0.38;
        const previewGfx = this.add.graphics().setDepth(5);
        if (isRuins) {
            // Sunset-ish gradient
            previewGfx.fillGradientStyle(0x2a1040, 0x2a1040, 0x503060, 0x503060, 1);
        } else {
            // Dark night
            previewGfx.fillGradientStyle(0x050510, 0x050510, 0x0a0520, 0x0a0520, 1);
        }
        previewGfx.fillRect(x0 + 4, y0 + cardH * 0.18, cardW - 8, previewH);

        // Moon / mountain silhouette in preview
        const previewMidX = cx;
        const previewMidY = y0 + cardH * 0.18 + previewH * 0.5;
        const iconGfx = this.add.graphics().setDepth(6);
        if (isRuins) {
            // Mountain silhouette
            iconGfx.fillStyle(0x3a1a50, 1);
            iconGfx.fillTriangle(
                previewMidX - 60, previewMidY + previewH * 0.35,
                previewMidX, previewMidY - previewH * 0.35,
                previewMidX + 60, previewMidY + previewH * 0.35
            );
            iconGfx.fillStyle(0x8060a0, 0.5);
            iconGfx.fillCircle(previewMidX + 40, previewMidY - previewH * 0.2, 18); // far moon
        } else {
            // Moon + stone pillars
            iconGfx.fillStyle(0xd0d8ff, 0.9);
            iconGfx.fillCircle(previewMidX, previewMidY - previewH * 0.2, 22);
            iconGfx.fillStyle(0x1a1030, 1);
            [-40, 0, 40].forEach(ox => {
                iconGfx.fillRect(previewMidX + ox - 8, previewMidY + previewH * 0.05, 16, previewH * 0.4);
            });
        }

        // Description
        this.add.text(cx, y0 + cardH * 0.65, `"${arena.description}"`, {
            fontSize: `${Math.round(cardW * 0.072)}px`,
            fontFamily: '"Courier New", monospace',
            color: '#a090b8',
            stroke: '#1a0030',
            strokeThickness: 3,
            wordWrap: { width: cardW * 0.85 },
            align: 'center',
        }).setOrigin(0.5).setDepth(5);

        // SELECT button
        const btnH = cardH * 0.13;
        const btnW = cardW * 0.7;
        const btnText = this.add.text(cx, y0 + cardH * 0.85, 'SELECT', {
            fontSize: `${Math.round(cardW * 0.1)}px`,
            fontFamily: '"Courier New", monospace',
            color: accentHex,
            stroke: '#1a0030',
            strokeThickness: 5,
        }).setOrigin(0.5).setDepth(6);

        // Pulse tween on the button text
        this.tweens.add({ targets: btnText, alpha: 0.55, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

        // Invisible hit zone over the whole card
        const zone = this.add.zone(cx, cy, cardW, cardH)
            .setInteractive({ useHandCursor: true })
            .setDepth(7);

        zone.on('pointerover', () => {
            draw(bgHover, 1.0);
            btnText.setColor('#ffffff');
        });
        zone.on('pointerout', () => {
            draw(bgBase, 0.9);
            btnText.setColor(accentHex);
        });
        zone.on('pointerdown', () => {
            window.selectedArena = arenaKey;
            draw(isRuins ? 0x4a2a60 : 0x280850, 1.0);
            this.time.delayedCall(130, () => {
                this.scene.start('GameScene');
            });
        });
    }
}