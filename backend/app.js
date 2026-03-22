const express = require("express");
const dotenv = require("dotenv");
dotenv.config(); // <-- ADD THIS LINE
const mongoose = require("mongoose");
const cors = require("cors");
const userRouter = require("./routes/userRouter");
const errorHandler = require("./middlewares/errorHandlerMiddleware");
const categoryRouter = require("./routes/categoryRouter");
const transactionRouter = require("./routes/transactionRouter");

const app = express();

//!Connect to mongodb
mongoose
  //.connect("mongodb://localhost:27017/mern-expenses")
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("DB Connected"))
  //.catch((e) => console.log(e));
.catch((error) => console.error("DB Connection Error:", error));
mongoose.connection.once("open", () => {
  console.log("✅ Connected to DB:", mongoose.connection.name);
});


// Allow your specific Netlify frontend to access the backend
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // Allow cookies if you use them
};
app.use(cors(corsOptions));
//!Middlewares
app.use(express.json()); //?Pass incoming json data
//!Routes
app.use("/api/v1", userRouter);
app.use("/api/v1", categoryRouter);
app.use("/api/v1", transactionRouter);

//! Error
app.use(errorHandler);

//!Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () =>
  console.log(`Server is running on this port... ${PORT} `)
);
