
import { NextResponse } from "next/server";

import { serviceTitanRequest } from "@/lib/integrations/servicetitan";

export const dynamic = "force-dynamic";

// ============================================
// SERVICETITAN TAG TYPES TEST API
// ============================================

export async function GET() {
  try {
    const startTime = performance.now();

    // Fetch all ServiceTitan Tag Types
    const result = await serviceTitanRequest(
      "/settings/v2/tenant/{tenant}/tag-types",
    );

    const duration = Number(
      ((performance.now() - startTime) / 1000).toFixed(2),
    );

    const tags = Array.isArray(result?.data)
      ? result.data
      : [];

    // ============================================
    // ANALYZE TAG DATA
    // ============================================

    const analysis = {
      totalTags: tags.length,

      activeTags: tags.filter(
        (tag) => tag.active === true,
      ).length,

      inactiveTags: tags.filter(
        (tag) => tag.active === false,
      ).length,

      uniqueFields: [
        ...new Set(
          tags.flatMap((tag) => Object.keys(tag || {})),
        ),
      ],

      tagId202: tags.find(
        (tag) => Number(tag.id) === 202,
      ) || null,

      onlineTags: tags.filter((tag) =>
        /online/i.test(tag.name || ""),
      ),

      shopifyTags: tags.filter((tag) =>
        /shopify/i.test(tag.name || ""),
      ),

      ebayTags: tags.filter((tag) =>
        /ebay/i.test(tag.name || ""),
      ),
    };

    // ============================================
    // API RESPONSE
    // ============================================

    return NextResponse.json({
      success: true,

      environment:
        process.env.SERVICETITAN_ENV || "integration",

      endpoint: "Settings API /tag-types",

      fetchDurationSeconds: duration,

      summary: analysis,

      tags,

    });
  } catch (error) {
    console.error(
      "[ServiceTitan Tag Types Test API]",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error.message ||
          "Unable to fetch ServiceTitan Tag Types.",
      },
      {
        status: 500,
      },
    );
  }
}
