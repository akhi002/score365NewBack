// matchSync.js
const axios = require("axios");
const mongoose = require("mongoose");

const EXTERNAL_API =
  "https://data2.mainredis.in/api/match/getMatches?isActive=true&isResult=false&type=own&sportId=124";

const DB_COLLECTION = "matches"; // MongoDB collection name
const INTERVAL = 10 * 60 * 1000; // 10 minutes (600,000 ms)

async function startMatchSync() {
  console.log("🕒 Match Sync Service Started...");

  setInterval(async () => {
    try {
      console.log("🔁 Fetching matches from external API...");
      const { data } = await axios.get(EXTERNAL_API);

      const matches = data?.matches || [];

      if (!matches.length) {
        console.log("⚠️ No matches found in external API");
        return;
      }

      const MatchCollection = mongoose.connection.collection(DB_COLLECTION);

      // Fetch all existing matches
      const existingMatches = await MatchCollection.find({}).toArray();
      const existingEventIds = existingMatches.map((m) => m.eventId);
      const newEventIds = matches.map((m) => m.eventId);

      // ✅ Add or Update Matches
      for (const match of matches) {
        await MatchCollection.updateOne(
          { eventId: match.eventId },
          { $set: match },
          { upsert: true }
        );
      }

      // ❌ Delete Matches that no longer exist in API
      const toDelete = existingEventIds.filter((id) => !newEventIds.includes(id));
      if (toDelete.length > 0) {
        await MatchCollection.deleteMany({ eventId: { $in: toDelete } });
        console.log(`🗑 Deleted ${toDelete.length} old matches`);
      }

      console.log(`✅ Sync complete (${matches.length} matches processed)`);

    } catch (err) {
      console.error("❌ Error syncing matches:", err.message);
    }
  }, INTERVAL);
}

module.exports = { startMatchSync };
