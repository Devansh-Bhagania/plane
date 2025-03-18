const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinRoom", ({ room, name }) => {
    socket.join(room);
    if (!rooms[room]) rooms[room] = {};
    rooms[room][socket.id] = {
      id: socket.id,
      name,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      animation: "Idle",
      health: 100,
      kills: 0,
      deaths: 0,
      color: "#" + Math.floor(Math.random() * 16777215).toString(16),
    };
    socket.emit("currentPlayers", rooms[room]);
    socket.to(room).emit("playerJoined", rooms[room][socket.id]);
  });

  socket.on("updatePosition", (data) => {
    const { room, position, rotation, animation, health, kills, deaths } = data;
    if (rooms[room] && rooms[room][socket.id]) {
      rooms[room][socket.id] = { ...rooms[room][socket.id], position, rotation, animation, health, kills, deaths };
      socket.to(room).emit("playerMoved", rooms[room][socket.id]);
    }
  });

  socket.on("bulletUpdate", ({ room, bullet }) => {
    io.to(room).emit("bulletMoved", bullet);
  });

  socket.on("hit", ({ room, bulletId, position, victimId }) => {
    if (rooms[room] && rooms[room][victimId]) {
      rooms[room][victimId].health -= 10;
      if (rooms[room][victimId].health <= 0) {
        rooms[room][victimId].deaths += 1;
        rooms[room][socket.id].kills += 1;
      }
      io.to(room).emit("bulletHit", { bulletId, position, victimId });
      socket.to(room).emit("playerMoved", rooms[room][victimId]);
    }
  });

  socket.on("disconnect", () => {
    for (const room in rooms) {
      if (rooms[room][socket.id]) {
        socket.to(room).emit("playerDisconnected", socket.id);
        delete rooms[room][socket.id];
        if (Object.keys(rooms[room]).length === 0) delete rooms[room];
        break;
      }
    }
  });
});

server.listen(5000, () => console.log("Server running on port 5000"));