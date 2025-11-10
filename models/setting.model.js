const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema({
  sportId: {
    type: String,
    required: true,
    unique: true,
  },
  scoreType: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model("Setting", settingSchema);
