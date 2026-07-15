const express = require("express");
const router = express.Router();
const c = require("../controllers/plans.controller");
const asyncHandler = require("../middleware/asyncHandler");

// Study plans + their lessons.
router.get("/", asyncHandler(c.getPlans));
router.post("/", asyncHandler(c.createPlan));
router.delete("/:id", asyncHandler(c.deletePlan));
router.post("/:planId/lessons", asyncHandler(c.addLesson));
router.put("/:planId/lessons/:lessonId", asyncHandler(c.toggleLesson));

module.exports = router;
