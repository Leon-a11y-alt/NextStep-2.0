const express = require("express");
const router = express.Router();
const c = require("../controllers/focus.controller");
const asyncHandler = require("../middleware/asyncHandler");

router.get("/", asyncHandler(c.getSessions));
router.post("/", asyncHandler(c.createSession));

module.exports = router;
