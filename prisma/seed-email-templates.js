import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

// ============================================
// DEFAULT FOLLOW-UP EMAIL TEMPLATES
// Exactly 6 predefined templates
// ============================================

const EMAIL_TEMPLATES = [
  {
    eventType: "H24",
    name: "First Follow-up",
    subject: "Follow up with {{customerName}}",
    body: "Morning, did you get those couple emails from yesterday?",
  },
  {
    eventType: "H36",
    name: "Second Follow-up",
    subject: "Follow up with {{customerName}}",
    body: "I wanted to follow up regarding your estimate. Have you had a chance to review it?",
  },
  {
    eventType: "W1",
    name: "Third Follow-up",
    subject: "Follow up with {{customerName}}",
    body: "I wanted to check in and see if you have any questions about the estimate.",
  },
  {
    eventType: "W2",
    name: "Fourth Follow-up",
    subject: "Follow up with {{customerName}}",
    body: "Just following up to see how things are progressing and whether you need any additional information.",
  },
  {
    eventType: "M1",
    name: "Fifth Follow-up",
    subject: "Follow up with {{customerName}}",
    body: "I wanted to check in one more time regarding your estimate. Please let us know if we can help.",
  },
  {
    eventType: "MANUAL",
    name: "Manual Follow-up",
    subject: "Follow up with {{customerName}}",
    body: "I wanted to follow up with you regarding this opportunity.",
  },
];

// ============================================
// SEED FUNCTION
// ============================================

async function seedEmailTemplates() {
  console.log("\nStarting Email Template Seed...\n");

  let created = 0;
  let updated = 0;

  for (const template of EMAIL_TEMPLATES) {
    // Find existing global template
    const existingTemplate = await prisma.emailTemplate.findFirst({
      where: {
        userId: null,
        eventType: template.eventType,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (existingTemplate) {
      await prisma.emailTemplate.update({
        where: {
          id: existingTemplate.id,
        },
        data: {
          name: template.name,
          subject: template.subject,
          body: template.body,
          isActive: true,
        },
      });

      updated++;

      console.log(`UPDATED: ${template.name}`);
    } else {
      await prisma.emailTemplate.create({
        data: {
          userId: null,
          eventType: template.eventType,
          name: template.name,
          subject: template.subject,
          body: template.body,
          isActive: true,
        },
      });

      created++;

      console.log(`CREATED: ${template.name}`);
    }
  }

  // Verify the six global templates
  const finalTemplates = await prisma.emailTemplate.findMany({
    where: {
      userId: null,
      eventType: {
        in: EMAIL_TEMPLATES.map((template) => template.eventType),
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log("\n============================================");
  console.log("EMAIL TEMPLATE SEED COMPLETED");
  console.log("============================================");
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Total matching records: ${finalTemplates.length}`);

  for (const template of finalTemplates) {
    console.log(
      `${template.eventType} | ${template.name} | ${
        template.isActive ? "ACTIVE" : "INACTIVE"
      }`,
    );
  }

  if (finalTemplates.length !== 6) {
    console.warn(
      "\nWARNING: Expected exactly 6 global templates. Check for duplicate records.",
    );
  } else {
    console.log("\nAll six template types are available.");
  }
}

// ============================================
// EXECUTION
// ============================================

try {
  await seedEmailTemplates();
} catch (error) {
  console.error("\nEmail Template Seed Failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
