const matchController = require("../controllers/match.controller");

const interval=setInterval(() => {
    matchController.saveMatchesFromAPI();
}, 10 * 1 * 1000); 

module.exports = {interval};