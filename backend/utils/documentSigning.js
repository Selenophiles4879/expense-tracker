const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const signpdf =
  require("@signpdf/signpdf").default ||
  require("@signpdf/signpdf");

const { P12Signer } = require("@signpdf/signer-p12");

const {
  pdfkitAddPlaceholder,
} = require("@signpdf/placeholder-pdfkit");

const {
  SUBFILTER_ETSI_CADES_DETACHED,
} = require("@signpdf/utils");

// =========================================================
// ED25519 CONFIGURATION
// =========================================================

const KEY_ID = "expense-tracker-ed25519-v1";

const privateKeyPath =
  process.env.ED25519_PRIVATE_KEY_PATH ||
  path.join(
    __dirname,
    "..",
    "config",
    "signing",
    "private_key.pem"
  );

const publicKeyPath =
  process.env.ED25519_PUBLIC_KEY_PATH ||
  path.join(
    __dirname,
    "..",
    "config",
    "signing",
    "public_key.pem"
  );

// =========================================================
// PDF SIGNING CONFIGURATION
// =========================================================

const pdfP12Path = path.resolve(
  __dirname,
  "..",
  process.env.PDF_SIGNING_P12_PATH ||
    "./config/pdf-signing/pdf-signing.p12"
);

const pdfP12Base64 =
  process.env.PDF_SIGNING_P12_BASE64 || null;

const pdfCertificatePath = path.resolve(
  __dirname,
  "..",
  process.env.PDF_SIGNING_CERT_PATH ||
    "./config/pdf-signing/certificate.pem"
);

const pdfCertificatePassword =
  process.env.PDF_SIGNING_CERT_PASSWORD || "";

const pdfSigningName =
  process.env.PDF_SIGNING_NAME ||
  "Expense Tracker";

const pdfSigningReason =
  process.env.PDF_SIGNING_REASON ||
  "Authentic Expense Tracker Report";

const pdfSigningLocation =
  process.env.PDF_SIGNING_LOCATION ||
  "India";

const pdfSigningContact =
  process.env.PDF_SIGNING_CONTACT ||
  "";

const opensslPath =
  process.env.OPENSSL_PATH ||
  "openssl";

// =========================================================
// ED25519 PRIVATE KEY
// =========================================================

const getPrivateKey = () => {
  if (!fs.existsSync(privateKeyPath)) {
    throw new Error(
      `Signing private key not found at: ${privateKeyPath}`
    );
  }

  const pem = fs
    .readFileSync(privateKeyPath, "utf8")
    .trim();

  if (
    !pem.includes(
      "-----BEGIN PRIVATE KEY-----"
    )
  ) {
    throw new Error(
      "Invalid Ed25519 private key format. Expected PKCS#8 PEM."
    );
  }

  try {
    const keyObject = crypto.createPrivateKey({
      key: pem,
      format: "pem",
      type: "pkcs8",
    });

    if (
      keyObject.asymmetricKeyType !==
      "ed25519"
    ) {
      throw new Error(
        `Wrong signing key type: ${keyObject.asymmetricKeyType}`
      );
    }

    return keyObject;
  } catch (error) {
    throw new Error(
      `Unable to load Ed25519 private key: ${error.message}`
    );
  }
};

// =========================================================
// ED25519 PUBLIC KEY
// =========================================================

const getPublicKey = () => {
  if (!fs.existsSync(publicKeyPath)) {
    throw new Error(
      `Verification public key not found at: ${publicKeyPath}`
    );
  }

  const pem = fs
    .readFileSync(publicKeyPath, "utf8")
    .trim();

  if (
    !pem.includes(
      "-----BEGIN PUBLIC KEY-----"
    )
  ) {
    throw new Error(
      "Invalid Ed25519 public key format. Expected SPKI PEM."
    );
  }

  try {
    const keyObject = crypto.createPublicKey({
      key: pem,
      format: "pem",
      type: "spki",
    });

    if (
      keyObject.asymmetricKeyType !==
      "ed25519"
    ) {
      throw new Error(
        `Wrong verification key type: ${keyObject.asymmetricKeyType}`
      );
    }

    return keyObject;
  } catch (error) {
    throw new Error(
      `Unable to load Ed25519 public key: ${error.message}`
    );
  }
};

// =========================================================
// DOCUMENT HASH
// =========================================================

const createDocumentHash = (
  canonicalData
) => {
  return crypto
    .createHash("sha256")
    .update(
      canonicalData,
      "utf8"
    )
    .digest("hex");
};

// =========================================================
// ED25519 SIGN
// =========================================================

