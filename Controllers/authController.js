const catchAsync = require("../utils/catchAsync");
const User = require("../models/userModel");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const AppError = require("./../utils/AppError");
const sendEmail = require("./../utils/email.js");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};
/////////////////////////////
exports.singup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role,
  });

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async function (req, res, next) {
  const { email, password } = req.body;
  // cheking if email and password exist
  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }
  // cheking if user exists && password is correct
  const curUser = await User.findOne({ email }).select("+password");
  if (!curUser || !(await curUser.correctPassword(password, curUser.password)))
    return next(new AppError("Email or Password isnt correct!", 400));
  //sending token

  createSendToken(curUser, 201, res);
});

exports.protect = catchAsync(async function (req, res, next) {
  //Getting token from header and cheking if its there;
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token)
    return next(
      new AppError("You are not logged in, please log in to get access")
    );
  //Verifies token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //cheks if user still exists
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    return next(
      new AppError("The user belonging this token does no longer exists", 401)
    );
  }
  //cheks if password was changed after token was issued;
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );
  }
  //Everything good - get acces to Content;
  req.user = freshUser;
  next();
});

exports.restrictTo = catchAsync(async function (req, res, next) {
  if (req.user.role !== "admin") {
    return next(new AppError("You do not have permission on this action"));
  }
  next();
});

exports.forgotPassword = catchAsync(async function (req, res, next) {
  console.log(req.body);
  //Get user with email and chek if it exists//
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with this email address", 404));
  }
  //Generate and save resetToken
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  // Sending email
  const resetURL = `http://localhost:3000/forgot-password/${resetToken}`;

  const message = `Forgot your password? to change your password please go to: ${resetURL} `;
  try {
    sendEmail({
      email: user.email,
      subject: "Reset your password (valid 10 min)",
      message,
    });
    res.status(200).json({
      status: "succes",
      message: "Token sent to email!",
    });
  } catch (error) {
    //in case of error setting RESETTOKEN TO UNDEFINED
    (user.passwordResetToken = undefined),
      (user.passwordResetExpires = undefined),
      await user.save({ validateBeforeSave: false });

    return next(
      new AppError("There was an error sending email. Try again later!", 500)
    );
  }
});

exports.resetPassword = catchAsync(async function (req, res, next) {
  // Gets user based on token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // cheks if user exists and token is valid , sets new password
  if (!user) {
    return next(new AppError("Token is invalid or expired", 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  //signs in

  createSendToken(user, 201, res);
});

exports.updatePassword = catchAsync(async function (req, res, next) {
  const user = await User.findOne({ email: req.user.email }).select(
    "+password"
  );
  // checks if currpass is true
  if (!(await user.correctPassword(req.body.curPassword, user.password))) {
    return next(new AppError("Please provide correct Current password", 401));
  }
  //updating password//
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // Loggins user with new JWT

  createSendToken(user, 201, res);
});

exports.isLoggedIn = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return next(new AppError("You are not logged in!", 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify token
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    req.user = user; // Attach user to request
    next();
  } catch (err) {
    return next(new AppError("Invalid token", 401));
  }
};

exports.logout = (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true, // Prevents JavaScript access
    secure: process.env.NODE_ENV === "production", // Ensures cookie is sent over HTTPS
    sameSite: "Strict", // Prevents CSRF attacks
    expires: new Date(0), // Sets the cookie to expire immediately
    path: "/", // Applies the cookie site-wide
  });

  res.status(200).json({ status: "success" });
};
