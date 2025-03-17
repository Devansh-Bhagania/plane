// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let players = {};
let bullets = [];

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on("joinGame", ({ userId }) => {
    players[socket.id] = { x: 0, y: 10, z: 0, rx: 0, ry: 0, rz: 0, health: 100 };
    io.emit("updatePlayers", players);
  });

  socket.on("move", ({ x, y, z, rx, ry, rz }) => {
    if (players[socket.id]) {
      players[socket.id].x = x;
      players[socket.id].y = y;
      players[socket.id].z = z;
      players[socket.id].rx = rx;
      players[socket.id].ry = ry;
      players[socket.id].rz = rz;
      io.emit("updatePlayers", players);
    }
  });

  socket.on("shoot", ({ targetId, position, direction }) => {
    if (players[socket.id] && players[targetId]) {
      const bullet = {
        position: position, // Use client-provided position
        direction: direction, // Use client-provided direction
        shooterId: socket.id,
      };
      bullets.push(bullet);

      setTimeout(() => {
        if (players[targetId]) {
          players[targetId].health -= 20;
          io.emit("hit", { targetId, damage: 20 });
          if (players[targetId].health <= 0) {
            delete players[targetId];
          }
        }
        bullets = bullets.filter((b) => b !== bullet);
        io.emit("updateBullets", bullets);
        io.emit("updatePlayers", players);
      }, 1000); // Bullet lifetime
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
    console.log(`Player disconnected: ${socket.id}`);
  });
});

server.listen(5000, () => console.log("Server running on port 5000"));