const signCanonicalData = (
  canonicalData
) => {
  const privateKey =
    getPrivateKey();

  const signature =
    crypto.sign(
      null,
      Buffer.from(
        canonicalData,
        "utf8"
      ),
      privateKey
    );

  return signature.toString(
    "base64"
  );
};

// =========================================================
// ED25519 VERIFY
// =========================================================

const verifyCanonicalData = (
  canonicalData,
  digitalSignature
) => {
  try {
    const publicKey =
      getPublicKey();

    return crypto.verify(
      null,
      Buffer.from(
        canonicalData,
        "utf8"
      ),
      publicKey,
      Buffer.from(
        digitalSignature,
        "base64"
      )
    );
  } catch (error) {
    console.error(
      "Digital signature verification error:",
      error
    );

    return false;
  }
};

// =========================================================
// KEY ID
// =========================================================

const getKeyId = () => {
  return KEY_ID;
};

// =========================================================
// LOAD PDF CERTIFICATE
// =========================================================

const getPdfCertificate = () => {
  if (
    !fs.existsSync(
      pdfCertificatePath
    )
  ) {
    throw new Error(
      `PDF signing certificate not found at: ${pdfCertificatePath}`
    );
  }

  const certificatePem =
    fs
      .readFileSync(
        pdfCertificatePath,
        "utf8"
      )
      .trim();

  if (
    !certificatePem.includes(
      "-----BEGIN CERTIFICATE-----"
    )
  ) {
    throw new Error(
      "Invalid PDF signing certificate PEM."
    );
  }

  return new crypto.X509Certificate(
    certificatePem
  );
};

// =========================================================
// PDF SIGNING CONFIG
// =========================================================

const getPdfSigningConfig = () => {
  if (
    !pdfP12Base64 &&
    !fs.existsSync(
      pdfP12Path
    )
  ) {
    throw new Error(
      `PDF signing P12 certificate not found at: ${pdfP12Path}`
    );
  }

  const certificate =
    getPdfCertificate();

  return {
    p12Path:
      pdfP12Path,

    certificatePath:
      pdfCertificatePath,

    password:
      pdfCertificatePassword,

    name:
      pdfSigningName,

    reason:
      pdfSigningReason,

    location:
      pdfSigningLocation,

    contactInfo:
      pdfSigningContact,

    fingerprint256:
      certificate.fingerprint256,

    fingerprint:
      certificate.fingerprint,

    subject:
      certificate.subject,

    issuer:
      certificate.issuer,

    serialNumber:
      certificate.serialNumber,

    validFrom:
      certificate.validFrom,

    validTo:
      certificate.validTo,
  };
};

// =========================================================
// ADD PDF SIGNATURE PLACEHOLDER
// =========================================================

const addPdfSignaturePlaceholder = (
  pdfDoc,
  verificationId
) => {
  const config =
    getPdfSigningConfig();

  pdfkitAddPlaceholder({
    pdf: pdfDoc,

    reason:
      `${config.reason} - ${verificationId}`,

    contactInfo:
      config.contactInfo,

    name:
      config.name,

    location:
      config.location,

    /*
     * Reserve enough space for the CMS
     * signature and embedded certificate.
     */
    signatureLength: 8192,

    subFilter:
      SUBFILTER_ETSI_CADES_DETACHED,

    signingTime:
      new Date(),
  });

  return pdfDoc;
};

// =========================================================
// SIGN PDF
// =========================================================

