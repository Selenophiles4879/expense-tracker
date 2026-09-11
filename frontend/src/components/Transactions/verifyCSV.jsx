import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const VerifyReport = () => {
  const [searchParams] = useSearchParams();

  const verificationId =
    searchParams.get("verificationId") || "";

  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [idVerificationLoading, setIdVerificationLoading] = useState(false);

  const fileInputRef = useRef(null);

  // ---------------------------------------------------------
  // AUTOMATIC VERIFICATION ID CHECK
  // ---------------------------------------------------------
  //
  // When this page is opened from the QR code / PDF verification
  // link with ?verificationId=..., verify the stored report data
  // automatically.
  //
  // IMPORTANT:
  // This checks the issued Verification ID and stored cryptographic
  // record. It does NOT prove that a downloaded PDF/CSV file itself
  // has not been modified. For that, the actual file must be uploaded.
  //
  useEffect(() => {
    if (!verificationId || !API_URL) return;

    const verifyVerificationId = async () => {
      setIdVerificationLoading(true);
      setResult(null);

      try {
        const response = await axios.get(
          `${API_URL}/api/v1/transactions/export/verify/${encodeURIComponent(
            verificationId
          )}/json`
        );

        setResult({
          ...response.data,
          verificationSource: "verification-id",
        });
      } catch (error) {
        console.error(
          "Verification ID check error:",
          error
        );

        setResult(
          error.response?.data || {
            verified: false,
            status: "ERROR",
            message:
              "Unable to verify this Verification ID. Please try again.",
          }
        );
      } finally {
        setIdVerificationLoading(false);
      }
    };

    verifyVerificationId();
  }, [verificationId]);

  // ---------------------------------------------------------
  // FILE SELECTION
  // ---------------------------------------------------------

  const validateAndSetFile = (selectedFile) => {
    setResult(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const fileName =
      selectedFile.name.toLowerCase();

    if (
      !fileName.endsWith(".csv") &&
      !fileName.endsWith(".pdf")
    ) {
      setFile(null);

      setResult({
        verified: false,
        status: "INVALID",
        message:
          "Please select a valid PDF or CSV file.",
      });

      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setFile(null);

      setResult({
        verified: false,
        status: "INVALID",
        message:
          "The selected file is larger than the 10 MB limit.",
      });

      return;
    }

    setFile(selectedFile);
  };

  const handleFileChange = (event) => {
    const selectedFile =
      event.target.files?.[0];

    validateAndSetFile(selectedFile);
  };

  // ---------------------------------------------------------
  // DRAG & DROP
  // ---------------------------------------------------------

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setDragActive(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setDragActive(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setDragActive(false);

    const droppedFile =
      event.dataTransfer.files?.[0];

    validateAndSetFile(droppedFile);
  };

  // ---------------------------------------------------------
  // VERIFY
  // ---------------------------------------------------------

  const verifyFile = async () => {
    if (!file) {
      setResult({
        verified: false,
        status: "INVALID",
        message:
          "Please select a PDF or CSV file first.",
      });

      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();

      formData.append(
        "file",
        file
      );

      const response = await axios.post(
        `${API_URL}/api/v1/transactions/export/verify-file`,
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      setResult({
        ...response.data,
        verificationSource: "file",
      });
    } catch (error) {
      console.error(
        "Document verification error:",
        error
      );

      setResult({
        ...(error.response?.data || {
          verified: false,
          status: "ERROR",
          message:
            "Unable to verify the document.",
        }),
        verificationSource: "file",
      });
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";

    const mb =
      bytes / (1024 * 1024);

    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    }

    return `${Math.max(
      1,
      Math.round(bytes / 1024)
    )} KB`;
  };

  const shortenHash = (hash) => {
    if (!hash || hash.length < 30) {
      return hash;
    }

    return `${hash.slice(
      0,
      20
    )}...${hash.slice(-20)}`;
  };

  // A Verification ID can prove that the issued server record is valid,
  // but only an uploaded file can prove that the actual PDF/CSV has not
  // been changed. Keep those two states deliberately separate.
  const isFileVerified =
    result?.verificationSource === "file" &&
    result?.verified === true;

  const isRecordVerified =
    result?.verificationSource === "verification-id" &&
    result?.verified === true;

  const isVerified =
    isFileVerified;

  const isPdf =
    file?.name
      ?.toLowerCase()
      .endsWith(".pdf");

  // ---------------------------------------------------------
  // CHECK ROW
  // ---------------------------------------------------------

  const CheckRow = ({
    label,
    value,
  }) => {
    const normalizedValue =
      typeof value === "string"
        ? value.toUpperCase()
        : value;

    const valid =
      normalizedValue === "VALID" ||
      normalizedValue === "MATCH" ||
      normalizedValue === "VALIDATED" ||
      normalizedValue === "AUTHENTIC";

    const invalid =
      normalizedValue === "INVALID" ||
      normalizedValue === "MISMATCH" ||
      normalizedValue === "FAILED" ||
      normalizedValue === "UNVERIFIED";

    return (
      <div style={styles.checkRow}>
        <div style={styles.checkLeft}>
          <div
            style={{
              ...styles.checkIcon,

              background: valid
                ? "#dcfce7"
                : invalid
                ? "#fee2e2"
                : "#f3f4f6",

              color: valid
                ? "#15803d"
                : invalid
                ? "#b91c1c"
                : "#6b7280",
            }}
          >
            {valid
              ? "✓"
              : invalid
              ? "×"
              : "•"}
          </div>

          <span style={styles.checkLabel}>
            {label}
          </span>
        </div>

        <span
          style={{
            ...styles.checkValue,

            color: valid
              ? "#15803d"
              : invalid
              ? "#b91c1c"
              : "#6b7280",
          }}
        >
          {value || "—"}
        </span>
      </div>
    );
  };

  // ---------------------------------------------------------
  // META VALUE
  // ---------------------------------------------------------

  const MetaItem = ({
    label,
    value,
  }) => {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return null;
    }

    return (
      <div style={styles.metaItem}>
        <div style={styles.metaLabel}>
          {label}
        </div>

        <div style={styles.metaValue}>
          {value}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <div style={styles.page}>
      {/* Background decoration */}

      <div
        style={styles.backgroundGlowOne}
      />

      <div
        style={styles.backgroundGlowTwo}
      />

      <div style={styles.container}>
        {/* -------------------------------------------------
            HEADER
        ------------------------------------------------- */}

        <div style={styles.header}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>
              ✓
            </span>
          </div>

          <div>
            <div style={styles.brand}>
              Expense Tracker
            </div>

            <div style={styles.secureText}>
              SECURE DOCUMENT VERIFICATION
            </div>
          </div>
        </div>

        {/* -------------------------------------------------
            MAIN CARD
        ------------------------------------------------- */}

        <div style={styles.card}>
          <div style={styles.titleSection}>
            <div style={styles.shield}>
              🔐
            </div>

            <h1 style={styles.title}>
              Verify Expense Report
            </h1>

            <p style={styles.subtitle}>
              Confirm that an Expense Tracker
              PDF or CSV report is authentic
              and has not been modified after
              it was issued.
            </p>
          </div>

          {/* -------------------------------------------------
              VERIFICATION ID
          ------------------------------------------------- */}

          {verificationId && (
            <div
              style={
                styles.verificationIdBox
              }
            >
              <div style={styles.idIcon}>
                #
              </div>

              <div style={styles.idContent}>
                <div style={styles.idLabel}>
                  VERIFICATION ID
                </div>

                <div style={styles.idValue}>
                  {verificationId}
                </div>
              </div>

              <div
                style={{
                  ...styles.idBadge,
                  ...(isRecordVerified
                    ? styles.idBadgeFound
                    : {}),
                }}
              >
                RECORD FOUND
              </div>
            </div>
          )}

          {/* -------------------------------------------------
              VERIFICATION ID STATUS
          ------------------------------------------------- */}

          {verificationId && idVerificationLoading && (
            <div style={styles.idLoadingBox}>
              <span style={styles.idLoadingSpinner} />
              <div>
                <strong style={styles.idLoadingTitle}>
                  Checking Verification ID...
                </strong>
                <div style={styles.idLoadingText}>
                  Verifying the cryptographic record issued by Expense Tracker.
                </div>
              </div>
            </div>
          )}

          {verificationId && !idVerificationLoading && result?.verificationSource === "verification-id" && (
            <div style={styles.uploadInstruction}>
              <strong>Want to verify the downloaded file itself?</strong>
              <span>Upload the original PDF or CSV below. The file contents will be checked against its issued cryptographic record.</span>
            </div>
          )}

          {/* -------------------------------------------------
              UPLOAD
          ------------------------------------------------- */}

          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() =>
              fileInputRef.current?.click()
            }
            style={{
              ...styles.uploadArea,

              ...(dragActive
                ? styles.uploadAreaActive
                : {}),

              ...(file
                ? styles.uploadAreaSelected
                : {}),
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv,application/pdf,text/csv"
              onChange={handleFileChange}
              style={{
                display: "none",
              }}
            />

            {!file ? (
              <>
                <div
                  style={
                    styles.uploadIcon
                  }
                >
                  ↑
                </div>

                <div
                  style={
                    styles.uploadTitle
                  }
                >
                  Drop your PDF or CSV
                  report here
                </div>

                <div
                  style={
                    styles.uploadSubtitle
                  }
                >
                  or click to browse from
                  your computer
                </div>

                <div
                  style={styles.fileTypes}
                >
                  PDF / CSV • MAX 10 MB
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    ...styles.fileIcon,

                    ...(isPdf
                      ? styles.pdfIcon
                      : styles.csvIcon),
                  }}
                >
                  {isPdf
                    ? "PDF"
                    : "CSV"}
                </div>

                <div
                  style={
                    styles.fileName
                  }
                >
                  {file.name}
                </div>

                <div
                  style={
                    styles.fileSize
                  }
                >
                  {formatFileSize(
                    file.size
                  )}
                </div>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();

                    setFile(null);
                    setResult(null);

                    if (
                      fileInputRef.current
                    ) {
                      fileInputRef.current.value =
                        "";
                    }
                  }}
                  style={
                    styles.removeButton
                  }
                >
                  Remove file
                </button>
              </>
            )}
          </div>

          {/* -------------------------------------------------
              VERIFY BUTTON
          ------------------------------------------------- */}

          <button
            type="button"
            onClick={verifyFile}
            disabled={!file || loading}
            style={{
              ...styles.verifyButton,

              ...(!file || loading
                ? styles.verifyButtonDisabled
                : {}),
            }}
          >
            {loading ? (
              <>
                <span
                  style={styles.spinner}
                />

                Verifying document...
              </>
            ) : (
              <>
                <span>✓</span>

                Verify Authenticity
              </>
            )}
          </button>

          {/* -------------------------------------------------
              SECURITY NOTE
          ------------------------------------------------- */}

          <div
            style={styles.securityNote}
          >
            <span
              style={styles.securityIcon}
            >
              🛡
            </span>

            <div>
              <strong>
                Cryptographic verification
              </strong>

              <div
                style={
                  styles.securityTextSmall
                }
              >
                Verification IDs are checked against
                the cryptographically protected report
                record. PDF reports are checked for
                their embedded digital signature and
                certificate, while CSV reports are
                checked using SHA-256 and Ed25519.
                Upload the downloaded file to verify
                the actual file for tampering.
              </div>
            </div>
          </div>

          {/* -------------------------------------------------
              RESULT
          ------------------------------------------------- */}

          {result && (
            <div
              style={{
                ...styles.resultCard,

                ...(isFileVerified
                  ? styles.resultSuccess
                  : isRecordVerified
                  ? styles.resultRecord
                  : styles.resultFailure),
              }}
            >
              {/* Status header */}

              <div
                style={
                  styles.resultHeader
                }
              >
                <div
                  style={{
                    ...styles.resultStatusIcon,

                    background: isFileVerified
                      ? "#dcfce7"
                      : isRecordVerified
                      ? "#dbeafe"
                      : "#fee2e2",

                    color: isFileVerified
                      ? "#15803d"
                      : isRecordVerified
                      ? "#1d4ed8"
                      : "#b91c1c",
                  }}
                >
                  {isFileVerified
                    ? "✓"
                    : isRecordVerified
                    ? "#"
                    : "×"}
                </div>

                <div>
                  <div
                    style={{
                      ...styles.resultStatus,

                      color: isFileVerified
                        ? "#15803d"
                        : isRecordVerified
                        ? "#1d4ed8"
                        : "#b91c1c",
                    }}
                  >
                    {result.verificationSource === "verification-id"
                      ? isRecordVerified
                        ? "REPORT RECORD FOUND"
                        : "REPORT RECORD NOT VERIFIED"
                      : isFileVerified
                      ? "AUTHENTIC FILE"
                      : result.status === "TAMPERED"
                      ? "TAMPERED FILE"
                      : "FILE NOT VERIFIED"}
                  </div>

                  <div
                    style={
                      styles.resultStatusSub
                    }
                  >
                    {result.verificationSource === "verification-id"
                      ? isRecordVerified
                        ? "The Verification ID matches an authentic protected report record. Upload the actual file below to verify the document itself."
                        : "The Verification ID or stored report record could not be verified."
                      : isFileVerified
                      ? "The uploaded file passed the authenticity and integrity checks."
                      : result.status === "TAMPERED"
                      ? "The uploaded file's cryptographic signature is invalid or the file was modified after signing."
                      : "The uploaded file could not be confirmed as authentic."}
                  </div>
                </div>
              </div>

              {/* Message */}

              {result.message && (
                <div
                  style={
                    styles.messageBox
                  }
                >
                  {result.message}

                  {result.verificationSource === "verification-id" &&
                    isRecordVerified && (
                      <div style={styles.messageEmphasis}>
                        This verifies the issued report record only. It does not prove that a downloaded PDF or CSV file is unchanged. Upload the actual file below to verify its integrity.
                      </div>
                    )}
                </div>
              )}

              {/* Checks */}

              {result.checks && (
                <div
                  style={
                    styles.checksSection
                  }
                >
                  <div
                    style={
                      styles.sectionTitle
                    }
                  >
                    Verification Checks
                  </div>

                  {result.checks
                    .verificationMetadata && (
                    <CheckRow
                      label={
                        result.verificationSource === "verification-id"
                          ? "Record metadata"
                          : "Verification metadata"
                      }
                      value={
                        result.checks
                          .verificationMetadata
                      }
                    />
                  )}

                  {result.checks
                    .documentHash && (
                    <CheckRow
                      label={
                        result.verificationSource === "verification-id"
                          ? "Issued report fingerprint"
                          : "Document fingerprint"
                      }
                      value={
                        result.checks
                          .documentHash
                      }
                    />
                  )}

                  {result.checks
                    .digitalSignature && (
                    <CheckRow
                      label={
                        result.verificationSource === "verification-id"
                          ? "Stored digital signature"
                          : "Digital signature"
                      }
                      value={
                        result.checks
                          .digitalSignature
                      }
                    />
                  )}

                  {result.checks.fileData && (
                    <CheckRow
                      label="Actual file data"
                      value={result.checks.fileData}
                    />
                  )}

                  {result.checks
                    .pdfSignature && (
                    <CheckRow
                      label="PDF digital signature"
                      value={
                        result.checks
                          .pdfSignature
                      }
                    />
                  )}

                  {result.checks
                    .certificate && (
                    <CheckRow
                      label="Signing certificate"
                      value={
                        result.checks
                          .certificate
                      }
                    />
                  )}

                  {result.checks
                    .certificateFingerprint && (
                    <CheckRow
                      label="Certificate fingerprint"
                      value={
                        result.checks
                          .certificateFingerprint
                      }
                    />
                  )}

                  {result.checks
                    .signatureFormat && (
                    <CheckRow
                      label="Signature format"
                      value={
                        result.checks
                          .signatureFormat
                      }
                    />
                  )}

                  {result.checks
                    .transactionCount && (
                    <CheckRow
                      label="Transaction count"
                      value={
                        result.checks
                          .transactionCount
                      }
                    />
                  )}
                </div>
              )}

              {/* -------------------------------------------------
                  DOCUMENT FINGERPRINT
              ------------------------------------------------- */}

              {result.documentHash && (
                <div
                  style={
                    styles.fingerprintBox
                  }
                >
                  <div
                    style={
                      styles.fingerprintHeader
                    }
                  >
                    <div>
                      <div
                        style={
                          styles.fingerprintTitle
                        }
                      >
                        SHA-256 DOCUMENT
                        FINGERPRINT
                      </div>

                      <div
                        style={
                          styles.fingerprintSubtitle
                        }
                      >
                        Unique cryptographic
                        identity of this report
                      </div>
                    </div>

                    <span
                      style={
                        styles.algorithmBadge
                      }
                    >
                      SHA-256
                    </span>
                  </div>

                  <div
                    style={
                      styles.hashValue
                    }
                    title={
                      result.documentHash
                    }
                  >
                    <span className="desktopHash">
                      {
                        result.documentHash
                      }
                    </span>

                    <span className="mobileHash">
                      {shortenHash(
                        result.documentHash
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------
                  PDF CERTIFICATE
              ------------------------------------------------- */}

              {(result.pdfSignatureFormat ||
                result.pdfCertificateFingerprint ||
                result.pdfCertificateFingerprint256 ||
                result.pdfCertificateSubject ||
                result.pdfCertificateIssuer ||
                result.pdfCertificateSerial ||
                result.pdfCertificateValidFrom ||
                result.pdfCertificateValidTo) && (
                <div
                  style={
                    styles.certificateBox
                  }
                >
                  <div
                    style={
                      styles.certificateHeader
                    }
                  >
                    <div>
                      <div
                        style={
                          styles.certificateTitle
                        }
                      >
                        PDF SIGNING CERTIFICATE
                      </div>

                      <div
                        style={
                          styles.certificateSubtitle
                        }
                      >
                        Cryptographic certificate
                        associated with the report
                      </div>
                    </div>

                    <span
                      style={
                        styles.certificateBadge
                      }
                    >
                      SIGNED
                    </span>
                  </div>

                  <div
                    style={
                      styles.certificateGrid
                    }
                  >
                    <MetaItem
                      label="SIGNATURE FORMAT"
                      value={
                        result.pdfSignatureFormat
                      }
                    />

                    <MetaItem
                      label="SUBJECT"
                      value={
                        result.pdfCertificateSubject
                      }
                    />

                    <MetaItem
                      label="ISSUER"
                      value={
                        result.pdfCertificateIssuer
                      }
                    />

                    <MetaItem
                      label="SERIAL NUMBER"
                      value={
                        result.pdfCertificateSerial
                      }
                    />

                    <MetaItem
                      label="VALID FROM"
                      value={
                        result.pdfCertificateValidFrom
                      }
                    />

                    <MetaItem
                      label="VALID TO"
                      value={
                        result.pdfCertificateValidTo
                      }
                    />
                  </div>

                  {(result.pdfCertificateFingerprint ||
                    result.pdfCertificateFingerprint256) && (
                    <div
                      style={
                        styles.certificateFingerprint
                      }
                    >
                      <div
                        style={
                          styles.metaLabel
                        }
                      >
                        SHA-256 CERTIFICATE
                        FINGERPRINT
                      </div>

                      <div
                        style={
                          styles.hashValue
                        }
                      >
                        {result.pdfCertificateFingerprint ||
                          result.pdfCertificateFingerprint256}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* -------------------------------------------------
                  SIGNING INFORMATION
              ------------------------------------------------- */}

              {(result.keyId ||
                result.verificationId) && (
                <div
                  style={
                    styles.metaGrid
                  }
                >
                  {result.verificationId && (
                    <MetaItem
                      label="VERIFICATION ID"
                      value={
                        result.verificationId
                      }
                    />
                  )}

                  {result.keyId && (
                    <MetaItem
                      label="ED25519 SIGNING KEY"
                      value={
                        result.keyId
                      }
                    />
                  )}
                </div>
              )}

              {/* -------------------------------------------------
                  GENERATED TIME
              ------------------------------------------------- */}

              {result.generatedAt && (
                <div
                  style={
                    styles.generatedAt
                  }
                >
                  <span>
                    Generated / Issued
                  </span>

                  <strong>
                    {new Date(
                      result.generatedAt
                    ).toLocaleString(
                      "en-IN",
                      {
                        dateStyle:
                          "medium",
                        timeStyle:
                          "short",
                      }
                    )}
                  </strong>
                </div>
              )}
            </div>
          )}
        </div>

        {/* -------------------------------------------------
            FOOTER
        ------------------------------------------------- */}

        <div style={styles.footer}>
          <div>
            Expense Tracker
          </div>

          <div
            style={
              styles.footerDot
            }
          >
            •
          </div>

          <div>
            Secure document verification
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------
          RESPONSIVE STYLES
      --------------------------------------------------- */}

      <style>{`
        .desktopHash {
          display: inline;
        }

        .mobileHash {
          display: none;
        }

        @keyframes verifySpin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 650px) {
          .desktopHash {
            display: none;
          }

          .mobileHash {
            display: inline;
          }
        }

        @media (max-width: 600px) {
          .verification-id-badge {
            display: none;
          }

          .certificate-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

// =========================================================
// STYLES
// =========================================================

const styles = {
  page: {
    minHeight: "100vh",

    background:
      "linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%)",

    display: "flex",
    justifyContent: "center",

    padding:
      "40px 20px",

    boxSizing:
      "border-box",

    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",

    position:
      "relative",

    overflow:
      "hidden",
  },

  backgroundGlowOne: {
    position: "fixed",

    width: "350px",
    height: "350px",

    borderRadius:
      "50%",

    background:
      "rgba(99, 102, 241, 0.08)",

    filter:
      "blur(80px)",

    top:
      "-150px",

    left:
      "-100px",

    pointerEvents:
      "none",
  },

  backgroundGlowTwo: {
    position: "fixed",

    width: "400px",
    height: "400px",

    borderRadius:
      "50%",

    background:
      "rgba(16, 185, 129, 0.06)",

    filter:
      "blur(90px)",

    bottom:
      "-180px",

    right:
      "-120px",

    pointerEvents:
      "none",
  },

  container: {
    width: "100%",

    maxWidth:
      "720px",

    position:
      "relative",

    zIndex: 1,
  },

  // -------------------------------------------------------
  // HEADER
  // -------------------------------------------------------

  header: {
    display: "flex",

    alignItems:
      "center",

    gap:
      "12px",

    marginBottom:
      "22px",

    paddingLeft:
      "5px",
  },

  logo: {
    width:
      "42px",

    height:
      "42px",

    borderRadius:
      "12px",

    background:
      "linear-gradient(135deg, #111827, #374151)",

    display: "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    boxShadow:
      "0 8px 20px rgba(17, 24, 39, 0.15)",
  },

  logoIcon: {
    color:
      "#fff",

    fontSize:
      "21px",

    fontWeight:
      "800",
  },

  brand: {
    fontSize:
      "15px",

    fontWeight:
      "750",

    color:
      "#111827",

    letterSpacing:
      "-0.2px",
  },

  secureText: {
    fontSize:
      "9px",

    fontWeight:
      "700",

    letterSpacing:
      "1.4px",

    color:
      "#6b7280",

    marginTop:
      "2px",
  },

  // -------------------------------------------------------
  // CARD
  // -------------------------------------------------------

  card: {
    background:
      "rgba(255,255,255,0.96)",

    border:
      "1px solid rgba(226, 232, 240, 0.9)",

    borderRadius:
      "24px",

    padding:
      "38px",

    boxShadow:
      "0 25px 70px rgba(15, 23, 42, 0.10)",

    backdropFilter:
      "blur(15px)",
  },

  titleSection: {
    textAlign:
      "center",

    marginBottom:
      "30px",
  },

  shield: {
    width:
      "58px",

    height:
      "58px",

    borderRadius:
      "18px",

    margin:
      "0 auto 17px",

    display: "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    background:
      "#eef2ff",

    fontSize:
      "25px",

    boxShadow:
      "inset 0 0 0 1px #e0e7ff",
  },

  title: {
    margin:
      0,

    color:
      "#111827",

    fontSize:
      "30px",

    fontWeight:
      "800",

    letterSpacing:
      "-0.8px",
  },

  subtitle: {
    margin:
      "11px auto 0",

    maxWidth:
      "510px",

    color:
      "#6b7280",

    fontSize:
      "14px",

    lineHeight:
      "1.65",
  },

  // -------------------------------------------------------
  // VERIFICATION ID
  // -------------------------------------------------------

  verificationIdBox: {
    display:
      "flex",

    alignItems:
      "center",

    gap:
      "13px",

    background:
      "#f8fafc",

    border:
      "1px solid #e5e7eb",

    borderRadius:
      "14px",

    padding:
      "13px 15px",

    marginBottom:
      "20px",
  },

  idIcon: {
    width:
      "34px",

    height:
      "34px",

    borderRadius:
      "9px",

    background:
      "#111827",

    color:
      "#fff",

    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    fontSize:
      "14px",

    fontWeight:
      "800",
  },

  idContent: {
    flex:
      1,

    minWidth:
      0,
  },

  idLabel: {
    fontSize:
      "9px",

    fontWeight:
      "800",

    color:
      "#9ca3af",

    letterSpacing:
      "1.2px",

    marginBottom:
      "3px",
  },

  idValue: {
    fontSize:
      "13px",

    fontFamily:
      "'SFMono-Regular', Consolas, monospace",

    color:
      "#1f2937",

    fontWeight:
      "650",

    overflowWrap:
      "anywhere",
  },

  idBadge: {
    fontSize:
      "9px",

    fontWeight:
      "800",

    letterSpacing:
      "0.8px",

    padding:
      "6px 9px",

    borderRadius:
      "7px",

    color:
      "#166534",

    background:
      "#dcfce7",
  },

  // -------------------------------------------------------
  // UPLOAD
  // -------------------------------------------------------

  idBadgeFound: {
    background:
      "#eff6ff",

    color:
      "#1d4ed8",

    border:
      "1px solid #bfdbfe",
  },

  idLoadingBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 15px",
    marginBottom: "20px",
    borderRadius: "12px",
    background: "#eff6ff",
    border: "1px solid #dbeafe",
    color: "#1e40af",
  },

  idLoadingSpinner: {
    width: "18px",
    height: "18px",
    flexShrink: 0,
    border: "2px solid #bfdbfe",
    borderTopColor: "#2563eb",
    borderRadius: "50%",
    display: "inline-block",
    animation: "verifySpin 0.8s linear infinite",
  },

  idLoadingTitle: {
    display: "block",
    fontSize: "12px",
    color: "#1e3a8a",
  },

  idLoadingText: {
    marginTop: "3px",
    fontSize: "10px",
    color: "#64748b",
    lineHeight: "1.45",
  },

  uploadInstruction: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "12px 14px",
    marginBottom: "16px",
    borderRadius: "11px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    color: "#374151",
    fontSize: "11px",
    lineHeight: "1.5",
  },

  uploadArea: {
    minHeight:
      "190px",

    border:
      "2px dashed #d1d5db",

    borderRadius:
      "17px",

    display:
      "flex",

    flexDirection:
      "column",

    alignItems:
      "center",

    justifyContent:
      "center",

    textAlign:
      "center",

    cursor:
      "pointer",

    transition:
      "all 0.2s ease",

    background:
      "#fafafa",

    padding:
      "25px",

    boxSizing:
      "border-box",
  },

  uploadAreaActive: {
    border:
      "2px dashed #6366f1",

    background:
      "#eef2ff",

    transform:
      "scale(1.01)",
  },

  uploadAreaSelected: {
    border:
      "2px solid #a7f3d0",

    background:
      "#f0fdf4",
  },

  uploadIcon: {
    width:
      "52px",

    height:
      "52px",

    borderRadius:
      "15px",

    background:
      "#eef2ff",

    color:
      "#4f46e5",

    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    fontSize:
      "27px",

    fontWeight:
      "700",

    marginBottom:
      "14px",
  },

  uploadTitle: {
    color:
      "#1f2937",

    fontSize:
      "15px",

    fontWeight:
      "750",
  },

  uploadSubtitle: {
    color:
      "#9ca3af",

    fontSize:
      "12px",

    marginTop:
      "5px",
  },

  fileTypes: {
    marginTop:
      "14px",

    background:
      "#f3f4f6",

    color:
      "#6b7280",

    fontSize:
      "9px",

    fontWeight:
      "800",

    letterSpacing:
      "0.8px",

    padding:
      "6px 9px",

    borderRadius:
      "6px",
  },

  fileIcon: {
    width:
      "55px",

    height:
      "55px",

    borderRadius:
      "14px",

    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    fontSize:
      "12px",

    fontWeight:
      "900",

    letterSpacing:
      "0.5px",

    marginBottom:
      "13px",
  },

  pdfIcon: {
    background:
      "#fee2e2",

    color:
      "#b91c1c",
  },

  csvIcon: {
    background:
      "#dcfce7",

    color:
      "#15803d",
  },

  fileName: {
    color:
      "#1f2937",

    fontSize:
      "14px",

    fontWeight:
      "750",

    maxWidth:
      "100%",

    overflowWrap:
      "anywhere",
  },

  fileSize: {
    color:
      "#9ca3af",

    fontSize:
      "11px",

    marginTop:
      "5px",
  },

  removeButton: {
    marginTop:
      "13px",

    border:
      "none",

    background:
      "transparent",

    color:
      "#dc2626",

    fontSize:
      "11px",

    fontWeight:
      "700",

    cursor:
      "pointer",
  },

  // -------------------------------------------------------
  // VERIFY BUTTON
  // -------------------------------------------------------

  verifyButton: {
    width:
      "100%",

    marginTop:
      "18px",

    padding:
      "15px",

    border:
      "none",

    borderRadius:
      "12px",

    background:
      "linear-gradient(135deg, #111827, #374151)",

    color:
      "#fff",

    fontSize:
      "14px",

    fontWeight:
      "750",

    letterSpacing:
      "0.1px",

    cursor:
      "pointer",

    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    gap:
      "9px",

    boxShadow:
      "0 8px 20px rgba(17,24,39,0.18)",

    transition:
      "transform 0.15s ease",
  },

  verifyButtonDisabled: {
    background:
      "#d1d5db",

    boxShadow:
      "none",

    cursor:
      "not-allowed",
  },

  spinner: {
    width:
      "15px",

    height:
      "15px",

    border:
      "2px solid rgba(255,255,255,0.35)",

    borderTopColor:
      "#fff",

    borderRadius:
      "50%",

    display:
      "inline-block",

    animation:
      "verifySpin 0.8s linear infinite",
  },

  // -------------------------------------------------------
  // SECURITY NOTE
  // -------------------------------------------------------

  securityNote: {
    display:
      "flex",

    gap:
      "11px",

    alignItems:
      "flex-start",

    marginTop:
      "17px",

    padding:
      "13px 14px",

    borderRadius:
      "11px",

    background:
      "#f8fafc",

    border:
      "1px solid #eef2f7",
  },

  securityIcon: {
    fontSize:
      "18px",

    lineHeight:
      "1",
  },

  securityTextSmall: {
    marginTop:
      "3px",

    fontSize:
      "10.5px",

    color:
      "#9ca3af",

    lineHeight:
      "1.5",
  },

  // -------------------------------------------------------
  // RESULT
  // -------------------------------------------------------

  resultCard: {
    marginTop:
      "25px",

    borderRadius:
      "17px",

    overflow:
      "hidden",

    border:
      "1px solid",
  },

  resultSuccess: {
    background:
      "#fafffb",

    borderColor:
      "#bbf7d0",
  },

  resultFailure: {
    background:
      "#fffafa",

    borderColor:
      "#fecaca",
  },

  resultRecord: {
    background:
      "#f8fbff",

    borderColor:
      "#bfdbfe",
  },

  resultHeader: {
    display:
      "flex",

    alignItems:
      "center",

    gap:
      "13px",

    padding:
      "20px",
  },

  resultStatusIcon: {
    width:
      "48px",

    height:
      "48px",

    flexShrink:
      0,

    borderRadius:
      "14px",

    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    fontSize:
      "25px",

    fontWeight:
      "900",
  },

  resultStatus: {
    fontSize:
      "14px",

    fontWeight:
      "850",

    letterSpacing:
      "0.2px",
  },

  resultStatusSub: {
    fontSize:
      "11px",

    color:
      "#6b7280",

    marginTop:
      "4px",
  },

  messageBox: {
    margin:
      "0 20px 17px",

    padding:
      "13px",

    borderRadius:
      "10px",

    background:
      "rgba(255,255,255,0.8)",

    color:
      "#4b5563",

    fontSize:
      "12px",

    lineHeight:
      "1.55",
  },

  // -------------------------------------------------------
  // CHECKS
  // -------------------------------------------------------

  messageEmphasis: {
    marginTop:
      "10px",

    paddingTop:
      "10px",

    borderTop:
      "1px solid rgba(0,0,0,0.07)",

    fontWeight:
      "600",

    color:
      "#4b5563",
  },

  checksSection: {
    margin:
      "0 20px 17px",

    borderTop:
      "1px solid rgba(0,0,0,0.06)",

    paddingTop:
      "16px",
  },

  sectionTitle: {
    fontSize:
      "10px",

    fontWeight:
      "850",

    color:
      "#6b7280",

    letterSpacing:
      "1px",

    textTransform:
      "uppercase",

    marginBottom:
      "7px",
  },

  checkRow: {
    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "space-between",

    gap:
      "10px",

    padding:
      "9px 0",

    borderBottom:
      "1px solid rgba(0,0,0,0.045)",
  },

  checkLeft: {
    display:
      "flex",

    alignItems:
      "center",

    gap:
      "9px",
  },

  checkIcon: {
    width:
      "23px",

    height:
      "23px",

    borderRadius:
      "7px",

    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    fontSize:
      "13px",

    fontWeight:
      "900",
  },

  checkLabel: {
    fontSize:
      "12px",

    color:
      "#374151",

    fontWeight:
      "600",
  },

  checkValue: {
    fontSize:
      "10px",

    fontWeight:
      "850",

    letterSpacing:
      "0.5px",

    textAlign:
      "right",
  },

  // -------------------------------------------------------
  // FINGERPRINT
  // -------------------------------------------------------

  fingerprintBox: {
    margin:
      "0 20px 17px",

    padding:
      "15px",

    background:
      "#111827",

    borderRadius:
      "12px",

    color:
      "#fff",
  },

  fingerprintHeader: {
    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "space-between",

    gap:
      "10px",
  },

  fingerprintTitle: {
    fontSize:
      "9px",

    fontWeight:
      "850",

    letterSpacing:
      "1px",

    color:
      "#d1d5db",
  },

  fingerprintSubtitle: {
    fontSize:
      "9px",

    color:
      "#6b7280",

    marginTop:
      "3px",
  },

  algorithmBadge: {
    flexShrink:
      0,

    fontSize:
      "8px",

    fontWeight:
      "850",

    letterSpacing:
      "0.7px",

    padding:
      "5px 7px",

    borderRadius:
      "5px",

    background:
      "#374151",

    color:
      "#d1d5db",
  },

  hashValue: {
    marginTop:
      "13px",

    padding:
      "10px",

    borderRadius:
      "8px",

    background:
      "#030712",

    color:
      "#a7f3d0",

    fontFamily:
      "'SFMono-Regular', Consolas, monospace",

    fontSize:
      "9px",

    lineHeight:
      "1.6",

    wordBreak:
      "break-all",
  },

  // -------------------------------------------------------
  // CERTIFICATE
  // -------------------------------------------------------

  certificateBox: {
    margin:
      "0 20px 17px",

    padding:
      "15px",

    background:
      "#f8fafc",

    border:
      "1px solid #e5e7eb",

    borderRadius:
      "12px",
  },

  certificateHeader: {
    display:
      "flex",

    alignItems:
      "flex-start",

    justifyContent:
      "space-between",

    gap:
      "10px",

    marginBottom:
      "12px",
  },

  certificateTitle: {
    fontSize:
      "9px",

    fontWeight:
      "850",

    letterSpacing:
      "1px",

    color:
      "#374151",
  },

  certificateSubtitle: {
    fontSize:
      "9px",

    color:
      "#9ca3af",

    marginTop:
      "3px",

    lineHeight:
      "1.4",
  },

  certificateBadge: {
    flexShrink:
      0,

    fontSize:
      "8px",

    fontWeight:
      "850",

    letterSpacing:
      "0.7px",

    padding:
      "5px 7px",

    borderRadius:
      "5px",

    background:
      "#dcfce7",

    color:
      "#166534",
  },

  certificateGrid: {
    display:
      "grid",

    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",

    gap:
      "8px",
  },

  certificateItem: {
    padding:
      "9px",

    borderRadius:
      "8px",

    background:
      "#fff",

    border:
      "1px solid #eef2f7",

    minWidth:
      0,
  },

  certificateFingerprint: {
    marginTop:
      "9px",
  },

  // -------------------------------------------------------
  // META
  // -------------------------------------------------------

  metaGrid: {
    display:
      "grid",

    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",

    gap:
      "10px",

    margin:
      "0 20px 15px",
  },

  metaItem: {
    padding:
      "11px",

    borderRadius:
      "9px",

    background:
      "rgba(255,255,255,0.7)",

    border:
      "1px solid rgba(0,0,0,0.06)",

    minWidth:
      0,
  },

  metaLabel: {
    fontSize:
      "8px",

    fontWeight:
      "850",

    letterSpacing:
      "0.8px",

    color:
      "#9ca3af",

    marginBottom:
      "5px",
  },

  metaValue: {
    fontSize:
      "10px",

    color:
      "#374151",

    fontFamily:
      "'SFMono-Regular', Consolas, monospace",

    overflowWrap:
      "anywhere",
  },

  // -------------------------------------------------------
  // GENERATED TIME
  // -------------------------------------------------------

  generatedAt: {
    display:
      "flex",

    justifyContent:
      "space-between",

    gap:
      "10px",

    padding:
      "13px 20px",

    borderTop:
      "1px solid rgba(0,0,0,0.05)",

    color:
      "#9ca3af",

    fontSize:
      "10px",
  },

  // -------------------------------------------------------
  // FOOTER
  // -------------------------------------------------------

  footer: {
    display:
      "flex",

    justifyContent:
      "center",

    alignItems:
      "center",

    gap:
      "8px",

    marginTop:
      "20px",

    color:
      "#9ca3af",

    fontSize:
      "10px",

    letterSpacing:
      "0.2px",
  },

  footerDot: {
    color:
      "#d1d5db",
  },
};

export default VerifyReport;