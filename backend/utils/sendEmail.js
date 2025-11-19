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
*/

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