const signPdfBuffer = async (
  unsignedPdfBuffer
) => {
  if (
    !Buffer.isBuffer(
      unsignedPdfBuffer
    )
  ) {
    throw new Error(
      "signPdfBuffer expected a PDF Buffer."
    );
  }

  if (
    unsignedPdfBuffer.length === 0
  ) {
    throw new Error(
      "Cannot sign an empty PDF."
    );
  }

  if (
    unsignedPdfBuffer
      .subarray(0, 5)
      .toString("ascii") !==
    "%PDF-"
  ) {
    throw new Error(
      "The document supplied for signing is not a valid PDF."
    );
  }

    const config =
    getPdfSigningConfig();

  const p12Buffer =
    pdfP12Base64
      ? Buffer.from(pdfP12Base64, "base64")
      : fs.readFileSync(
          config.p12Path
        );

//temporary
  console.log("P12 path:", config.p12Path);
console.log("P12 size:", p12Buffer.length);
console.log(
  "P12 first 16 bytes:",
  p12Buffer.subarray(0, 16).toString("hex")
);
  
  if (
    !p12Buffer ||
    p12Buffer.length === 0
  ) {
    throw new Error(
      "PDF signing P12 file is empty."
    );
  }

  if (
    p12Buffer[0] !== 0x30
  ) {
    throw new Error(
      `Decoded P12 does not start with a valid ASN.1 SEQUENCE (0x30). Got 0x${p12Buffer[0].toString(16)}. Check PDF_SIGNING_P12_BASE64 encoding.`
    );
  }

  const signer =
    new P12Signer(
      p12Buffer,
      {
        passphrase:
          config.password,
      }
    );

  const signedPdf =
    await signpdf.sign(
      unsignedPdfBuffer,
      signer
    );

  if (
    !Buffer.isBuffer(
      signedPdf
    )
  ) {
    throw new Error(
      "PDF signing did not return a Buffer."
    );
  }

  if (
    signedPdf.length === 0
  ) {
    throw new Error(
      "PDF signing produced an empty PDF."
    );
  }

  const pdfText =
    signedPdf.toString(
      "latin1"
    );

  if (
    !pdfText.includes(
      "/ByteRange"
    ) ||
    !pdfText.includes(
      "/Contents"
    )
  ) {
    throw new Error(
      "Signed PDF does not contain a valid PDF signature dictionary."
    );
  }

  /*
   * IMPORTANT:
   *
   * Verify the generated PDF immediately.
   *
   * This prevents the server from sending a PDF which
   * was apparently signed but cannot subsequently pass
   * cryptographic verification.
   */
  const selfVerification =
    await verifyPdfSignature(
      signedPdf
    );

  if (
    !selfVerification.valid
  ) {
    throw new Error(
      `Generated PDF failed cryptographic self-verification: ${
        selfVerification.reason ||
        "Unknown PDF signature verification error."
      }`
    );
  }

  return signedPdf;
};

// =========================================================
// READ DER OBJECT LENGTH
// =========================================================

const getDerObjectLength = (
  buffer
) => {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length < 2
  ) {
    throw new Error(
      "Invalid DER buffer."
    );
  }

  /*
   * CMS ContentInfo must begin with
   * an ASN.1 SEQUENCE.
   */
  if (
    buffer[0] !== 0x30
  ) {
    throw new Error(
      `CMS signature does not begin with an ASN.1 SEQUENCE. Found byte 0x${buffer[0].toString(
        16
      )}.`
    );
  }

  const firstLengthByte =
    buffer[1];

  /*
   * Short-form DER length.
   */
  if (
    (firstLengthByte & 0x80) ===
    0
  ) {
    const contentLength =
      firstLengthByte;

    const totalLength =
      2 + contentLength;

    if (
      totalLength >
      buffer.length
    ) {
      throw new Error(
        "DER object is truncated."
      );
    }

    return totalLength;
  }

  /*
   * Long-form DER length.
   */
  const lengthOctets =
    firstLengthByte & 0x7f;

  if (
    lengthOctets === 0
  ) {
    throw new Error(
      "Indefinite DER length is not valid for this CMS signature."
    );
  }

  if (
    lengthOctets > 8
  ) {
    throw new Error(
      "DER length field is unreasonably large."
    );
  }

  if (
    2 + lengthOctets >
    buffer.length
  ) {
    throw new Error(
      "DER length field is truncated."
    );
  }

  let contentLength = 0;

  for (
    let i = 0;
    i < lengthOctets;
    i++
  ) {
    contentLength =
      contentLength * 256 +
      buffer[2 + i];
  }

  const headerLength =
    2 + lengthOctets;

  const totalLength =
    headerLength +
    contentLength;

  if (
    totalLength >
    buffer.length
  ) {
    throw new Error(
      `DER object is truncated. Expected ${totalLength} bytes but only ${buffer.length} bytes are available.`
    );
  }

  return totalLength;
};

// =========================================================
// EXTRACT PDF SIGNATURE
// =========================================================

