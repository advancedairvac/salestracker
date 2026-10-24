
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma/client.js";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

try {
  const result = await prisma.$queryRaw`
    SELECT current_database() AS database
  `;

  console.log("Prisma connection successful!");
  console.log("Database:", result[0].database);
} catch (error) {
  console.error("Prisma connection failed:", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
