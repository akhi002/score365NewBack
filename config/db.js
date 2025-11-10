const mongoose = require('mongoose');
const { createClient } = require('redis');

let redisClient; // Redis client instance

// ------------------ MongoDB ------------------
const connectMongoDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ MongoDB Error: ${err.message}`);
    process.exit(1);
  }
};

// ------------------ Redis ------------------
const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    redisClient.on('error', (err) => console.error('❌ Redis Error:', err));

    await redisClient.connect();
    console.log('✅ Redis Connected');

    return redisClient; // <-- IMPORTANT: ye line jaruri hai
  } catch (err) {
    console.error(`❌ Redis Error: ${err.message}`);
    process.exit(1);
  }
};

const   getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

module.exports = { connectMongoDB, connectRedis, getRedisClient };
