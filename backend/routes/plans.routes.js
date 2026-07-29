// Study Plans routes. Done by Khaing Khant Zaw.
//
// The address book: it maps each URL the browser can call to the controller
// function that handles it. server.js mounts this at /api/plans, so the paths
// below are all relative to that.
//
// asyncHandler wraps every function so that if one throws, Express returns a
// clean error instead of the whole server crashing.
const express = require("express");
const router = express.Router();
const c = require("../controllers/plans.controller");
const asyncHandler = require("../middleware/asyncHandler");

router.get("/", asyncHandler(c.getPlans));                              // GET    /api/plans?userId=1        -> my plans + their items
router.post("/", asyncHandler(c.createPlan));                           // POST   /api/plans                 -> new plan (with its items)
router.delete("/:id", asyncHandler(c.deletePlan));                      // DELETE /api/plans/3               -> delete a plan
router.post("/:id/lessons", asyncHandler(c.addLesson));                 // POST   /api/plans/3/lessons       -> add one item
router.put("/:id/lessons/:lessonId", asyncHandler(c.updateLesson));     // PUT    /api/plans/3/lessons/7     -> tick / untick an item

module.exports = router;
