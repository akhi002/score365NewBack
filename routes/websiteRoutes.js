const express = require("express");
const router = express.Router();


const {
    createWebsite,
    getAllWebsites,
    updateWebsiteDomain,
    deleteWebsite
} = require("../controllers/website.controller");

router.post("/", createWebsite);
router.post("/get", getAllWebsites);
router.post("/update", updateWebsiteDomain);
router.post("/delete", deleteWebsite);

module.exports = router;