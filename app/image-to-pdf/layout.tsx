import type { Metadata } from "next";
import { BreadcrumbStructuredData } from "../components/BreadcrumbStructuredData";
import ToolSeoContent from "../components/ToolSeoContent";

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
  return (
    <>
      <BreadcrumbStructuredData
        items={[
          { name: "MakeUdocs", url: "https://makeudocs.com/" },
          { name: "Image to PDF", url: "https://makeudocs.com/image-to-pdf" },
        ]}
      />
      {children}
      <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
        <ToolSeoContent
          intro="MakeUdocs Image to PDF lets you turn JPG and PNG images into a PDF directly in your browser. You can add multiple images, arrange their order, crop pages, rotate images, choose PDF quality, preview the result, and download the finished document."
          benefits={[
            "Convert multiple JPG or PNG images into one PDF.",
            "Crop and rotate images before creating the PDF.",
            "Arrange pages in the order you need.",
            "Choose PDF quality before generating the file.",
            "Work with your images directly in the browser.",
            "Preview the generated PDF before downloading it.",
          ]}
          steps={[
            "Select the JPG or PNG images you want to include.",
            "Arrange the images and use the editor to crop or rotate them when needed.",
            "Choose the PDF quality and create the PDF.",
            "Preview the result and download your finished PDF.",
          ]}
          faq={[
            { question: "Can I convert multiple images to one PDF?", answer: "Yes. You can select multiple JPG or PNG images and arrange them as pages in a single PDF." },
            { question: "Can I crop or rotate an image?", answer: "Yes. The Image to PDF tool includes editing controls for cropping and rotating images before PDF creation." },
            { question: "Do my images need to be uploaded to a server?", answer: "The tool is designed to process the images in your browser, so the conversion workflow does not require uploading them to a MakeUdocs conversion server." },
            { question: "Can I preview the PDF before downloading it?", answer: "Yes. After the PDF is generated, MakeUdocs provides a preview before you download the file." },
          ]}
          related={[
            { name: "Word to PDF", href: "/word-to-pdf" },
            { name: "Compress PDF", href: "/compress-pdf" },
            { name: "Merge PDF", href: "/merge-pdf" },
            { name: "PDF to Images", href: "/pdf-to-images" },
          ]}
        />
      </div>
    </>
  );
}
