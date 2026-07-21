// SpeedPlay route — one endpoint: turn uploaded notes into a quiz.
const express = require("express");
const router = express.Router();
const c = require("../controllers/sorting.controller");
const asyncHandler = require("../middleware/asyncHandler");

router.post("/upload", asyncHandler(c.uploadNotes)); // POST /api/sorting/upload

module.exports = router;
