const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please tell us  ur Name!"],
  },
  email: {
    type: String,
    required: [true, "Please provide your Email"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid Email"],
  },
  photo: {
    type: String,
    default: "default.jpg",
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
    select: false,
  },
  password: {
    type: String,
    required: [true, "Please provide your Password"],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your Password"],
    validate: {
      //Works only on CREATE AND SAVE !!!
      validator: function (el) {
        return el === this.password;
      },
      message: "Passwords are not the same",
    },
  },
  passwordChangetAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre("save", async function (next) {
  //Cheks if password is modified
  if (!this.isModified("password")) return next();
  //hashes password
  this.password = await bcrypt.hash(this.password, 10);
  //deletes passwordConfirm field from DB
  this.passwordConfirm = undefined;
  return next();
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangetAt = Date.now() - 15000;
  next();
});

userSchema.methods.correctPassword = async function (candidatePass, pass) {
  return await bcrypt.compare(candidatePass, pass);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangetAt) {
    const changedTimestamp = parseInt(
      this.passwordChangetAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }

  // PASSWORD WASNT CHANGED - IF FALSE
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
