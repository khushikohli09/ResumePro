// File upload middleware (multer): saves uploaded resumes to disk and restricts type and size.
const multer = require("multer");
const path = require("path");

// Store files in the backend/uploads folder with a unique name (timestamp + random number)
// plus the original extension, so two uploads never overwrite each other.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "..", "uploads")),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

// MIME types we accept: PDF and Word documents.
const allowedTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
];

// Accept the file if its MIME type is allowed, otherwise reject with an error
// (handled by the central error handler in app.js).
const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF and Word documents (.pdf, .doc, .docx) are supported"), false);
  }
};

// Configured multer instance; routes use it like upload.single("file").
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

module.exports = upload;
