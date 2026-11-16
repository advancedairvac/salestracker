
import { resend } from "@/lib/email/resend";

// ============================================
// SEND FOLLOW-UP EMAIL
// ============================================

export async function sendFollowUpEmail({
  recipientEmail,
  subject,
  body,
}) {
  if (!recipientEmail) {
    throw new Error("Recipient email is required.");
  }

  if (!subject || !body) {
    throw new Error("Email subject and body are required.");
  }

  const from = process.env.RESEND_FROM_EMAIL;

  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is missing.");
  }

  const { data, error } = await resend.emails.send({
    from,
    to: [recipientEmail],
    subject,
    text: body,
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
