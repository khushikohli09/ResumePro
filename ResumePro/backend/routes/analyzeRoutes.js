// Routes for analysing resumes (mounted at /api/analyze). All require login.
const express = require("express");
const { analyzeUpload, analyzeText, rematchAgainstJob } = require("../controllers/analyzeController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

// Every route below needs a valid token.
router.use(protect);
// Upload a resume file (form field name "file") and analyse it.
router.post("/upload", upload.single("file"), analyzeUpload);
// Analyse resume text sent directly in the request body.
router.post("/text", analyzeText);
// Re-run the job-description match for an already saved resume.
router.post("/:id/rematch", rematchAgainstJob);

module.exports = router;
