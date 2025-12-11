// backend/utils/sendEmail.js
/* const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "Expense Tracker <onboarding@resend.dev>", // or your verified domain
      to,
      subject,
      html,
    });

    if (error) {
      console.log("Resend Error:", error);
      throw new Error("Failed to send email");
    }

    console.log("Email sent successfully to:", to);
    return data;
  } catch (err) {
    console.log("Email sending failed:", err.message);
    throw err;
  }
};*/

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const msg = {
      to, // recipient
      from: `Expense Tracker <${process.env.SENDGRID_SENDER}>`, // your verified email
      subject,
      html,
    };

    await sgMail.send(msg);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
};

module.exports = sendEmail;
