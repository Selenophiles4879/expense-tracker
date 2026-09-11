const express = require("express");
const multer = require("multer");

const exportRouter = express.Router();

const isAuthenticated = require("../middlewares/isAuth");
const emailVerifiedOnly = require("../middlewares/emailVerifiedOnly");
const exportController = require("../controllers/exportCtrl");

// =========================================================
// FILE UPLOAD CONFIGURATION
// =========================================================
//
// Supports:
//   - CSV expense reports
//   - PDF expense reports
//
// Files are kept in memory because the verification
// controller verifies the uploaded bytes directly.
//

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    // Maximum uploaded file size: 10 MB
    fileSize: 10 * 1024 * 1024,

    // Only one file at a time
    files: 1,

    // Prevent excessive multipart fields
    fields: 5,

    fieldArrayIndexLimit: 100,
  },

  fileFilter: (req, file, cb) => {
    const originalName = String(
      file.originalname || ""
    ).toLowerCase();

    const isCSV =
      file.mimetype === "text/csv" ||
      originalName.endsWith(".csv");

    const isPDF =
      file.mimetype === "application/pdf" ||
      originalName.endsWith(".pdf");

    // -------------------------------------------------------
    // ACCEPT CSV
    // -------------------------------------------------------

    if (isCSV) {
      return cb(null, true);
    }

    // -------------------------------------------------------
    // ACCEPT PDF
    // -------------------------------------------------------

    if (isPDF) {
      return cb(null, true);
    }

    // -------------------------------------------------------
    // REJECT EVERYTHING ELSE
    // -------------------------------------------------------

    return cb(
      new Error(
        "Only Expense Tracker PDF or CSV files are allowed."
      )
    );
  },
});

// =========================================================
// ONLINE VERIFICATION — HTML / QR
// =========================================================
//
// QR code / Verification ID verification.
//
// Example:
// GET /transactions/export/verify/:verificationId
//
// This route is intentionally kept as the HTML verification
// endpoint used by QR codes.
//

exportRouter.get(
  "/transactions/export/verify/:verificationId",
  exportController.verifyExpenseReport
);

// =========================================================
// ONLINE VERIFICATION — JSON
// =========================================================
//
// Used by the frontend verification page.
//
// Example:
// GET /transactions/export/verify/:verificationId/json
//
// IMPORTANT:
// This is different from the HTML route above.
//
// The frontend verification page should call this endpoint
// when it receives a Verification ID from:
//   /verify?verificationId=EXP-XXXXXXXX
//
// This verifies the cryptographically stored report data.
//
// It does NOT replace actual uploaded-file verification.
// For the actual downloaded PDF/CSV bytes, use:
//
// POST /transactions/export/verify-file
//

exportRouter.get(
  "/transactions/export/verify/:verificationId/json",
  exportController.verifyExpenseReportJson
);

// =========================================================
// ACTUAL FILE VERIFICATION
// =========================================================
//
// Accepts:
//   .pdf
//   .csv
//
// The controller determines the file type and performs
// the appropriate cryptographic verification.
//

exportRouter.post(
  "/transactions/export/verify-file",
  upload.single("file"),
  exportController.verifyExportFile
);

// =========================================================
// DOWNLOAD PDF
// =========================================================

exportRouter.get(
  "/transactions/export/pdf",
  isAuthenticated,
  emailVerifiedOnly,
  exportController.downloadExpensesPDF
);

// =========================================================
// DOWNLOAD CSV
// =========================================================

exportRouter.get(
  "/transactions/export/csv",
  isAuthenticated,
  emailVerifiedOnly,
  exportController.downloadExpensesCSV
);

// =========================================================
// EXPORT
// =========================================================

module.exports = exportRouter;