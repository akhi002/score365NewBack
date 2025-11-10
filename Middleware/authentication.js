// middleware/auth.js
const jwt = require("jsonwebtoken");

module.exports = async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ success: false, message: "No token found" });
    }

    // ✅ Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // ✅ Redis session check
    const redis = req.app.locals.redis;
    const sessionsKey = `user_sessions:${decoded.id}`; // same key pattern

    const sessions = await redis.lRange(sessionsKey, 0, -1);
    const isActive = sessions.some(s => JSON.parse(s).token == token);

    if (!isActive) {
      return res.status(401).json({ success: false, message: "Session expired or invalid" });
    }

    // ✅ All good
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Unauthorized access" });
  }
};
