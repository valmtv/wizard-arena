// Game logic will go here.
// Initializing window-level socket connection for now.
const socket = io();

socket.on('connect', () => {
    console.log('[Client]: Connected to server via socket.io');
});
