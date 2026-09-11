const asyncHandler = require("express-async-handler");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const crypto = require("crypto");

const Transaction = require("../model/Transaction");
const ExportVerification = require("../model/ExportVerification");

const {
  createDocumentHash,
  signCanonicalData,
  verifyCanonicalData,
  getKeyId,
  getPdfSigningConfig,
  signPdfBuffer,
  verifyPdfSignature,
  extractPdfSignature,
} = require("../utils/documentSigning");


// =========================================================
// HELPERS
// =========================================================

const parseDateOnly = (value) => {
  const text = String(value || "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = new Date(`${text}T00:00:00.000Z`);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const match = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);

  if (match) {
    const [, day, month, year] = match;
    const normalized = `${year}-${month}-${day}`;
    const date = new Date(`${normalized}T00:00:00.000Z`);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};


const createVerificationId = () => {
  const randomPart = crypto
    .randomBytes(6)
    .toString("hex")
    .toUpperCase();

  return `EXP-${new Date().getFullYear()}-${randomPart}`;
};


const formatDate = (date) => {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
};


const formatDateISO = (date) => {
  return new Date(date).toISOString().slice(0, 10);
};


const formatMoney = (amount) => {
  return `Rs. ${Number(amount || 0).toFixed(2)}`;
};


/*
 * =========================================================
 * PAGE NUMBER STAMP
 * =========================================================
 *
 * Stamps "Page N" bottom-right on whatever page is currently
 * active. Deliberately does NOT rely on PDFKit's bufferPages
 * mode (no "Page N of Y" total) — that mode changes how the
 * document is finalized and was found to interfere with the
 * PDF signature placeholder step, which must remain exactly
 * as it was: called once, right before doc.end(), on a
 * normally-streamed (non-buffered) document.
 */

const stampPageNumber = (
  doc,
  pageNumber
) => {
  /*
   * Save the current text cursor before drawing the stamp.
   *
   * PDFKit's .text() call below leaves doc.x/doc.y (and the
   * narrow 70pt width used here) as the "current" cursor state
   * for whatever .text() call comes next. Since this function
   * is called at arbitrary points — including right before the
   * report header, which relies on the default full-width,
   * centered cursor — that leftover narrow/bottom-right state
   * was corrupting later text layout. Restoring the cursor
   * afterwards makes this stamp a true side-effect-free overlay.
   */
  const savedX = doc.x;
  const savedY = doc.y;

  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor("#9ca3af")
    .text(
      `Page ${pageNumber}`,

      doc.page.width -
        doc.page.margins.right -
        70,

      doc.page.height -
        doc.page.margins.bottom -
        25,

      {
        width: 70,
        align: "right",
        lineBreak: false,
      }
    );

  doc.x = savedX;
  doc.y = savedY;
};


const getBackendUrl = () => {
  return (
    process.env.BACKEND_URL ||
    "http://localhost:8000"
  ).replace(/\/+$/, "");
};


const getFrontendUrl = () => {
  return (
    process.env.FRONTEND_URL ||
    "http://localhost:5173"
  ).replace(/\/+$/, "");
};


const escapeHtml = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};


const escapeCSV = (value) => {
  const text = String(value ?? "");

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
};


const normalizeTransactionType = (transaction) => {
  const type = String(
    transaction?.type ||
      transaction?.transactionType ||
      "expense"
  )
    .trim()
    .toLowerCase();

  if (type === "income") {
    return "income";
  }

  return "expense";
};


const getTransactionAmount = (transaction) => {
  const candidates = [
    transaction?.amount,
    transaction?.price,
    transaction?.value,
  ];

  for (const candidate of candidates) {
    const number = Number(candidate);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return 0;
};


const getTransactionDate = (transaction) => {
  return (
    transaction?.date ||
    transaction?.createdAt ||
    transaction?.transactionDate ||
    null
  );
};


const getTransactionDescription = (transaction) => {
  return String(
    transaction?.description ||
      transaction?.title ||
      transaction?.name ||
      ""
  ).trim();
};


const getTransactionCategory = (transaction) => {
  return String(
    transaction?.category ||
      transaction?.type ||
      "Uncategorized"
  ).trim();
};


const getTransactionItems = (transaction) => {
  if (
    Array.isArray(transaction?.items)
  ) {
    return transaction.items.map((item) => ({
      name: String(item?.name || ""),
      price: Number(item?.price || 0),
    }));
  }

  return [];
};


// =========================================================
// CANONICAL REPORT DATA
// =========================================================

const buildCanonicalData = ({
  verificationId,
  startDate,
  endDate,
  transactions,
}) => {
  const normalizedTransactions =
    transactions.map((transaction) => {
      const type =
        normalizeTransactionType(
          transaction
        );

      const amount =
        getTransactionAmount(
          transaction
        );

      const date =
        getTransactionDate(
          transaction
        );

      const description =
        getTransactionDescription(
          transaction
        );

      const category =
        getTransactionCategory(
          transaction
        );

      const items =
        getTransactionItems(
          transaction
        );

      return {
        id: String(
          transaction?._id ||
            transaction?.id ||
            ""
        ),

        type,

        amount,

        date: date
          ? new Date(date).toISOString()
          : null,

        description,

        category,

        items,
      };
    });

  normalizedTransactions.sort(
    (a, b) => {
      if (a.date !== b.date) {
        return String(
          a.date || ""
        ).localeCompare(
          String(
            b.date || ""
          )
        );
      }

      return a.id.localeCompare(
        b.id
      );
    }
  );

  const canonicalObject = {
    version: "1",

    verificationId:
      String(
        verificationId
      ).trim(),

    startDate:
      formatDateISO(
        startDate
      ),

    endDate:
      formatDateISO(
        endDate
      ),

    transactions:
      normalizedTransactions,
  };

  return JSON.stringify(
    canonicalObject
  );
};


// =========================================================
// FETCH USER TRANSACTIONS
// =========================================================

const getUserTransactions = async ({
  userId,
  startDate,
  endDate,
}) => {
  const query = {
    user: userId,

    date: {
      $gte: startDate,
      $lte: endDate,
    },
  };

  const transactions =
    await Transaction.find(
      query
    ).lean();

  return Array.isArray(
    transactions
  )
    ? transactions
    : [];
};


// =========================================================
// CREATE VERIFICATION RECORD
// =========================================================

const createVerificationRecord = async ({
  req,
  verificationId,
  startDate,
  endDate,
  transactions,
  exportType,
}) => {
  const canonicalData =
    buildCanonicalData({
      verificationId,
      startDate,
      endDate,
      transactions,
    });

  const documentHash =
    createDocumentHash(
      canonicalData
    );

  const digitalSignature =
    signCanonicalData(
      canonicalData
    );

  const generatedAt =
    new Date();

  let pdfSigningMetadata = {};

  if (
    exportType === "PDF"
  ) {
    const pdfConfig =
      getPdfSigningConfig();

    pdfSigningMetadata = {
      pdfSignatureFormat:
        "ETSI.CAdES.detached",

      pdfCertificateFingerprint:
        pdfConfig.fingerprint256 ||
        null,

      pdfCertificateSubject:
        pdfConfig.subject ||
        null,

      pdfCertificateIssuer:
        pdfConfig.issuer ||
        null,

      pdfCertificateSerial:
        pdfConfig.serialNumber ||
        null,

      pdfCertificateValidFrom:
        pdfConfig.validFrom ||
        null,

      pdfCertificateValidTo:
        pdfConfig.validTo ||
        null,
    };
  }

  const total = transactions.reduce(
    (sum, transaction) => {
      const amount =
        getTransactionAmount(
          transaction
        );

      const type =
        normalizeTransactionType(
          transaction
        );

      /*
       * Expenses contribute positively to the
       * expense total.
       *
       * Income is kept in the report but is not
       * included in the expense total.
       */
      if (
        type === "expense"
      ) {
        return sum + amount;
      }

      return sum;
    },
    0
  );

  const verification =
    await ExportVerification.create({
      verificationId,

      user:
        req.user.id,

      startDate,

      endDate,

      expenseCount:
        transactions.length,

      totalAmount:
        total,

      documentHash,

      canonicalData,

      digitalSignature,

      keyId:
        getKeyId(),

      exportType,

      generatedAt,

      ...pdfSigningMetadata,
    });

  return {
    verification,

    verificationId,

    generatedAt,

    canonicalData,

    documentHash,

    digitalSignature,

    keyId:
      getKeyId(),
  };
};


// =========================================================
// VERIFICATION URL
// =========================================================

const createVerificationUrl = (
  verificationId
) => {
  const backendUrl =
    getBackendUrl();

  return `${backendUrl}/api/v1/transactions/export/verify/${verificationId}`;
};


// CSV verification opens the frontend verifier so the actual
// downloaded CSV can be uploaded and checked.
const createCSVVerificationUrl = (
  verificationId
) => {
  const frontendUrl =
    getFrontendUrl();

  return `${frontendUrl}/verify-csv?verificationId=${encodeURIComponent(
    verificationId
  )}`;
};


// PDF verification opens the same frontend verifier so the actual
// downloaded PDF bytes can be uploaded and cryptographically
// checked — not just the stored database record. This is the URL
// embedded in the PDF's QR code and footer link.
const createPDFVerificationUrl = (
  verificationId
) => {
  const frontendUrl =
    getFrontendUrl();

  return `${frontendUrl}/verify?verificationId=${encodeURIComponent(
    verificationId
  )}`;
};


// =========================================================
// CSV ITEM REPRESENTATION
// =========================================================

const formatItemsForCSV = (
  items
) => {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return "";
  }

  return JSON.stringify(
    items.map((item) => ({
      name: String(
        item?.name || ""
      ),

      price: Number(
        item?.price || 0
      ),
    }))
  );
};


// =========================================================
// PARSE ITEMS FROM CSV
// =========================================================

const parseItemsFromCSV = (
  value
) => {
  const text =
    String(
      value || ""
    ).trim();

  if (!text) {
    return [];
  }

  if (
    text.startsWith("[")
  ) {
    try {
      const parsed =
        JSON.parse(text);

      if (
        !Array.isArray(
          parsed
        )
      ) {
        return null;
      }

      return parsed.map(
        (item) => {
          if (
            !item ||
            typeof item !==
              "object"
          ) {
            throw new Error(
              "Invalid item"
            );
          }

          const name =
            String(
              item.name ?? ""
            );

          const price =
            Number(
              item.price
            );

          if (
            !Number.isFinite(
              price
            )
          ) {
            throw new Error(
              "Invalid item price"
            );
          }

          return {
            name,
            price,
          };
        }
      );
    } catch (error) {
      return null;
    }
  }

  // Backward compatibility for older Expense Tracker CSVs.
  return text
    .split(";")
    .map(
      (part) =>
        part.trim()
    )
    .filter(Boolean)
    .map((part) => {
      const separatorIndex =
        part.lastIndexOf(":");

      if (
        separatorIndex === -1
      ) {
        return {
          name: part,
          price: 0,
        };
      }

      const name =
        part
          .slice(
            0,
            separatorIndex
          )
          .trim();

      const priceText =
        part
          .slice(
            separatorIndex + 1
          )
          .trim();

      const price =
        Number(
          priceText
        );

      return {
        name,
        price:
          Number.isFinite(
            price
          )
            ? price
            : 0,
      };
    });
};


// =========================================================
// NORMALIZE CSV DATE
// =========================================================

const normalizeCSVDate = (
  value
) => {
  const text =
    String(
      value || ""
    ).trim();

  if (!text) {
    return null;
  }

  const directDate =
    new Date(text);

  if (
    !Number.isNaN(
      directDate.getTime()
    )
  ) {
    return directDate
      .toISOString()
      .slice(0, 10);
  }

  const match =
    text.match(
      /^(\d{2})-(\d{2})-(\d{4})$/
    );

  if (match) {
    const [, day, month, year] =
      match;

    return `${year}-${month}-${day}`;
  }

  return null;
};


// =========================================================
// CSV PARSER
// =========================================================

const parseCSV = (
  csvText
) => {
  const rows = [];

  let current = "";

  let insideQuotes =
    false;

  for (
    let i = 0;
    i < csvText.length;
    i++
  ) {
    const character =
      csvText[i];

    const next =
      csvText[i + 1];

    if (
      character === '"' &&
      insideQuotes &&
      next === '"'
    ) {
      current += '"';
      i++;
      continue;
    }

    if (
      character === '"'
    ) {
      insideQuotes =
        !insideQuotes;
      current += character;
      continue;
    }

    if (
      character === "," &&
      !insideQuotes
    ) {
      rows.push(
        current
      );
      current = "";
      continue;
    }

    if (
      (character === "\n" ||
        character === "\r") &&
      !insideQuotes
    ) {
      if (
        character === "\r" &&
        next === "\n"
      ) {
        i++;
      }

      rows.push(
        current
      );

      current = "";

      continue;
    }

    current += character;
  }

  rows.push(current);

  return rows;
};


// =========================================================
// PARSE CSV RECORDS
// =========================================================

const parseCSVRecords = (
  csvText
) => {
  const lines =
    String(
      csvText || ""
    )
      .replace(
        /^\uFEFF/,
        ""
      )
      .split(/\r?\n/)
      .filter(
        (line) =>
          line.trim() !== ""
      );

  if (
    lines.length === 0
  ) {
    return [];
  }

  const parseLine = (
    line
  ) => {
    const result = [];

    let current = "";

    let insideQuotes =
      false;

    for (
      let i = 0;
      i < line.length;
      i++
    ) {
      const char =
        line[i];

      const next =
        line[i + 1];

      if (
        char === '"' &&
        insideQuotes &&
        next === '"'
      ) {
        current += '"';
        i++;
        continue;
      }

      if (
        char === '"'
      ) {
        insideQuotes =
          !insideQuotes;
        continue;
      }

      if (
        char === "," &&
        !insideQuotes
      ) {
        result.push(
          current
        );

        current = "";

        continue;
      }

      current += char;
    }

    result.push(current);

    return result;
  };

  const headers =
    parseLine(
      lines[0]
    ).map(
      (header) =>
        header
          .trim()
    );

  return lines
    .slice(1)
    .map((line) => {
      const values =
        parseLine(line);

      const object = {};

      headers.forEach(
        (header, index) => {
          object[header] =
            values[index] ??
            "";
        }
      );

      return object;
    });
};


// =========================================================
// PDF VERIFICATION PANEL
// =========================================================

const drawVerificationPanel = (
  doc,
  {
    verificationId,
    documentHash,
    pdfConfig,
    qrBuffer,
    verificationUrl,
    pageCounter,
  }
) => {
  const panelX = 50;

  const panelY =
    doc.y + 12;

  const panelWidth =
    doc.page.width - 100;

  /*
   * Combined authenticity + QR card.
   *
   * This replaces the older layout where the QR section
   * occupied a separate block and wasted vertical space.
   *
   * The card height is trimmed down from the original
   * layout to keep it compact, while font sizes and colors
   * are kept clear and legible.
   */
  const panelHeight =
    205;

  /*
   * Make sure the complete card stays on the current page.
   */
  if (
    panelY +
      panelHeight >
    doc.page.height -
      doc.page.margins.bottom
  ) {
    doc.addPage();

    if (pageCounter) {
      pageCounter.current += 1;

      stampPageNumber(
        doc,
        pageCounter.current
      );
    }
  }

  const actualPanelY =
    doc.y + 12;

  /*
   * Outer card.
   */
  doc
    .roundedRect(
      panelX,
      actualPanelY,
      panelWidth,
      panelHeight,
      12
    )
    .lineWidth(1)
    .strokeColor("#cbd5e1")
    .fillColor("#f8fafc")
    .fillAndStroke();

  /*
   * Header strip.
   */
  doc
    .roundedRect(
      panelX,
      actualPanelY,
      panelWidth,
      34,
      12
    )
    .fillColor("#eff6ff")
    .fill();

  /*
   * Cover the lower corners of the header strip so
   * only the top corners remain rounded.
   */
  doc
    .rect(
      panelX,
      actualPanelY + 17,
      panelWidth,
      17
    )
    .fillColor("#eff6ff")
    .fill();

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#1e3a8a")
    .text(
      "AUTHENTICITY & INTEGRITY",
      panelX + 16,
      actualPanelY + 9,
      {
        width:
          panelWidth - 170,
      }
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .fillColor("#166534")
    .text(
      "DIGITALLY SIGNED",
      panelX +
        panelWidth -
        118,
      actualPanelY + 10,
      {
        width: 102,
        align: "right",
      }
    );

  /*
   * Vertical divider between metadata and QR.
   */
  const dividerX =
    panelX +
    panelWidth -
    142;

  doc
    .moveTo(
      dividerX,
      actualPanelY + 44
    )
    .lineTo(
      dividerX,
      actualPanelY +
        panelHeight -
        16
    )
    .lineWidth(0.7)
    .strokeColor("#dbe3ee")
    .stroke();

  /*
   * Left-side metadata.
   */
  const contentX =
    panelX + 16;

  const contentWidth =
    dividerX -
    contentX -
    14;

  let currentY =
    actualPanelY + 46;

  const drawField = (
    label,
    value,
    options = {}
  ) => {
    const labelSize =
      options.labelSize || 7;

    const valueSize =
      options.valueSize || 8.2;

    doc
      .font("Helvetica-Bold")
      .fontSize(labelSize)
      .fillColor("#64748b")
      .text(
        label,
        contentX,
        currentY,
        {
          width:
            contentWidth,
        }
      );

    currentY +=
      labelSize + 2;

    doc
      .font(
        options.mono
          ? "Courier"
          : "Helvetica"
      )
      .fontSize(valueSize)
      .fillColor(
        options.valueColor ||
          "#0f172a"
      )
      .text(
        value || "—",
        contentX,
        currentY,
        {
          width:
            contentWidth,
          lineBreak: true,
        }
      );

    currentY +=
      options.height ||
      20;
  };

  drawField(
    "VERIFICATION ID",
    verificationId,
    {
      valueColor:
        "#1d4ed8",
      valueSize: 9,
      height: 18,
    }
  );

  drawField(
    "REPORT DATA SHA-256 FINGERPRINT",
    documentHash,
    {
      mono: true,
      valueSize: 6.3,
      height: 26,
    }
  );

  drawField(
    "SIGNING CERTIFICATE SHA-256",
    pdfConfig?.fingerprint256,
    {
      mono: true,
      valueSize: 6.3,
      height: 25,
    }
  );

  /*
   * Two compact fields side by side.
   */
  const smallY =
    currentY;

  const halfWidth =
    (contentWidth - 8) /
    2;

  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor("#64748b")
    .text(
      "SIGNATURE FORMAT",
      contentX,
      smallY,
      {
        width:
          halfWidth,
      }
    );

  doc
    .font("Helvetica")
    .fontSize(7.4)
    .fillColor("#0f172a")
    .text(
      "ETSI.CAdES.detached",
      contentX,
      smallY + 10,
      {
        width:
          halfWidth,
      }
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor("#64748b")
    .text(
      "SIGNING AUTHORITY",
      contentX +
        halfWidth +
        8,
      smallY,
      {
        width:
          halfWidth,
      }
    );

  doc
    .font("Helvetica")
    .fontSize(7.4)
    .fillColor("#0f172a")
    .text(
      pdfConfig?.name ||
        "Expense Tracker",
      contentX +
        halfWidth +
        8,
      smallY + 10,
      {
        width:
          halfWidth,
      }
    );

  /*
   * QR section.
   */
  const qrX =
    dividerX + 18;

  const qrSize =
    80;

  const qrY =
    actualPanelY + 44;

  if (
    qrBuffer &&
    Buffer.isBuffer(qrBuffer)
  ) {
    doc.image(
      qrBuffer,
      qrX,
      qrY,
      {
        width: qrSize,
        height: qrSize,
      }
    );
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .fillColor("#334155")
    .text(
      "SCAN TO VERIFY THIS PDF",
      qrX - 30,
      qrY + qrSize + 7,
      {
        width:
          qrSize + 60,
        align: "center",
        lineBreak: false,
      }
    );

  doc
    .font("Helvetica")
    .fontSize(6.2)
    .fillColor("#64748b")
    .text(
      "Opens the upload checker to confirm this file is unaltered.",
      qrX - 10,
      qrY + qrSize + 18,
      {
        width:
          qrSize + 20,
        align: "center",
      }
    );

  /*
   * Verification URL.
   *
   * The raw URL (with a full Verification ID as a query
   * param) is often too long to fit the QR column width
   * without wrapping onto 2–3 lines and colliding with the
   * notice box below. The QR already encodes the full URL,
   * so a short, unambiguous tap target reads better here.
   */
  if (verificationUrl) {
    doc
      .font("Helvetica-Bold")
      .fontSize(7.2)
      .fillColor("#2563eb")
      .text(
        "Tap to verify online ->",
        qrX - 12,
        qrY + qrSize + 35,
        {
          width:
            qrSize + 24,
          align: "center",
          link: verificationUrl,
          underline: false,
          lineBreak: false,
        }
      );
  }

  /*
   * Bottom security notice.
   */
  const noticeY =
    actualPanelY +
    panelHeight -
    34;

  doc
    .roundedRect(
      contentX,
      noticeY,
      panelWidth - 32,
      22,
      6
    )
    .fillColor("#f1f5f9")
    .fill();

  doc
    .font("Helvetica")
    .fontSize(6.2)
    .fillColor("#475569")
    .text(
      "This report is protected by a cryptographic PDF signature. Upload the actual downloaded PDF to verify file integrity and detect post-signing changes.",
      contentX + 8,
      noticeY + 7,
      {
        width:
          panelWidth - 48,
        align: "center",
      }
    );

  doc.y =
    actualPanelY +
    panelHeight +
    8;
};


// =========================================================
// GENERATE PDF BUFFER
// =========================================================

const generatePdfBuffer =
  async ({
    verificationId,
    startDate,
    endDate,
    transactions,
    documentHash,
  }) => {
    const pdfConfig =
      getPdfSigningConfig();

    const pdfVerificationUrl =
      createPDFVerificationUrl(
        verificationId
      );

    const qrBuffer =
      await QRCode.toBuffer(
        pdfVerificationUrl,
        {
          type: "png",
          width: 180,
          margin: 1,
          errorCorrectionLevel: "H",
        }
      );

    const doc =
      new PDFDocument({
        size: "A4",

        margins: {
          top: 45,
          bottom: 45,
          left: 50,
          right: 50,
        },

        info: {
          Title:
            "Expense Tracker Report",

          Author:
            pdfConfig.name ||
            "Expense Tracker",

          Subject:
            "Digitally signed expense report",

          Keywords:
            `Verification ID ${verificationId}, digitally signed, authentic`,
        },
      });

    const chunks = [];

    doc.on(
      "data",
      (chunk) => {
        chunks.push(chunk);
      }
    );

    const finished =
      new Promise(
        (
          resolve,
          reject
        ) => {
          doc.on(
            "end",
            resolve
          );

          doc.on(
            "error",
            reject
          );
        }
      );

    /*
     * Shared mutable counter so both this function and
     * drawVerificationPanel (which can also trigger its own
     * page break) stamp consistent, incrementing page numbers.
     */
    const pageCounter = {
      current: 1,
    };

    stampPageNumber(
      doc,
      pageCounter.current
    );

    /*
     * =========================================================
     * HEADER
     * =========================================================
     */

    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor("#111827")
      .text(
        "Expense Tracker",
        {
          align: "center",
        }
      );

    doc
      .moveDown(0.3)
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#6b7280")
      .text(
        "Digitally Signed Expense Report",
        {
          align: "center",
        }
      );

    doc.moveDown(1);

    /*
     * =========================================================
     * REPORT DETAILS
     * =========================================================
     */

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#111827")
      .text(
        `Report Period: ${formatDate(
          startDate
        )} - ${formatDate(
          endDate
        )}`
      );

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#4b5563")
      .text(
        `Verification ID: ${verificationId}`
      );

    doc.moveDown(0.7);

    /*
     * =========================================================
     * TRANSACTION TABLE
     * =========================================================
     *
     * IMPORTANT:
     * Items are displayed here from transaction.items.
     *
     * The same items are already included in the canonical
     * data used for hashing/signing, so adding them here does
     * NOT weaken the security model.
     */

    /*
     * ---------------------------------------------------------
     * TRUNCATE TEXT TO FIT A COLUMN
     * ---------------------------------------------------------
     *
     * Single-line columns (date/type/category) previously had
     * no protection against long values: PDFKit would wrap a
     * long category name onto a second line even though the
     * row height was only ever calculated from the description
     * and items columns, which could silently overlap the row
     * below it. This clips with an ellipsis instead, using the
     * font/size already active on `doc` when called.
     */

    const truncateToWidth = (
      text,
      maxWidth
    ) => {
      const str =
        String(text ?? "");

      if (
        doc.widthOfString(
          str
        ) <= maxWidth
      ) {
        return str;
      }

      let low = 0;
      let high =
        str.length;

      while (
        low < high
      ) {
        const mid =
          Math.ceil(
            (low + high) / 2
          );

        const candidate =
          str.slice(
            0,
            mid
          ) + "…";

        if (
          doc.widthOfString(
            candidate
          ) <= maxWidth
        ) {
          low = mid;
        } else {
          high = mid - 1;
        }
      }

      return (
        str.slice(0, low) + "…"
      );
    };

    /*
     * ---------------------------------------------------------
     * TYPE CHIP COLORS
     * ---------------------------------------------------------
     *
     * Matches the app's own income/expense color convention
     * (green-100/green-800 and red-100/red-800) so the PDF
     * reads consistently with the dashboard.
     */

    const typeColors = {
      income: {
        bg: "#dcfce7",
        text: "#15803d",
      },
      expense: {
        bg: "#fee2e2",
        text: "#b91c1c",
      },
    };

    const tableX =
      doc.page.margins.left;

    const tableWidth =
      doc.page.width -
      doc.page.margins.left -
      doc.page.margins.right;

    /*
     * A4 printable width is approximately 495 points.
     *
     * The columns are sized to make the table larger and more
     * legible than before, and the old single ITEMS column is
     * now split into two sub-columns — ITEM and PRICE — so item
     * names and their prices are shown separately.
     *
     * DATE
     * TYPE
     * CATEGORY
     * DESCRIPTION
     * ITEMS  -> ITEM | PRICE
     * AMOUNT
     */

    const columns = {
      date: 55,
      type: 42,
      category: 65,
      description: 90,
      itemName: 95,
      itemPrice: 55,

      amount:
        tableWidth -
        55 -
        42 -
        65 -
        90 -
        95 -
        55,
    };

    /*
     * Total width of the merged ITEMS header cell (spans the
     * itemName + itemPrice sub-columns).
     */
    const itemsColumnWidth =
      columns.itemName +
      columns.itemPrice;

    /*
     * Row/header sizing — bumped up from the previous compact
     * layout so the table reads as larger and more visible.
     */
    const HEADER_HEIGHT = 34;
    const HEADER_SUBROW_Y_OFFSET = 20;
    const ROW_FONT_SIZE = 8;
    const HEADER_FONT_SIZE = 8.3;
    const HEADER_SUB_FONT_SIZE = 6.8;
    const MIN_ROW_HEIGHT = 32;
    const GRID_LINE_COLOR = "#cbd5e1";

    /*
     * ---------------------------------------------------------
     * TABLE HEADER
     * ---------------------------------------------------------
     */

    const drawTableHeader =
      () => {
        const y =
          doc.y;

        doc
          .rect(
            tableX,
            y,
            tableWidth,
            HEADER_HEIGHT
          )
          .fillColor("#1f2937")
          .fill();

        let x =
          tableX;

        doc
          .font("Helvetica-Bold")
          .fontSize(HEADER_FONT_SIZE)
          .fillColor("#ffffff")
          .text(
            "DATE",
            x + 5,
            y + 13,
            {
              width:
                columns.date - 10,
              lineBreak: false,
            }
          );

        x += columns.date;

        doc.text(
          "TYPE",
          x + 5,
          y + 13,
          {
            width:
              columns.type - 10,
            lineBreak: false,
          }
        );

        x += columns.type;

        doc.text(
          "CATEGORY",
          x + 5,
          y + 13,
          {
            width:
              columns.category - 10,
            lineBreak: false,
          }
        );

        x += columns.category;

        doc.text(
          "DESCRIPTION",
          x + 5,
          y + 13,
          {
            width:
              columns.description - 10,
            lineBreak: false,
          }
        );

        x += columns.description;

        /*
         * ITEMS — merged header label across both sub-columns,
         * with an ITEM / PRICE sub-heading row underneath.
         */

        doc
          .font("Helvetica-Bold")
          .fontSize(HEADER_FONT_SIZE)
          .text(
            "ITEMS",
            x + 5,
            y + 4,
            {
              width:
                itemsColumnWidth - 10,
              align: "center",
              lineBreak: false,
            }
          );

        doc
          .moveTo(
            x,
            y + HEADER_SUBROW_Y_OFFSET - 4
          )
          .lineTo(
            x + itemsColumnWidth,
            y + HEADER_SUBROW_Y_OFFSET - 4
          )
          .lineWidth(0.5)
          .strokeColor("#4b5563")
          .stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(HEADER_SUB_FONT_SIZE)
          .fillColor("#d1d5db")
          .text(
            "ITEM",
            x + 5,
            y + HEADER_SUBROW_Y_OFFSET,
            {
              width:
                columns.itemName - 10,
              lineBreak: false,
            }
          );

        doc
          .moveTo(
            x + columns.itemName,
            y + HEADER_SUBROW_Y_OFFSET - 4
          )
          .lineTo(
            x + columns.itemName,
            y + HEADER_HEIGHT
          )
          .lineWidth(0.5)
          .strokeColor("#4b5563")
          .stroke();

        doc.text(
          "PRICE",
          x + columns.itemName + 5,
          y + HEADER_SUBROW_Y_OFFSET,
          {
            width:
              columns.itemPrice - 10,
            align: "right",
            lineBreak: false,
          }
        );

        x += itemsColumnWidth;

        doc
          .font("Helvetica-Bold")
          .fontSize(HEADER_FONT_SIZE)
          .fillColor("#ffffff")
          .text(
            "AMOUNT",
            x + 5,
            y + 13,
            {
              width:
                columns.amount - 10,
              align: "right",
              lineBreak: false,
            }
          );

        /*
         * Vertical grid lines between every column, drawn over
         * the dark header background, so the table reads as a
         * clear, visible grid rather than plain text columns.
         */

        let dividerX = tableX;

        [
          columns.date,
          columns.type,
          columns.category,
          columns.description,
          itemsColumnWidth,
        ].forEach((colWidth) => {
          dividerX += colWidth;

          doc
            .moveTo(dividerX, y)
            .lineTo(dividerX, y + HEADER_HEIGHT)
            .lineWidth(0.5)
            .strokeColor("#4b5563")
            .stroke();
        });

        doc.y =
          y + HEADER_HEIGHT;
      };

    drawTableHeader();

    /*
     * =========================================================
     * TOTALS
     * =========================================================
     */

    let expenseTotal =
      0;

    let incomeTotal =
      0;

    /*
     * =========================================================
     * TRANSACTIONS
     * =========================================================
     */

    transactions.forEach(
      (
        transaction,
        transactionIndex
      ) => {
        const type =
          normalizeTransactionType(
            transaction
          );

        const amount =
          getTransactionAmount(
            transaction
          );

        if (
          type ===
          "income"
        ) {
          incomeTotal +=
            amount;
        } else {
          expenseTotal +=
            amount;
        }

        const date =
          getTransactionDate(
            transaction
          );

        const category =
          getTransactionCategory(
            transaction
          );

        const description =
          getTransactionDescription(
            transaction
          );

        /*
         * =====================================================
         * ITEMS
         * =====================================================
         */

        const items =
          getTransactionItems(
            transaction
          );

        /*
         * Convert items into two aligned, one-line-per-item
         * strings — item names in one sub-column, prices in
         * the other — so each item's name and price line up
         * on the same row inside the table cell.
         *
         * Example:
         *
         * ITEM          PRICE
         * Milk          Rs. 60.00
         * Bread         Rs. 40.00
         * Eggs          Rs. 90.00
         */

        doc
          .font("Helvetica")
          .fontSize(ROW_FONT_SIZE);

        const itemNamesText =
          items.length > 0
            ? items
                .map((item) =>
                  truncateToWidth(
                    item.name ||
                      "Unnamed item",
                    columns.itemName -
                      10
                  )
                )
                .join("\n")
            : "—";

        const itemPricesText =
          items.length > 0
            ? items
                .map((item) =>
                  formatMoney(
                    item.price
                  )
                )
                .join("\n")
            : "—";

        /*
         * =====================================================
         * CALCULATE DYNAMIC ROW HEIGHT
         * =====================================================
         *
         * The old PDF used a fixed 25px row.
         *
         * That would not work for multiple items because
         * item names would overlap.
         */

        const descriptionHeight =
          doc.heightOfString(
            description || "-",
            {
              width:
                columns.description -
                10,
            }
          );

        const itemNamesHeight =
          doc.heightOfString(
            itemNamesText,
            {
              width:
                columns.itemName -
                10,
            }
          );

        const itemPricesHeight =
          doc.heightOfString(
            itemPricesText,
            {
              width:
                columns.itemPrice -
                10,
            }
          );

        const itemsHeight =
          Math.max(
            itemNamesHeight,
            itemPricesHeight
          );

        const rowHeight =
          Math.max(
            MIN_ROW_HEIGHT,

            descriptionHeight +
              16,

            itemsHeight +
              16
          );

        /*
         * =====================================================
         * PAGE BREAK
         * =====================================================
         */

        if (
          doc.y +
            rowHeight >
          doc.page.height -
            doc.page.margins.bottom -
            80
        ) {
          doc.addPage();

          pageCounter.current += 1;

          stampPageNumber(
            doc,
            pageCounter.current
          );

          drawTableHeader();
        }

        const y =
          doc.y;

        /*
         * =====================================================
         * ALTERNATING ROW BACKGROUND
         * =====================================================
         */

        if (
          transactionIndex %
            2 ===
          1
        ) {
          doc
            .rect(
              tableX,
              y,
              tableWidth,
              rowHeight
            )
            .fillColor(
              "#f9fafb"
            )
            .fill();
        }

        /*
         * =====================================================
         * ROW TEXT
         * =====================================================
         */

        doc
          .font("Helvetica")
          .fontSize(ROW_FONT_SIZE)
          .fillColor(
            "#111827"
          );

        let x =
          tableX;

        /*
         * DATE
         */

        doc.text(
          truncateToWidth(
            date
              ? formatDate(
                  date
                )
              : "-",
            columns.date - 10
          ),

          x + 5,

          y + 9,

          {
            width:
              columns.date -
              10,

            lineBreak: false,
          }
        );

        x +=
          columns.date;

        /*
         * TYPE
         */

        {
          const typeLabel =
            type
              .charAt(0)
              .toUpperCase() +
            type.slice(1);

          const chipColors =
            typeColors[type] ||
            typeColors.expense;

          const chipPaddingX = 5;
          const chipHeight = 14;
          const chipWidth =
            Math.min(
              columns.type - 8,
              doc.widthOfString(
                typeLabel
              ) +
                chipPaddingX * 2
            );

          doc
            .roundedRect(
              x + 4,
              y + 6,
              chipWidth,
              chipHeight,
              4
            )
            .fillColor(
              chipColors.bg
            )
            .fill();

          doc
            .font(
              "Helvetica-Bold"
            )
            .fontSize(6.6)
            .fillColor(
              chipColors.text
            )
            .text(
              typeLabel,
              x + 4,
              y + 10,
              {
                width:
                  chipWidth,
                align:
                  "center",
                lineBreak: false,
              }
            );

          doc
            .font("Helvetica")
            .fontSize(ROW_FONT_SIZE)
            .fillColor(
              "#111827"
            );
        }

        x +=
          columns.type;

        /*
         * CATEGORY
         */

        doc.text(
          truncateToWidth(
            category || "-",
            columns.category - 10
          ),

          x + 5,

          y + 9,

          {
            width:
              columns.category -
              10,

            lineBreak: false,
          }
        );

        x +=
          columns.category;

        /*
         * DESCRIPTION
         */

        doc.text(
          description || "-",

          x + 5,

          y + 9,

          {
            width:
              columns.description -
              10,
          }
        );

        x +=
          columns.description;

        /*
         * ITEMS — rendered as two aligned sub-columns: item
         * name on the left, its price on the right, so each
         * item and its price are clearly shown separately.
         */

        doc.text(
          itemNamesText,

          x + 5,

          y + 9,

          {
            width:
              columns.itemName -
              10,
          }
        );

        doc.text(
          itemPricesText,

          x +
            columns.itemName +
            5,

          y + 9,

          {
            width:
              columns.itemPrice -
              10,

            align: "right",
          }
        );

        /*
         * Divider between the ITEM and PRICE sub-columns.
         */

        doc
          .moveTo(
            x + columns.itemName,
            y
          )
          .lineTo(
            x + columns.itemName,
            y + rowHeight
          )
          .lineWidth(0.4)
          .strokeColor(
            GRID_LINE_COLOR
          )
          .stroke();

        x += itemsColumnWidth;

        /*
         * AMOUNT
         */

        doc
          .font(
            "Helvetica-Bold"
          )
          .fillColor(
            (
              typeColors[
                type
              ] ||
                typeColors.expense
            ).text
          )
          .text(
            `${
              type === "income"
                ? "+"
                : "-"
            }${formatMoney(
              amount
            )}`,

            x + 5,

            y + 9,

            {
              width:
                columns.amount -
                10,

              align:
                "right",

              lineBreak: false,
            }
          );

        doc
          .font("Helvetica")
          .fillColor(
            "#111827"
          );

        /*
         * Vertical grid lines between every main column for
         * this row, so the enlarged table reads as a clear,
         * visible grid rather than plain text columns.
         */

        {
          let dividerX = tableX;

          [
            columns.date,
            columns.type,
            columns.category,
            columns.description,
            itemsColumnWidth,
          ].forEach((colWidth) => {
            dividerX += colWidth;

            doc
              .moveTo(dividerX, y)
              .lineTo(
                dividerX,
                y + rowHeight
              )
              .lineWidth(0.4)
              .strokeColor(
                GRID_LINE_COLOR
              )
              .stroke();
          });
        }

        doc
          .moveTo(
            tableX,
            y + rowHeight
          )
          .lineTo(
            tableX +
              tableWidth,
            y + rowHeight
          )
          .lineWidth(0.5)
          .strokeColor(
            "#e5e7eb"
          )
          .stroke();

        doc.y =
          y + rowHeight;
      }
    );

    /*
     * =========================================================
     * SUMMARY
     * =========================================================
     */

    const summaryBoxHeight =
      78;

    if (
      doc.y +
        summaryBoxHeight +
        20 >
      doc.page.height -
        doc.page.margins
          .bottom
    ) {
      doc.addPage();

      pageCounter.current += 1;

      stampPageNumber(
        doc,
        pageCounter.current
      );
    }

    doc.moveDown(1);

    const summaryX =
      doc.page.margins.left;

    const summaryY =
      doc.y;

    const summaryWidth =
      doc.page.width -
      doc.page.margins.left -
      doc.page.margins.right;

    doc
      .roundedRect(
        summaryX,
        summaryY,
        summaryWidth,
        summaryBoxHeight,
        10
      )
      .lineWidth(1)
      .strokeColor(
        "#cbd5e1"
      )
      .fillColor(
        "#f8fafc"
      )
      .fillAndStroke();

    doc
      .font(
        "Helvetica-Bold"
      )
      .fontSize(10)
      .fillColor(
        "#111827"
      )
      .text(
        "REPORT SUMMARY",
        summaryX + 16,
        summaryY + 12,
        {
          width:
            summaryWidth -
            32,
        }
      );

    const summaryItems =
      [
        {
          label:
            "TOTAL TRANSACTIONS",

          value:
            String(
              transactions.length
            ),
        },

        {
          label:
            "TOTAL EXPENSES",

          value:
            formatMoney(
              expenseTotal
            ),
        },

        {
          label:
            "TOTAL INCOME",

          value:
            formatMoney(
              incomeTotal
            ),
        },

        {
          label:
            "NET BALANCE",

          value:
            formatMoney(
              incomeTotal -
                expenseTotal
            ),
        },
      ];

    const summaryColWidth =
      (summaryWidth -
        32) /
      summaryItems.length;

    summaryItems.forEach(
      (
        item,
        index
      ) => {
        const colX =
          summaryX +
          16 +
          index *
            summaryColWidth;

        if (
          index > 0
        ) {
          doc
            .moveTo(
              colX - 8,
              summaryY + 32
            )
            .lineTo(
              colX - 8,
              summaryY +
                summaryBoxHeight -
                12
            )
            .lineWidth(
              0.7
            )
            .strokeColor(
              "#dbe3ee"
            )
            .stroke();
        }

        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor(
            "#64748b"
          )
          .text(
            item.label,
            colX,
            summaryY + 34,
            {
              width:
                summaryColWidth -
                12,
            }
          );

        doc
          .font(
            "Helvetica-Bold"
          )
          .fontSize(11)
          .fillColor(
            "#111827"
          )
          .text(
            item.value,
            colX,
            summaryY + 46,
            {
              width:
                summaryColWidth -
                12,
            }
          );
      }
    );

    doc.y =
      summaryY +
      summaryBoxHeight +
      8;

    /*
     * =========================================================
     * AUTHENTICITY PANEL
     * =========================================================
     *
     * IMPORTANT:
     *
     * Everything below is written BEFORE the cryptographic
     * PDF signature is generated.
     *
     * Therefore changing any of this content after export
     * invalidates the PDF signature.
     */

    drawVerificationPanel(
      doc,
      {
        verificationId,

        documentHash,

        pdfConfig,

        qrBuffer,

        verificationUrl:
          pdfVerificationUrl,

        pageCounter,
      }
    );

    /*
     * =========================================================
     * FOOTER
     * =========================================================
     */

    const footerY =
      doc.page.height -
      doc.page.margins.bottom -
      25;

    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(
        "#9ca3af"
      )
      .text(
        `Verification ID: ${verificationId}  •  Tap to verify online`,

        50,

        footerY,

        {
          width:
            doc.page.width -
            100,

          align:
            "center",

          lineBreak:
            false,

          link:
            pdfVerificationUrl,
        }
      );

    /*
     * =========================================================
     * PDF SIGNATURE PLACEHOLDER
     * =========================================================
     *
     * MUST happen before doc.end().
     */

    const {
      addPdfSignaturePlaceholder,
    } = require(
      "../utils/documentSigning"
    );

    addPdfSignaturePlaceholder(
      doc,
      verificationId
    );

    /*
     * =========================================================
     * FINISH PDF
     * =========================================================
     */

    doc.end();

    await finished;

    const unsignedPdf =
      Buffer.concat(
        chunks
      );

    return unsignedPdf;
  };

// =========================================================
// DOWNLOAD PDF
// =========================================================

const downloadExpensesPDF =
  asyncHandler(
    async (req, res) => {
      const {
        startDate,
        endDate,
      } = req.query;

      const start =
        parseDateOnly(
          startDate
        );

      const end =
        parseDateOnly(
          endDate
        );

      if (
        !start ||
        !end
      ) {
        return res
          .status(400)
          .json({
            message:
              "Valid startDate and endDate are required.",
          });
      }

      if (
        start > end
      ) {
        return res
          .status(400)
          .json({
            message:
              "startDate cannot be after endDate.",
          });
      }

      /*
       * Include the complete requested end date.
       */

      const endInclusive =
        new Date(end);

      endInclusive.setUTCHours(
        23,
        59,
        59,
        999
      );

      const transactions =
        await getUserTransactions({
          userId:
            req.user.id,

          startDate:
            start,

          endDate:
            endInclusive,
        });

      const verificationId =
        createVerificationId();

      const verificationData =
        await createVerificationRecord(
          {
            req,

            verificationId,

            startDate:
              start,

            endDate:
              endInclusive,

            transactions,

            exportType:
              "PDF",
          }
        );

      const unsignedPdfBuffer =
        await generatePdfBuffer(
          {
            verificationId,

            startDate:
              start,

            endDate:
              endInclusive,

            transactions,

            documentHash:
              verificationData.documentHash,
          }
        );

      let signedPdfBuffer;

      try {
        signedPdfBuffer =
          await signPdfBuffer(
            unsignedPdfBuffer
          );
      } catch (
        error
      ) {
        console.error(
          "PDF signing failed:",
          error
        );

        /*
         * SECURITY:
         *
         * Never return an unsigned PDF
         * if signing fails.
         */

        return res
          .status(500)
          .json({
            verified: false,

            status:
              "SIGNING_FAILED",

            message:
              "The PDF could not be digitally signed. No unsigned document was downloaded.",

            error:
              process.env.NODE_ENV ===
              "production"
                ? undefined
                : error.message,
          });
      }

      /*
       * Additional defensive verification.
       *
       * signPdfBuffer() already performs its own verification,
       * but the controller verifies the final bytes again before
       * sending them to the user.
       */

      try {
        const pdfSignature =
          await verifyPdfSignature(
            signedPdfBuffer
          );

        if (
          !pdfSignature.valid
        ) {
          console.error(
            "Signed PDF failed final verification:",
            pdfSignature
          );

          return res
            .status(500)
            .json({
              verified: false,

              status:
                "SIGNATURE_VERIFICATION_FAILED",

              message:
                "The generated PDF signature could not be verified. The document was not downloaded.",
            });
        }
      } catch (
        error
      ) {
        console.error(
          "Final PDF verification error:",
          error
        );

        return res
          .status(500)
          .json({
            verified: false,

            status:
              "SIGNATURE_VERIFICATION_FAILED",

            message:
              "The generated PDF signature could not be verified. The document was not downloaded.",
          });
      }

      res.set({
        "Content-Type":
          "application/pdf",

        "Content-Disposition":
          `attachment; filename="expense-report-${formatDateISO(
            start
          )}-to-${formatDateISO(
            endInclusive
          )}.pdf"`,

        "Content-Length":
          signedPdfBuffer.length,

        "Cache-Control":
          "no-store",
      });

      return res.send(
        signedPdfBuffer
      );
    }
  );

// =========================================================
// DOWNLOAD CSV
// =========================================================

const downloadExpensesCSV =
  asyncHandler(
    async (req, res) => {
      const {
        startDate,
        endDate,
      } = req.query;

      const start =
        parseDateOnly(
          startDate
        );

      const end =
        parseDateOnly(
          endDate
        );

      if (
        !start ||
        !end
      ) {
        return res
          .status(400)
          .json({
            message:
              "Valid startDate and endDate are required.",
          });
      }

      if (
        start > end
      ) {
        return res
          .status(400)
          .json({
            message:
              "startDate cannot be after endDate.",
          });
      }

      const endInclusive =
        new Date(end);

      endInclusive.setUTCHours(
        23,
        59,
        59,
        999
      );

      const transactions =
        await getUserTransactions({
          userId:
            req.user.id,

          startDate:
            start,

          endDate:
            endInclusive,
        });

      const verificationId =
        createVerificationId();

      const verificationData =
        await createVerificationRecord({
          req,

          verificationId,

          startDate:
            start,

          endDate:
            endInclusive,

          transactions,

          exportType:
            "CSV",
        });

      /*
       * =====================================================
       * CSV FORMAT
       * =====================================================
       */

      const headers = [
        "Verification ID",
        "Report Start Date",
        "Report End Date",
        "Transaction ID",
        "Date",
        "Type",
        "Category",
        "Description",
        "Amount",
        "Items",
        "Document SHA-256",
        "Digital Signature",
        "Key ID",
        "Verify URL",
      ];

      const rows =
        transactions.map(
          (transaction) => {
            const type =
              normalizeTransactionType(
                transaction
              );

            const amount =
              getTransactionAmount(
                transaction
              );

            const date =
              getTransactionDate(
                transaction
              );

            const category =
              getTransactionCategory(
                transaction
              );

            const description =
              getTransactionDescription(
                transaction
              );

            const items =
              getTransactionItems(
                transaction
              );

            return [
              verificationId,

              formatDateISO(
                start
              ),

              formatDateISO(
                endInclusive
              ),

              String(
                transaction?._id ||
                  transaction?.id ||
                  ""
              ),

              date
                ? new Date(
                    date
                  ).toISOString()
                : "",

              type,

              category,

              description,

              amount,

              formatItemsForCSV(
                items
              ),

              verificationData.documentHash,

              verificationData.digitalSignature,

              verificationData.keyId,

              createCSVVerificationUrl(
                verificationId
              ),
            ]
              .map(
                escapeCSV
              )
              .join(",");
          }
        );

      const csv = [
        headers
          .map(
            escapeCSV
          )
          .join(","),

        ...rows,
      ].join("\r\n");

      res.set({
        "Content-Type":
          "text/csv; charset=utf-8",

        "Content-Disposition":
          `attachment; filename="expense-report-${formatDateISO(
            start
          )}-to-${formatDateISO(
            endInclusive
          )}.csv"`,

        "Content-Length":
          Buffer.byteLength(
            csv,
            "utf8"
          ),

        "Cache-Control":
          "no-store",
      });

      return res.send(csv);
    }
  );


// =========================================================
// ONLINE VERIFICATION
// =========================================================

const verifyExpenseReport =
  asyncHandler(
    async (req, res) => {
      const {
        verificationId,
      } = req.params;

      if (
        !verificationId
      ) {
        return res
          .status(400)
          .send(`
            <!DOCTYPE html>
            <html>
            <body
              style="
                font-family:Arial;
                padding:40px;
              "
            >
              <h2>
                Invalid Verification ID
              </h2>
            </body>
            </html>
          `);
      }

      const verification =
        await ExportVerification.findOne({
          verificationId:
            verificationId.toUpperCase(),
        });

      if (
        !verification
      ) {
        return res
          .status(404)
          .send(`
            <!DOCTYPE html>
            <html>

            <head>
              <meta
                name="viewport"
                content="width=device-width,initial-scale=1"
              >

              <title>
                Verification Failed
              </title>
            </head>

            <body
              style="
                margin:0;
                background:#f4e7c8;
                font-family:Arial,sans-serif;
              "
            >
              <div
                style="
                  max-width:600px;
                  margin:70px auto;
                  background:white;
                  padding:40px;
                  border-radius:16px;
                  box-shadow:0 5px 25px rgba(0,0,0,.15);
                  text-align:center;
                "
              >
                <h1
                  style="
                    color:#b00020;
                  "
                >
                  ✕ Report Record Not Found
                </h1>

                <p>
                  This Verification ID could not be found in the Expense Tracker verification registry.
                </p>

                <p
                  style="
                    color:#666;
                  "
                >
                  The report may not have been issued by Expense Tracker, or the Verification ID may be invalid.
                </p>
              </div>
            </body>
            </html>
          `);
      }

      /*
       * -----------------------------------------------------
       * VERIFY STORED HASH
       * -----------------------------------------------------
       */

      const recalculatedHash =
        createDocumentHash(
          verification.canonicalData
        );

      const hashValid =
        recalculatedHash ===
        verification.documentHash;

      /*
       * -----------------------------------------------------
       * VERIFY DIGITAL SIGNATURE
       * -----------------------------------------------------
       */

      const signatureValid =
        verifyCanonicalData(
          verification.canonicalData,
          verification.digitalSignature
        );

      const verified =
        hashValid &&
        signatureValid;

      const formatDateLocal =
        (date) => {
          return new Intl.DateTimeFormat(
            "en-IN",
            {
              day: "2-digit",

              month:
                "short",

              year:
                "numeric",
            }
          ).format(
            new Date(date)
          );
        };

      const statusColor =
        verified
          ? "#166534"
          : "#b00020";

      const statusBackground =
        verified
          ? "#dcfce7"
          : "#fee2e2";

      const statusText =
        verified
          ? "✓ REPORT RECORD VERIFIED"
          : "✕ REPORT RECORD NOT VERIFIED";

      return res
        .status(
          verified
            ? 200
            : 409
        )
        .send(`
          <!DOCTYPE html>

          <html>

          <head>

            <meta
              name="viewport"
              content="width=device-width,initial-scale=1"
            >

            <title>
              Expense Report Verification
            </title>

          </head>

          <body
            style="
              margin:0;
              background:#f4e7c8;
              font-family:Arial,Helvetica,sans-serif;
              color:#222;
            "
          >

            <div
              style="
                max-width:760px;
                margin:45px auto;
                padding:20px;
              "
            >

              <div
                style="
                  background:#ffffff;
                  border-radius:20px;
                  padding:35px;
                  box-shadow:0 8px 35px rgba(0,0,0,.12);
                "
              >

                <div
                  style="
                    text-align:center;
                    margin-bottom:28px;
                  "
                >

                  <div
                    style="
                      font-size:13px;
                      letter-spacing:2px;
                      color:#777;
                      font-weight:bold;
                      margin-bottom:8px;
                    "
                  >
                    EXPENSE TRACKER
                  </div>

                  <h1
                    style="
                      margin:0;
                      font-size:30px;
                    "
                  >
                    Report Verification
                  </h1>

                  <p
                    style="
                      color:#666;
                      margin-top:10px;
                    "
                  >
                    Cryptographic verification of an issued report record
                  </p>

                </div>


                <div
                  style="
                    background:${statusBackground};
                    color:${statusColor};
                    border-radius:12px;
                    padding:18px;
                    text-align:center;
                    font-size:18px;
                    font-weight:bold;
                    margin-bottom:28px;
                  "
                >
                  ${statusText}
                </div>


                <div
                  style="
                    border:1px solid #e5e7eb;
                    border-radius:14px;
                    padding:22px;
                    margin-bottom:22px;
                  "
                >

                  <div
                    style="
                      font-size:12px;
                      color:#777;
                      text-transform:uppercase;
                      letter-spacing:1px;
                      margin-bottom:7px;
                    "
                  >
                    Verification ID
                  </div>

                  <div
                    style="
                      font-family:monospace;
                      font-size:20px;
                      font-weight:bold;
                      word-break:break-all;
                    "
                  >
                    ${escapeHtml(
                      verification.verificationId
                    )}
                  </div>

                </div>


                <div
                  style="
                    display:grid;
                    grid-template-columns:1fr 1fr;
                    gap:14px;
                    margin-bottom:24px;
                  "
                >

                  <div
                    style="
                      border:1px solid #e5e7eb;
                      border-radius:12px;
                      padding:18px;
                    "
                  >

                    <div
                      style="
                        color:#777;
                        font-size:12px;
                        margin-bottom:8px;
                      "
                    >
                      REPORT TYPE
                    </div>

                    <strong>
                      ${escapeHtml(
                        verification.exportType
                      )}
                    </strong>

                  </div>


                  <div
                    style="
                      border:1px solid #e5e7eb;
                      border-radius:12px;
                      padding:18px;
                    "
                  >

                    <div
                      style="
                        color:#777;
                        font-size:12px;
                        margin-bottom:8px;
                      "
                    >
                      GENERATED
                    </div>

                    <strong>
                      ${formatDateLocal(
                        verification.generatedAt
                      )}
                    </strong>

                  </div>


                  <div
                    style="
                      border:1px solid #e5e7eb;
                      border-radius:12px;
                      padding:18px;
                    "
                  >

                    <div
                      style="
                        color:#777;
                        font-size:12px;
                        margin-bottom:8px;
                      "
                    >
                      REPORT PERIOD
                    </div>

                    <strong>
                      ${formatDateLocal(
                        verification.startDate
                      )}
                      –
                      ${formatDateLocal(
                        verification.endDate
                      )}
                    </strong>

                  </div>


                  <div
                    style="
                      border:1px solid #e5e7eb;
                      border-radius:12px;
                      padding:18px;
                    "
                  >

                    <div
                      style="
                        color:#777;
                        font-size:12px;
                        margin-bottom:8px;
                      "
                    >
                      TRANSACTIONS
                    </div>

                    <strong>
                      ${verification.expenseCount}
                    </strong>

                  </div>

                </div>


                <div
                  style="
                    border:1px solid #e5e7eb;
                    border-radius:14px;
                    padding:22px;
                    margin-bottom:22px;
                  "
                >

                  <h3
                    style="
                      margin-top:0;
                      margin-bottom:18px;
                    "
                  >
                    Cryptographic Checks
                  </h3>


                  <div
                    style="
                      display:flex;
                      justify-content:space-between;
                      gap:15px;
                      padding:12px 0;
                      border-bottom:1px solid #eee;
                    "
                  >

                    <span>
                      Document SHA-256
                    </span>

                    <strong
                      style="
                        color:${hashValid ? "#166534" : "#b00020"};
                      "
                    >
                      ${
                        hashValid
                          ? "✓ VALID"
                          : "✕ INVALID"
                      }
                    </strong>

                  </div>


                  <div
                    style="
                      display:flex;
                      justify-content:space-between;
                      gap:15px;
                      padding:12px 0;
                    "
                  >

                    <span>
                      Digital Signature
                    </span>

                    <strong
                      style="
                        color:${signatureValid ? "#166534" : "#b00020"};
                      "
                    >
                      ${
                        signatureValid
                          ? "✓ VALID"
                          : "✕ INVALID"
                      }
                    </strong>

                  </div>

                </div>


                <div
                  style="
                    background:#f8fafc;
                    border:1px solid #e2e8f0;
                    border-radius:14px;
                    padding:22px;
                  "
                >

                  <div
                    style="
                      font-size:16px;
                      font-weight:bold;
                      margin-bottom:10px;
                    "
                  >
                    🔐 File Integrity Verification
                  </div>

                  <div
                    style="
                      color:#555;
                      line-height:1.6;
                      font-size:14px;
                    "
                  >
                    This page verifies the official report record associated with the Verification ID.
                    It does not by itself prove that a downloaded PDF or CSV file has remained unchanged.
                  </div>

                  <div
                    style="
                      margin-top:12px;
                      color:#555;
                      line-height:1.6;
                      font-size:14px;
                    "
                  >
                    To verify the actual file, use the Expense Tracker file verification page and upload the downloaded document.
                  </div>

                </div>


                <div
                  style="
                    margin-top:22px;
                    padding:14px;
                    background:#fff7ed;
                    border:1px solid #fed7aa;
                    border-radius:10px;
                    color:#7c2d12;
                    font-size:13px;
                    line-height:1.5;
                  "
                >

                  <strong>
                    Security note:
                  </strong>

                  The report data stored by Expense Tracker is protected by a cryptographic hash and digital signature.
                  Any modification to that protected record causes verification to fail.

                </div>

              </div>

            </div>

          </body>

          </html>
        `);
    }
  );


// =========================================================
// ONLINE JSON VERIFICATION
// =========================================================

const verifyExpenseReportJson =
  asyncHandler(
    async (req, res) => {
      const {
        verificationId,
      } = req.params;

      if (
        !verificationId
      ) {
        return res
          .status(400)
          .json({
            verified: false,

            status:
              "INVALID",

            message:
              "Verification ID is required.",
          });
      }

      const verification =
        await ExportVerification.findOne({
          verificationId:
            verificationId.toUpperCase(),
        }).lean();

      if (
        !verification
      ) {
        return res
          .status(404)
          .json({
            verified: false,

            status:
              "NOT_FOUND",

            message:
              "Verification ID was not found.",
          });
      }

      const calculatedHash =
        createDocumentHash(
          verification.canonicalData
        );

      const hashValid =
        calculatedHash ===
        verification.documentHash;

      const signatureValid =
        verifyCanonicalData(
          verification.canonicalData,
          verification.digitalSignature
        );

      const metadataValid =
        Boolean(
          verification.verificationId &&
            verification.documentHash &&
            verification.canonicalData &&
            verification.digitalSignature &&
            verification.keyId
        );

      const verified =
        hashValid &&
        signatureValid &&
        metadataValid;

      const response = {
        verified,

        status:
          verified
            ? "AUTHENTIC"
            : "INVALID",

        verificationId:
          verification.verificationId,

        exportType:
          verification.exportType,

        message:
          verified
            ? "The report record is authentic. Its stored cryptographically protected data has not been altered. Upload the actual PDF or CSV file separately to verify file integrity."
            : "The report record could not be cryptographically verified.",

        checks: {
          verificationMetadata:
            metadataValid
              ? "VALID"
              : "INVALID",

          documentHash:
            hashValid
              ? "VALID"
              : "INVALID",

          digitalSignature:
            signatureValid
              ? "VALID"
              : "INVALID",
        },

        documentHash:
          verification.documentHash,

        keyId:
          verification.keyId,

        generatedAt:
          verification.generatedAt,

        startDate:
          verification.startDate,

        endDate:
          verification.endDate,

        expenseCount:
          verification.expenseCount,

        totalAmount:
          verification.totalAmount,
      };

      if (
        verification.exportType ===
        "PDF"
      ) {
        response.pdfSignatureFormat =
          verification.pdfSignatureFormat ||
          null;

        response.pdfCertificateFingerprint =
          verification.pdfCertificateFingerprint ||
          null;

        response.pdfCertificateSubject =
          verification.pdfCertificateSubject ||
          null;

        response.pdfCertificateIssuer =
          verification.pdfCertificateIssuer ||
          null;

        response.pdfCertificateSerial =
          verification.pdfCertificateSerial ||
          null;
      }

      return res
        .status(
          verified
            ? 200
            : 409
        )
        .json(
          response
        );
    }
  );


// =========================================================
// VERIFY UPLOADED FILE
// =========================================================

const verifyExportFile =
  asyncHandler(
    async (req, res) => {
      if (
        !req.file ||
        !req.file.buffer
      ) {
        return res
          .status(400)
          .json({
            verified: false,

            status:
              "FILE_REQUIRED",

            message:
              "Please upload a PDF or CSV file.",
          });
      }

      const originalName =
        String(
          req.file.originalname ||
            ""
        );

      const extension =
        originalName
          .split(".")
          .pop()
          .toLowerCase();

      const mime =
        String(
          req.file.mimetype ||
            ""
        ).toLowerCase();

      const isPDF =
        extension === "pdf" ||
        mime ===
          "application/pdf";

      const isCSV =
        extension === "csv" ||
        mime === "text/csv" ||
        mime ===
          "application/vnd.ms-excel";

      if (
        !isPDF &&
        !isCSV
      ) {
        return res
          .status(400)
          .json({
            verified: false,

            status:
              "UNSUPPORTED_FILE",

            message:
              "Only PDF and CSV files are supported.",
          });
      }

      /*
       * =====================================================
       * PDF VERIFICATION
       * =====================================================
       */

      if (isPDF) {
        let pdfSignatureResult;

        try {
          pdfSignatureResult =
            await verifyPdfSignature(
              req.file.buffer
            );
        } catch (error) {
          console.error(
            "PDF verification error:",
            error
          );

          return res
            .status(500)
            .json({
              verified: false,

              status:
                "VERIFICATION_ERROR",

              message:
                "The PDF could not be cryptographically verified.",

              error:
                process.env.NODE_ENV ===
                "production"
                  ? undefined
                  : error.message,
            });
        }

        if (
          !pdfSignatureResult ||
          !pdfSignatureResult.valid
        ) {
          return res
            .status(409)
            .json({
              verified: false,

              status:
                "TAMPERED",

              message:
                pdfSignatureResult?.reason ||
                "The PDF digital signature is invalid. The file may have been modified after signing.",

              signatureFound:
                Boolean(
                  pdfSignatureResult?.signatureFound
                ),

              cryptographicSignatureValid:
                Boolean(
                  pdfSignatureResult?.cryptographicSignatureValid
                ),

              certificateMatchesTrusted:
                Boolean(
                  pdfSignatureResult?.certificateMatchesTrusted
                ),

              byteRange:
                pdfSignatureResult?.byteRange ||
                null,
            });
        }

        /*
         * -----------------------------------------------------
         * EXTRACT VERIFICATION ID
         * -----------------------------------------------------
         */

        const extracted =
          extractPdfSignature(
            req.file.buffer
          );

        let verificationId =
          extracted?.verificationId ||
          null;

        /*
         * -----------------------------------------------------
         * FALLBACK:
         * SEARCH PDF TEXT FOR VERIFICATION ID
         * -----------------------------------------------------
         */

        if (
          !verificationId
        ) {
          const pdfText =
            req.file.buffer
              .toString(
                "latin1"
              );

          const match =
            pdfText.match(
              /Verification\s*ID[\s\S]{0,500}?(EXP-\d{4}-[A-F0-9]{12})/i
            );

          if (
            match &&
            match[1]
          ) {
            verificationId =
              match[1]
                .trim()
                .toUpperCase();
          }
        }

        /*
         * -----------------------------------------------------
         * LAST FALLBACK:
         * SEARCH REASON FIELD
         * -----------------------------------------------------
         */

        if (
          !verificationId
        ) {
          const pdfText =
            req.file.buffer
              .toString(
                "latin1"
              );

          const reasonMatch =
            pdfText.match(
              /\/Reason\s*\(([^)]*)\)/i
            );

          if (
            reasonMatch &&
            reasonMatch[1]
          ) {
            const reason =
              reasonMatch[1];

            const idMatch =
              reason.match(
                /(EXP-\d{4}-[A-F0-9]{12})/i
              );

            if (
              idMatch &&
              idMatch[1]
            ) {
              verificationId =
                idMatch[1]
                  .trim()
                  .toUpperCase();
            }
          }
        }

        if (
          !verificationId
        ) {
          return res
            .status(409)
            .json({
              verified: false,

              status:
                "VERIFICATION_ID_NOT_FOUND",

              message:
                "The PDF signature is present, but the Verification ID could not be extracted from the document.",
            });
        }

        const normalizedVerificationId =
  String(verificationId || "")
    .trim()
    .toUpperCase();

if (
  !/^EXP-\d{4}-[A-F0-9]{12}$/.test(
    normalizedVerificationId
  )
) {
  return res
    .status(409)
    .json({
      verified: false,

      status:
        "INVALID_VERIFICATION_ID",

      message:
        "The PDF contains an invalid Expense Tracker Verification ID format.",

      verificationId:
        normalizedVerificationId || null,
    });
}

verificationId = normalizedVerificationId;

        /*
         * -----------------------------------------------------
         * LOAD ISSUED RECORD
         * -----------------------------------------------------
         */

        const verification =
          await ExportVerification.findOne({
            verificationId:
              verificationId.toUpperCase(),
          }).lean();

        if (
          !verification
        ) {
          return res
            .status(404)
            .json({
              verified: false,

              status:
                "NOT_FOUND",

              message:
                "The PDF signature is valid, but its Verification ID is not present in the Expense Tracker verification registry.",

              verificationId,
            });
        }

        if (
          verification.exportType !==
          "PDF"
        ) {
          return res
            .status(409)
            .json({
              verified: false,

              status:
                "TYPE_MISMATCH",

              message:
                "The Verification ID belongs to a different export type.",

              verificationId,
            });
        }

        /*
         * -----------------------------------------------------
         * VERIFY STORED CANONICAL DATA
         * -----------------------------------------------------
         */

        const calculatedHash =
          createDocumentHash(
            verification.canonicalData
          );

        const hashValid =
          calculatedHash ===
          verification.documentHash;

        const canonicalSignatureValid =
          verifyCanonicalData(
            verification.canonicalData,
            verification.digitalSignature
          );

        /*
         * -----------------------------------------------------
         * VERIFY CERTIFICATE
         * -----------------------------------------------------
         */

        const pdfConfig =
          getPdfSigningConfig();

        const embeddedFingerprint =
          String(
            pdfSignatureResult.certificateFingerprint ||
              extracted?.certificateFingerprint ||
              ""
          ).toLowerCase();

        const trustedFingerprint =
          String(
            pdfConfig.fingerprint256 ||
              ""
          ).toLowerCase();

        const recordFingerprint =
          String(
            verification.pdfCertificateFingerprint ||
              ""
          ).toLowerCase();

        const certificateMatchesTrusted =
          Boolean(
            embeddedFingerprint &&
              trustedFingerprint &&
              embeddedFingerprint ===
                trustedFingerprint
          );

        const certificateMatchesRecord =
          Boolean(
            embeddedFingerprint &&
              recordFingerprint &&
              embeddedFingerprint ===
                recordFingerprint
          );

        /*
         * -----------------------------------------------------
         * FINAL AUTHENTICITY DECISION
         * -----------------------------------------------------
         */

        const authentic =
          pdfSignatureResult.valid &&
          certificateMatchesTrusted &&
          certificateMatchesRecord &&
          hashValid &&
          canonicalSignatureValid;

        if (!authentic) {
          return res
            .status(409)
            .json({
              verified: false,

              status:
                "TAMPERED",

              message:
                "The PDF could not be confirmed as the original authentic report. Its cryptographic signature, certificate, stored report record, or integrity checks did not match.",

              verificationId,

              checks: {
                pdfSignature:
                  pdfSignatureResult.valid
                    ? "VALID"
                    : "INVALID",

                trustedCertificate:
                  certificateMatchesTrusted
                    ? "VALID"
                    : "INVALID",

                recordCertificate:
                  certificateMatchesRecord
                    ? "VALID"
                    : "INVALID",

                documentHash:
                  hashValid
                    ? "VALID"
                    : "INVALID",

                digitalSignature:
                  canonicalSignatureValid
                    ? "VALID"
                    : "INVALID",
              },
            });
        }

        /*
         * -----------------------------------------------------
         * AUTHENTIC PDF
         * -----------------------------------------------------
         */

        return res
          .status(200)
          .json({
            verified: true,

            status:
              "AUTHENTIC",

            message:
              "The uploaded PDF is authentic and cryptographically verified. The signed file content, PDF signature, trusted certificate, and issued report record all match.",

            verificationId,

            exportType:
              "PDF",

            checks: {
              pdfSignature:
                "VALID",

              trustedCertificate:
                "VALID",

              recordCertificate:
                "VALID",

              documentHash:
                "VALID",

              digitalSignature:
                "VALID",
            },

            certificateFingerprint:
              embeddedFingerprint,

            signatureFormat:
              pdfSignatureResult.signatureFormat ||
              verification.pdfSignatureFormat ||
              null,

            byteRange:
              pdfSignatureResult.byteRange ||
              extracted?.byteRange ||
              null,

            expenseCount:
              verification.expenseCount,

            totalAmount:
              verification.totalAmount,

            generatedAt:
              verification.generatedAt,

            startDate:
              verification.startDate,

            endDate:
              verification.endDate,
          });
      }


      /*
       * =====================================================
       * CSV VERIFICATION
       * =====================================================
       */

      if (isCSV) {
        const csvText =
          req.file.buffer.toString(
            "utf8"
          );

        /*
         * -----------------------------------------------------
         * EXTRACT VERIFICATION ID
         * -----------------------------------------------------
         */

        const firstLine =
          csvText
            .split(/\r?\n/)
            .find(
              (line) =>
                line.trim()
            );

        if (
          !firstLine
        ) {
          return res
            .status(400)
            .json({
              verified: false,

              status:
                "INVALID_CSV",

              message:
                "The CSV file is empty or invalid.",
            });
        }

        /*
         * -----------------------------------------------------
         * PARSE CSV
         * -----------------------------------------------------
         */

        const records = parseCSVRecords(csvText);

        if (
          !records ||
          records.length === 0
        ) {
          return res
            .status(400)
            .json({
              verified: false,

              status:
                "INVALID_CSV",

              message:
                "The CSV file does not contain a valid report record.",
            });
        }

        const verificationId =
          String(
            records[0]?.[
              "Verification ID"
            ] ||
              ""
          )
            .trim()
            .toUpperCase();

        if (
          !verificationId
        ) {
          return res
            .status(409)
            .json({
              verified: false,

              status:
                "VERIFICATION_ID_NOT_FOUND",

              message:
                "Verification ID could not be found in the CSV file.",
            });
        }

        /*
         * -----------------------------------------------------
         * LOAD ISSUED RECORD
         * -----------------------------------------------------
         */

        const verification =
          await ExportVerification.findOne({
            verificationId,
          }).lean();

        if (
          !verification
        ) {
          return res
            .status(404)
            .json({
              verified: false,

              status:
                "NOT_FOUND",

              message:
                "The Verification ID is not present in the Expense Tracker verification registry.",

              verificationId,
            });
        }

        if (
          verification.exportType !==
          "CSV"
        ) {
          return res
            .status(409)
            .json({
              verified: false,

              status:
                "TYPE_MISMATCH",

              message:
                "The Verification ID belongs to a different export type.",

              verificationId,
            });
        }

        /*
         * -----------------------------------------------------
         * VERIFY CSV CONTENT
         * -----------------------------------------------------
         */

        const suppliedHash =
          String(
            records[0]?.[
              "Document SHA-256"
            ] ||
              ""
          )
            .trim()
            .toLowerCase();

        const suppliedSignature =
          String(
            records[0]?.[
              "Digital Signature"
            ] ||
              ""
          )
            .trim();

        const suppliedKeyId =
          String(
            records[0]?.[
              "Key ID"
            ] ||
              ""
          )
            .trim();

        const hashMatchesRecord =
          suppliedHash ===
          String(
            verification.documentHash
          ).toLowerCase();

        const signatureMatchesRecord =
          suppliedSignature ===
          String(
            verification.digitalSignature
          );

        const keyMatchesRecord =
          suppliedKeyId ===
          String(
            verification.keyId
          );

        const canonicalHashValid =
          createDocumentHash(
            verification.canonicalData
          ) ===
          verification.documentHash;

        const canonicalSignatureValid =
          verifyCanonicalData(
            verification.canonicalData,
            verification.digitalSignature
          );

        /*
         * -----------------------------------------------------
         * REBUILD CANONICAL CSV DATA
         *
         * The actual transaction rows are included so that
         * changing CSV data cannot be hidden by keeping the
         * original hash/signature columns unchanged.
         * -----------------------------------------------------
         */

        const csvTransactionData =
          records
            .map(
              (record) => ({
                id:
                  record[
                    "Transaction ID"
                  ] || "",

                type:
                  record[
                    "Type"
                  ] || "",

                amount:
                  Number(
                    record[
                      "Amount"
                    ] || 0
                  ),

                date:
                  record[
                    "Date"
                  ]
                    ? new Date(
                        record[
                          "Date"
                        ]
                      ).toISOString()
                    : null,

                description:
                  record[
                    "Description"
                  ] || "",

                category:
                  record[
                    "Category"
                  ] || "",

                items:
                  parseItemsFromCSV(
                    record[
                      "Items"
                    ]
                  ),
              })
            )
            .sort(
              (a, b) => {
                if (
                  a.date !==
                  b.date
                ) {
                  return String(
                    a.date ||
                      ""
                  ).localeCompare(
                    String(
                      b.date ||
                        ""
                    )
                  );
                }

                return a.id.localeCompare(
                  b.id
                );
              }
            );

        const csvCanonicalPayload =
          JSON.stringify(
            {
              version:
                "1",

              verificationId,

              startDate:
                records[0]?.[
                  "Report Start Date"
                ] || "",

              endDate:
                records[0]?.[
                  "Report End Date"
                ] || "",

              transactions:
                csvTransactionData,
            }
          );

        const actualCsvHash =
          createDocumentHash(
            csvCanonicalPayload
          );

        /*
         * -----------------------------------------------------
         * IMPORTANT:
         *
         * The issued documentHash is generated from the
         * canonical report data on export. Therefore, the
         * actual CSV hash is compared against the issued
         * record only when the canonical payload represents
         * the same issued data.
         *
         * This additional comparison prevents a modified
         * transaction row from passing simply because someone
         * preserved the original hash/signature columns.
         * -----------------------------------------------------
         */

        const csvDataIntegrityValid =
          Boolean(
            actualCsvHash &&
              actualCsvHash ===
                suppliedHash
          );

        const authentic =
          hashMatchesRecord &&
          signatureMatchesRecord &&
          keyMatchesRecord &&
          canonicalHashValid &&
          canonicalSignatureValid &&
          csvDataIntegrityValid;

        if (!authentic) {
          return res
            .status(409)
            .json({
              verified: false,

              status:
                "TAMPERED",

              message:
                "The uploaded CSV failed cryptographic integrity verification. The report data, hash, digital signature, or signing metadata does not match the issued record.",

              verificationId,

              checks: {
                reportHash:
                  hashMatchesRecord
                    ? "VALID"
                    : "INVALID",

                digitalSignature:
                  signatureMatchesRecord
                    ? "VALID"
                    : "INVALID",

                keyId:
                  keyMatchesRecord
                    ? "VALID"
                    : "INVALID",

                storedRecordHash:
                  canonicalHashValid
                    ? "VALID"
                    : "INVALID",

                storedRecordSignature:
                  canonicalSignatureValid
                    ? "VALID"
                    : "INVALID",

                fileData:
                  csvDataIntegrityValid
                    ? "VALID"
                    : "INVALID",
              },
            });
        }

        return res
          .status(200)
          .json({
            verified: true,

            status:
              "AUTHENTIC",

            message:
              "The uploaded CSV is authentic and its report data, SHA-256 hash, Ed25519 signature, and signing metadata match the issued verification record.",

            verificationId,

            exportType:
              "CSV",

            checks: {
              reportHash:
                "VALID",

              digitalSignature:
                "VALID",

              keyId:
                "VALID",

              storedRecordHash:
                "VALID",

              storedRecordSignature:
                "VALID",

              fileData:
                "VALID",
            },

            documentHash:
              verification.documentHash,

            keyId:
              verification.keyId,

            expenseCount:
              verification.expenseCount,

            totalAmount:
              verification.totalAmount,

            generatedAt:
              verification.generatedAt,

            startDate:
              verification.startDate,

            endDate:
              verification.endDate,
          });
      }

      return res
        .status(400)
        .json({
          verified: false,

          status:
            "UNSUPPORTED_FILE",

          message:
            "Only PDF and CSV files are supported.",
        });
    }
  );


// =========================================================
// CONTROLLER EXPORT
// =========================================================

const exportController = {
  downloadExpensesPDF,
  downloadExpensesCSV,
  verifyExpenseReport,
  verifyExpenseReportJson,
  verifyExportFile,
};

module.exports = exportController;