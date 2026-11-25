// Routes for the extra career tools (mounted at /api/tools). All require login.
const express = require("express");
const c = require("../controllers/toolsController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
// Each route maps to a handler in controllers/toolsController.js.
router.get("/roles", c.listRoles);
router.post("/grammar", c.grammarCheck);
router.post("/authenticity", c.authenticityCheck);
router.post("/linkedin", c.linkedinSuggestions);
router.post("/jobs", c.jobRecommendations);
router.post("/roadmap", c.skillRoadmap);
router.post("/portfolio", c.portfolioGenerate);

module.exports = router;
