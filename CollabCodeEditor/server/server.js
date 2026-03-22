const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] }
});

// In-memory room store: roomId -> { users: Map, document: string, history: [] }
const rooms = new Map();

// REST endpoint to check server health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', ({ roomId, userName }) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Map(),
        document: '// Start coding here...\n',
        history: [],
        language: 'javascript'
      });
    }

    const room = rooms.get(roomId);
    const user = { id: socket.id, name: userName, color: getRandomColor() };
    room.users.set(socket.id, user);
    socket.join(roomId);
    socket.userData = { roomId, userName };

    // Send current state to the joining user
    socket.emit('init', {
      document: room.document,
      users: Array.from(room.users.values()),
      language: room.language
    });

    // Notify others
    socket.to(roomId).emit('user_joined', user);
    console.log(`${userName} joined room ${roomId}`);
  });

  socket.on('operation', ({ roomId, operation }) => {
    const room = rooms.get(roomId);
    if (room) {
      // Apply the operation to server-side document state
      room.document = operation.text;
      // Add to history for version rollback
      room.history.push({ text: operation.text, timestamp: Date.now(), userId: socket.id });
      if (room.history.length > 50) room.history.shift(); // Keep last 50 versions

      // Broadcast to all OTHER users in the room
      socket.to(roomId).emit('operation', { operation, userId: socket.id });
    }
  });

  socket.on('cursor_move', ({ roomId, position }) => {
    const room = rooms.get(roomId);
    if (room) {
      const user = room.users.get(socket.id);
      if (user) {
        socket.to(roomId).emit('cursor_moved', {
          userId: socket.id,
          position,
          color: user.color,
          name: user.name
        });
      }
    }
  });

  socket.on('language_change', ({ roomId, language }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.language = language;
      socket.to(roomId).emit('language_changed', { language, userId: socket.id });
    }
  });

  socket.on('get_history', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      socket.emit('history', room.history);
    }
  });

  socket.on('rollback', ({ roomId, index }) => {
    const room = rooms.get(roomId);
    if (room && room.history[index]) {
      const snapshot = room.history[index];
      room.document = snapshot.text;
      io.to(roomId).emit('operation', {
        operation: { text: snapshot.text },
        userId: 'system'
      });
    }
  });

  socket.on('disconnect', () => {
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        room.users.delete(socket.id);
        io.to(roomId).emit('user_left', socket.id);
        console.log(`${user?.name} left room ${roomId}`);

        // Clean up empty rooms
        if (room.users.size === 0) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty)`);
        }
      }
    });
  });
});

function getRandomColor() {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#C7B8EA', '#F7DC6F'];
  return colors[Math.floor(Math.random() * colors.length)];
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
