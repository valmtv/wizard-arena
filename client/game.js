// game.js — Phaser bootstrap
// All scenes, networking, and utilities live in their own files.
// This file only wires them together into a Phaser.Game instance.
// ─────────────────────────────────────────────────────────────────────────────

const config = {
    type: Phaser.AUTO,  // eslint-disable-line no-undef
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.RESIZE,       // eslint-disable-line no-undef
        autoCenter: Phaser.Scale.CENTER_BOTH,  // eslint-disable-line no-undef
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1500 },
            debug: false,
        },
    },
    scene: [MenuScene, GameScene, EndScene],  // eslint-disable-line no-undef
};

const game = new Phaser.Game(config);  // eslint-disable-line no-undef