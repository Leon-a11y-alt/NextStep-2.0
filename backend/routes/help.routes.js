// Study Help routes. Done by Khaing Khant Zaw.
const express = require("express");
const router = express.Router();
const c = require("../controllers/help.controller");
const asyncHandler = require("../middleware/asyncHandler");

router.post("/recommend", asyncHandler(c.recommend));               // one-shot JSON answer
router.post("/recommend-stream", asyncHandler(c.recommendStream));  // live "thinking process" (NDJSON)

module.exports = router;
