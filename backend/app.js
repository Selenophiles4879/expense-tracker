const express = require("express");
const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");
const cors = require("cors");

const userRouter = require("./routes/userRouter");
const { brevoEmailWebhook } = require("./controllers/usersCtrl");

const errorHandler = require("./middlewares/errorHandlerMiddleware");
const categoryRouter = require("./routes/categoryRouter");
const transactionRouter = require("./routes/transactionRouter");
const exportRouter = require("./routes/exportRouter");

const app = express();

//! Connect to MongoDB
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("DB Connected"))
  .catch((error) => console.error("DB Connection Error:", error));

mongoose.connection.once("open", () => {
  console.log("✅ Connected to DB:", mongoose.connection.name);
});

//! CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

//! Middlewares
app.use(express.json());

//! Brevo email tracking webhook
app.post(
  "/api/v1/users/brevo-email-webhook",
  brevoEmailWebhook
);

//! Routes
app.use("/api/v1", userRouter);
app.use("/api/v1", categoryRouter);
app.use("/api/v1", transactionRouter);
app.use("/api/v1", exportRouter);

//! Error handling
app.use(errorHandler);

// Development error handler
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

//! Start the server
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
