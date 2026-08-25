import type { Metadata } from "next";
import { BreadcrumbStructuredData } from "../components/BreadcrumbStructuredData";
import ToolSeoContent from "../components/ToolSeoContent";

export const metadata: Metadata = {
  title: "Word to PDF Converter – Free Online | MakeUdocs",
  description: "Convert DOCX files to PDF online for free with MakeUdocs. Preview your Word document and download a submission-ready PDF directly in your browser.",
  alternates: { canonical: "/word-to-pdf" },
  openGraph: { title: "Word to PDF Converter – Free Online | MakeUdocs", description: "Convert DOCX files to PDF online with MakeUdocs. Preview your Word document and download a submission-ready PDF directly in your browser.", url: "/word-to-pdf", type: "website", siteName: "MakeUdocs" },
  twitter: { card: "summary", title: "Word to PDF Converter – Free Online | MakeUdocs", description: "Convert DOCX files to PDF online with MakeUdocs. Preview your Word document and download a submission-ready PDF directly in your browser." },
};

export default function WordToPdfLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <BreadcrumbStructuredData items={[{ name: "MakeUdocs", url: "https://makeudocs.com/" }, { name: "Word to PDF", url: "https://makeudocs.com/word-to-pdf" }]} />
      {children}
      <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
        <ToolSeoContent
          intro="MakeUdocs Word to PDF converts DOCX documents into PDF directly in your browser. You can preview the Word document, make supported edits, create an A4 PDF, review the generated result, and download the finished file."
          benefits={["Convert supported DOCX documents to PDF online for free.", "Preview your Word document before conversion.", "Make supported text and formatting edits before creating the PDF.", "Generate A4 PDF pages across multi-page documents.", "Review the generated PDF before downloading it.", "Process the conversion directly in your browser."]}
          steps={["Select a DOCX file from your device.", "Review the rendered document and make any supported edits.", "Click Convert to PDF to generate the A4 PDF.", "Review the PDF preview, choose a file name, and download it."]}
          faq={[
            { question: "Can I convert Word to PDF for free?", answer: "Yes. MakeUdocs provides a free Word to PDF converter for supported DOCX documents." },
            { question: "Can I convert a DOCX file to PDF?", answer: "Yes. The current Word to PDF tool accepts DOCX files and converts them into PDF documents." },
            { question: "Do I need Microsoft Word installed?", answer: "No. You can upload a supported DOCX document through your web browser and convert it to PDF with MakeUdocs." },
            { question: "Can I create an A4 PDF from a Word document?", answer: "Yes. The Word to PDF workflow generates A4 PDF pages and handles document pagination across multiple pages." },
            { question: "Will my document formatting be preserved?", answer: "MakeUdocs renders the Word document before creating the PDF and is designed to preserve the document layout and formatting." },
          ]}
          related={[{ name: "Image to PDF", href: "/image-to-pdf" }, { name: "Compress PDF", href: "/compress-pdf" }, { name: "Merge PDF", href: "/merge-pdf" }, { name: "PDF to Images", href: "/pdf-to-images" }, { name: "Passport Photo Maker", href: "/passport-photo" }]}
        />
      </div>
    </>
  );
}
