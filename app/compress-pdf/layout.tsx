import type { Metadata } from "next";
import { BreadcrumbStructuredData } from "../components/BreadcrumbStructuredData";
import ToolSeoContent from "../components/ToolSeoContent";

export const metadata: Metadata = {
  title: "Compress PDF Online – Reduce PDF File Size",
  description: "Compress PDF files online for free with MakeUdocs. Reduce PDF file size with balanced, strong, or maximum compression directly in your browser.",
  alternates: { canonical: "https://makeudocs.com/compress-pdf" },
  openGraph: { type: "website", url: "https://makeudocs.com/compress-pdf", siteName: "MakeUdocs", title: "Compress PDF Online – Reduce PDF File Size", description: "Reduce PDF file size online for free with MakeUdocs. Choose your compression level and download a smaller PDF directly in your browser." },
  twitter: { card: "summary", title: "Compress PDF Online – Reduce PDF File Size", description: "Compress PDF files online for free with MakeUdocs. Reduce PDF file size with balanced, strong, or maximum compression directly in your browser." },
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <BreadcrumbStructuredData items={[{ name: "MakeUdocs", url: "https://makeudocs.com/" }, { name: "Compress PDF", url: "https://makeudocs.com/compress-pdf" }]} />
      {children}
      <div className="mx-auto max-w-5xl px-6 pb-12">
        <ToolSeoContent
          intro="MakeUdocs Compress PDF reduces the size of a PDF directly in your browser. You can choose balanced, strong, or maximum compression and download the result when it is actually smaller than the original file."
          benefits={["Choose from three compression levels.", "See the original and compressed file sizes.", "The tool avoids returning a larger file as a compression result.", "View compression progress while pages are processed.", "Process the PDF directly in your browser.", "Download the compressed PDF with a clean file name."]}
          steps={["Select the PDF you want to reduce.", "Choose Balanced, Strong, or Maximum compression.", "Start compression and wait while the pages are processed.", "Review the size reduction and download the smaller PDF."]}
          faq={[
            { question: "Which compression level should I choose?", answer: "Balanced is a good starting point when you want useful size reduction while retaining more quality. Strong and Maximum can produce smaller files with more quality reduction." },
            { question: "Will MakeUdocs return a larger PDF?", answer: "The current compression workflow checks the generated result and does not offer it as the final compressed file when it is not smaller than the original." },
            { question: "Does compression happen in my browser?", answer: "Yes. The compression workflow processes the selected PDF in the browser rather than requiring a MakeUdocs upload server." },
            { question: "Can I see how much the PDF was reduced?", answer: "Yes. After successful compression, the tool shows the original size, compressed size, and reduction percentage." },
          ]}
          related={[{ name: "Word to PDF", href: "/word-to-pdf" }, { name: "Merge PDF", href: "/merge-pdf" }, { name: "Image to PDF", href: "/image-to-pdf" }, { name: "PDF to Images", href: "/pdf-to-images" }]}
        />
      </div>
    </>
  );
}
