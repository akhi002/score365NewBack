
// const express = require('express');
// const dotenv = require('dotenv');
// const cookieParser = require("cookie-parser");
// const cors = require('cors');
// const { errors } = require('celebrate');
// const routes = require('./routes/indexRoutes');
// const limiter = require('./utils/serverSecurity');

// // const { interval } = require('./utils/scrapper'); 
// const { connectMongoDB, connectRedis, redisClient } = require('./config/db');

// dotenv.config();
// const app = express();
 
// const origins=["http://localhost:4800","http://localhost:4200"]

// app.use(cors({
//   origin: origins,
//   credentials: true, // allow cookies
// }));
// // app.use(require('./Middleware/encryptResponse'));
// app.use(express.json());
// app.use(cookieParser());
// app.use(express.urlencoded({ extended: true }));

// (async () => {
//   await connectMongoDB();
//   // Connect Redis
//   const redis = await connectRedis();
//   // Make Redis available in routes
//   app.locals.redis = redis;

//   app.use('/api', limiter, routes);
//   app.use(errors());
//   const PORT = process.env.PORT || 5000;
//   app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// })();

const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { errors } = require('celebrate');
const routes = require('./routes/indexRoutes');
const limiter = require('./utils/serverSecurity');
const { connectMongoDB, connectRedis } = require('./config/db');

dotenv.config();
const app = express();

const origins = ["http://localhost:4800", "http://localhost:4200"];

app.use(cors({
  origin: origins,
  credentials: true,
}));
// app.use(require('./Middleware/encryptResponse'));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

(async () => {
  try {
    await connectMongoDB();

    //  Connect Redis before loading routes
    const redis = await connectRedis();
    app.locals.redis = redis;

    console.log(" Redis Client Ready:", !!app.locals.redis);

    //  Load routes only after Redis connection
    app.use('/api', limiter, routes);
    app.use(errors());

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error(" Server Startup Error:", err.message);
    process.exit(1);
  }
})();
