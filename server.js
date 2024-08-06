const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const PORT = 8000;
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const globalErrorHandler = require("./Controllers/errorController");

dotenv.config({ path: "./config.env" });
const DB = process.env.DATABASE_URL;
//Global middlewares for security
const limiter = rateLimit({
  max: 1000000,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, try after 1h!",
});

app.use("/api", limiter);

app.use(helmet());
////////////////////////////////

//Sanitizes mongo NOSQL search chatlaxob//
app.use(mongoSanitize());
app.use(xss());
app.use(cors());

//Body PARSER - to read data from req.body !!!
app.use(express.json());
app.use(cookieParser());
//////////////////////////////////////////////
app.get("/api/v1/home", (req, res) => {
  res.send({ message: "Hello man" });
});
app.use("/api/v1/", authRoutes);
app.use("/api/v1/users/", userRoutes);
app.use("/api/v1/posts/", postRoutes);
///
app.listen(PORT, () => {
  console.log(`Server runs on ${PORT} port`);
});

mongoose.connect(DB, {}).then(() => console.log("DB connection successful!"));

app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
});

app.use(globalErrorHandler);
