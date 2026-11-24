import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env";

// Read NEXT_PUBLIC_APP_URL / VERCEL_* at request time (Docker images are built without them).
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getAppUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/docs", "/login", "/privacy", "/terms"],
      disallow: ["/api/", "/dashboard"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
