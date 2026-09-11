const mongoose = require("mongoose");

// =========================================================
// EXPORT VERIFICATION SCHEMA
// =========================================================

const exportVerificationSchema =
  new mongoose.Schema(
    {
      // -----------------------------------------------------
      // UNIQUE VERIFICATION ID
      // -----------------------------------------------------

      verificationId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
      },

      // -----------------------------------------------------
      // USER
      // -----------------------------------------------------

      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      // -----------------------------------------------------
      // REPORT PERIOD
      // -----------------------------------------------------

      startDate: {
        type: Date,
        required: true,
      },

      endDate: {
        type: Date,
        required: true,
      },

      // -----------------------------------------------------
      // REPORT SUMMARY
      // -----------------------------------------------------

      expenseCount: {
        type: Number,
        required: true,
        min: 0,
      },

      totalAmount: {
        type: Number,
        required: true,
        min: 0,
      },

      // -----------------------------------------------------
      // APPLICATION-LEVEL INTEGRITY
      // -----------------------------------------------------

      /*
       * SHA-256 hash of the canonical expense data.
       *
       * This is NOT the same thing as the cryptographic
       * signature embedded inside the PDF.
       */

      documentHash: {
        type: String,
        required: true,
        trim: true,
      },

      /*
       * Exact canonical JSON that was hashed and signed.
       *
       * Stored so the server can reconstruct and verify
       * the original report data.
       */

      canonicalData: {
        type: String,
        required: true,
      },

      /*
       * Ed25519 signature over canonicalData.
       */

      digitalSignature: {
        type: String,
        required: true,
      },

      /*
       * Identifies the Ed25519 signing key/version.
       */

      keyId: {
        type: String,
        required: true,
        trim: true,
      },

      // -----------------------------------------------------
      // EXPORT TYPE
      // -----------------------------------------------------

      exportType: {
        type: String,
        enum: ["PDF", "CSV"],
        required: true,
        index: true,
      },

      // -----------------------------------------------------
      // PDF CRYPTOGRAPHIC SIGNATURE INFORMATION
      // -----------------------------------------------------

      /*
       * Signature format used for the actual PDF.
       *
       * Example:
       * ETSI.CAdES.detached
       *
       * CSV exports do not use these fields.
       */

      pdfSignatureFormat: {
        type: String,
        default: null,
      },

      /*
       * SHA-256 fingerprint of the X.509 certificate
       * used to sign the PDF.
       */

      pdfCertificateFingerprint: {
        type: String,
        default: null,
        trim: true,
      },

      /*
       * X.509 certificate subject.
       */

      pdfCertificateSubject: {
        type: String,
        default: null,
        trim: true,
      },

      /*
       * X.509 certificate issuer.
       */

      pdfCertificateIssuer: {
        type: String,
        default: null,
        trim: true,
      },

      /*
       * X.509 certificate serial number.
       */

      pdfCertificateSerial: {
        type: String,
        default: null,
        trim: true,
      },

      /*
       * Certificate validity start date as reported
       * by OpenSSL.
       */

      pdfCertificateValidFrom: {
        type: String,
        default: null,
        trim: true,
      },

      /*
       * Certificate validity end date as reported
       * by OpenSSL.
       */

      pdfCertificateValidTo: {
        type: String,
        default: null,
        trim: true,
      },

      // -----------------------------------------------------
      // GENERATION TIME
      // -----------------------------------------------------

      generatedAt: {
        type: Date,
        required: true,
        default: Date.now,
      },
    },

    {
      timestamps: true,
    }
  );

// =========================================================
// INDEXES
// =========================================================

exportVerificationSchema.index({
  user: 1,
  exportType: 1,
  generatedAt: -1,
});

// =========================================================
// MODEL
// =========================================================

module.exports =
  mongoose.models.ExportVerification ||
  mongoose.model(
    "ExportVerification",
    exportVerificationSchema
  );
