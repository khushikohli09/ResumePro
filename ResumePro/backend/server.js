// Entry point: loads environment variables, connects to MongoDB, then starts the HTTP server.
require("dotenv").config();
const connectDB = require("./config/db");
const app = require("./app");

// Use the PORT from .env if set, otherwise default to 5000.
const PORT = process.env.PORT || 5000;

// Only start listening once the database connection has succeeded.
connectDB().then(() => {
  app.listen(PORT, () => console.log(`[server] Listening on port ${PORT}`));
});
