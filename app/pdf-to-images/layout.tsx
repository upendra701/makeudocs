import type { Metadata } from "next";
import { BreadcrumbStructuredData } from "../components/BreadcrumbStructuredData";
import ToolSeoContent from "../components/ToolSeoContent";

export const metadata: Metadata = {
  title: "PDF to Images Converter – Convert PDF Pages to PNG",
  description: "Convert PDF pages to PNG images online for free with MakeUdocs. Render every PDF page in your browser and download individual images, all pages, or a ZIP file.",
  alternates: { canonical: "https://makeudocs.com/pdf-to-images" },
  openGraph: { type: "website", url: "https://makeudocs.com/pdf-to-images", siteName: "MakeUdocs", title: "PDF to Images Converter – Convert PDF Pages to PNG", description: "Convert PDF pages to PNG images online for free. Download individual pages, all images, or a ZIP file directly from your browser." },
  twitter: { card: "summary", title: "PDF to Images Converter – Convert PDF Pages to PNG", description: "Convert PDF pages to PNG images online for free with MakeUdocs. Render every PDF page in your browser and download individual images, all pages, or a ZIP file." },
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <BreadcrumbStructuredData items={[{ name: "MakeUdocs", url: "https://makeudocs.com/" }, { name: "PDF to Images", url: "https://makeudocs.com/pdf-to-images" }]} />
      {children}
      <div className="mx-auto max-w-6xl px-6 pb-12">
        <ToolSeoContent
          intro="MakeUdocs PDF to Images converts the pages of a PDF into PNG images directly in your browser. You can preview the rendered pages, download individual pages, download all pages, or package the images into a ZIP file."
          benefits={["Convert PDF pages into PNG images.", "Preview every rendered page before downloading.", "Download individual PNG pages.", "Download all rendered pages or create a ZIP file.", "Process the PDF in your browser.", "Render pages sequentially to keep browser memory use more manageable for larger PDFs."]}
          steps={["Select the PDF you want to convert.", "Wait while MakeUdocs loads and renders the PDF pages.", "Review the page previews and choose individual downloads, Download All, or Download as ZIP.", "Save the PNG images or ZIP file to your device."]}
          faq={[
            { question: "What image format does the tool create?", answer: "The current download workflow creates PNG images for the PDF pages." },
            { question: "Can I download just one page?", answer: "Yes. Each rendered page has its own Download PNG button." },
            { question: "Can I download all pages together?", answer: "Yes. You can download all pages individually or create a ZIP file containing the PNG images." },
            { question: "Are my PDF files uploaded to MakeUdocs?", answer: "The conversion workflow is designed to load and render the selected PDF in your browser rather than requiring a MakeUdocs conversion server." },
          ]}
          related={[{ name: "Word to PDF", href: "/word-to-pdf" }, { name: "Image to PDF", href: "/image-to-pdf" }, { name: "Compress PDF", href: "/compress-pdf" }, { name: "Merge PDF", href: "/merge-pdf" }]}
        />
      </div>
    </>
  );
}
