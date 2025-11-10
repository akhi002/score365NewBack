const express = require("express");
const {
    saveMatchesFromAPI,
    getAllActiveMatches,
    updateMatchScores,
    updateMatchStatus,
    getAllMatches,
    updateScoreType,
    updateScoreTypeForNewMatches,
    getScoreTypeBySportId,
    updateAllScoreTypes,
    getAllSettings,
    getMatches,
    getMarketResult,
    getStream
} = require("../controllers/match.controller");

const router = express.Router();

router.post("/", saveMatchesFromAPI);
router.post("/getMatchesBySport", getAllActiveMatches);
router.post("/updateMatchScores", updateMatchScores);
router.post("/changeStatus", updateMatchStatus);
router.post("/activeMatches", getAllMatches);
router.post("/updateScoreType", updateScoreType);
router.post("/updateScoreTypeForNewMatches", updateScoreTypeForNewMatches);
router.post("/getScoreTypeBySportId", getScoreTypeBySportId);
router.post("/updateAllScoreTypes", updateAllScoreTypes);
router.post("/getAllSettings", getAllSettings);
router.post("/getMatches", getMatches);
router.post("/getMarketId/:marketId", getMarketResult);
router.post("/getStream", getStream);


module.exports = router;
