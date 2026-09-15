const baseUrl = "https://makeudocs.com";

// Keep the sitemap focused on important public pages and tool landing pages.
const routes = [
  "",
  "/tools",
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
