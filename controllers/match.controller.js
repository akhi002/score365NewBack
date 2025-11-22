require("dotenv").config();
const axios = require("axios");
const Match = require("../models/match.model");
const Setting = require("../models/setting.model");
const mongoose = require("mongoose");
const { getRedisClient, connectRedis } = require("../config/db");

function findArray(obj) {
  if (Array.isArray(obj)) return obj;
  if (obj && typeof obj === "object") {
    for (const key of Object.keys(obj)) {
      const result = findArray(obj[key]);
      if (Array.isArray(result)) return result;
    }
  }
  return null;
}

const updateMarketIdsIfChanged = async (apiMatch, existingMatch) => {
  const dbMarketIds = (existingMatch.marketIds || []).sort().join(",");
  const apiMarketIds = (apiMatch.marketIds || []).sort().join(",");

  if (dbMarketIds !== apiMarketIds) {
    await Match.updateOne(
      { eventId: apiMatch.eventId },
      { $set: { marketIds: apiMatch.marketIds, updatedAt: new Date() } }
    );
    return true;
  }
  return false;
};

// const saveMatchesFromAPI = async (req, res) => {
//   try {
//     const requestBody = req?.body || {};

//     // 1️⃣ Fetch matches from external API
//     const response = await axios.post(
//       "https://scoreapi.365cric.com/api/match/getAllMatches",
//       requestBody
//     );

//     const matches = findArray(response.data);
//     if (!Array.isArray(matches)) {
//       return res.status(400).json({ error: "API did not return an array" });
//     }

//     // 2️⃣ Get all existing eventIds from DB
//     const existingMatches = await Match.find(
//       { eventId: { $in: matches.map((m) => m.eventId) } },
//       { eventId: 1 }
//     ).lean();

//     const existingEventIds = new Set(existingMatches.map((m) => m.eventId));

//     // 3️⃣ Find new matches (not in DB)
//     const newMatches = matches.filter((m) => !existingEventIds.has(m.eventId));

//     // 4️⃣ Prepare bulk operations
//     const bulkOps = [];

//     // 🟢 Insert new matches with isNew: true
//     for (const match of newMatches) {
//       bulkOps.push({
//         insertOne: {
//           document: { ...match, isNew: true },
//         },
//       });
//     }

//     // 🔵 For old/existing matches → set isNew: false (mark as not new)
//     await Match.updateMany({ isNew: true }, { $set: { isNew: false } });
//     // Run all bulk operations if any exist
//     if (bulkOps.length > 0) {
//       await Match.bulkWrite(bulkOps);
//     }

//     // 5️⃣ Delete matches that no longer exist in API
//     const apiEventIds = matches.map((m) => m.eventId);
//     await Match.deleteMany({ eventId: { $nin: apiEventIds } });

//     // ✅ Response
//     if (res) {
//       return res.json({
//         success: true,
//         message: "Database synced successfully",
//         totalMatches: matches.length,
//         newMatches: newMatches.length,
//       });
//     } else {
//       console.log(
//         `Database synced successfully. Total: ${matches.length}, New: ${newMatches.length}`
//       );
//     }
//   } catch (error) {
//     if (res)
//       res.status(500).json({ error: "Failed to fetch and save matches" });
//   }
// };

// const saveMatchesFromAPI = async (req, res) => {
//   try {
//     const requestBody = req?.body || {};

//     // 1️⃣ Fetch matches from external API
//     const response = await axios.post(
//       "https://scoreapi.365cric.com/api/match/getAllMatches",
//       requestBody
//     );

//     const matches = findArray(response.data);
//     if (!Array.isArray(matches)) {
//       return res.status(400).json({ error: "API did not return an array" });
//     }

//     // 2️⃣ Get all existing matches
//     const existingMatches = await Match.find(
//       {},
//       { eventId: 1, marketIds: 1 }
//     ).lean();
//     const existingMap = new Map();
//     existingMatches.forEach((m) => existingMap.set(m.eventId, m));

//     const bulkOps = [];
//     const apiEventIds = matches.map((m) => m.eventId);
//     let updatedCount = 0;

//     // 3️⃣ Process all API matches
//     for (const match of matches) {
//       const existing = existingMap.get(match.eventId);

