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

module.exports = {sendEmail};
