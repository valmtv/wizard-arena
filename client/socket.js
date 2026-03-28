// socket.js — Socket.io connection + server event wiring
// ─────────────────────────────────────────────────────────────────────────────
// Exposes two globals used by GameScene:
//   socket       — the live Socket.io instance
//   myPlayerId   — 'Player 1' | 'Player 2' (set once server responds)
//
// Also owns the audio→game bridge so audio.js can stay decoupled from Phaser.
// ─────────────────────────────────────────────────────────────────────────────

const socket = io();   // eslint-disable-line no-undef

let myPlayerId = null;  // assigned by the server on connect
let gameSceneRef = null; // live reference injected by GameScene.create()

// ── Server → Client ───────────────────────────────────────────────────────────

socket.on('connect', () => {
    console.log('[Socket]: Connected to server —', socket.id);
});

socket.on('PLAYER_JOINED', ({ id, socketId }) => {
    myPlayerId = id;
    console.log(`[Socket]: Assigned as ${id} (socket ${socketId})`);

    // GameScene may already be running when this arrives
    if (gameSceneRef) gameSceneRef.assignPlayers();
});

socket.on('BROADCAST_STATE', (data) => {
    if (gameSceneRef) gameSceneRef.onRemoteStateUpdate(data);
});

socket.on('BROADCAST_SPELL', (data) => {
    if (gameSceneRef) gameSceneRef.onRemoteSpell(data);
});

socket.on('connect_error', (err) => {
    console.error('[Socket]: connect_error —', err.message);
});

// ── Audio → Game bridge ───────────────────────────────────────────────────────
// audio.js calls window.castSpellFromAudio(result) after Gemini responds.

window.castSpellFromAudio = (result) => {
    if (gameSceneRef) {
        gameSceneRef.castSpellFromResult(result);
    } else {
        console.warn('[Socket]: castSpellFromAudio called before GameScene was ready.');
    }
};