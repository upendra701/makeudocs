import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Word to PDF Converter – Free Online DOCX to PDF | MakeUdocs",
  description:
    "Convert Word DOCX files to PDF online for free. Preview, edit visible text, and download your PDF with MakeUdocs. Your document is processed locally in your browser.",
  alternates: {
    canonical: "https://makeudocs.com/word-to-pdf",
  },
  openGraph: {
    type: "website",
    url: "https://makeudocs.com/word-to-pdf",
    siteName: "MakeUdocs",
    title: "Word to PDF Converter – Free Online DOCX to PDF | MakeUdocs",
    description:
      "Convert Word DOCX files to PDF online for free. Preview, edit visible text, and download your PDF with MakeUdocs.",
  },
  twitter: {
    card: "summary",
    title: "Word to PDF Converter – Free Online DOCX to PDF | MakeUdocs",
    description:
      "Convert Word DOCX files to PDF online for free. Preview, edit visible text, and download your PDF with MakeUdocs. Your document is processed locally in your browser.",
  },
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
