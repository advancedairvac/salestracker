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

  if (
    typeof subject !== "string" ||
    !subject.trim() ||
    typeof body !== "string" ||
    !body.trim()
  ) {
    throw new Error("Email subject and HTML body are required.");
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is missing.");
  }

  const plainText =
    typeof text === "string" && text.trim()
      ? text
      : body
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/(div|p|tr|td)>/gi, "\n")
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .trim();

  const { data, error } = await resend.emails.send({
    from,
    to: [recipient],
    subject: subject.trim(),
    html: body,
    text: plainText,
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
