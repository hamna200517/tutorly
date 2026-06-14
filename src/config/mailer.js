const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendPasswordResetEmail(toEmail, resetLink) {
  await transporter.sendMail({
    from: `"Tutorly" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Reset your Tutorly password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e0c8c8;border-radius:16px;">
        <h2 style="color:#800020;margin-top:0;">Reset your password</h2>
        <p>Click the link below to reset your Tutorly password. This link expires in 1 hour.</p>
        <a href="${resetLink}" style="display:inline-block;background:#800020;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">Reset Password</a>
        <p style="color:#6b3a3a;font-size:13px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetEmail };
