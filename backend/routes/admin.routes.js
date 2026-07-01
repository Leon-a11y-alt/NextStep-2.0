const express = require("express");
const router = express.Router();
const c = require("../controllers/admin.controller");

router.get("/pending-posts", c.getPendingPosts);
router.put("/posts/:id/approve", c.approvePost);
router.put("/posts/:id/reject", c.rejectPost);

router.get("/reports", c.getReports);
router.put("/reports/:id/resolve", c.resolveReport);

router.get("/requests", c.getRequests);
router.put("/requests/:id/approve", c.approveRequest);
router.put("/requests/:id/reject", c.rejectRequest);

router.get("/stats", c.getStats);

module.exports = router;
