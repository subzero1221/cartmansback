const express = require("express");
const multer = require("multer");
const {
  getUsers,
  updateMe,
  getUser,
  getUserDataWithId,
  updatePhoto,
} = require("../Controllers/userController");
const {
  protect,
  restrictTo,
  forgotPassword,
  resetPassword,
  updatePassword,
  isLoggedIn,
} = require("../Controllers/authController");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

router.get("/getUsers", protect, restrictTo, getUsers);
router.get("/getUser", isLoggedIn, getUser);
router.post("/forgotPassword", forgotPassword);
router.patch("/resetPassword/:token", resetPassword);
router.patch("/updatePassword", protect, updatePassword);
router.patch("/updateMe", protect, upload.single("photo"), updateMe);

module.exports = router;
