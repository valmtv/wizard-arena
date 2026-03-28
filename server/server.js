const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the /client directory
app.use(express.static(path.join(__dirname, '../client')));

// Basic connection test
io.on('connection', (socket) => {
    console.log('[Server]: A user connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('[Server]: A user disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`[Server]: Wizard Arena running on http://localhost:${PORT}`);
});
