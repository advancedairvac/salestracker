
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
    annualGoal: 120000,
    quarterlyGoal: 30000,
    monthlyGoal: 10000,
  },
  {
    name: "Easton Meier",
    username: "easton.meier",
    email: "easton.meier@advanced-sales-tracker.com",
    role: "SALESPERSON",
    title: "Director of Operations",
    annualGoal: 92000,
    quarterlyGoal: 23000,
    monthlyGoal: 7666.67,
  },
  {
    name: "David Garcia",
    username: "david.garcia",
    email: "david.garcia@advanced-sales-tracker.com",
    role: "SALESPERSON",
    title: "Imperial Valley",
    annualGoal: 80000,
    quarterlyGoal: 20000,
    monthlyGoal: 6666.67,
  },
  {
    name: "David Hunt",
    username: "david.hunt",
    email: "david.hunt@advanced-sales-tracker.com",
    role: "SALESPERSON",
    title: "Account Advisor AZ/NV",
    annualGoal: 100000,
    quarterlyGoal: 25000,
    monthlyGoal: 8333.33,
  },
  {
    name: "Brian Rosas",
    username: "brian.rosas",
    email: "brian.rosas@advanced-sales-tracker.com",
    role: "SALESPERSON",
    title: "Automotive",
    annualGoal: 75000,
    quarterlyGoal: 18750,
    monthlyGoal: 6250,
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
        isActive: true,
      },
      create: {
        ...data,
        username,
        passwordHash,
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