const extractPdfSignature = (
  pdfBuffer
) => {
  if (
    !Buffer.isBuffer(
      pdfBuffer
    )
  ) {
    throw new Error(
      "extractPdfSignature expected a PDF Buffer."
    );
  }

  const pdfText =
    pdfBuffer.toString(
      "latin1"
    );

  /*
   * Find the signature ByteRange.
   *
   * We intentionally use the first signature dictionary.
   * The application currently creates one PDF signature.
   */
  const byteRangeMatch =
    pdfText.match(
      /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/
    );

  if (
    !byteRangeMatch
  ) {
    return {
      found: false,

      reason:
        "PDF signature ByteRange was not found.",
    };
  }

  const byteRange =
    byteRangeMatch
      .slice(1)
      .map(Number);

  if (
    byteRange.length !== 4
  ) {
    return {
      found: false,

      reason:
        "Invalid PDF signature ByteRange.",
    };
  }

  const [
    range1Start,
    range1Length,
    range2Start,
    range2Length,
  ] = byteRange;

  if (
    range1Start !== 0
  ) {
    return {
      found: false,

      reason:
        "PDF signature ByteRange does not start at zero.",

      byteRange,
    };
  }

  if (
    !Number.isSafeInteger(
      range1Length
    ) ||
    !Number.isSafeInteger(
      range2Start
    ) ||
    !Number.isSafeInteger(
      range2Length
    )
  ) {
    return {
      found: false,

      reason:
        "PDF signature ByteRange contains unsafe numeric values.",

      byteRange,
    };
  }

  if (
    range1Length < 0 ||
    range2Start < 0 ||
    range2Length < 0
  ) {
    return {
      found: false,

      reason:
        "PDF signature ByteRange contains invalid values.",

      byteRange,
    };
  }

  const range1End =
    range1Start +
    range1Length;

  const range2End =
    range2Start +
    range2Length;

  if (
    range1End >
    pdfBuffer.length
  ) {
    return {
      found: false,

      reason:
        "First PDF signature ByteRange exceeds file size.",

      byteRange,
    };
  }

  if (
    range2Start >
    pdfBuffer.length
  ) {
    return {
      found: false,

      reason:
        "Second PDF signature ByteRange starts outside the file.",

      byteRange,
    };
  }

  if (
    range2End >
    pdfBuffer.length
  ) {
    return {
      found: false,

      reason:
        "Second PDF signature ByteRange exceeds file size.",

      byteRange,
    };
  }

  /*
   * The two signed ranges must not overlap.
   */
  if (
    range1End >
    range2Start
  ) {
    return {
      found: false,

      reason:
        "PDF signature ByteRange contains overlapping ranges.",

      byteRange,
    };
  }

  /*
   * The second range should normally continue
   * after the signature /Contents region.
   */
  if (
    range2Start <=
    range1End
  ) {
    return {
      found: false,

      reason:
        "PDF signature ByteRange does not contain a detached signature gap.",

      byteRange,
    };
  }

  /*
   * Search for /Contents only after /ByteRange.
   *
   * This avoids accidentally picking a random /Contents
   * field from an earlier PDF object.
   */
  const contentsSearchStart =
    byteRangeMatch.index;

  const contentsRegion =
    pdfText.slice(
      contentsSearchStart
    );

  const contentsMatch =
    contentsRegion.match(
      /\/Contents\s*<([0-9A-Fa-f\s\r\n]+)>/
    );

  if (
    !contentsMatch
  ) {
    return {
      found: false,

      reason:
        "PDF signature Contents was not found.",

      byteRange,
    };
  }

  /*
   * Convert the PDF hex string into bytes.
   */
  const contentsHex =
    contentsMatch[1]
      .replace(
        /\s+/g,
        ""
      );

  if (
    contentsHex.length === 0
  ) {
    return {
      found: false,

      reason:
        "PDF signature Contents is empty.",

      byteRange,
    };
  }

  if (
    contentsHex.length % 2 !==
    0
  ) {
    return {
      found: false,

      reason:
        "PDF signature Contents contains an odd number of hexadecimal characters.",

      byteRange,
    };
  }

  if (
    !/^[0-9A-Fa-f]+$/.test(
      contentsHex
    )
  ) {
    return {
      found: false,

      reason:
        "PDF signature Contents is not valid hexadecimal.",

      byteRange,
    };
  }

  let contentsBuffer;

  try {
    contentsBuffer =
      Buffer.from(
        contentsHex,
        "hex"
      );
  } catch (error) {
    return {
      found: false,

      reason:
        `PDF signature Contents could not be decoded: ${error.message}`,

      byteRange,
    };
  }

  if (
    contentsBuffer.length === 0
  ) {
    return {
      found: false,

      reason:
        "PDF signature Contents decoded to an empty buffer.",

      byteRange,
    };
  }

  /*
   * ---------------------------------------------------------
   * IMPORTANT FIX
   * ---------------------------------------------------------
   *
   * @signpdf reserves a fixed /Contents size.
   *
   * Therefore the actual CMS object is followed by zero
   * padding.
   *
   * Do NOT pass the entire padded /Contents to OpenSSL.
   *
   * Instead, read the actual DER object length directly.
   */
  let cmsLength;

  try {
    cmsLength =
      getDerObjectLength(
        contentsBuffer
      );
  } catch (error) {
    return {
      found: false,

      reason:
        `Embedded CMS signature could not be parsed as DER: ${error.message}`,

      byteRange,
    };
  }

  const cmsBuffer =
    contentsBuffer.subarray(
      0,
      cmsLength
    );

  /*
   * Make sure CMS bytes exist inside the
   * detached signature region.
   */
  const contentsRelativeIndex =
    contentsRegion.indexOf(
      "<",
      contentsRegion.indexOf(
        "/Contents"
      )
    );

  if (
    contentsRelativeIndex <
    0
  ) {
    return {
      found: false,

      reason:
        "Could not locate the PDF /Contents hexadecimal string.",

      byteRange,
    };
  }

  const contentsHexStart =
    contentsSearchStart +
    contentsRelativeIndex +
    1;

  /*
   * We calculate the textual end for diagnostics.
   */
  const contentsHexEnd =
    contentsHexStart +
    contentsMatch[1].length;

  void contentsHexEnd;

  /*
   * Construct the exact signed content.
   *
   * The bytes inside /Contents are excluded.
   */
  const signedContent =
    Buffer.concat([
      pdfBuffer.subarray(
        range1Start,
        range1End
      ),

      pdfBuffer.subarray(
        range2Start,
        range2End
      ),
    ]);

  return {
    found: true,

    byteRange,

    cmsBuffer,

    signedContent,

    contentsOffset:
      contentsSearchStart,

    contentsLength:
      contentsBuffer.length,

    cmsLength,

    contentsHexLength:
      contentsHex.length,

    range1Start,

    range1Length,

    range2Start,

    range2Length,
  };
};

