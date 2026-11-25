// Routes for managing a user's saved resumes (mounted at /api/resumes). All require login.
const express = require("express");
const { listResumes, getResume, deleteResume, renameResume } = require("../controllers/resumeController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
// List, fetch, rename and delete resumes.
router.get("/", listResumes);
router.get("/:id", getResume);
router.patch("/:id", renameResume);
router.delete("/:id", deleteResume);

module.exports = router;
