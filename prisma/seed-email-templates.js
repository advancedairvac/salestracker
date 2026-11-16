
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

// ============================================
// PRISMA CLIENT INITIALIZATION
// ============================================

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from environment variables.");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

// ============================================
// FOLLOW-UP EMAIL & COMMUNICATION TEMPLATES
// ============================================

const followUpTemplates = [
  {
    eventType: "H24",
    name: "24 Hours Follow-up",
    subject: "Following Up on Your Recent Estimate",
    body: `Hi {{customerName}},

I hope you're doing well.

I'm following up on the estimate we recently presented for {{jobType}}.

I wanted to check if you've had a chance to review the proposal and whether you have any questions.

Please feel free to reach out. I'd be happy to help.

Best regards,
{{salespersonName}}
{{companyName}}
{{companyPhone}}`,
  },

  {
    eventType: "H36",
    name: "36 Hours Follow-up",
    subject: "36 Hours Follow-up - SMS Script",
    body: `Hi {{customerName}}, this is {{salespersonName}} from {{companyName}}. I'm following up on the estimate we shared for {{jobType}}. Please let me know if you have any questions. Thank you!`,
  },

  {
    eventType: "W1",
    name: "1 Week Follow-up",
    subject: "Checking In Regarding Your Estimate",
    body: `Hi {{customerName}},

I wanted to follow up on the estimate we shared last week for {{jobType}}.

We would love to know if you've had time to review the proposal and if there is anything we can clarify for you.

If you're ready to move forward or need any additional information, please let us know.

Thank you for considering {{companyName}}.

Best regards,
{{salespersonName}}
{{companyName}}
{{companyPhone}}`,
  },

  {
    eventType: "W2",
    name: "2 Weeks Follow-up",
    subject: "Two Weeks Follow-up - Call Script",
    body: `CALL SCRIPT

Opening:
Hi {{customerName}}, this is {{salespersonName}} calling from {{companyName}}.

Purpose:
I'm calling to follow up on the estimate we provided for {{jobType}} about two weeks ago.

Questions:
1. Have you had a chance to review the estimate?
2. Do you have any questions about the proposed work?
3. Are you considering moving forward with the project?

Closing:
Thank you for your time. Please let me know if you need any additional information.`,
  },

  {
    eventType: "M1",
    name: "1 Month Follow-up",
    subject: "One Month Follow-up - Call Script",
    body: `CALL SCRIPT

Opening:
Hi {{customerName}}, this is {{salespersonName}} from {{companyName}}.

Purpose:
I'm reaching out to check in regarding the estimate we provided for {{jobType}} last month.

Questions:
1. Are you still considering the proposed project?
2. Have your project requirements or timeline changed?
3. Is there anything we can do to help you make a decision?

Closing:
We appreciate your time and consideration. Please feel free to contact us whenever you're ready.`,
  },

  {
    eventType: "MANUAL",
    name: "Manual Follow-up",
    subject: "Manual Follow-up - Call Script",
    body: `CALL SCRIPT

Opening:
Hi {{customerName}}, this is {{salespersonName}} calling from {{companyName}}.

Purpose:
I'm following up regarding your estimate for {{jobType}}.

Discussion:
1. Ask about the customer's current decision.
2. Understand any concerns or questions.
3. Discuss the next steps.
4. Record any additional requirements.

Closing:
Thank you for your time. I'll make sure to follow up on any agreed next steps.`,
  },
];

// ============================================
// SEED FOLLOW-UP TEMPLATES
// ============================================

async function seedFollowUpTemplates() {
  console.log("\nStarting email template seeding...\n");

  let createdCount = 0;
  let updatedCount = 0;

  for (const template of followUpTemplates) {
    const existingTemplate = await prisma.emailTemplate.findFirst({
      where: {
        userId: null,
        eventType: template.eventType,
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

      updatedCount++;

      console.log(`Updated: ${template.eventType}`);
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

      createdCount++;

      console.log(`Created: ${template.eventType}`);
    }
  }

  console.log("\n=================================");
  console.log("EMAIL TEMPLATE SEEDING COMPLETED");
  console.log("=================================");
  console.log(`Created: ${createdCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Total templates: ${followUpTemplates.length}`);
  console.log("=================================\n");
}

// ============================================
// EXECUTE SEED
// ============================================

async function main() {
  try {
    await seedFollowUpTemplates();
  } catch (error) {
    console.error("\nEmail template seeding failed:");
    console.error(error);

    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
