const mongoose = require("mongoose");

const postSchema = mongoose.Schema({
  description: {
    type: String,
    required: [true, "Share your thoughts!"],
  },
  like: {
    type: Number,
    default: 0,
  },
  dislike: {
    type: Number,
    default: 0,
  },
  love: {
    type: Number,
    default: 0,
  },
  commentedUser: [
    {
      userId: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true,
      },
      comment: {
        type: String,
        required: [true, "Provide your opinion"],
      },
    },
  ],
  reactedUsers: [
    {
      userId: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true,
      },
      reactionType: {
        type: String,
        enum: ["like", "dislike", "love"],
        required: true,
      },
    },
  ],
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "Post must belong to a User!"],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
