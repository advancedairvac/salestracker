import { resend } from "@/lib/email/resend";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendSalesmanInvitation({
  name,
  email,
  invitationUrl,
}) {
  const from = process.env.RESEND_FROM_EMAIL;

  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is missing.");
  }

  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(invitationUrl);

  const result = await resend.emails.send({
    from,
    to: email,
    subject: "Complete your Advanced Sales Tracker registration",
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:32px 16px;background:#f5f5f5;font-family:Arial,sans-serif;color:#111;">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;padding:36px 28px;">
            <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;">
              ADVANCED
            </h1>

            <h2 style="font-size:21px;margin:0 0 16px;">
              Complete Your Registration
            </h2>

            <p style="font-size:15px;line-height:1.7;">
              Hello ${safeName},
            </p>

            <p style="font-size:15px;line-height:1.7;">
              You have been invited to join Advanced Sales Tracker.
              Please use the button below to set up your username and password.
            </p>

            <div style="margin:30px 0;">
              <a
                href="${safeUrl}"
                style="display:inline-block;background:#111;color:#fff;padding:14px 24px;text-decoration:none;font-size:14px;font-weight:600;"
              >
                COMPLETE REGISTRATION
              </a>
            </div>

            <p style="font-size:13px;line-height:1.7;color:#666;">
              This invitation link expires in 48 hours and can only be used once.
            </p>

            <p style="font-size:13px;line-height:1.7;color:#666;">
              If you were not expecting this invitation, you can ignore this email.
            </p>

            <hr style="border:none;border-top:1px solid #eee;margin:30px 0;" />

            <p style="font-size:12px;color:#888;">
              Advanced Sales Tracker
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (result.error) {
    throw new Error(
      result.error.message || "Unable to send invitation email.",
    );
  }

  return result;
}