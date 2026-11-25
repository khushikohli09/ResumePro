// Builds and configures the Express app (middleware + routes) without starting it;
// server.js is what actually calls listen(). Keeping them apart makes testing easier.
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const analyzeRoutes = require("./routes/analyzeRoutes");
const builderRoutes = require("./routes/builderRoutes");
const toolsRoutes = require("./routes/toolsRoutes");

const app = express();

// Allow the frontend (browser) to call this API from a different origin.
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
// Parse JSON request bodies (max 2MB).
app.use(express.json({ limit: "2mb" }));
// Parse HTML-form style (urlencoded) request bodies.
app.use(express.urlencoded({ extended: true }));

// Basic abuse protection on the API surface, especially the LLM-backed routes
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

// Simple health-check endpoint: returns status and how long the server has been running (seconds).
app.get("/api/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

// Mount each group of routes under its URL prefix.
app.use("/api/auth", authRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/analyze", analyzeRoutes);
app.use("/api/builder", builderRoutes);
app.use("/api/tools", toolsRoutes);

// Any unmatched /api URL gets a JSON 404 instead of Express's default HTML page.
app.use("/api", (req, res) => res.status(404).json({ message: "Route not found" }));

// Central error handler (e.g. multer file-type errors)
// Express recognises error handlers by their 4 parameters (err, req, res, next); keep all four.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

module.exports = app;
