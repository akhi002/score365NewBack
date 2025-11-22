const express = require("express");
const {
    manuallySyncMatches,
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
    getStream,
    getLmtUrl,
    getMatchListByEventId
} = require("../controllers/match.controller");

const router = express.Router();

// router.post("/", saveMatchesFromAPI);
router.post("/syncMatches",manuallySyncMatches)
router.post("/getMatchesBySport", getAllActiveMatches);
router.post("/updateMatchScores", updateMatchScores);
router.post("/changeStatus", updateMatchStatus);
router.post("/activeMatches", getAllMatches);
router.post("/allSports", getAllMatches);
router.post("/updateScoreType", updateScoreType);
router.post("/updateScoreTypeForNewMatches", updateScoreTypeForNewMatches);
router.post("/getScoreTypeBySportId", getScoreTypeBySportId);
router.post("/updateAllScoreTypes", updateAllScoreTypes);
router.post("/getAllSettings", getAllSettings);
router.post("/getMatches", getMatches);
router.post("/getMarketId/:marketId", getMarketResult);
router.post("/getStream", getStream);
router.post("/getscoreurl",getLmtUrl);
router.post("/matchByEventId",getMatchListByEventId)


module.exports = router;
