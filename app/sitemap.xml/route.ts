const baseUrl = "https://makeudocs.com";

// Keep the sitemap focused on pages that are intended to attract organic
// search traffic. Legal/support pages remain crawlable through internal links
// but do not need to compete for crawl attention in the XML sitemap.
const routes = [
  "",
  "/image-to-pdf",
  "/word-to-pdf",
  "/pdf-to-images",
  "/compress-pdf",
  "/merge-pdf",
  "/passport-photo",
];

export function GET() {
  const urls = routes
    .map(
      (route) => `
  <url>
    <loc>${baseUrl}${route}</loc>
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
