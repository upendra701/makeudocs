import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Image to PDF Converter – Convert JPG & PNG to PDF",
  description:
    "Convert JPG and PNG images to PDF online for free with MakeUdocs. Upload multiple images, crop and rotate them, arrange pages, and create a PDF directly in your browser.",
  alternates: {
    canonical: "https://makeudocs.com/image-to-pdf",
  },
  openGraph: {
    type: "website",
    url: "https://makeudocs.com/image-to-pdf",
    siteName: "MakeUdocs",
    title: "Image to PDF Converter – Convert JPG & PNG to PDF",
    description:
      "Convert JPG and PNG images to PDF online for free. Crop, rotate, arrange and create your PDF directly in your browser.",
  },
  twitter: {
    card: "summary",
    title: "Image to PDF Converter – Convert JPG & PNG to PDF",
    description:
      "Convert JPG and PNG images to PDF online for free with MakeUdocs. Upload multiple images, crop and rotate them, arrange pages, and create a PDF directly in your browser.",
  },
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
