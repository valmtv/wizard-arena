const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';

console.log('Starting client tests...');

// Connect Player 1
const player1 = io(SERVER_URL);

player1.on('connect', () => {
    console.log('[Test Client 1] Connected with ID:', player1.id);
});

player1.on('PLAYER_JOINED', (data) => {
    console.log('[Test Client 1] PLAYER_JOINED received:', data);
    
    // Connect Player 2 after Player 1 joins
    const player2 = io(SERVER_URL);
    
    player2.on('connect', () => {
        console.log('[Test Client 2] Connected with ID:', player2.id);
    });

    player2.on('PLAYER_JOINED', (data2) => {
        console.log('[Test Client 2] PLAYER_JOINED received:', data2);
        
        // Emulate Player 1 sending a STATE_UPDATE
        console.log('[Test Client 1] Emitting STATE_UPDATE...');
        player1.emit('STATE_UPDATE', { x: 100, y: 150, velocity: { x: 0, y: 0 } });
        
        // Emulate Player 2 casting a spell
        setTimeout(() => {
            console.log('[Test Client 2] Emitting SPELL_CAST...');
            player2.emit('SPELL_CAST', { spell: 'fireball', x: 200, y: 200, angle: 45, scale: 1 });
        }, 500);

        // Try to connect a third player to see the rejection later
        setTimeout(() => {
            console.log('[Test Client 3] Attempting to connect...');
            const player3 = io(SERVER_URL);
            player3.on('disconnect', (reason) => {
                console.log('[Test Client 3] Disconnected as expected (server full). Reason:', reason);
                console.log('\n--- Test finished! You can check the server logs. ---');
                process.exit(0);
            });
        }, 1000);
    });
    
    player2.on('BROADCAST_STATE', (stateData) => {
        console.log('[Test Client 2] BROADCAST_STATE received:', stateData);
    });
});

player1.on('BROADCAST_SPELL', (spellData) => {
    console.log('[Test Client 1] BROADCAST_SPELL received:', spellData);
});
