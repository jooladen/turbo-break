import type { MetadataRoute } from "next";

const BASE_URL = "https://turbo-break.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/login", "/signup"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
