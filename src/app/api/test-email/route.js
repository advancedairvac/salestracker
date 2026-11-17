
import { resend } from "@/lib/email/resend";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { to, subject, message } = await request.json();

    // Validate recipient email
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    // Validate subject and message
    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Subject and message are required.",
        },
        { status: 400 }
      );
    }

    // Get sender email from environment variables
    const from = process.env.RESEND_FROM_EMAIL;

    if (!from) {
      return NextResponse.json(
        {
          success: false,
          error: "RESEND_FROM_EMAIL is missing from environment variables.",
        },
        { status: 500 }
      );
    }

    // Send test email
    const { data, error } = await resend.emails.send({
      from,
      to: [to.trim()],
      subject: subject.trim(),
      text: message.trim(),
    });

    if (error) {
      console.error("Resend error:", error);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email accepted by Resend.",
      data,
    });
  } catch (error) {
    console.error("Test email error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to send test email.",
      },
      { status: 500 }
    );
  }
}
