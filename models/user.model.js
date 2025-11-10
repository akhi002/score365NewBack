const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
    required: true,
  },

  // deviceId: { type: String },
  // deviceType: { type: String, enum: ["web", "mobile", "tablet", "unknown"], default: "unknown" },
  // ipAddress: { type: String },
  // location: { type: String },
  // userAgent: { type: String },
}, { timestamps: true });


module.exports = mongoose.model("User", userSchema);
