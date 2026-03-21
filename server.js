const express = require('express')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
    cors: { origin: '*' }
})

const rooms = {}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    socket.on('join-room', (roomId, userId, userName) => {
        socket.join(roomId)
        socket.userName = userName
        socket.roomId = roomId

        if (!rooms[roomId]) rooms[roomId] = []
        rooms[roomId] = rooms[roomId].filter(u => u.socketId !== socket.id)
        rooms[roomId].push({ socketId: socket.id, userName })

        console.log(`${userName} joined room ${roomId}`)
        socket.to(roomId).emit('user-connected', socket.id, userName)
    })

    socket.on('signal', (data) => {
        io.to(data.to).emit('signal', {
            from: socket.id,
            signal: data.signal,
            name: data.name
        })
    })

    socket.on('media-state', (data) => {
        socket.to(socket.roomId).emit('peer-media-state', {
            socketId: socket.id,
            video: data.video,
            audio: data.audio,
        })
    })

    socket.on('chat-message', (data) => {
        io.to(socket.roomId).emit('chat-message', {
            id:        Date.now(),
            userName:  data.userName,
            message:   data.message,
            timestamp: new Date().toISOString(),
        })
    })

    socket.on('disconnect', () => {
        const roomId = socket.roomId
        if (roomId && rooms[roomId]) {
            rooms[roomId] = rooms[roomId].filter(u => u.socketId !== socket.id)
            socket.to(roomId).emit('user-disconnected', socket.id)
            console.log(`${socket.userName} left room ${roomId}`)
        }
    })
})

server.listen(5000, () => console.log('Signaling server running on port 5000'))