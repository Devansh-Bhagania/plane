const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("joinRoom", ({ room, name }) => {
    socket.join(room);
    if (!rooms[room]) {
      rooms[room] = {};
    }

    rooms[room][socket.id] = {
      id: socket.id,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      animation: "idle",
      name: name || `Player${Object.keys(rooms[room]).length + 1}`,
    };

    // Send current players in the room to the new player
    socket.emit("currentPlayers", rooms[room]);

    // Notify others in the room of the new player
    socket.to(room).emit("playerJoined", rooms[room][socket.id]);
    console.log(`${socket.id} joined room ${room}`);
  });

  socket.on("updatePosition", (data) => {
    const { room, position, rotation, animation } = data;
    if (rooms[room] && rooms[room][socket.id]) {
      rooms[room][socket.id].position = position;
      rooms[room][socket.id].rotation = rotation;
      rooms[room][socket.id].animation = animation;
      socket.to(room).emit("playerMoved", rooms[room][socket.id]);
    }
  });

  socket.on("chatMessage", (message) => {
    const room = Object.keys(socket.rooms)[1]; // Get the first joined room
    if (room && rooms[room] && rooms[room][socket.id]) {
      const playerName = rooms[room][socket.id].name;
      io.to(room).emit("chatMessage", { playerName, message });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    for (const room in rooms) {
      if (rooms[room][socket.id]) {
        socket.to(room).emit("playerDisconnected", socket.id);
        delete rooms[room][socket.id];
        if (Object.keys(rooms[room]).length === 0) {
          delete rooms[room];
        }
        break;
      }
    }
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});