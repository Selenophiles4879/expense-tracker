const brevo = require("@getbrevo/brevo");

const sendWithBrevo = async ({
  apiKey,
  fromEmail,
  to,
  subject,
  htmlContent,
  emailType,
  userId,
  providerName,
}) => {
  const apiInstance = new brevo.TransactionalEmailsApi();

  apiInstance.setApiKey(
    brevo.TransactionalEmailsApiApiKeys.apiKey,
    apiKey
  );

  const sendSmtpEmail = new brevo.SendSmtpEmail();

  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = htmlContent;
  sendSmtpEmail.sender = {
    email: fromEmail,
    name: "Expense Tracker",
  };
  sendSmtpEmail.to = [{ email: to }];

  sendSmtpEmail.tags = [
    `email_type:${emailType}`,
    ...(userId ? [`user_id:${String(userId)}`] : []),
  ];

  sendSmtpEmail.headers = {
    "X-Mailin-custom": [
      `email_type:${emailType}`,
      `user_id:${userId || ""}`,
    ].join("|"),
  };

  const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

  return {
    provider: providerName,
    messageId: result?.messageId || result?.body?.messageId,
  };
};

const sendEmail = async ({
  to,
  subject,
  htmlContent,
  emailType = "transactional",
  userId,
}) => {
  const providers = [
    {
      apiKey: process.env.BREVO_API_KEY,
      fromEmail: process.env.FROM_EMAIL,
      providerName: "brevo-primary",
    },
    {
      apiKey: process.env.BREVO_FALLBACK_API_KEY,
      fromEmail:
        process.env.BREVO_FALLBACK_FROM_EMAIL || process.env.FROM_EMAIL,
      providerName: "brevo-fallback",
    },
  ].filter((provider) => provider.apiKey && provider.fromEmail);

  if (providers.length === 0) {
    throw new Error("No Brevo email provider is configured.");
  }

  let lastError;

  for (const provider of providers) {
    try {
      const result = await sendWithBrevo({
        ...provider,
        to,
        subject,
        htmlContent,
        emailType,
        userId,
      });

      console.log(`Email sent through ${provider.providerName}`);
      return result;
    } catch (error) {
      lastError = error;
      console.error(
        `${provider.providerName} failed:`,
        error?.message || error
      );
    }
  }

  console.error("All Brevo email providers failed:", lastError);
  throw new Error("Email could not be sent. Please try again later.");
};

module.exports = { sendEmail };
