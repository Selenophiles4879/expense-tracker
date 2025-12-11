// backend/utils/sendEmail.js
/* const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "Expense Tracker <onboardingresend.dev>", // or your verified domain
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
};

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
};*/

// utils/sendEmail.js
const brevo = require("@getbrevo/brevo");

export const sendEmail = async (toEmail, subject, htmlContent) => {
  try {
    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY
    );

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = { email: process.env.FROM_EMAIL, name: "Expense Tracker" };
    sendSmtpEmail.to = [{ email: toEmail }];

    await apiInstance.sendTransacEmail(sendSmtpEmail);
  } catch (err) {
    console.error("Email sending failed:", err);
    throw new Error("Email could not be sent. Please try again later.");
  }
};

module.exports = sendEmail;