//       if (!existing) {
//         // 🟢 Insert new match
//         bulkOps.push({
//           insertOne: { document: { ...match, isNew: true } },
//         });
//       } else {
//         // 🔵 Check & update marketIds if changed
//         const changed = await updateMarketIdsIfChanged(match, existing);
//         if (changed) updatedCount++;
//       }
//     }

//     // 4️⃣ Mark all matches as not new
//     await Match.updateMany({ isNew: true }, { $set: { isNew: false } });

//     // 5️⃣ Perform inserts
//     if (bulkOps.length > 0) {
//       await Match.bulkWrite(bulkOps);
//     }

//     // 6️⃣ Delete removed matches
//     await Match.deleteMany({ eventId: { $nin: apiEventIds } });

//     // ✅ Response
//     if (res) {
//       return res.json({
//         success: true,
//         message: "Database synced successfully",
//         totalMatches: matches.length,
//         newInserted: bulkOps.length,
//         updatedMarkets: updatedCount,
//       });
//     } else {
//       console.log(
//         `Synced: Total=${matches.length}, Inserted=${bulkOps.length}, UpdatedMarkets=${updatedCount}`
//       );
//     }
//   } catch (error) {
//     if (res)
//       res.status(500).json({ error: "Failed to fetch and save matches" });
//   }
// };

