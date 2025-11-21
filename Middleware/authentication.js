// middleware/auth.js
const jwt = require("jsonwebtoken");

module.exports = async function authMiddleware(req, res, next) {
  try {
    let token = null;

    // ✅ 1️⃣ Try to get token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // ✅ 2️⃣ If no header token, try from cookies
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    // ✅ 3️⃣ If still no token found → reject
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token found",
      });
    }

    // ✅ 4️⃣ Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // ✅ 5️⃣ Redis session validation
    const redis = req.app.locals.redis;
    const sessionsKey = `user_sessions:${decoded.id}`;
    const sessions = await redis.lRange(sessionsKey, 0, -1);

    const isActive = sessions.some((s) => {
      try {
        const parsed = JSON.parse(s);
        return parsed.token === token;
      } catch {
        return false;
      }
    });

    if (!isActive) {
      return res.status(401).json({
        success: false,
        message: "Session expired or invalid",
      });
    }

    // ✅ All good → continue
    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }
};
