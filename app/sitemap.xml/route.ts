const baseUrl = "https://makeudocs.com";

const routes = [
  "",
  "/image-to-pdf",
  "/word-to-pdf",
  "/pdf-to-images",
  "/compress-pdf",
  "/merge-pdf",
  "/passport-photo",
  "/about",
  "/contact",
  "/report-issue",
  "/privacy",
  "/terms",
];

export function GET() {
  const urls = routes
    .map(
      (route) => `
  <url>
    <loc>${baseUrl}${route}</loc>
    <changefreq>${route === "" ? "weekly" : "monthly"}</changefreq>
    <priority>${route === "" ? "1.0" : "0.8"}</priority>
  </url>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}