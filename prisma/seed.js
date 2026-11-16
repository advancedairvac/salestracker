import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

const passwordHash = await bcrypt.hash("1234", 10);

const users = [
  {
    name: "Troy Hollinger",
    username: "admin",
    email: "admin@advanced-sales-tracker.com",
    role: "ADMIN",
    title: "CCO",
  },
  {
    name: "Easton Meier",
    username: "easton.meier",
    email: "easton.meier@advanced-sales-tracker.com",
    role: "SALESPERSON",
    title: "Director of Operations",
  },
  {
    name: "David Garcia",
    username: "david.garcia",
    email: "david.garcia@advanced-sales-tracker.com",
    role: "SALESPERSON",
    title: "Imperial Valley",
  },
  {
    name: "David Hunt",
    username: "david.hunt",
    email: "david.hunt@advanced-sales-tracker.com",
    role: "SALESPERSON",
    title: "Account Advisor AZ/NV",
  },
  {
    name: "Brian Rosas",
    username: "brian.rosas",
    email: "brian.rosas@advanced-sales-tracker.com",
    role: "SALESPERSON",
    title: "Automotive",
  },
];

async function main() {
  console.log("Starting demo user import...\n");

  for (const user of users) {
    const { username, ...data } = user;

    await prisma.user.upsert({
      where: { username },
      update: {
        ...data,
        passwordHash,
        monthlyGoal: 200000,
        quarterlyGoal: 600000,
        annualGoal: 2400000,
        isActive: true,
      },
      create: {
        ...data,
        username,
        passwordHash,
        monthlyGoal: 200000,
        quarterlyGoal: 600000,
        annualGoal: 2400000,
        isActive: true,
      },
    });

    console.log(`✓ Imported: ${user.name} (${user.role})`);
  }

  console.log("\nAll 5 demo users imported successfully!");
}

main()
  .catch((error) => {
    console.error("\nUser import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
