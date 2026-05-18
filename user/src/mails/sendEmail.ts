import nodemailer from "nodemailer";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const sendEmail = async ({
  to,
  subject,
  html,
}: SendEmailOptions) => {
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined) {
    console.log(`[TEST MODE] Skipping actual email to ${to}`);
    return;
  }
  await transporter.sendMail({
    from: `"AI Trip Planner" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  });
};