const express = require("express");
const dotenv = require("dotenv");
dotenv.config(); // <-- ADD THIS LINE
const mongoose = require("mongoose");
const cors = require("cors");
const userRouter = require("./routes/userRouter");
const errorHandler = require("./middlewares/errorHandlerMiddleware");
const categoryRouter = require("./routes/categoryRouter");
const transactionRouter = require("./routes/transactionRouter");
const exportRouter = require("./routes/exportRouter");

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
app.use("/api/v1", exportRouter);

//! Error
app.use(errorHandler);

// Error handler - development debugging
app.use((err, req, res, next) => {
  console.error("=================================");
  console.error("EXPORT/API ERROR");
  console.error("Message:", err.message);
  console.error("Stack:", err.stack);
  console.error("=================================");

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

//!Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () =>
  console.log(`Server is running on this port... ${PORT} `)
);
