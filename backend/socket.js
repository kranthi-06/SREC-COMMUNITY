const socketIo = require('socket.io');

let io;
const connectedUsers = new Map(); // userId -> socket.id

module.exports = {
    init: (server) => {
        io = socketIo(server, {
            cors: {
                origin: process.env.FRONTEND_URL || '*',
                methods: ["GET", "POST"]
            },
            // Important to allow WebSockets through Vercel / reverse proxies
            transports: ['websocket', 'polling']
        });

        io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            socket.on('authenticate', (userId) => {
                if (userId) {
                    connectedUsers.set(userId, socket.id);
                    console.log(`User ${userId} authenticated on socket ${socket.id}`);
                }
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
                // Remove user from map
                for (let [userId, socketId] of connectedUsers.entries()) {
                    if (socketId === socket.id) {
                        connectedUsers.delete(userId);
                        break;
                    }
                }
            });
        });

        return io;
    },
    getIo: () => {
        if (!io) {
            console.warn('Socket.io not initialized, maybe running in serverless environment.');
            return null;
        }
        return io;
    },
    getConnectedUserSocket: (userId) => {
        return connectedUsers.get(userId);
    }
};
