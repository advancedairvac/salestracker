import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // This diagnostic intentionally reaches PostgreSQL directly so it reports
    // the live connection state rather than a cached application read.
    const result = await prisma.$queryRaw`
      SELECT current_database() AS database
    `;

    return Response.json({
      success: true,
      message: "Prisma connection successful!",
      database: result[0].database,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 },
    );
  }
}
