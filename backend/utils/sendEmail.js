const nodemailer = require("nodemailer");

const sendEmail = async (options) => {


  // 1. Create a transporter
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // 2. Define the email options
  const mailOptions = {
    from: "Your App Name <your-email@gmail.com>",
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html: (can add html version here)
  };

  // 3. Actually send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;