const express = require("express");
const router = express.Router();

const matchRoutes = require("./matchRoutes");
const websiteRoutes = require("./websiteRoutes");
const roleRoutes = require("./roleRoutes");
const userRoutes = require("./userRoutes");
const authMiddleware = require("../Middleware/authentication");

router.use("/matches", authMiddleware, matchRoutes);
router.use("/websites", authMiddleware, websiteRoutes);
router.use("/roles", roleRoutes);
router.use("/users", userRoutes);

module.exports = router;
