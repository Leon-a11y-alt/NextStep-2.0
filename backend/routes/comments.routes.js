const express = require("express");
const router = express.Router();
const c = require("../controllers/comments.controller");

router.get("/", c.getComments);
router.post("/", c.createComment);

module.exports = router;
