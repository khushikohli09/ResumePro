// Routes for the resume builder (mounted at /api/builder). All require login.
const express = require("express");
const { generateBullets, generateSummary, saveBuilderResume } = require("../controllers/builderController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
// AI helpers that write bullet points / a summary.
router.post("/generate-bullets", generateBullets);
router.post("/generate-summary", generateSummary);
// Create a new builder resume (POST) or update an existing one (PUT); same handler for both.
router.post("/", saveBuilderResume);
router.put("/:id", saveBuilderResume);

module.exports = router;
