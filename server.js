const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const THREE = require("three");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const rooms = {};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("joinRoom", ({ userId, name, room }) => {
    socket.join(room);
    if (!rooms[room]) rooms[room] = { players: {}, bullets: [] };
    rooms[room].players[userId] = {
      x: Math.random() * 20 - 10,
      y: 5,
      z: Math.random() * 20 - 10,
      rx: 0,
      ry: 0,
      rz: 0,
      name,
      health: 100,
      score: 0,
    };
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
    if (!rooms[room] || !rooms[room].players[shooterId]) return;
    const bullet = { shooterId, position: [...position], direction: [...direction], id: Date.now() + Math.random() };
    rooms[room].bullets.push(bullet);
    io.to(room).emit("updateBullets", [bullet]); // Only send new bullet
  });

  socket.on("bulletExpired", ({ room, shooterId, position }) => {
    if (!rooms[room]) return;
    rooms[room].bullets = rooms[room].bullets.filter((b) => b.shooterId !== shooterId || b.position.toString() !== position.toString());
    io.to(room).emit("updateBullets", rooms[room].bullets);

    for (const targetId in rooms[room].players) {
      if (targetId === shooterId) continue;
      const target = rooms[room].players[targetId];
      const bulletPos = new THREE.Vector3(...position);
      const targetPos = new THREE.Vector3(target.x, target.y, target.z);
      if (bulletPos.distanceTo(targetPos) < 2) {
        target.health = Math.max(target.health - 20, 0);
        if (target.health <= 0) {
          target.x = Math.random() * 20 - 10;
          target.y = 5;
          target.z = Math.random() * 20 - 10;
          target.health = 100;
          rooms[room].players[shooterId].score += 50;
        }
        io.to(room).emit("hit", { targetId, damage: 20 });
        io.to(room).emit("updatePlayers", rooms[room].players);
        break;
      }
    }
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

app.get("/", (req, res) => res.send("Plane Combat Server is running!"));
server.listen(process.env.PORT || 5000, () => console.log(`Server running on port ${process.env.PORT || 5000}`));