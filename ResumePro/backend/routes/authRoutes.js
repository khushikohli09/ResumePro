// Routes for signing up, logging in and user profile (mounted at /api/auth).
const express = require("express");
const { register, login, getMe, updateTheme } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Public routes (no token needed).
router.post("/register", register);
router.post("/login", login);
// Protected routes: protect runs first to check the token.
router.get("/me", protect, getMe);
router.patch("/theme", protect, updateTheme);

module.exports = router;
