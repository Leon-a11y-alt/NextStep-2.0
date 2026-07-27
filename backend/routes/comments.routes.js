const express = require("express");
const router = express.Router();
const c = require("../controllers/comments.controller");
const asyncHandler = require("../middleware/asyncHandler");

router.get("/", asyncHandler(c.getComments));
router.post("/", asyncHandler(c.createComment));
router.put("/:id", asyncHandler(c.updateComment));
router.delete("/:id", asyncHandler(c.deleteComment));
// The URLs stay /like and /dislike (that's what the frontend calls); the
// controller functions were renamed to upvote/downvote to match posts.
router.post("/:id/like", asyncHandler(c.upvoteComment));       // Done by Andrea Ho
router.post("/:id/dislike", asyncHandler(c.downvoteComment));  // Done by Andrea Ho

module.exports = router;
