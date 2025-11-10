const express = require("express");
const router = express.Router();

const {registerUser,login,redisClearSessions}= require("../controllers/user.controller");
router.post("/register",registerUser);
router.post("/login",login);
router.post("/redisclear", redisClearSessions);

module.exports = router;