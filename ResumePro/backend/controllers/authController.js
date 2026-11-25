// Controllers for registration, login and the current user's profile.
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Creates a signed JWT containing the user id. Lifetime comes from JWT_EXPIRES_IN (default 7 days).
function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// Returns only safe user fields (never the password) to send to the client.
function sanitize(user) {
  return { id: user._id, name: user.name, email: user.email, theme: user.theme };
}

// POST /api/auth/register { name, email, password }: validates input, rejects duplicate emails (409),
// creates the user (password is hashed by the model) and returns { token, user }.
async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const user = await User.create({ name, email, password });
    const token = signToken(user._id);
    res.status(201).json({ token, user: sanitize(user) });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
}

// POST /api/auth/login { email, password }: returns { token, user } or 401.
// The same message is used for unknown email and wrong password so attackers can't tell which was wrong.
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // password is hidden by default, so ask for it explicitly to compare.
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(user._id);
    res.json({ token, user: sanitize(user) });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
}

// GET /api/auth/me: returns the user that protect middleware already loaded.
async function getMe(req, res) {
  res.json({ user: sanitize(req.user) });
}

// PATCH /api/auth/theme { theme }: saves 'light' or 'dark' for the user.
async function updateTheme(req, res) {
  try {
    const { theme } = req.body;
    if (!["light", "dark"].includes(theme)) {
      return res.status(400).json({ message: "Theme must be 'light' or 'dark'" });
    }
    req.user.theme = theme;
    await req.user.save();
    res.json({ user: sanitize(req.user) });
  } catch (err) {
    res.status(500).json({ message: "Could not update theme", error: err.message });
  }
}

module.exports = { register, login, getMe, updateTheme };
