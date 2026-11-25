// Mongoose model for application users (account details and theme preference).
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Schema: email is unique and stored lowercase; password is hidden from queries by default (select: false)
// and must be requested explicitly with .select("+password").
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    theme: { type: String, enum: ["light", "dark"], default: "light" },
  },
  { timestamps: true }
);

// Runs before every save: hash the password with bcrypt, but only if it was changed,
// so we never store plain-text passwords and never re-hash an existing hash.
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compares a plain-text password with the stored hash. Returns a Promise resolving to true/false.
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);
