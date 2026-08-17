import type { Metadata } from "next";
import { BreadcrumbStructuredData } from "../components/BreadcrumbStructuredData";

export const metadata: Metadata = {
  title: "Merge PDF Online – Combine Multiple PDF Files",
  description:
    "Merge multiple PDF files into one document online for free with MakeUdocs. Add PDFs, arrange their order, combine them in your browser, and download the merged file.",
  alternates: {
    canonical: "https://makeudocs.com/merge-pdf",
  },
  openGraph: {
    type: "website",
    url: "https://makeudocs.com/merge-pdf",
    siteName: "MakeUdocs",
    title: "Merge PDF Online – Combine Multiple PDF Files",
    description:
      "Combine multiple PDF files into one document online for free. Arrange your files and merge them directly in your browser.",
  },
  twitter: {
    card: "summary",
    title: "Merge PDF Online – Combine Multiple PDF Files",
    description:
      "Merge multiple PDF files into one document online for free with MakeUdocs. Add PDFs, arrange their order, combine them in your browser, and download the merged file.",
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
            name: "Merge PDF",
            url: "https://makeudocs.com/merge-pdf",
          },
        ]}
      />

      {children}
    </>
  );
}