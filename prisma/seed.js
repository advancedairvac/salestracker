
async function main() {
  const dotenv = await import("dotenv");
  dotenv.config();

  const bcryptModule = await import("bcryptjs");
  const bcrypt = bcryptModule.default;

  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("../src/generated/prisma/client.ts");

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    // =====================================
    // 1. SALESMEN
    // =====================================

    const salesmen = [
      { name: "John Smith", username: "john", email: "john@example.com" },
      { name: "Sarah Johnson", username: "sarah", email: "sarah@example.com" },
      { name: "Michael Brown", username: "michael", email: "michael@example.com" },
      { name: "David Wilson", username: "david", email: "david@example.com" },
      { name: "Emily Davis", username: "emily", email: "emily@example.com" },
    ];

    const passwordHash = await bcrypt.hash("Dev@123456", 12);

    console.log("Seeding Salesmen...");

    for (const salesman of salesmen) {
      await prisma.user.upsert({
        where: { username: salesman.username },
        update: {},
        create: {
          ...salesman,
          passwordHash,
          role: "SALESPERSON",
          isActive: true,
        },
      });
    }

    // =====================================
    // 2. CUSTOMERS
    // =====================================

    const customers = [
      ["ST-CUST-1001", "ABC Mechanical Services", "James Anderson", "+1-555-0101", "james@abcmechanical.com", "Dallas, TX"],
      ["ST-CUST-1002", "Prime HVAC Solutions", "Robert Wilson", "+1-555-0102", "robert@primehvac.com", "Houston, TX"],
      ["ST-CUST-1003", "Elite Plumbing Group", "Michael Brown", "+1-555-0103", "michael@eliteplumbing.com", "Austin, TX"],
      ["ST-CUST-1004", "Reliable Air Systems", "David Miller", "+1-555-0104", "david@reliableair.com", "San Antonio, TX"],
      ["ST-CUST-1005", "Comfort Zone HVAC", "Daniel Taylor", "+1-555-0105", "daniel@comfortzone.com", "Fort Worth, TX"],
      ["ST-CUST-1006", "Advanced Cooling Experts", "Christopher Lee", "+1-555-0106", "chris@advancedcooling.com", "Phoenix, AZ"],
      ["ST-CUST-1007", "Premier Electrical Services", "Matthew Davis", "+1-555-0107", "matthew@premierelectric.com", "Denver, CO"],
      ["ST-CUST-1008", "Summit Building Solutions", "Andrew Martin", "+1-555-0108", "andrew@summitbuilding.com", "Atlanta, GA"],
      ["ST-CUST-1009", "Blue Sky Property Group", "Kevin Thomas", "+1-555-0109", "kevin@blueskyproperty.com", "Miami, FL"],
      ["ST-CUST-1010", "Evergreen Facility Management", "Brian White", "+1-555-0110", "brian@evergreenfacility.com", "Orlando, FL"],
    ].map(([stCustomerId, businessName, pocName, phone, email, location]) => ({
      stCustomerId,
      businessName,
      pocName,
      phone,
      email,
      location,
    }));

    console.log("Seeding Customers...");

    for (const customer of customers) {
      await prisma.customer.upsert({
        where: { stCustomerId: customer.stCustomerId },
        update: customer,
        create: customer,
      });
    }

    // =====================================
    // 3. OPPORTUNITIES
    // =====================================

    const opportunities = [
      ["HVAC System Installation", "ST-CUST-1001", "john", "HVAC Installation", 12500, "SELF_GENERATED", "WON"],
      ["Commercial AC Maintenance", "ST-CUST-1002", "sarah", "Maintenance", 4500, "COMPANY_GENERATED", "OPEN"],
      ["Plumbing System Upgrade", "ST-CUST-1003", "michael", "Plumbing", 8200, "SELF_GENERATED", "WON"],
      ["Air Conditioning Repair", "ST-CUST-1004", "david", "Repair", 2800, "COMPANY_GENERATED", "LOST"],
      ["HVAC Replacement Project", "ST-CUST-1005", "emily", "HVAC Replacement", 18500, "SELF_GENERATED", "OPEN"],
      ["Cooling System Installation", "ST-CUST-1006", "john", "Installation", 14500, "COMPANY_GENERATED", "WON"],
      ["Electrical System Upgrade", "ST-CUST-1007", "sarah", "Electrical", 9200, "SELF_GENERATED", "OPEN"],
      ["Building HVAC Maintenance", "ST-CUST-1008", "michael", "Maintenance", 5600, "COMPANY_GENERATED", "WON"],
      ["Property HVAC Installation", "ST-CUST-1009", "david", "Installation", 22000, "SELF_GENERATED", "OPEN"],
      ["Facility Management HVAC", "ST-CUST-1010", "emily", "Maintenance", 6800, "COMPANY_GENERATED", "LOST"],
      ["Commercial Refrigeration", "ST-CUST-1001", "sarah", "Refrigeration", 11200, "SELF_GENERATED", "OPEN"],
      ["Plumbing Repair Contract", "ST-CUST-1003", "john", "Plumbing", 3900, "COMPANY_GENERATED", "WON"],
      ["Annual HVAC Service Contract", "ST-CUST-1005", "michael", "Service Contract", 7500, "SELF_GENERATED", "OPEN"],
      ["Electrical Maintenance Project", "ST-CUST-1007", "david", "Electrical", 4800, "COMPANY_GENERATED", "LOST"],
      ["Multi-unit HVAC Installation", "ST-CUST-1009", "emily", "HVAC Installation", 32000, "SELF_GENERATED", "OPEN"],
    ].map(([title, customer, salesman, jobType, value, source, status]) => ({
      title,
      customer,
      salesman,
      jobType,
      value,
      source,
      status,
    }));

    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (!admin) throw new Error("Admin user not found!");

    console.log("Seeding Opportunities...");

    for (const item of opportunities) {
      const customer = await prisma.customer.findUnique({
        where: { stCustomerId: item.customer },
      });

      const salesman = await prisma.user.findUnique({
        where: { username: item.salesman },
      });

      if (!customer || !salesman) {
        throw new Error(`Missing relation: ${item.title}`);
      }

      const data = {
        title: item.title,
        customerId: customer.id,
        opportunityDate: new Date(),
        jobType: item.jobType,
        value: item.value,
        source: item.source,
        status: item.status,
        assignedToId: salesman.id,
        createdById: admin.id,
        closedById: item.status === "OPEN" ? null : salesman.id,
        closedAt: item.status === "OPEN" ? null : new Date(),
        notes: "Demo opportunity created for testing.",
      };

      const existing = await prisma.opportunity.findFirst({
        where: {
          title: item.title,
          customerId: customer.id,
        },
      });

      if (existing) {
        await prisma.opportunity.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await prisma.opportunity.create({ data });
      }
    }

    // =====================================
    // 4. FOLLOW-UPS
    // =====================================

    console.log("Seeding FollowUps...");

    const openOpportunities = await prisma.opportunity.findMany({
      where: { status: "OPEN" },
    });

    const schedules = [
      {
        hours: 24,
        notes: "First follow-up: Contact customer after 24 hours.",
      },
      {
        hours: 72,
        notes: "Second follow-up: Contact customer after 3 days.",
      },
      {
        hours: 168,
        notes: "Third follow-up: Contact customer after 7 days.",
      },
    ];

    for (const opportunity of openOpportunities) {
      for (const schedule of schedules) {
        const dueAt = new Date(
          opportunity.opportunityDate.getTime() +
          schedule.hours * 60 * 60 * 1000
        );

        const existing = await prisma.followUp.findFirst({
          where: {
            opportunityId: opportunity.id,
            notes: schedule.notes,
          },
        });

        const data = {
          opportunityId: opportunity.id,
          assignedToId: opportunity.assignedToId,
          dueAt,
          status: "PENDING",
          notes: schedule.notes,
        };

        if (existing) {
          await prisma.followUp.update({
            where: { id: existing.id },
            data,
          });
        } else {
          await prisma.followUp.create({ data });
        }
      }
    }

    // =====================================
    // 5. ACTIVITIES
    // =====================================

    console.log("Seeding Activities...");

    const activityTemplates = [
      {
        type: "CALL",
        description: "Called the customer to discuss project requirements and service needs.",
      },
      {
        type: "EMAIL",
        description: "Sent the customer a project estimate and service details by email.",
      },
      {
        type: "MEETING",
        description: "Discussed project scope, pricing, and expected completion timeline.",
      },
      {
        type: "NOTE",
        description: "Customer is interested. Waiting for confirmation before proceeding.",
      },
      {
        type: "FOLLOW_UP",
        description: "Followed up with the customer regarding the submitted estimate.",
      },
      {
        type: "STATUS_CHANGE",
        description: "Opportunity status reviewed and updated by the assigned salesperson.",
      },
    ];

    const allOpportunities = await prisma.opportunity.findMany();

    let activityCount = 0;

    for (const opportunity of allOpportunities) {
      const indexes = [
        (activityCount * 2) % activityTemplates.length,
        (activityCount * 2 + 1) % activityTemplates.length,
      ];

      for (const index of indexes) {
        const template = activityTemplates[index];

        const existing = await prisma.activity.findFirst({
          where: {
            opportunityId: opportunity.id,
            userId: opportunity.assignedToId,
            type: template.type,
            description: template.description,
          },
        });

        const data = {
          opportunityId: opportunity.id,
          userId: opportunity.assignedToId,
          type: template.type,
          description: template.description,
        };

        if (existing) {
          await prisma.activity.update({
            where: { id: existing.id },
            data,
          });
        } else {
          await prisma.activity.create({ data });
        }
      }

      activityCount++;
    }

    // =====================================
    // 6. SALES
    // =====================================

    console.log("Seeding Sales...");

    const wonOpportunities = await prisma.opportunity.findMany({
      where: {
        status: "WON",
      },
    });

    let salesCount = 0;

    for (const opportunity of wonOpportunities) {
      if (!opportunity.closedById) {
        throw new Error(
          `Closing Salesman missing for: ${opportunity.title}`
        );
      }

      const serviceTitanJobId = `ST-JOB-${opportunity.id}`;

      const saleData = {
        opportunityId: opportunity.id,
        closedById: opportunity.closedById,
        saleValue: opportunity.value,
        source: opportunity.source,
        closedAt: opportunity.closedAt || new Date(),
        serviceTitanJobId,
      };

      const existingSale = await prisma.sale.findFirst({
        where: {
          opportunityId: opportunity.id,
        },
      });

      if (existingSale) {
        await prisma.sale.update({
          where: { id: existingSale.id },
          data: saleData,
        });
      } else {
        await prisma.sale.create({
          data: saleData,
        });
      }

      salesCount++;

      console.log(`Sale processed: ${opportunity.title}`);
    }

    // =====================================
    // FINAL SUMMARY
    // =====================================

    console.log("---------------------------------");
    console.log("ALL SEED DATA COMPLETED!");
    console.log("5 Salesmen");
    console.log("10 Customers");
    console.log("15 Opportunities");
    console.log(`${openOpportunities.length * 3} FollowUps`);
    console.log("30 Activities");
    console.log(`${salesCount} Sales`);
    console.log("---------------------------------");

  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
