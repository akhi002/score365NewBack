const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema(
  {
    mType: { type: String, default: "" },
    eventId: { type: String, required: true, unique: true },
    marketId: { type: String, default: "" },
    eventName: { type: String, default: "" },
    competitionName: { type: String, default: "" },
    competitionId: { type: String, default: "" },
    sportId: { type: Number, default: 0 },
    sportName: { type: String, default: "" },
    openDate: { type: Date, default: null },
    type: { type: String, default: "auto" },
    isActive: { type: Boolean, default: true },
    isResult: { type: Boolean, default: false },
    scoreId: { type: String, default: "0" },
    scoreId2: { type: Number, default: 0 },
    scoreType: { type: String, default: "" },
    tvUrl: { type: String, default: "" },
    matchRunners: { type: Array, default: [] },
    matchType: { type: String, default: "All" },
    match_ka_type: { type: String, default: "" },
    inning_info: { type: Object, default: {} },
    marketIds: { type: [String], default: [] },

    scoreCardhomeTeam: { type: String, default: null },
    scoreCardawayTeam: { type: String, default: null },
    isNew: { type: Boolean, default: true }

  },
  { timestamps: true }
);

module.exports = mongoose.model("Match", matchSchema);
