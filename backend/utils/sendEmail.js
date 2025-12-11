/* const nodemailer = require("nodemailer");
const sendEmail = async (options) => {
  try {
    // 1. Create a transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure:false, // true for 465, false for others
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      }
    });

    // 2. Email options
    const mailOptions = {
      from: `Expense Tracker <${process.env.SMTP_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      // html: options.html || null
    };

    // 3. Send the email
    await transporter.sendMail(mailOptions);

    console.log("Email sent successfully to:", options.email);
  } catch (error) {
    console.error("Email sending failed:", error.message);

    // Prevent server crash
    throw new Error("Email could not be sent. Please try again later.");
  }
};

module.exports = sendEmail;

// backend/utils/sendEmail.js

const axios = require("axios");

const sendEmail = async (options) => {
  try {
    // Prepare email payload for Brevo
    const payload = {
      sender: {
        name: "Expense Tracker",
        email: process.env.FROM_EMAIL, // must be a verified Brevo sender
      },
      to: [
        {
          email: options.email,
        },
      ],
      subject: options.subject,
      textContent: options.message, // plain text message
      // htmlContent: options.html || null // optional
    };

    // Send using Brevo Email API
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.BREVO_API_KEY,
        },
      }
    );

    console.log("Email sent via Brevo API:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Email sending failed:",
      error.response?.data || error.message
    );

    throw new Error("Email could not be sent. Please try again later.");
  }
};

module.exports = sendEmail;

// backend/utils/sendEmail.js

const { google } = require("googleapis");
// Utility function to Base64url encode the raw email string
const { Base64 } = require("js-base64"); 

// --- GMAIL API INITIALIZATION ---
// This should only be done once, outside the main function,
// but we include it here for context.

// Get credentials from environment variables (set on Render)
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI; // Your Render callback URL
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// Create OAuth client instance
const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Set the refresh token obtained from the one-time manual flow
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

// Create the Gmail service instance
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

// --- EMAIL SENDING FUNCTION ---

/**
 * Sends an email using the Google Gmail API.
 * @param {object} options - Email options.
 * @param {string} options.email - Recipient email address.
 * @param {string} options.subject - Email subject.
 * @param {string} options.message - Plain text message or HTML content.
 * @param {string} [options.html] - Optional HTML content (recommended for reset links).
 
const sendEmail = async (options) => {
  try {
    const fromEmail = process.env.GMAIL_SENDER_EMAIL; // e.g., 'noreply@yourapp.com'

    // 1. Construct the raw email message (RFC 2822 format)
    const emailLines = [];
    emailLines.push(`To: ${options.email}`);
    emailLines.push(`From: Expense Tracker <${fromEmail}>`);
    emailLines.push(`Subject: ${options.subject}`);
    
    // Choose text/plain or text/html based on options.html
    if (options.html) {
        emailLines.push("Content-Type: text/html; charset=utf-8");
        emailLines.push(""); // Empty line separates headers from body
        emailLines.push(options.html); // HTML content
    } else {
        emailLines.push("Content-Type: text/plain; charset=utf-8");
        emailLines.push(""); // Empty line separates headers from body
        emailLines.push(options.message); // Plain text content
    }

    const email = emailLines.join('\n');

    // 2. Base64url encode the raw email string
    // Must use Base64url, which replaces + and / with - and _
    const base64EncodedEmail = Base64.encodeURI(email);

    // 3. Send the email using the Gmail API
    const response = await gmail.users.messages.send({
      userId: 'me', // Refers to the authenticated user via the Refresh Token
      requestBody: {
        raw: base64EncodedEmail,
      },
    });

    console.log("Email sent successfully via Gmail API. Message ID:", response.data.id);
    return response.data;

  } catch (error) {
    console.error(
      "Gmail API email sending failed:",
      error.message
    );
    // Log the entire error object if needed for debugging Google API issues
    // console.error(error); 

    throw new Error("Email could not be sent via Gmail API. Please try again later.");
  }
};*/

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Expense Tracker <onboarding@resend.dev>', // or your verified domain
      to,
      subject,
      html,
    });

    if (error) {
      console.log("Resend Error:", error);
      throw new Error("Failed to send email");
    }

    return data;
  } catch (err) {
    console.log("Email sending failed:", err.message);
    throw err;
  }
};
module.exports = sendEmail;
