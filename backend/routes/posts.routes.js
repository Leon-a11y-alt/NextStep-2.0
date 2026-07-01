const express = require("express");
const router = express.Router();
const c = require("../controllers/posts.controller");

router.get("/", c.getPosts);
router.get("/:id", c.getPost);
router.post("/", c.createPost);
router.put("/:id", c.updatePost);
router.delete("/:id", c.deletePost);
router.post("/:id/upvote", c.upvotePost);

module.exports = router;
