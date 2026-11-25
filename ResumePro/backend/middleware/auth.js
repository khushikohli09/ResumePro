// Authentication middleware: protects routes so only logged-in users can reach them.
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Express middleware. Expects an 'Authorization: Bearer <token>' header, verifies the JWT,
// loads the matching user into req.user and calls next(). Otherwise replies 401.
async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    // Take the part after 'Bearer ' as the token; null if the header is missing or malformed.
    const token = header.startsWith("Bearer ") ? header.split(" ")[1] : null;

    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token provided" });
    }

    // Throws if the token is invalid or expired; the catch block below turns that into a 401.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }

    // Make the user available to later handlers (controllers).
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorized, invalid or expired token" });
  }
}

module.exports = { protect };
