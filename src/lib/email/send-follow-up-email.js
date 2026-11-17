
import { resend } from "@/lib/email/resend";

export async function sendFollowUpEmail({
  recipientEmail,
  subject,
  body,
}) {
  const recipient = recipientEmail?.trim();

  if (
    !recipient ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)
  ) {
    throw new Error("A valid recipient email is required.");
  }

  if (
    typeof subject !== "string" ||
    !subject.trim() ||
    typeof body !== "string" ||
    !body.trim()
  ) {
    throw new Error("Email subject and body are required.");
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is missing.");
  }

  const { data, error } = await resend.emails.send({
    from,
    to: [recipient],
    subject: subject.trim(),
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
