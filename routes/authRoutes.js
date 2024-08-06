const express = require("express");
const { singup, login, logout } = require("../Controllers/authController");

const router = express.Router();

router.post("/signup", singup);
router.post("/login", login);
router.post("/logout", logout);

module.exports = router;
