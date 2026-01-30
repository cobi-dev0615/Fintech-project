/**
 * Send OTP email for registration 2FA.
 * If SMTP is not configured (SMTP_HOST), logs the code to console for development.
 */

let transporter: Awaited<ReturnType<typeof createTransporter>> | null = null;

async function createTransporter() {
  const nodemailer = await import('nodemailer');
  return nodemailer.default.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' }
      : undefined,
  });
}

async function getTransporter() {
  if (transporter !== null) return transporter;
  if (!process.env.SMTP_HOST) return null;
  transporter = await createTransporter();
  return transporter;
}

export async function sendRegistrationOtp(to: string, code: string): Promise<void> {
  const trans = await getTransporter();
  const from = process.env.SMTP_FROM || 'noreply@zurt.com.br';
  const subject = 'Código de verificação - zurT';
  const text = `Seu código de verificação para concluir o cadastro no zurT é: ${code}. Este código expira em 10 minutos.`;
  const html = `
    <p>Seu código de verificação para concluir o cadastro no zurT é:</p>
    <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p>
    <p>Este código expira em 10 minutos.</p>
  `;

  if (!trans) {
    console.log('[Email] SMTP not configured. OTP for', to, ':', code);
    return;
  }

  await trans.sendMail({ from, to, subject, text, html });
}
