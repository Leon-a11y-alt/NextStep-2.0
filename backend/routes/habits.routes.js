const express = require("express");
const router = express.Router();
const c = require("../controllers/habits.controller");

router.get("/", c.getHabits);
router.post("/", c.createHabit);
router.put("/:id", c.updateHabit);
router.delete("/:id", c.deleteHabit);

module.exports = router;
