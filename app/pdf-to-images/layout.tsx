import type { Metadata } from "next";
import { BreadcrumbStructuredData } from "../components/BreadcrumbStructuredData";

export const metadata: Metadata = {
  title: "PDF to Images Converter – Convert PDF Pages to PNG",
  description:
    "Convert PDF pages to PNG images online for free with MakeUdocs. Render every PDF page in your browser and download individual images, all pages, or a ZIP file.",
  alternates: {
    canonical: "https://makeudocs.com/pdf-to-images",
  },
  openGraph: {
    type: "website",
    url: "https://makeudocs.com/pdf-to-images",
    siteName: "MakeUdocs",
    title: "PDF to Images Converter – Convert PDF Pages to PNG",
    description:
      "Convert PDF pages to PNG images online for free. Download individual pages, all images, or a ZIP file directly from your browser.",
  },
  twitter: {
    card: "summary",
    title: "PDF to Images Converter – Convert PDF Pages to PNG",
    description:
      "Convert PDF pages to PNG images online for free with MakeUdocs. Render every PDF page in your browser and download individual images, all pages, or a ZIP file.",
  },
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <BreadcrumbStructuredData
        items={[
          {
            name: "MakeUdocs",
            url: "https://makeudocs.com/",
          },
          {
            name: "PDF to Images",
            url: "https://makeudocs.com/pdf-to-images",
          },
        ]}
      />

      {children}
    </>
  );
}