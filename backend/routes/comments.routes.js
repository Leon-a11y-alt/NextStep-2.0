const express = require("express");
const router = express.Router();
const c = require("../controllers/comments.controller");
const asyncHandler = require("../middleware/asyncHandler");

router.get("/", asyncHandler(c.getComments));
router.post("/", asyncHandler(c.createComment));
router.put("/:id", asyncHandler(c.updateComment));
router.delete("/:id", asyncHandler(c.deleteComment));

module.exports = router;
