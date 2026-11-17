import { resend } from "@/lib/email/resend";

export async function sendFollowUpEmail({
  recipientEmail,
  subject,
  body,
  text,
}) {
  const recipient = recipientEmail?.trim();

  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new Error("A valid recipient email is required.");
  }

  if (typeof subject !== "string" || !subject.trim()) {
    throw new Error("Email subject is required.");
  }

  const html = body?.trim();
  const plainText = text?.trim();

  if (!html && !plainText) {
    throw new Error("Email body is required.");
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is missing.");
  }

  const { data, error } = await resend.emails.send({
    from,
    to: [recipient],
    subject: subject.trim(),

    ...(html ? { html } : {}),
    ...(plainText ? { text: plainText } : {}),
  });

  if (error) {
    throw new Error(error.message || "Resend email delivery failed.");
  }

  if (!data?.id) {
    throw new Error("Resend did not return an email ID.");
  }

  return {
    success: true,
    providerMessageId: data.id,
  };
}
