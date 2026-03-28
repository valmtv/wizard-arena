const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { FishjamClient } = require('@fishjam-cloud/js-server-sdk');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// ── Game state (server-authoritative) ─────────────────────────────────────
const STARTING_HP = 100;
const RESPAWN_DELAY = 3000;

let gameState = {
    'Player 1': { hp: STARTING_HP, alive: true, peerId: null },
    'Player 2': { hp: STARTING_HP, alive: true, peerId: null },
};

function resetGameState() {
    gameState = {
        'Player 1': { hp: STARTING_HP, alive: true, peerId: null },
        'Player 2': { hp: STARTING_HP, alive: true, peerId: null },
    };
}

// ── Fishjam Setup ──────────────────────────────────────────────────────────

const FJ_HOST = process.env.FJ_HOST || '127.0.0.1';
const fishjam = new FishjamClient({
    fishjamUrl: `http://${FJ_HOST}:5002`,
    managementToken: 'development'
});

let roomId = null;

async function initFishjam() {
    try {
        console.log(`[Fishjam]: Initializing on http://${FJ_HOST}:5002...`);
        const room = await fishjam.createRoom({
            videoCodec: 'h264'
        });
        roomId = room.id;
        console.log(`[Fishjam]: Room created: ${roomId}`);
    } catch (err) {
        console.error('[Fishjam Error]: Failed to create room —', err.message);
    }
}

/** Helper to update peer metadata via Fishjam REST API (SDK v0.3.0 lacks this) */
async function updatePeerMetadata(roomId, peerId, metadata) {
    const url = `http://${FJ_HOST}:5002/room/${roomId}/peer/${peerId}`;
    try {
        await axios.patch(url, { metadata }, {
            headers: { 'Authorization': `Bearer development` } // Matches managementToken
        });
    } catch (err) {
        console.error(`[Fishjam REST Error]: PATCH ${url} failed —`, err.response?.data || err.message);
        throw err;
    }
}

initFishjam();

// ── REST API (Signaling + Hits) ───────────────────────────────────────────

app.get('/join', async (req, res) => {
    try {
        if (!roomId) {
            return res.status(503).json({ error: 'Room not ready' });
        }

        const assignedId = !gameState['Player 1'].peerId ? 'Player 1' : 
                          (!gameState['Player 2'].peerId ? 'Player 2' : null);

        if (!assignedId) {
            return res.status(403).json({ error: 'Lobby full' });
        }

        const { peer, peerToken } = await fishjam.createPeer(roomId, {
            metadata: { assignedId, hp: gameState[assignedId].hp }
        });

        gameState[assignedId].peerId = peer.id;
        console.log(`[Server]: Assigned ${assignedId} to Peer ${peer.id}`);

        res.json({
            peerToken,
            peerId: peer.id,
            assignedId,
            roomId,
            fishjamUrl: `ws://${FJ_HOST}:5002/socket/peer/websocket`
        });
    } catch (err) {
        console.error('[Join Error]:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/hit', async (req, res) => {
    const { targetId, damage, spell } = req.body;
    const target = gameState[targetId];

    if (!target || !target.alive || !target.peerId) {
        return res.json({ success: false, reason: 'Target not available' });
    }

    const clampedDmg = Math.min(Math.max(0, damage), 50);
    target.hp = Math.max(0, target.hp - clampedDmg);

    console.log(`[Server]: ${spell} hit ${targetId} for ${clampedDmg}hp → ${target.hp}hp`);

    // Broadcast update via Fishjam Metadata using our helper
    try {
        await updatePeerMetadata(roomId, target.peerId, { hp: target.hp });
        
        if (target.hp <= 0) {
            target.alive = false;
            console.log(`[Server]: ${targetId} died. Respawning...`);
            
            setTimeout(async () => {
                target.hp = STARTING_HP;
                target.alive = true;
                await updatePeerMetadata(roomId, target.peerId, { hp: STARTING_HP });
                console.log(`[Server]: ${targetId} respawned.`);
            }, RESPAWN_DELAY);
        }
        res.json({ success: true, hp: target.hp });
    } catch (err) {
        console.error('[Metadata Update Error]:', err);
        res.status(500).json({ error: err.message });
    }
});

// Reset logic when players leave would usually use webhooks or polling.
// For now, we'll expose a simple reset or rely on process restart.

// ── HTTPS / HTTP boot ──────────────────────────────────────────────────────

const CERT_KEY = path.join(__dirname, 'cert', 'key.pem');
const CERT_CERT = path.join(__dirname, 'cert', 'cert.pem');

const port = process.env.PORT || 3000;

if (fs.existsSync(CERT_KEY) && fs.existsSync(CERT_CERT)) {
    const httpsServer = https.createServer({
        key: fs.readFileSync(CERT_KEY),
        cert: fs.readFileSync(CERT_CERT),
    }, app);

    httpsServer.listen(port, () => {
        console.log(`[Server]: Wizard Arena (HTTPS) → https://localhost:${port}`);
    });
} else {
    const httpServer = http.createServer(app);
    httpServer.listen(port, () => {
        console.log(`[Server]: Wizard Arena (HTTP) → http://localhost:${port}`);
        console.log('[Server]: WebRTC requires HTTPS or localhost to access camera/mic.');
    });
}