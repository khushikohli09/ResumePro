// Controllers for listing, viewing, renaming and deleting the logged-in user's resumes.
// Every query filters by user: req.user._id so users can only touch their own resumes.
const Resume = require("../models/Resume");

// GET /api/resumes: returns a lightweight list (no full text), newest-updated first.
async function listResumes(req, res) {
  try {
    const resumes = await Resume.find({ user: req.user._id })
      .select("title source fileName analysis.atsScore analysis.overallScore createdAt updatedAt")
      .sort({ updatedAt: -1 });
    res.json({ resumes });
  } catch (err) {
    res.status(500).json({ message: "Could not fetch resumes", error: err.message });
  }
}

// GET /api/resumes/:id: returns one full resume, or 404 if it doesn't exist or isn't the user's.
async function getResume(req, res) {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
    if (!resume) return res.status(404).json({ message: "Resume not found" });
    res.json({ resume });
  } catch (err) {
    res.status(500).json({ message: "Could not fetch resume", error: err.message });
  }
}

// DELETE /api/resumes/:id: deletes one resume owned by the user.
async function deleteResume(req, res) {
  try {
    const resume = await Resume.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!resume) return res.status(404).json({ message: "Resume not found" });
    res.json({ message: "Resume deleted" });
  } catch (err) {
    res.status(500).json({ message: "Could not delete resume", error: err.message });
  }
}

// PATCH /api/resumes/:id with { title }: renames a resume. new: true returns the updated document.
async function renameResume(req, res) {
  try {
    const { title } = req.body;
    const resume = await Resume.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { title },
      { new: true }
    );
    if (!resume) return res.status(404).json({ message: "Resume not found" });
    res.json({ resume });
  } catch (err) {
    res.status(500).json({ message: "Could not rename resume", error: err.message });
  }
}

module.exports = { listResumes, getResume, deleteResume, renameResume };