// =========================================================
// TEMPORARY FILE HELPER
// =========================================================

const createTempDirectory =
  async () => {
    return fs.promises.mkdtemp(
      path.join(
        os.tmpdir(),
        "expense-tracker-pdf-"
      )
    );
  };

// =========================================================
// RUN OPENSSL
// =========================================================

const runOpenSSL = async (
  args
) => {
  try {
    return await execFileAsync(
      opensslPath,
      args,
      {
        windowsHide: true,

        maxBuffer:
          20 * 1024 * 1024,
      }
    );
  } catch (error) {
    const stderr =
      error.stderr
        ? String(
            error.stderr
          ).trim()
        : "";

    const stdout =
      error.stdout
        ? String(
            error.stdout
          ).trim()
        : "";

    const details =
      stderr ||
      stdout ||
      error.message;

    throw new Error(
      `OpenSSL command failed: ${details}`
    );
  }
};

// =========================================================
// EXTRACT SIGNER CERTIFICATE FROM CMS
// =========================================================

const extractSignerCertificateFromCMS =
  async (
    cmsBuffer,
    tempDir
  ) => {
    const cmsPath =
      path.join(
        tempDir,
        "signature.der"
      );

    const signerCertificatePath =
      path.join(
        tempDir,
        "signer-cert.pem"
      );

    await fs.promises.writeFile(
      cmsPath,
      cmsBuffer
    );

    /*
     * OpenSSL CMS -verify with -signer writes
     * the signer certificate extracted from the CMS.
     *
     * We use -noverify because the certificate may
     * be self-signed/private and does not need to
     * chain to the public OS trust store.
     */
    try {
      await runOpenSSL([
        "cms",

        "-verify",

        "-binary",

        "-inform",
        "DER",

        "-in",
        cmsPath,

        "-noverify",

        "-signer",
        signerCertificatePath,

        "-out",
        path.join(
          tempDir,
          "certificate-extraction.bin"
        ),
      ]);
    } catch (error) {
      /*
       * If CMS verification has already been performed
       * by the caller, try extracting the certificate
       * independently.
       */
      try {
        await runOpenSSL([
          "cms",

          "-inform",
          "DER",

          "-in",
          cmsPath,

          "-cmsout",

          "-print",
        ]);
      } catch {
        throw error;
      }
    }

    if (
      !fs.existsSync(
        signerCertificatePath
      )
    ) {
      return [];
    }

    const pemText =
      await fs.promises.readFile(
        signerCertificatePath,
        "utf8"
      );

    const matches =
      pemText.match(
        /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g
      ) || [];

    return matches.map(
      (pem) => {
        const certificate =
          new crypto.X509Certificate(
            pem
          );

        return {
          pem,

          certificate,

          fingerprint256:
            certificate.fingerprint256,

          fingerprint:
            certificate.fingerprint,

          subject:
            certificate.subject,

          issuer:
            certificate.issuer,

          serialNumber:
            certificate.serialNumber,

          validFrom:
            certificate.validFrom,

          validTo:
            certificate.validTo,
        };
      }
    );
  };

