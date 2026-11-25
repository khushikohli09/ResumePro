// Database setup: connects Mongoose to MongoDB.
const mongoose = require("mongoose");

// Connects to MongoDB using MONGO_URI (falls back to a local database if unset).
// Exits the process on failure, since the app cannot work without its database.
async function connectDB() {
  try {
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/resumeai";
    await mongoose.connect(uri);
    console.log(`[db] MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error(`[db] Connection error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = connectDB;
