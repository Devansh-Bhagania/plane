const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const THREE = require("three"); // Import THREE.js

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (adjust for production)
    methods: ["GET", "POST"],
  },
});

// Store rooms with players and bullets
const rooms = {}; // { roomName: { players: {}, bullets: [] } }

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle room joining
  socket.on("joinRoom", ({ userId, name, room }) => {
    socket.join(room);

    // Initialize room if it doesn't exist
    if (!rooms[room]) {
      rooms[room] = { players: {}, bullets: [] };
    }

    // Add player to room with initial position and rotation
    rooms[room].players[userId] = {
      x: Math.random() * 20 - 10, // Random starting x (-10 to 10)
      y: 5,                       // Start at height 5
      z: Math.random() * 20 - 10, // Random starting z (-10 to 10)
      rx: 0,                      // Rotation x (pitch)
      ry: 0,                      // Rotation y (yaw)
      rz: 0,                      // Rotation z (roll)
      name,                       // Player's name
      health: 100,                // Initial health
      score: 0,                   // Initial score
    };

    // Broadcast updated players list to room
    io.to(room).emit("updatePlayers", rooms[room].players);
    console.log(`${name} (${userId}) joined room: ${room}`);
  });

  // Handle position updates from players
  socket.on("updatePosition", ({ room, userId, position, rotation }) => {
    if (rooms[room] && rooms[room].players[userId]) {
      const player = rooms[room].players[userId];
      player.x = position.x;
      player.y = position.y;
      player.z = position.z;
      player.rx = rotation.x;
      player.ry = rotation.y;
      player.rz = rotation.z;

      // Broadcast updated players list to room
      io.to(room).emit("updatePlayers", rooms[room].players);
    }
  });

  // Handle shooting
  socket.on("shoot", ({ room, shooterId, position, direction }) => {
    if (!rooms[room] || !rooms[room].players[shooterId]) return;

    const bullet = {
      shooterId,
      position: [...position], // Clone position array
      direction: [...direction], // Clone direction array
      id: Date.now() + Math.random(), // Unique ID for bullet
    };

    rooms[room].bullets.push(bullet);
    io.to(room).emit("updateBullets", rooms[room].bullets);

    // Bullet lifetime and collision check
    setTimeout(() => {
      // Remove bullet after 2 seconds
      rooms[room].bullets = rooms[room].bullets.filter((b) => b.id !== bullet.id);
      io.to(room).emit("updateBullets", rooms[room].bullets);

      // Simple collision detection
      for (const targetId in rooms[room].players) {
        if (targetId === shooterId) continue; // Don't hit self

        const target = rooms[room].players[targetId];
        const bulletPos = new THREE.Vector3(...bullet.position);
        const targetPos = new THREE.Vector3(target.x, target.y, target.z);

        // Check if bullet is close to target
        if (bulletPos.distanceTo(targetPos) < 2) { // 2 units radius
          target.health = Math.max(target.health - 20, 0); // Reduce health by 20
          if (target.health <= 0) {
            target.x = Math.random() * 20 - 10; // Respawn
            target.y = 5;
            target.z = Math.random() * 20 - 10;
            target.health = 100; // Reset health
            rooms[room].players[shooterId].score += 50; // Award points for kill
          }
          io.to(room).emit("hit", { targetId, damage: 20 });
          io.to(room).emit("updatePlayers", rooms[room].players);
          break; // Bullet hits only one target
        }
      }
    }, 2000); // Bullet lifetime of 2 seconds

    // Update bullet position every frame (server-side simulation)
    const interval = setInterval(() => {
      const bulletIndex = rooms[room].bullets.findIndex((b) => b.id === bullet.id);
      if (bulletIndex === -1) {
        clearInterval(interval);
        return;
      }

      const b = rooms[room].bullets[bulletIndex];
      const dir = new THREE.Vector3(...b.direction);
      b.position[0] += dir.x * 0.5; // Speed of 0.5 units per frame
      b.position[1] += dir.y * 0.5;
      b.position[2] += dir.z * 0.5;

      io.to(room).emit("updateBullets", rooms[room].bullets);
    }, 16); // ~60 FPS update
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    for (const room in rooms) {
      if (rooms[room].players[socket.id]) {
        delete rooms[room].players[socket.id];
        io.to(room).emit("updatePlayers", rooms[room].players);
        console.log(`User disconnected: ${socket.id} from room: ${room}`);

        // Clean up empty rooms
        if (Object.keys(rooms[room].players).length === 0) {
          delete rooms[room];
          console.log(`Room ${room} deleted (empty)`);
        }
        break;
      }
    }
  });
});

// Serve a simple endpoint for health check
app.get("/", (req, res) => {
  res.send("Plane Combat Server is running!");
});

// Start server
const PORT = process.env.PORT || 5000; // Match client port
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});