const getAllActiveMatches = async (req, res) => {
  try {
    const { sportId } = req.body;

    const query = { isActive: true };
    if (sportId) {
      query.sportId = sportId;
    }

    const matches = await Match.find(query).lean().sort({ openDate: 1 });

    if (sportId && matches.length === 0) {
      return res.status(404).json({
        status: "false",
        message: "No active matches found for the given sportId",
      });
    }

    return res.json({
      status: "success",
      matches,
      count: matches.length,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch matches" });
  }
};

const updateMatchScores = async (req, res) => {
  try {
    const { id, scoreId, scoreType } = req.body;

    if (!id) {
      return res.status(400).json({
        status: "false",
        message: "id is required",
      });
    }

    const updateFields = {};
    if (scoreId) updateFields.scoreId = scoreId;
    if (scoreType) updateFields.scoreType = scoreType;

    if (Object.keys(updateFields).length == 0) {
      return res.status(400).json({
        status: "false",
        message: "No fields provided to update",
      });
    }

    const updatedMatch = await Match.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedMatch) {
      return res.status(404).json({
        status: "false",
        message: "Match not found",
      });
    }

    res.json({
      status: "success",
      message: "Score updated successfully",
      data: updatedMatch,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateMatchStatus = async (req, res) => {
  try {
    const { id, isActive } = req.body;

    if (!id) {
      return res.status(400).json({
        status: "false",
        message: "id is required",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        status: "false",
        message: "isActive must be true or false",
      });
    }

    const updatedMatch = await Match.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );

    if (!updatedMatch) {
      return res.status(404).json({
        status: "false",
        message: "Match not found",
      });
    }

    res.json({
      message: "Status updated successfully",
      status: "success",
      data: updatedMatch,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllMatches = async (req, res) => {
  try {
    const { sportId } = req.body;

    // Always active matches
    let filter = { isActive: true };
   

    // Add sport filter if provided
    if (sportId) {
      filter.sportId = sportId;
    }

    const matches = await Match.find(filter).lean();
    const allMatches=await Match.find(sportId).lean()

    if (!matches || matches.length == 0) {
      return res.status(404).json({
        status: "false",
        message: "No matches found",
        totalCount: 0,
        activeCount: 0,
        inactiveCount: 0,
        data: [],
      });
    }

    const totalCount = matches.length;
    const activeCount = matches.filter((m) => m.isActive).length;
    const inactiveCount = totalCount - activeCount;

    res.json({
      message: "Matches fetched successfully",
      status: "success",
      totalCount,
      activeCount,
      inactiveCount,
      data: matches,
      allMatches:allMatches
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};



const updateScoreType = async (req, res) => {
  const { sportId, scoreType } = req.body;

  if (!sportId || !scoreType) {
    return res.status(400).json({
      status: "false",
      message: "sportId & scoreType required",
    });
  }

  try {
    const sport = await Match.updateMany(
      { sportId },
      { $set: { scoreType } },
      { new: true }
    );

    if (!sport) {
      return res.status(404).json({
        status: "false",
        message: "Sport not found",
      });
    }

    res.json({
      success: true,
      message: "ScoreType updated successfully",
      data: sport,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const updateScoreTypeForNewMatches = async (req, res) => {
  const { sportId, scoreType } = req.body;

  if (!sportId || !scoreType) {
    return res.status(400).json({
      success: false,
      message: "sportId & scoreType are required",
    });
  }

  try {
    const settingResult = await Setting.updateOne(
      { sportId },
      { $set: { scoreType } },
      { upsert: true }
    );

    const result = await Match.updateMany(
      { sportId, isNew: true },
      { $set: { scoreType, isNew: false } }
    );

    if (result.modifiedCount == 0) {
      return res.json({
        success: true,
        message: "No new matches found to update",
      });
    }

    res.json({
      success: true,
      message: `ScoreType updated for ${result.modifiedCount} new matches`,
      updatedCount: result.modifiedCount,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
};

const getAllSettings = async (req, res) => {
  try {
    const { sportId } = req.body;
    const settings = await Setting.find({ }).lean();

    if (!settings || settings.length == 0) {
      return res.status(404).json({
        success: false,
        message: "No settings found",
        data: [],
      });
    }

    return res.json({
      success: true,
      total: settings.length,
      data: settings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getScoreTypeBySportId = async (req, res) => {
  try {
    const { sportId } = req.body;

    if (!sportId) {
      return res.status(400).json({
        success: false,
        message: "sportId is required",
      });
    }

    //  sabse latest updated match find karo
    const match = await Match.findOne({ sportId })
      .sort({ updatedAt: -1 }) // latest first
      .select("scoreType updatedAt eventName") // sirf zaroori fields
      .lean();

    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found",
      });
    }

    res.json({
      success: true,
      message: "Latest scoreType fetched successfully",
      scoreType: match.scoreType,
      updatedAt: match.updatedAt,
      eventName: match.eventName || null,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateAllScoreTypes = async (req, res) => {
  try {
    const { scoreType } = req.body;

    if (!scoreType) {
      return res.status(400).json({
        status: false,
        message: "scoreType is required",
      });
    }

    const result = await Match.updateMany({}, { $set: { scoreType } });

    res.json({
      status: true,
      message: `ScoreType updated for ${result.modifiedCount} matches`,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const TV_API = "https://marketsarket.qnsports.live/virtualgames";

// Fetch and cache TV data in Redis
const tvUrlSync = async () => {
  try {
    const { data } = await axios.get(TV_API);

    if (!data || !Array.isArray(data)) {
      console.log("⚠️ No valid TV data received");
      return;
    }

    const redisClient = getRedisClient();

    for (const item of data) {
      if (item.eventId && item.channel) {
        await redisClient.set(`tv:${item.eventId}`, item.channel);
      }
    }

    console.log(`✅ Cached ${data.length} TV entries in Redis`);
  } catch (err) {
    console.error("❌ Error fetching TV API:", err.message);
  }
};

//  Helper function to get tvUrl
// const getTvUrl = async (eventId) => {
//   try {
//     const redisClient = getRedisClient();
//     const channel = await redisClient.get(`tv:${eventId}`);

//     if (channel) {
//       return `https://alpha-m.qnsports.live/route/?id=${channel}`;
//     }
//     return `https://live.jhabar.link/livetv.php?eventId=${eventId}`;
//   } catch (err) {
//     console.error("⚠️ Error getting TV URL:", err.message);
//     return `https://live.jhabar.link/livetv.php?eventId=${eventId}`;
//   }
// };

// const EXTERNAL_API = process.env.EXTERNAL_MATCH_API;
// const INTERVAL = 10 * 1000; // 10 seconds

//  Function to sync matches
// const matchSync = async () => {
//   try {
//     const { data } = await axios.get(EXTERNAL_API);

//     // Handle both "result" and "matches" keys
//     const matches = data.result || data.matches || [];

//     if (!matches.length) {
//       console.log("No matches found in API");
//       return;
//     }

//     //  Get existing matches from DB
//     const existingMatches = await Match.find({}, { eventId: 1 }).lean();
//     const existingEventIds = existingMatches.map((m) => m.eventId);
//     const newEventIds = matches.map((m) => m.eventId);

//     for (const match of matches) {
//       const tvUrl = await getTvUrl(match.eventId);
//       const filteredMatch = {
//         mType: match.mType || "manual",
//         eventId: match.eventId,
//         marketId: match.marketId,
//         eventName: match.eventName,
//         competitionName: match.competitionName,
//         competitionId: match.competitionId,
//         sportId: match.sportId,
//         sportName: match.sportName,
//         openDate: match.openDate,
//         type: match.type || "auto",
//         isActive: match.isActive ?? true,
//         isResult: match.isResult ?? false,
//         scoreId: match.scoreId || "0",
//         scoreId2: 0,
//         scoreType: match.scoreType || "",
//         tvUrl,
//         matchRunners: match.matchRunners || [],
//         matchType:
//           match.sportId == 4 && match.matchRunners.length == 3 ? "Test" : "All",
//         match_ka_type: match.match_ka_type || "",
//         inning_info: match.inning_info || {},
//         marketIds: match.marketIds || [match.marketId],
//       };
//       await Match.updateOne(
//         { eventId: match.eventId },
//         { $set: filteredMatch },
//         { upsert: true }
//       );
//     }

//     //  Delete old matches not in new data
//     const toDelete = existingEventIds.filter((id) => !newEventIds.includes(id));

//     if (toDelete.length > 0) {
//       await Match.deleteMany({ eventId: { $in: toDelete } });
//     }

//     console.log(
//       `matchSync completed. Total: ${matches.length}, Deleted: ${toDelete.length}`
//     );
//   } catch (err) {
//     console.error("Error syncinggg matches:", err.message);
//   }
// };

const getTvUrl = async (eventId,mType = "normal") => {
  try {
    const redisClient = getRedisClient();
    const channel = await redisClient.get(`tv:${eventId}`);

    if (channel && mType == "normal") {
      return `https://alpha-m.qnsports.live/route/?id=${channel}`;
    }
    return `https://live.jhabar.link/livetv.php?eventId=${eventId}`;
  } catch (err) {
    console.error("⚠️ Error getting TV URL:", err.message);
    return `https://live.jhabar.link/livetv.php?eventId=${eventId}`;
  }
};

const EXTERNAL_API = process.env.EXTERNAL_MATCH_API;
const INTERVAL = 10 * 1000; // 10 seconds

// Optimized function to sync matches
// const matchSync = async () => {
//   try {
//     const { data } = await axios.get(EXTERNAL_API);

//     const matches = data.result || data.matches || [];
//     if (!matches.length) {
//       console.log("No matches found in API");
//       return;
//     }

//     const existingMatches = await Match.find({}, { eventId: 1 }).lean();
//     const existingEventIds = new Set(existingMatches.map((m) => m.eventId));
//     const newEventIds = new Set(matches.map((m) => m.eventId));

//     const tvUrlResults = await Promise.allSettled(
//       matches.map((m) => getTvUrl(m.eventId))
//     );

//     // ✅ Prepare filtered matches in one pass
//     const filteredMatches = matches.map((match, idx) => ({
//       mType: match.mType || "manual",
//       eventId: match.eventId,
//       marketId: match.marketId,
//       eventName: match.eventName,
//       competitionName: match.competitionName,
//       competitionId: match.competitionId,
//       sportId: match.sportId,
//       sportName: match.sportName,
//       openDate: match.openDate,
//       type: match.type || "auto",
//       isActive: match.isActive ?? true,
//       isResult: match.isResult ?? false,
//       scoreId: match.scoreId || "0",
//       scoreId2: 0,
//       scoreType: match.scoreType || "",
//       tvUrl: tvUrlResults[idx]?.value || "",
//       matchRunners: match.matchRunners || [],
//       matchType:
//         match.sportId == 4 && match.matchRunners?.length == 3 ? "Test" : "All",
//       match_ka_type: match.match_ka_type || "",
//       inning_info: match.inning_info || {},
//       marketIds: match.marketIds || [match.marketId],
//     }));

//     //  Prepare all bulk operations together (not inside loop)
//     const bulkOps = filteredMatches.map((match) => ({
//       updateOne: {
//         filter: { eventId: match.eventId },
//         update: { $set: match },
//         upsert: true,
//       },
//     }));

//     // ✅ Single DB bulk write
//     if (bulkOps.length > 0) {
//       const res = await Match.bulkWrite(bulkOps);
//       console.log(
//         `✅ Upserted: ${res.upsertedCount}, Modified: ${res.modifiedCount}`
//       );
//     }

//     // ✅ Delete old matches in one go
//     const toDelete = [...existingEventIds].filter((id) => !newEventIds.has(id));
//     if (toDelete.length > 0) {
//       await Match.deleteMany({ eventId: { $in: toDelete } });
//       console.log(`🗑️ Deleted ${toDelete.length} old matches`);
//     }

//     console.log(
//       `✅ matchSync completed — Total: ${matches.length}, Deleted: ${toDelete.length}`
//     );
//   } catch (err) {
//     console.error("❌ Error syncing matches:", err.message);
//   }
// };

const matchSync = async () => {
  try {
    const { data } = await axios.get(EXTERNAL_API);

    const matches = data.result || data.matches || [];
    if (!matches.length) {
      console.log("No matches found in API");
      return;
    }

    const existingMatches = await Match.find({}, { eventId: 1 }).lean();
    const existingEventIds = new Set(existingMatches.map((m) => m.eventId));
    const newEventIds = new Set(matches.map((m) => m.eventId));

    const tvUrlResults = await Promise.allSettled(
      matches.map((m) => getTvUrl(m.eventId, m.mType))
    );

    const bulkOps = [];

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];

      const partialUpdate = {
        marketId: match.marketId,
        marketIds: match.marketIds || [match.marketId],
        openDate: match.openDate,
        tvUrl: tvUrlResults[i]?.value || "",
        updatedAt: new Date(),
      };

      bulkOps.push({
        updateOne: {
          filter: { eventId: match.eventId },
          update: {
            $set: partialUpdate,
            $setOnInsert: {
              // Only when NEW match
              mType: match.mType || "manual",
              eventName: match.eventName,
              competitionName: match.competitionName,
              competitionId: match.competitionId,
              sportId: match.sportId,
              sportName: match.sportName,
              type: match.type || "auto",
              isActive: true,
              isResult: false,
              scoreId: match.scoreId || "0",
              scoreId2: 0,
              scoreType: match.scoreType || "",
              matchRunners: match.matchRunners || [],
              matchType:
                match.sportId == 4 && match.matchRunners?.length == 3
                  ? "Test"
                  : "All",
              match_ka_type: match.match_ka_type || "",
              inning_info: match.inning_info || {},
              createdAt: new Date(),
            },
          },
          upsert: true,
        },
      });
    }

    // ---------- Bulk Write ----------
    if (bulkOps.length > 0) {
      const r = await Match.bulkWrite(bulkOps);
      console.log(
        `✅ Upserted: ${r.upsertedCount}, Modified: ${r.modifiedCount}`
      );
    }

    // ---------- Delete old matches ----------
    const toDelete = [...existingEventIds].filter((id) => !newEventIds.has(id));

    if (toDelete.length > 0) {
      await Match.deleteMany({ eventId: { $in: toDelete } });
      console.log(`🗑 Deleted: ${toDelete.length}`);
    }

    console.log("✅ matchSync completed successfully");
  } catch (err) {
    console.error("❌ matchSync error:", err.message);
  }
};

const manuallySyncMatches = async (req, res) => {
  try {
    const { data } = await axios.get(EXTERNAL_API);

    const matches = data.result || data.matches || [];
    if (!matches.length) {
      return res.json({
        status: false,
        message: "No matches found from external API",
      });
    }

    const existingMatches = await Match.find({}, { eventId: 1 }).lean();
    const existingEventIds = new Set(existingMatches.map((m) => m.eventId));
    const newEventIds = new Set(matches.map((m) => m.eventId));

    // ------- FETCH TV URLs IN PARALLEL -------
    const tvUrlResults = await Promise.allSettled(
      matches.map((m) => getTvUrl(m.eventId, m.mType))
    );

    const bulkOps = [];

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];

      const partialUpdate = {
        marketId: match.marketId,
        marketIds: match.marketIds || [match.marketId],
        openDate: match.openDate,
        tvUrl: tvUrlResults[i]?.value || "",
        updatedAt: new Date(),
      };

      bulkOps.push({
        updateOne: {
          filter: { eventId: match.eventId },
          update: {
            $set: partialUpdate,
            $setOnInsert: {
              mType: match.mType || "manual",
              eventName: match.eventName,
              competitionName: match.competitionName,
              competitionId: match.competitionId,
              sportId: match.sportId,
              sportName: match.sportName,
              type: match.type || "auto",
              isActive: true,
              isResult: false,
              scoreId: match.scoreId || "0",
              scoreId2: 0,
              scoreType: match.scoreType || "",
              matchRunners: match.matchRunners || [],
              matchType:
                match.sportId == 4 && match.matchRunners?.length == 3
                  ? "Test"
                  : "All",
              match_ka_type: match.match_ka_type || "",
              inning_info: match.inning_info || {},
              createdAt: new Date(),
            },
          },
          upsert: true,
        },
      });
    }

    // ---------- Bulk Write ----------
    const result = await Match.bulkWrite(bulkOps);

    // ---------- Delete Stale Matches ----------
    const toDelete = [...existingEventIds].filter((id) => !newEventIds.has(id));

    if (toDelete.length) {
      await Match.deleteMany({ eventId: { $in: toDelete } });
    }

    return res.json({
      status: true,
      message: "matchSync completed",
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
      deleted: toDelete.length,
    });
  } catch (err) {
    console.error("matchSync error:", err.message);
    return res.status(500).json({
      status: false,
      message: "matchSync failed",
      error: err.message,
    });
  }
};

(async () => {
  await tvUrlSync();
  // Schedule periodically
  // setInterval(tvUrlSync, 60 * 1000); // every 1 min
})();

const getMatches = async (req, res) => {
  try {
    const data = await Match.find().lean();
    if (!data.length) {
      return res.json({ status: "success", total: 0, matches: [] });
    }

    res.json({ status: "success", total: data.length, matches: data });
  } catch (err) {
    console.error(" Error in getMatches:", err.message);
    res.status(500).json({ status: "error", message: err.message });
  }
};

const EVENT_API = process.env.EVENT_API;

async function syncEventData() {
  try {
    const { data } = await axios.get(EVENT_API);
    if (!data || typeof data !== "object") {
      console.log(" Invalid API response");
      return;
    }

    const redis = getRedisClient();
    const keys = Object.keys(data);
    console.log(`Found ${keys.length} events`);

    const events = [];
    for (const key of keys) {
      const event = data[key];
      events.push(event);
    }
    await redis.set("stream", JSON.stringify(events));

    console.log("🎯 All events synced successfully");
  } catch (err) {
    console.error("❌ Error syncing events:", err.message);
  }
}

//  Run immediately & every 1 min
(async () => {
  await connectRedis(); // ensure Redis ready
  await syncEventData();

  // Repeat every 1 minute
  // setInterval(syncEventData, 60 * 1000);
})();

const TEAMNAME_API = process.env.TEAMNAME_API;

async function processMatchesFromRedis() {
  try {
    console.log("📦 Fetching matches from Redis...");

    // ✅ Initialize Redis client
    const redisClient = getRedisClient();

    // Redis se data nikalna
    const data = await redisClient.get("stream");
    if (!data) {
      console.log("⚠️ No match data found in Redis");
      return;
    }

    const matches =
      JSON.parse(data)?.filter(
        (dt) =>
          dt.sportId == "4" &&
          dt.scoreId != "0" &&
          (dt.scoreCardhomeTeam == "null" || dt.scoreCardawayTeam == "null")
      ) || [];

    console.log(`✅ ${matches.length} matches found to process`);

    for (const match of matches) {
      const scoreId = match.scoreId;

      try {
        const { data: teamResponse } = await axios.get(
          `${TEAMNAME_API}/${scoreId}`
        );
        console.log(
          `🏏 Team info fetched for scoreId ${scoreId}:`,
          teamResponse
        );

        // optionally update Redis or DB with team info here
        // await redisClient.set(`teaminfo:${scoreId}`, JSON.stringify(teamResponse));
      } catch (err) {
        console.error(
          `❌ Failed to fetch team info for scoreId ${scoreId}:`,
          err.message
        );
      }
    }

    console.log("🎯 Processing complete.");
  } catch (err) {
    console.error("❌ Error processing matches from Redis:", err.message);
  }
}

const CHUNK_SIZE = 10;
const CACHE_EXPIRY = 7200; // 2 hours

// ---------------------- Utility ----------------------

// ---------------------- Main Logic ----------------------

const chaId = "-1001234567890";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "YOUR_TELEGRAM_BOT_TOKEN";

// ======================= 🔹 MAIN FUNCTION =======================

const GET_SCORE_API = process.env.GET_SCORE_API;
const BANGLADEX_API = process.env.BANGLADEX_API;

const getResultScrapper = async () => {
  try {
    const redis = getRedisClient(); // ✅ Initialize Redis client

    const matches = await Match.find({
      isActive: true,
      mType: "normal",
    }).lean();
    if (!matches.length)
      return console.log("⚠️ No active normal matches found.");

    const chunked = chunkArray(matches, CHUNK_SIZE);

    for (const chunk of chunked) {
      await Promise.all(
        chunk.map(async (dt) => {
          const {
            eventId,
            eventName,
            sportId,
            scoreId,
            marketIds = [],
            marketId,
          } = dt;
          try {
            let status = "";

            // 🏸 STEP 1: Get score/timeline for sportId = 2
            if (sportId == 2 && scoreId !== "0") {
              try {
                const headers = {
                  "User-Agent": getRandomUserAgent(),
                  Accept: "*/*",
                  "Accept-Encoding": "gzip, deflate, br",
                  Connection: "keep-alive",
                  Host: "lt-fn-cdn001.akamaized.net",
                };

                const { data: timelineData } = await axios.get(
                  `${GET_SCORE_API}/${eventId}/${sportId}`,
                  { headers }
                );

                status =
                  timelineData?.result?.doc?.[0]?.data?.match?.status?.name ||
                  "";
              } catch (err) {
                console.log(
                  `⚠️ Timeline fetch failed for ${eventId}: ${err.message}`
                );
              }
            }

            // 🚫 STEP 2: Cancelled / Retired logic
            if (sportId === 2 && ["Cancelled", "Retired"].includes(status)) {
              await redis.setEx(
                `getResult-${marketId}`,
                7200,
                JSON.stringify([])
              );

              const msg = `⚠️ Walkover recorded:\nEvent: ${eventName}\nEventId: ${eventId}\nMarketId: ${marketId}`;
              const body = { eventId, walkOver: true };

              await Promise.allSettled([
                axios.post(BANGLADEX_API, body),
                sendMessage(chatId, msg),
              ]);

              return;
            }

            // 🏆 STEP 3: Normal market results
            await Promise.allSettled(
              marketIds.map(async (mkt) => {
                try {
                  const { data } = await axios.get(
                    `http://176.58.103.194:4000/api/multimarkets2/${mkt}`
                  );

                  await redis.setEx(
                    `getResult-${mkt}`,
                    7200,
                    JSON.stringify(data)
                  );
                } catch (err) {
                  console.log(`❌ Market ${mkt} failed: ${err.message}`);
                }
              })
            );
          } catch (err) {
            console.log(
              `❌ Error processing match ${dt.eventId}: ${err.message}`
            );
          }
        })
      );
    }

    console.log("✅ getResultScrapper completed successfully.");
  } catch (err) {
    console.log("❌ getResultScrapper failed:", err.message);
  }
};

// ======================= 🔹 HELPER FUNCTIONS =======================

const chunkArray = (arr, size) => {
  const result = [];
  for (let i = 0; i < arr.length; i += size)
    result.push(arr.slice(i, i + size));
  return result;
};

function getRandomUserAgent() {
  const agents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
    "Mozilla/5.0 (Linux; Android 13; SM-G996B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; rv:123.0) Gecko/20100101 Firefox/123.0",
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

async function sendMessage(chatId, text, parseMode = "HTML") {
  try {
    if (!BOT_TOKEN) return console.error("❌ TELEGRAM_BOT_TOKEN not set!");
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const payload = { chat_id: chatId, text, parse_mode: parseMode };
    const { data } = await axios.post(url, payload);
    return data;
  } catch (err) {
    console.error("❌ Telegram send error:", err.message);
  }
}

const getScoreIdNew = async () => {
  try {
    console.log("🚀 Fetching all score IDs...");

    const { data } = await axios.get(
      "http://13.233.90.208:3000/api/match/getAllScoreId"
    );

    if (!data?.result || !Array.isArray(data.result)) {
      console.log("⚠️ Invalid or empty response from API");
      return;
    }

    const updates = data.result.map(async (item) => {
      if (!item.eventId || !item.scoreId) return;

      const updated = await Match.findOneAndUpdate(
        { eventId: item.eventId, scoreId: "0" },
        { $set: { scoreId: item.scoreId } },
        { new: true }
      );

      if (updated) {
        console.log(
          `✅ Updated match: ${item.eventId} → scoreId: ${item.scoreId}`
        );
      }
    });

    await Promise.all(updates);

    console.log(`🎯 Done updating ${data.result.length} score IDs`);
  } catch (error) {
    console.error("❌ Error in getScoreIdNew:", error.message);
  }
};

const getMarketResult = async (req, res) => {
  try {
    const { marketId } = req.params;

    if (!marketId) {
      return res
        .status(400)
        .json({ success: false, message: "Market ID is required" });
    }

    const redis = getRedisClient();
    const redisKey = `getResult-${marketId}`;

    const cachedData = await redis.get(redisKey);

    if (!cachedData) {
      return res.status(404).json({
        success: false,
        message:
          "No data found for this Market ID (maybe expired or not stored yet)",
      });
    }

    const parsedData = JSON.parse(cachedData);

    return res.status(200).json({
      success: true,
      marketId,
      data: parsedData,
    });
  } catch (err) {
    console.error("❌ Error fetching market result:", err.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

const getStream = async (req, res) => {
  try {
    const redis = getRedisClient();
    const { Cno } = req.query;

    if (!Cno) {
      return res.status(400).json({
        status: 0,
        message: "Missing required parameter: Cno",
        result: { channelNo: "0" },
      });
    }

    // Fetch stream data from Redis

    const streamDataRaw = await redis.get("stream");
    const streamData = streamDataRaw ? JSON.parse(streamDataRaw) : [];

    // Find the matching stream by MatchID
    const matchedStream = streamData.find((dt) => dt.MatchID == Cno);

    if (!matchedStream || !matchedStream.Channel) {
      return res.status(200).json({
        status: 0,
        result: { channelNo: "0" },
      });
    }

    // Success response
    return res.status(200).json({
      status: 1,
      result: { channelNo: matchedStream.Channel },
    });
  } catch (error) {
    console.error("Error in getStream:", error);
    return res.status(200).json({
      status: 0,
      result: { channelNo: "0" },
    });
  }
};

const getLmtUrl = async (req, res) => {
  try {
    const { sourceType, sportId, gameId } = req.body;

    switch (sourceType) {
      case "Ckex":
        return res.send({
          url: `https://live.ckex.xyz/lmt/preview.html?matchId=${sportId}`,
        });

      case "Leon Bet": {
        const baseUrl =
          "https://ru.leonspwidget.com/iframe-widgets/dark/sportradarLiveMatchTracker";

        const family =
          gameId == 4 ? "Cricket" : gameId == 1 ? "Soccer" : "Tennis";

        return res.send({
          url: `${baseUrl}?matchId=${sportId}&type=match.lmtPlus&lang=en&family=${family}`,
        });
      }

      case "SS8":
        return res.send({
          url: `https://lmt.ss8055.com/index?Id=${sportId}&t=d`,
        });

      case "Fasthik":
        return res.send({
          url: `https://fasthit.uk/skyclnt/scoreboard-widget/?id=${sportId}&t=b`,
        });

      default:
        return res.send({ url: "" });
    }
  } catch (error) {
    console.log("LMT URL Error:", error);
    return res.status(500).send({ url: "", error: "Something went wrong" });
  }
};

const getMatchListByEventId = async (req, res) => {
  try {
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "eventId is required",
      });
    }

    const match = await Match.findOne({ eventId }).lean();
    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: match,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  manuallySyncMatches,
  getAllActiveMatches,
  updateMatchScores,
  updateMatchStatus,
  getAllMatches,
  updateScoreType,
  updateScoreTypeForNewMatches,
  getScoreTypeBySportId,
  updateAllScoreTypes,
  getAllSettings,
  matchSync,
  getMatches,
  syncEventData,
  processMatchesFromRedis,
  getResultScrapper,
  getScoreIdNew,
  getMarketResult,
  getStream,
  getLmtUrl,
  getMatchListByEventId,
};