// =========================================================
// EXTRACT ALL CERTIFICATES FROM CMS
// =========================================================

const extractCertificatesFromCMS =
  async (
    cmsBuffer,
    tempDir
  ) => {
    const cmsPath =
      path.join(
        tempDir,
        "signature.der"
      );

    const certificatesPath =
      path.join(
        tempDir,
        "certificates.pem"
      );

    await fs.promises.writeFile(
      cmsPath,
      cmsBuffer
    );

    /*
     * CMS SignedData is accepted by the OpenSSL
     * pkcs7 command as a PKCS#7 structure in
     * normal OpenSSL versions.
     */
    try {
      await runOpenSSL([
        "pkcs7",

        "-inform",
        "DER",

        "-in",
        cmsPath,

        "-print_certs",

        "-out",
        certificatesPath,
      ]);
    } catch {
      /*
       * Modern OpenSSL may prefer CMS.
       *
       * The signer certificate extraction below is
       * more reliable for identifying the actual signer.
       */
      const signerCertificates =
        await extractSignerCertificateFromCMS(
          cmsBuffer,
          tempDir
        );

      return signerCertificates;
    }

    if (
      !fs.existsSync(
        certificatesPath
      )
    ) {
      return [];
    }

    const pemText =
      await fs.promises.readFile(
        certificatesPath,
        "utf8"
      );

    const matches =
      pemText.match(
        /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g
      ) || [];

    return matches.map(
      (pem) => {
        const certificate =
          new crypto.X509Certificate(
            pem
          );

        return {
          pem,

          certificate,

          fingerprint256:
            certificate.fingerprint256,

          fingerprint:
            certificate.fingerprint,

          subject:
            certificate.subject,

          issuer:
            certificate.issuer,

          serialNumber:
            certificate.serialNumber,

          validFrom:
            certificate.validFrom,

          validTo:
            certificate.validTo,
        };
      }
    );
  };

// =========================================================
// VERIFY CMS CRYPTOGRAPHIC SIGNATURE
// =========================================================

const verifyCMSCryptographicSignature =
  async (
    cmsBuffer,
    signedContent,
    tempDir
  ) => {
    const cmsPath =
      path.join(
        tempDir,
        "signature.der"
      );

    const contentPath =
      path.join(
        tempDir,
        "signed-content.bin"
      );

    const verifiedOutputPath =
      path.join(
        tempDir,
        "verified-content.bin"
      );

    await fs.promises.writeFile(
      cmsPath,
      cmsBuffer
    );

    await fs.promises.writeFile(
      contentPath,
      signedContent
    );

    /*
     * OpenSSL performs the actual CMS cryptographic
     * signature verification.
     *
     * -verify
     *   Verify the signature.
     *
     * -binary
     *   Treat the PDF as binary data.
     *
     * -inform DER
     *   Embedded CMS is DER encoded.
     *
     * -content
     *   Detached signed PDF ByteRange content.
     *
     * -noverify
     *   Do not require the certificate chain to be
     *   trusted by the operating system.
     *
     * The actual signing certificate is separately
     * compared against our trusted certificate.
     */
    try {
      await runOpenSSL([
        "cms",

        "-verify",

        "-binary",

        "-inform",
        "DER",

        "-in",
        cmsPath,

        "-content",
        contentPath,

        "-noverify",

        "-out",
        verifiedOutputPath,
      ]);

      return {
        valid: true,

        message:
          "CMS cryptographic signature is valid.",
      };
    } catch (error) {
      return {
        valid: false,

        message:
          error.message,
      };
    }
  };

// =========================================================
// VERIFY ACTUAL PDF SIGNATURE
// =========================================================

