// Helper to pull plain text out of uploaded PDF and Word files.
const fs = require("fs");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

// Reads the file at filePath and returns its text, choosing the parser by MIME type.
// Throws for unsupported types.
async function extractText(filePath, mimeType) {
  const buffer = fs.readFileSync(filePath);

  if (mimeType === "application/pdf") {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error("Unsupported file type for parsing");
}

module.exports = { extractText };
