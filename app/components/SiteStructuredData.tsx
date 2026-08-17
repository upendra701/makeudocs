export function SiteStructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://makeudocs.com/#website",
        name: "MakeUdocs",
        alternateName: "makeudocs.com",
        url: "https://makeudocs.com/",
      },
      {
        "@type": "Organization",
        "@id": "https://makeudocs.com/#organization",
        name: "MakeUdocs",
        url: "https://makeudocs.com/",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData),
      }}
    />
  );
}