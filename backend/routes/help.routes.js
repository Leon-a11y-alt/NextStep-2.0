// Study Help routes. Done by Khaing Khant Zaw.
const express = require("express");
const router = express.Router();
const c = require("../controllers/help.controller");
const asyncHandler = require("../middleware/asyncHandler");

router.post("/recommend", asyncHandler(c.recommend));

module.exports = router;
