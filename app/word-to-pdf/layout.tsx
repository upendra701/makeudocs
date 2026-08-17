import type { Metadata } from "next";
import { BreadcrumbStructuredData } from "../components/BreadcrumbStructuredData";

export const metadata: Metadata = {
  title: "Word to PDF Converter – Free Online | MakeUdocs",
  description:
    "Convert DOCX files to PDF online for free with MakeUdocs. Preview your Word document and download a submission-ready PDF directly in your browser.",
  alternates: {
    canonical: "/word-to-pdf",
  },
  openGraph: {
    title: "Word to PDF Converter – Free Online | MakeUdocs",
    description:
      "Convert DOCX files to PDF online with MakeUdocs. Preview your Word document and download a submission-ready PDF directly in your browser.",
    url: "/word-to-pdf",
    type: "website",
    siteName: "MakeUdocs",
  },
  twitter: {
    card: "summary",
    title: "Word to PDF Converter – Free Online | MakeUdocs",
    description:
      "Convert DOCX files to PDF online with MakeUdocs. Preview your Word document and download a submission-ready PDF directly in your browser.",
  },
};

export default function WordToPdfLayout({
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
            name: "Word to PDF",
            url: "https://makeudocs.com/word-to-pdf",
          },
        ]}
      />

      {children}
    </>
  );
}