
"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

import { sendFollowUpEmail } from "@/lib/email/send-follow-up-email";
import { renderFollowUpEmail } from "@/lib/email/follow-up-email-template";

const TEMPLATE_EVENTS = [
  "H24",
  "H36",
  "W1",
  "W2",
  "M1",
  "MANUAL",
];

async function requireAdmin() {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== "ADMIN") {
    throw new Error("Unauthorized. Admin access required.");
  }

  return user;
}

function validateTemplateInput({ subject, body }) {
  if (
    typeof subject !== "string" ||
    !subject.trim() ||
    subject.length > 200
  ) {
    throw new Error("A valid email subject is required.");
  }

  if (
    typeof body !== "string" ||
    !body.trim() ||
    body.length > 5000
  ) {
    throw new Error("A valid email message is required.");
  }
}

async function getGlobalTemplate(templateId) {
  const template = await prisma.emailTemplate.findFirst({
    where: {
      id: templateId,
      userId: null,
      eventType: {
        in: TEMPLATE_EVENTS,
      },
    },
  });

  if (!template) {
    throw new Error("Email template not found.");
  }

  return template;
}

export async function updateEmailTemplate({
  templateId,
  subject,
  body,
}) {
  await requireAdmin();

  if (!templateId) {
    throw new Error("Template ID is required.");
  }

  validateTemplateInput({ subject, body });

  const template = await getGlobalTemplate(templateId);

  const updatedTemplate = await prisma.emailTemplate.update({
    where: {
      id: template.id,
    },
    data: {
      subject: subject.trim(),
      body: body.trim(),
    },
    select: {
      id: true,
      eventType: true,
      name: true,
      subject: true,
      body: true,
      isActive: true,
      updatedAt: true,
    },
  });

  revalidatePath("/admin/settings/email-templates");

  return {
    success: true,
    template: updatedTemplate,
  };
}

function createExampleData() {
  const opportunity = {
    jobType: "2 PUMPS + KIT [MISSION VALLEY]",
    value: 21400,
    createdAt: new Date("2026-10-28T00:00:00"),
    assignedTo: {
      name: "Troy Hollinger",
    },
    customer: {
      businessName: "SAN DIEGO COMMUNITY COLLEGE",
      pocName: "JASON BOTTICELLI",
      location: "MISSION VALLEY",
      phone: "619-777-9977",
      email: "jbottice@sdccd.edu",
    },
  };

  const followUp = {
    eventType: "H24",
    dueAt: new Date("2026-10-30T07:30:00"),
  };

  return {
    opportunity,
    followUp,
  };
}

async function createTemplatePreview(template) {
  const { opportunity, followUp } = createExampleData();

  followUp.eventType = template.eventType;

  return renderFollowUpEmail({
    opportunity,
    followUp,
    customMessage: template.body,
    subject: template.subject,
  });
}

export async function getEmailTemplatePreview({
  templateId,
  subject,
  body,
}) {
  await requireAdmin();

  const template = await getGlobalTemplate(templateId);

  validateTemplateInput({ subject, body });

  const preview = await createTemplatePreview({
    ...template,
    subject: subject.trim(),
    body: body.trim(),
  });

  return {
    success: true,
    subject: preview.subject,
    html: preview.html,
  };
}

export async function sendEmailTemplateTest({
  templateId,
  recipientEmail,
}) {
  await requireAdmin();

  if (!templateId) {
    throw new Error("Template ID is required.");
  }

  const recipient = recipientEmail?.trim();

  if (
    !recipient ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)
  ) {
    throw new Error("Please enter a valid recipient email address.");
  }

  const template = await getGlobalTemplate(templateId);

  if (!template.isActive) {
    throw new Error("This email template is inactive.");
  }

  const preview = await createTemplatePreview(template);

  const result = await sendFollowUpEmail({
    recipientEmail: recipient,
    subject: `[TEST] ${preview.subject}`,
    body: preview.html,
    text: preview.text,
  });

  return {
    success: true,
    message: "Test email sent successfully.",
    providerMessageId: result.providerMessageId,
  };
}
