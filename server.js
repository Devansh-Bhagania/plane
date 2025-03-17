const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });
const rooms = {};

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ userId, name, room }) => {
    socket.join(room);
    if (!rooms[room]) rooms[room] = { players: {} };
    rooms[room].players[userId] = { x: 0, y: 5, z: 0, rx: 0, ry: 0, rz: 0, name };
    io.to(room).emit("updatePlayers", rooms[room].players);
  });

  socket.on("updatePosition", ({ room, userId, position, rotation }) => {
    if (rooms[room] && rooms[room].players[userId]) {
      const player = rooms[room].players[userId];
      player.x = position.x;
      player.y = position.y;
      player.z = position.z;
      player.rx = rotation.x;
      player.ry = rotation.y;
      player.rz = rotation.z;
      io.to(room).emit("updatePlayers", rooms[room].players);
    }
  });

  socket.on("shoot", ({ room, shooterId, position, direction }) => {
    if (rooms[room] && rooms[room].players[shooterId]) {
      const bullet = { shooterId, position: [...position], direction: [...direction], id: Date.now() + Math.random() };
      io.to(room).emit("updateBullets", [bullet]);
    }
  });

  socket.on("bulletExpired", ({ room, shooterId, position }) => {
    // Optional: Handle collisions server-side if needed
  });

  socket.on("disconnect", () => {
    for (const room in rooms) {
      if (rooms[room].players[socket.id]) {
        delete rooms[room].players[socket.id];
        io.to(room).emit("updatePlayers", rooms[room].players);
        if (Object.keys(rooms[room].players).length === 0) delete rooms[room];
        break;
      }
    }
  });
});

server.listen(process.env.PORT || 5000, () => console.log(`Server on port ${process.env.PORT || 5000}`));