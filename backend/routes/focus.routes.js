const express = require("express");
const router = express.Router();
<<<<<<< HEAD

const controller = require("../controllers/focus.controller");
const asyncHandler = require("../middleware/asyncHandler");

router.get("/", asyncHandler(controller.getSessions));
router.post("/", asyncHandler(controller.createSession));

module.exports = router;
=======
const c = require("../controllers/focus.controller");
const asyncHandler = require("../middleware/asyncHandler");

router.get("/", asyncHandler(c.getSessions));
router.post("/", asyncHandler(c.createSession));

module.exports = router;
>>>>>>> 189b85227e2c974ee0574a4a4bc4b50171a4a331
