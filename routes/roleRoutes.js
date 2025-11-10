const express = require("express");
const router = express.Router();
const { createRole } = require("../controllers/role.controller");

router.post("/create", createRole);

module.exports = router;
