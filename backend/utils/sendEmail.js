const nodemailer = require("nodemailer");

const sendEmail = async (options) => {


  // 1. Create a transporter
  const transporter = nodemailer.createTransport({
   host: process.env.SMTP_HOST, 
    port: process.env.SMTP_PORT,
    secure: false, // Use 'secure: true' for port 465, or 'false' for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // 2. Define the email options
  const mailOptions = {
    from: `Expense Tracker <${process.env.SMTP_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html: (can add html version here)
  };

  // 3. Actually send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
