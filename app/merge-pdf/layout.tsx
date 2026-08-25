import type { Metadata } from "next";
import { BreadcrumbStructuredData } from "../components/BreadcrumbStructuredData";
import ToolSeoContent from "../components/ToolSeoContent";

export const metadata: Metadata = {
  title: "Merge PDF Online – Combine Multiple PDF Files",
  description:
    "Merge multiple PDF files into one document online for free with MakeUdocs. Add PDFs, arrange their order, combine them in your browser, and download the merged file.",
  alternates: { canonical: "https://makeudocs.com/merge-pdf" },
  openGraph: { type: "website", url: "https://makeudocs.com/merge-pdf", siteName: "MakeUdocs", title: "Merge PDF Online – Combine Multiple PDF Files", description: "Combine multiple PDF files into one document online for free. Arrange your files and merge them directly in your browser." },
  twitter: { card: "summary", title: "Merge PDF Online – Combine Multiple PDF Files", description: "Merge multiple PDF files into one document online for free with MakeUdocs. Add PDFs, arrange their order, combine them in your browser, and download the merged file." },
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <BreadcrumbStructuredData items={[{ name: "MakeUdocs", url: "https://makeudocs.com/" }, { name: "Merge PDF", url: "https://makeudocs.com/merge-pdf" }]} />
      {children}
      <div className="mx-auto max-w-5xl px-6 pb-12">
        <ToolSeoContent
          intro="MakeUdocs Merge PDF combines multiple PDF files into one document directly in your browser. You can add two or more PDFs, change their order, merge them, and download the resulting file."
          benefits={["Combine two or more PDF files into one document.", "Arrange PDF files before merging them.", "See the number of files, pages, and output size after merging.", "Choose a custom output file name.", "Process the merge directly in your browser.", "Download the finished merged PDF when it is ready."]}
          steps={["Select two or more PDF files.", "Use the move controls to put the files in the order you want.", "Click Merge PDFs and wait for the browser to create the document.", "Choose a file name and download the merged PDF."]}
          faq={[
            { question: "How many PDFs can I merge?", answer: "You can add multiple PDF files. The tool requires at least two PDFs before the merge can start." },
            { question: "Can I change the order of the PDFs?", answer: "Yes. Use the move controls beside each file to arrange the PDFs before merging." },
            { question: "Are my PDFs uploaded to a MakeUdocs server?", answer: "The merge workflow is designed to run in your browser, so the selected PDFs do not need to be uploaded to a MakeUdocs conversion server." },
            { question: "Can I rename the merged PDF?", answer: "Yes. After merging, you can enter the output file name before downloading the PDF." },
          ]}
          related={[{ name: "Word to PDF", href: "/word-to-pdf" }, { name: "Image to PDF", href: "/image-to-pdf" }, { name: "Compress PDF", href: "/compress-pdf" }, { name: "PDF to Images", href: "/pdf-to-images" }]}
        />
      </div>
    </>
  );
}
