const User = require("../models/userModel");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { google } = require("googleapis");
const stream = require("stream");
const path = require("path");
require("dotenv").config({ path: "./config.env" });

const filterObj = (obj, ...allowed) => {
  const newObject = {};
  Object.keys(obj).forEach((el) => {
    if (allowed.includes(el)) newObject[el] = obj[el];
  });
  return newObject;
};

exports.getUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();
  res.status(200).json({
    message: "succes",
    data: {
      users,
    },
  });
});

const apiKey = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: process.env.GOOGLE_AUTH_URI,
  token_uri: process.env.GOOGLE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN,
};

async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: apiKey,
    scopes: process.env.SCOPE,
  });
  return await auth.getClient(); // Return the authorized client
}

////STORES PHOTO TO GOOGLE DRIVE///////////////////
async function photoManager(file) {
  const authClient = await getAuthClient(); // Get the auth client
  const drive = google.drive({ version: "v3", auth: authClient });

  // Create a readable stream from the file buffer
  const bufferStream = new stream.PassThrough();
  bufferStream.end(file.buffer);

  const fileMetadata = {
    name: `${file.originalname}`, // Use user ID as file name
    parents: ["17I6yodbDwDkGPavz24k9xOd7tI7Ar-BH"], // Google Drive folder ID
  };

  const media = {
    mimeType: file.mimetype,
    body: bufferStream, // Use the readable stream here
  };

  try {
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id",
    });

    return response.data;
  } catch (error) {
    throw error;
  }
}
//////GET PHOTO FROM GOOGLE DRIVE////////////////
async function getPhotoUrl(fileId) {
  const authClient = await getAuthClient(); // Get the auth client
  const drive = google.drive({ version: "v3", auth: authClient });

  try {
    const response = await drive.files.get({
      fileId: fileId,
      fields: "webViewLink", // Fetch the URL of the file
    });

    return response.data.webViewLink; // Return the URL of the file
  } catch (error) {
    console.error("Error fetching photo URL:", error);
    throw error;
  }
}

//////////////////////////////////////////////////////////////////

exports.updateMe = catchAsync(async (req, res, next) => {
  const filtredBody = filterObj(req.body, "name", "email");
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filtredBody, {
    new: true,
    runValidators: true,
  });

  if (req.file) {
    const uploadResponse = await photoManager(req.file);
    const fileId = uploadResponse.id;

    const userWithNewPhoto = await User.findByIdAndUpdate(
      req.user.id,
      { photo: fileId },
      {
        new: true,
        runValidators: true,
      }
    );
  }

  res.status(200).json({
    status: "success",
    user: updatedUser,
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = req.user;

  // Fetch the photo URL if the user has a photo
  let photoUrl = null;
  if (user.photo && user.photo !== "default.jpg") {
    try {
      photoUrl = await getPhotoUrl(user.photo); // Fetch the photo URL from Google Drive
    } catch (error) {
      console.error("Error fetching photo URL:", error);
    }
  }

  res.status(200).json({
    status: "success",
    user,
    photo: photoUrl,
  });
});
