const User = require("../models/user.model");
const Role = require("../models/role.model");
const { hashPassword, comparePassword } = require("../utils/passwordhasing");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { client } = require("../index");
const { encrypt } = require("../utils/encrypt");

const registerUser = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      roleName,
      deviceId,
      deviceType,
      location,
    } = req.body;

    if (!username || !email || !password || !roleName) {
      return res
        .status(400)
        .json({ success: false, message: "All fields required" });
    }

    const role = await Role.findOne({ name: roleName });
    if (!role) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await hashPassword(password);

    // Capture client info
    const ipAddress =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: role._id,
      deviceId: deviceId || null,
      deviceType: deviceType || "unknown",
      ipAddress,
      location: location || null,
      userAgent,
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        username,
        email,
        role: role.name,
        device: {
          deviceId: newUser.deviceId,
          deviceType: newUser.deviceType,
          ipAddress: newUser.ipAddress,
          location: newUser.location,
          userAgent: newUser.userAgent,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password)
//       return res.status(400).json({ success: false, message: "Missing email or password" });

//     const user = await User.findOne({ email }).populate("role");
//     if (!user) return res.status(404).json({ success: false, message: "User not found" });

//     const isMatch = await comparePassword(password, user.password);
//     if (!isMatch)
//       return res.status(401).json({ success: false, message: "Invalid credentials" });

//     const token = jwt.sign(
//       { userId: user._id, role: user.role.name },
//       process.env.JWT_SECRET,
//       { expiresIn: "1d" }
//     );

//     res.cookie("Access_Token", token, {
//       httpOnly: true,     // prevents JS access
//       secure: false,      // true in production (HTTPS)
//       sameSite: "strict", // CSRF protection
//       maxAge: 24 * 60 * 60 * 1000 // 1 day
//     });

//     res.json({
//       success: true,
//       message: "Login successful",
//       token,
//       user: {
//         username: user.username,
//         email: user.email,
//         role: user.role.name,
//         permissions: user.role.permissions,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// }

const MAX_DEVICES = 2;

exports.generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).populate("role");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(401)
        .json({ success: false, message: "Invalid password" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const encryptedUserId = (user._id.toString());

    const deviceId = req.headers["x-device-id"] || `device-${Date.now()}`;
    const deviceType = req.headers["x-device-type"] || "unknown";

    const redisClient = req.app.locals.redis;
    if (!redisClient) throw new Error("Redis client not initialized");

    const key = `user_sessions:${user._id}`;
    let sessions = await redisClient.lRange(key, 0, -1);
    sessions = sessions
      .map((s) => {
        try {
          return JSON.parse(s);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const deviceSession = sessions.find((s) => s.deviceId === deviceId);

    if (!deviceSession && sessions.length >= MAX_DEVICES) {
      return res.status(403).json({
        success: false,
        message: `You have already logged in on ${MAX_DEVICES} devices. Logout from another device to continue.`,
      });
    }

    if (!deviceSession) {
      const newSession = {
        deviceId,
        deviceType,
        token,
        loginAt: new Date().toISOString(),
      };
      await redisClient.rPush(key, JSON.stringify(newSession));
    } else {
      deviceSession.token = token;
      const index = sessions.findIndex((s) => s.deviceId === deviceId);
      await redisClient.lSet(key, index, JSON.stringify(deviceSession));
    }

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });

    res.json({
      success: true,
      message: "Login successful",
      token,
      encryptedUserId,
      device: { deviceId, deviceType },
    });
  } catch (err) {
    console.error("❌ Login Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

const redisClearSessions = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID required " });
    }

    const redisClient = req.app.locals.redis;
    const key = `user_sessions:${userId}`;

    await redisClient.del(key);

    return res.json({
      success: true,
      message: `Sessions cleared for user ${userId}`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { registerUser, login, redisClearSessions };
