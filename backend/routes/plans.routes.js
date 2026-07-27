const express = require("express");
const router = express.Router();
const c = require("../controllers/plans.controller");
const asyncHandler = require("../middleware/asyncHandler");

router.get("/", asyncHandler(c.getPlans));
router.post("/", asyncHandler(c.createPlan));
router.delete("/:id", asyncHandler(c.deletePlan));
router.post("/:id/lessons", asyncHandler(c.addLesson));
router.put("/:id/lessons/:lessonId", asyncHandler(c.updateLesson));

module.exports = router;
