/**
 * fishjam.js — Fishjam client-side bridge (replacing socket.js)
 *
 * This module handles the WebRTC session via Fishjam for:
 * 1. Synchronous game state (via Peer Metadata)
 * 2. Real-time voice chat (via Audio Tracks)
 * 3. Authoritative HP updates (via Metadata events)
 */

import { FishjamClient } from "https://esm.sh/@fishjam-dev/ts-client@0.5.0";

// --- Globals for Phaser ---
window.myPlayerId = null;
window.gameSceneRef = null;
window.fishjam = null; // Our wrapper object

const client = new FishjamClient();

async function joinArena() {
    try {
        console.log('[Fishjam]: Joining arena...');
        
        // 1. Get token from our server
        const response = await fetch('/join');
        if (!response.ok) throw new Error('Lobby full or server down');
        const { peerToken, assignedId, roomId, fishjamUrl, peerId } = await response.json();
        
        window.myPlayerId = assignedId;
        console.log(`[Fishjam]: Assigned ${assignedId} (Peer: ${peerId}) in Room: ${roomId}`);

        // 2. Connect to Fishjam
        client.connect({
            token: peerToken,
            peerMetadata: { assignedId, hp: 100, x: 0, y: 0, vx: 0, vy: 0 },
            signaling: {
                host: window.location.hostname + ':5002',
                path: '/socket/peer/websocket',
                protocol: 'ws'
            }
        });

        // 3. Setup Listeners
        client.on('joined', (myId, peers) => {
            console.log(`[Fishjam]: Joined as ${myId}. Other peers:`, peers.length);
            if (window.gameSceneRef) window.gameSceneRef.assignPlayers();
        });

        /** 
         * Heart of the networking: 
         * We update our position via client.updatePeerMetadata().
         * Other peers hear it via 'peerUpdated' event.
         */
        client.on('peerUpdated', (peer) => {
            const data = peer.metadata;
            if (!data || data.assignedId === window.myPlayerId) return;

            // Handle HP update (pushed from server metadata update)
            if (data.hp !== undefined && window.gameSceneRef) {
                window.gameSceneRef.onHpUpdate({ playerId: data.assignedId, hp: data.hp });
            }

            // Handle Position sync
            if (data.x !== undefined && window.gameSceneRef) {
                window.gameSceneRef.onRemoteStateUpdate(data);
            }
            
            // Handle Spells
            if (data.lastSpell && window.gameSceneRef) {
                // If the spell timestamp is new, trigger it
                if (peer._lastSpellReceived !== data.lastSpellTime) {
                    peer._lastSpellReceived = data.lastSpellTime;
                    window.gameSceneRef.onRemoteSpell(data.lastSpell);
                }
            }
        });

        client.on('peerJoined', (peer) => {
            console.log(`[Fishjam]: Peer joined: ${peer.id}`);
        });

        client.on('peerLeft', (peer) => {
            console.log(`[Fishjam]: Peer left: ${peer.id}`);
        });

        // --- Multi-media logic (Voice Chat) ---
        client.on('trackReady', (ctx) => {
            console.log('[Fishjam]: Remote track ready:', ctx.endpoint.id);
            if (ctx.track.kind === 'audio') {
                const audio = document.createElement('audio');
                audio.srcObject = ctx.stream;
                audio.autoplay = true;
                // Don't append to DOM, just play
                audio.play().catch(e => console.warn('[Fishjam]: Audio play failed', e));
                ctx.endpoint._audioElement = audio;
            }
        });

        client.on('trackRemoved', (ctx) => {
             if (ctx.endpoint._audioElement) {
                 ctx.endpoint._audioElement.srcObject = null;
                 ctx.endpoint._audioElement.remove();
             }
        });

        // Store client in wrapper
        window.fishjam = {
            client,
            
            /** Send position/velocity updates */
            sendMessage: (data) => {
                // We use updatePeerMetadata for the movement loop
                // We merge with existing metadata to preserve hp/assignedId
                client.updatePeerMetadata({
                    ...client.getLocalEndpoint()?.metadata,
                    ...data
                });
            },

            /** Trigger a spell cast */
            castSpell: (spellData) => {
                client.updatePeerMetadata({
                    ...client.getLocalEndpoint()?.metadata,
                    lastSpell: spellData,
                    lastSpellTime: Date.now()
                });
            },

            /** Authoritative HP update request (hits) */
            emitHit: async (hitData) => {
                try {
                    await fetch('/hit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(hitData)
                    });
                } catch (err) {
                    console.error('[Hit Error]:', err);
                }
            }
        };

        // Start voice chat if mic is already granted, otherwise do it on-demand
        if (window.localMicStream) {
            await startVoiceChat();
        } else {
            console.log('[Fishjam]: Waiting for audio.js to initialize microphone...');
            // We'll retry when the user first uses Shift (which calls initAudio in audio.js)
            window.addEventListener('micReady', async () => {
                await startVoiceChat();
            });
        }

    } catch (err) {
        console.error('[Fishjam Init Error]:', err);
    }
}

/** bridge from audio.js (Gemini result) to game level logic */
window.castSpellFromAudio = (result) => {
    if (!window.gameSceneRef) {
        console.warn('[Fishjam]: castSpellFromAudio called before GameScene was ready.');
        return;
    }
    window.gameSceneRef.prepareSpell(result);
};

async function startVoiceChat() {
    try {
        const stream = window.localMicStream || await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!window.localMicStream) window.localMicStream = stream;
        
        const track = stream.getAudioTracks()[0];
        await client.addTrack(track, stream, { type: 'voice' });
        console.log('[Fishjam]: Local voice published.');
    } catch (err) {
        console.warn('[Fishjam]: Failed to start voice chat —', err.message);
    }
}

// Start
joinArena();
