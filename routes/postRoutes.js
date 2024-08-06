const express = require("express");
const {
  createPost,
  updatePost,
  deletePost,
  getPosts,
  addComment,
} = require("../Controllers/postController");
const { protect } = require("../Controllers/authController");

const router = express.Router();

router.post("/createPost", protect, createPost);
router.post("/addComment", protect, addComment);
router.patch("/updatePost/:id", protect, updatePost);
router.delete("/deletePost", protect, deletePost);
router.get("/getPosts", protect, getPosts);

module.exports = router;
