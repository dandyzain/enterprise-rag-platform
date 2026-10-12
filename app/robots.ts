import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/docs", "/login"],
      disallow: ["/api/"],
    },
    sitemap: "http://localhost:3000/sitemap.xml",
  };
}
