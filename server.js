require("dotenv").config();
const { connectMongoDB, connectRedis } = require("./config/db");
const { matchSync, processMatchesFromRedis ,syncEventData, getResultScrapper} = require("./controllers/match.controller");

const INTERVAL = 10 * 1000; // 10 sec

(async () => {
  try {
    console.log("🚀 Starting background sync...");
    await connectMongoDB();
    await connectRedis();

    console.log("✅ Mongo & Redis ready. Running first sync...");
    // await matchSync();

    setInterval(async () => {
      console.log("Running scheduled matchSync..." );
      await matchSync();
      await syncEventData();
      await processMatchesFromRedis();
      await getResultScrapper();
    
    }, INTERVAL);

    console.log("Background sync loop started...");

  } catch (err) {
    console.error(" Server error:", err.message);
  }
})();



// tO flux key in redis
//  1 :--flushall
