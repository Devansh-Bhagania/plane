const mongoose = require("mongoose");

const PlaneSchema = new mongoose.Schema({
  model: { type: String, required: true },
  speed: { type: Number, default: 100 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
});

module.exports = mongoose.model("Plane", PlaneSchema);
