const nodemailer = require("nodemailer");

const sendEmail = async (options) => {


  // 1. Create a transporter
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // 2. Define the email options
  const mailOptions = {
    from: "Expense Tracker <process.env.EMAIL_USER>",
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html: (can add html version here)
  };

  // 3. Actually send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
