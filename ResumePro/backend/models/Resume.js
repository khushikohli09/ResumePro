// Mongoose models for resumes: one schema for the analysis results and one for the resume itself.
const mongoose = require("mongoose");

// Sub-document holding the analysis results of a resume (scores, keywords, feedback).
// _id: false stops Mongoose adding an id to this embedded object.
const analysisSchema = new mongoose.Schema(
  {
    atsScore: { type: Number, default: 0 },
    overallScore: { type: Number, default: 0 },
    jobDescription: { type: String, default: "" },
    matchScore: { type: Number, default: 0 },
    matchedKeywords: [{ type: String }],
    missingKeywords: [{ type: String }],
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    suggestions: [{ type: String }],
    // Per-category scores.
    sectionScores: {
      formatting: { type: Number, default: 0 },
      impact: { type: Number, default: 0 },
      clarity: { type: Number, default: 0 },
      keywords: { type: Number, default: 0 },
    },
    skillGaps: [{ type: String }],
  },
  { _id: false }
);

// A resume belongs to one user and is either uploaded as a file or created in the builder.
// timestamps: true adds createdAt/updatedAt automatically.
const resumeSchema = new mongoose.Schema(
  {
    // Owner of the resume; indexed because we often look resumes up by user.
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    source: { type: String, enum: ["uploaded", "builder"], default: "uploaded" },
    title: { type: String, default: "Untitled Resume" },
    fileName: { type: String },
    fileType: { type: String },
    // Text extracted from the uploaded file.
    rawText: { type: String },
    builderData: { type: mongoose.Schema.Types.Mixed }, // structured data for the builder
    analysis: analysisSchema,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Resume", resumeSchema);
