const nodemailer = require("nodemailer");

let mailTransporter = null;

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isMailConfigured() {
  return Boolean(
    String(process.env.PERSONAL_GMAIL_ADDRESS || "").trim()
    && String(process.env.GMAIL_APP_PASSWORD || "").trim()
  );
}

function getMailTransporter() {
  const user = String(process.env.PERSONAL_GMAIL_ADDRESS || "").trim();
  const pass = String(process.env.GMAIL_APP_PASSWORD || "").trim();

  if (!user || !pass) {
    throw new Error("Missing PERSONAL_GMAIL_ADDRESS or GMAIL_APP_PASSWORD");
  }

  if (!mailTransporter) {
    mailTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  return mailTransporter;
}

async function sendEmail({ to, subject, html }) {
  if (!to || !isMailConfigured()) {
    return { sent: false, skipped: true };
  }

  const transporter = getMailTransporter();
  await transporter.sendMail({
    from: '"3D Printings Management" <management@3dprintings.xyz>',
    to,
    subject,
    html,
  });

  return { sent: true, skipped: false };
}

module.exports = {
  escapeHtml,
  getMailTransporter,
  isMailConfigured,
  sendEmail,
};
