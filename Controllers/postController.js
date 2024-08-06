const Post = require("./../models/postModel");
const User = require("../models/userModel");
const AppError = require("./../utils/AppError");
const catchAsync = require("../utils/catchAsync");

exports.createPost = catchAsync(async (req, res, next) => {
  const user = req.user;

  const newPost = await Post.create({
    description: req.body.description,
    user: user,
  });

  res.status(200).json({
    status: "succes",
    post: newPost,
  });
});

exports.updatePost = catchAsync(async (req, res, next) => {
  const postId = req.params.id;
  const userId = req.user.id;
  const { reaction } = req.body;

  //checks if post is made by current loged in user

  const post = await Post.findById({ _id: postId });
  const alreadyReacted = await Post.findOne({
    _id: postId,
    reactedUsers: { $elemMatch: { userId } },
  });

  if (reaction === "like" && !alreadyReacted) {
    post.like = +1;
    post.reactedUsers.push({ userId, reactionType: reaction });
    await post.save();
  } else if (reaction === "dislike" && !alreadyReacted) {
    post.dislike = +1;
    post.reactedUsers.push({ userId, reactionType: reaction });
    await post.save();
  } else if (reaction === "love" && !alreadyReacted) {
    post.love = +1;
    post.reactedUsers.push({ userId, reactionType: reaction });
    await post.save();
  }

  res.status(200).json({
    status: "succes",
    post,
  });
});

exports.addComment = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { comment, id } = req.body;

  const post = await Post.findById({ _id: id });
  if (!post) {
    return next(new AppError("There is no post with that id", 404));
  }
  post.commentedUser.push({ userId, comment });
  await post.save();

  res.status(200).json({
    status: "succes",
  });
});

exports.deletePost = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  // Find the post by ID
  const post = await Post.findById(req.body.id);

  // Check if the post exists
  if (!post) {
    return next(new AppError("Post not found", 404));
  }

  // Check if the logged-in user is the owner of the post
  if (userId.toString() !== post.user.toString()) {
    return next(
      new AppError("You have no permission to perform this action", 403)
    );
  }

  // Delete the post
  await post.deleteOne();

  // Send response
  res.status(200).json({
    status: "success",
    message: "Post deleted",
  });
});

exports.getPosts = catchAsync(async function (req, res, next) {
  const posts = await Post.find()
    .populate("user", "name email photo")
    .populate("commentedUser.userId", "name email")
    .populate("commentedUser", "comment")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    data: posts,
    user: req.user,
  });
});
