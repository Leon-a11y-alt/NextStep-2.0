const express = require("express");
const router = express.Router();
const c = require("../controllers/calendar.controller");

router.get("/", c.getTasks);
router.post("/", c.createTask);
router.put("/:id", c.updateTask);
router.delete("/:id", c.deleteTask);

module.exports = router;