const verifyPdfSignature =
  async (
    pdfBuffer
  ) => {
    if (
      !Buffer.isBuffer(
        pdfBuffer
      )
    ) {
      throw new Error(
        "verifyPdfSignature expected a PDF Buffer."
      );
    }

    if (
      pdfBuffer.length < 5 ||
      pdfBuffer
        .subarray(0, 5)
        .toString("ascii") !==
      "%PDF-"
    ) {
      return {
        valid: false,

        status: "INVALID",

        reason:
          "The uploaded file is not a PDF.",

        signatureFound: false,
      };
    }

    let extracted;

    try {
      extracted =
        extractPdfSignature(
          pdfBuffer
        );
    } catch (error) {
      return {
        valid: false,

        status: "INVALID",

        reason:
          `PDF signature extraction failed: ${error.message}`,

        signatureFound: false,
      };
    }

    if (
      !extracted.found
    ) {
      return {
        valid: false,

        status: "INVALID",

        reason:
          extracted.reason ||
          "No digital signature was found in the PDF.",

        signatureFound: false,

        byteRange:
          extracted.byteRange ||
          null,
      };
    }

    const [
      range1Start,
      range1Length,
      range2Start,
      range2Length,
    ] = extracted.byteRange;

    const firstEnd =
      range1Start +
      range1Length;

    const secondEnd =
      range2Start +
      range2Length;

    /*
     * Strict ByteRange validation.
     */
    if (
      range1Start !== 0 ||
      range1Length < 0 ||
      range2Start < 0 ||
      range2Length < 0 ||
      firstEnd >
        range2Start ||
      secondEnd >
        pdfBuffer.length
    ) {
      return {
        valid: false,

        status: "INVALID",

        reason:
          "The PDF signature ByteRange is malformed.",

        signatureFound: true,

        cryptographicSignatureValid:
          false,

        byteRange:
          extracted.byteRange,
      };
    }

    /*
     * =======================================================
     * CRITICAL SECURITY CHECK
     * =======================================================
     *
     * The signed ByteRange MUST reach the exact end of the
     * uploaded PDF.
     *
     * If:
     *
     *     secondEnd < pdfBuffer.length
     *
     * then unsigned bytes exist after the signed range.
     *
     * An attacker could otherwise append an incremental
     * update or arbitrary trailing data while keeping the
     * original CMS signature cryptographically valid.
     *
     * Therefore the only accepted condition is:
     *
     *     secondEnd === pdfBuffer.length
     */
    if (
      secondEnd !==
      pdfBuffer.length
    ) {
      return {
        valid: false,

        status: "TAMPERED",

        reason:
          "The PDF contains unsigned bytes after the signed ByteRange. The file may contain an appended or incremental modification after signing.",

        signatureFound: true,

        cryptographicSignatureValid:
          false,

        byteRange:
          extracted.byteRange,

        signedLength:
          secondEnd,

        actualFileLength:
          pdfBuffer.length,
      };
    }

    /*
     * Ensure there really is a detached signature
     * gap between the two signed byte ranges.
     */
    if (
      range2Start <=
      firstEnd
    ) {
      return {
        valid: false,

        status: "INVALID",

        reason:
          "The PDF signature ByteRange does not contain a valid detached signature region.",

        signatureFound: true,

        cryptographicSignatureValid:
          false,

        byteRange:
          extracted.byteRange,
      };
    }

    /*
     * Make sure CMS exists.
     */
    if (
      !Buffer.isBuffer(
        extracted.cmsBuffer
      ) ||
      extracted.cmsBuffer.length <
        2
    ) {
      return {
        valid: false,

        status: "INVALID",

        reason:
          "The PDF contains an empty or invalid CMS signature.",

        signatureFound: true,

        cryptographicSignatureValid:
          false,

        byteRange:
          extracted.byteRange,
      };
    }

    const expectedConfig =
      getPdfSigningConfig();

    const tempDir =
      await createTempDirectory();

    try {
      /*
       * -------------------------------------------------------
       * CRYPTOGRAPHIC VERIFICATION
       * -------------------------------------------------------
       */

      const cmsResult =
        await verifyCMSCryptographicSignature(
          extracted.cmsBuffer,
          extracted.signedContent,
          tempDir
        );

      if (
        !cmsResult.valid
      ) {
        return {
          valid: false,

          status: "TAMPERED",

          reason:
            "The embedded PDF digital signature is cryptographically invalid. The PDF bytes may have been changed after signing, or the embedded signature may be corrupted.",

          signatureFound: true,

          cryptographicSignatureValid:
            false,

          byteRange:
            extracted.byteRange,

          signatureFormat:
            SUBFILTER_ETSI_CADES_DETACHED,

          cryptographicError:
            cmsResult.message,
        };
      }

      /*
       * -------------------------------------------------------
       * CERTIFICATE EXTRACTION
       * -------------------------------------------------------
       */

      let certificates = [];

      try {
        certificates =
          await extractCertificatesFromCMS(
            extracted.cmsBuffer,
            tempDir
          );
      } catch (error) {
        return {
          valid: false,

          status: "INVALID",

          reason:
            `The embedded signing certificate could not be extracted: ${error.message}`,

          signatureFound: true,

          cryptographicSignatureValid:
            true,

          byteRange:
            extracted.byteRange,
        };
      }

      /*
       * Some OpenSSL configurations may not expose all
       * certificates through pkcs7 -print_certs.
       *
       * Try direct signer extraction as a second method.
       */
      if (
        certificates.length === 0
      ) {
        try {
          certificates =
            await extractSignerCertificateFromCMS(
              extracted.cmsBuffer,
              tempDir
            );
        } catch (error) {
          console.warn(
            "Direct CMS signer certificate extraction failed:",
            error.message
          );
        }
      }

      if (
        certificates.length === 0
      ) {
        return {
          valid: false,

          status: "INVALID",

          reason:
            "The CMS signature is cryptographically valid, but no signing certificate was found inside it.",

          signatureFound: true,

          cryptographicSignatureValid:
            true,

          certificateMatch:
            false,

          byteRange:
            extracted.byteRange,
        };
      }

      /*
       * -------------------------------------------------------
       * TRUSTED CERTIFICATE MATCH
       * -------------------------------------------------------
       *
       * We NEVER trust an arbitrary certificate simply
       * because it is embedded inside an uploaded PDF.
       *
       * It must match our configured certificate.
       */

      const normalizeFingerprint =
        (value) => {
          return String(
            value || ""
          )
            .replace(
              /:/g,
              ""
            )
            .replace(
              /\s+/g,
              ""
            )
            .toUpperCase();
        };

      const trustedFingerprint =
        normalizeFingerprint(
          expectedConfig.fingerprint256
        );

      const embeddedCertificate =
        certificates.find(
          (certificate) => {
            return (
              normalizeFingerprint(
                certificate.fingerprint256
              ) ===
              trustedFingerprint
            );
          }
        );

      if (
        !embeddedCertificate
      ) {
        return {
          valid: false,

          status: "INVALID",

          reason:
            "The PDF signature is cryptographically valid, but it was not signed with the trusted Expense Tracker signing certificate.",

          signatureFound: true,

          cryptographicSignatureValid:
            true,

          certificateMatch:
            false,

          expectedCertificateFingerprint:
            expectedConfig.fingerprint256,

          embeddedCertificates:
            certificates.map(
              (certificate) =>
                certificate.fingerprint256
            ),

          byteRange:
            extracted.byteRange,
        };
      }

      /*
       * -------------------------------------------------------
       * CERTIFICATE VALIDITY
       * -------------------------------------------------------
       *
       * Certificate expiration alone does NOT invalidate
       * an old document that was correctly signed while
       * the certificate was valid.
       */

      let certificateCurrentlyValid =
        true;

      try {
        const now =
          new Date();

        const validFrom =
          new Date(
            embeddedCertificate.validFrom
          );

        const validTo =
          new Date(
            embeddedCertificate.validTo
          );

        certificateCurrentlyValid =
          now >= validFrom &&
          now <= validTo;
      } catch {
        certificateCurrentlyValid =
          false;
      }

      /*
       * -------------------------------------------------------
       * AUTHENTIC
       * -------------------------------------------------------
       */

      return {
        valid: true,

        status: "AUTHENTIC",

        reason:
          "The PDF's embedded CMS signature is cryptographically valid and matches the trusted Expense Tracker signing certificate.",

        signatureFound: true,

        cryptographicSignatureValid:
          true,

        certificateMatch:
          true,

        certificateCurrentlyValid,

        signatureFormat:
          SUBFILTER_ETSI_CADES_DETACHED,

        byteRange:
          extracted.byteRange,

        certificateFingerprint:
          embeddedCertificate.fingerprint256,

        certificateFingerprint256:
          embeddedCertificate.fingerprint256,

        certificateFingerprintSha1:
          embeddedCertificate.fingerprint ||
          null,

        certificateSubject:
          embeddedCertificate.subject ||
          null,

        certificateIssuer:
          embeddedCertificate.issuer ||
          null,

        certificateSerial:
          embeddedCertificate.serialNumber ||
          null,

        certificateValidFrom:
          embeddedCertificate.validFrom ||
          null,

        certificateValidTo:
          embeddedCertificate.validTo ||
          null,
      };
    } finally {
      /*
       * Always remove temporary OpenSSL files.
       */
      try {
        await fs.promises.rm(
          tempDir,
          {
            recursive: true,
            force: true,
          }
        );
      } catch (cleanupError) {
        console.warn(
          "PDF signature temporary-file cleanup failed:",
          cleanupError.message
        );
      }
    }
  };

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  createDocumentHash,

  signCanonicalData,

  verifyCanonicalData,

  getKeyId,

  getPdfSigningConfig,

  addPdfSignaturePlaceholder,

  signPdfBuffer,

  verifyPdfSignature,

  extractPdfSignature,
};
