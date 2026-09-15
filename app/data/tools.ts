export type ToolCategory = "PDF Tools" | "Convert" | "Image Tools" | "AI Tools" | "Business Tools";

export type Tool = {
  name: string;
  description: string;
  href: string;
  category: ToolCategory;
  status?: "available" | "coming-soon";
};

export const tools: Tool[] = [
  { name: "Image to PDF", description: "Convert JPG, PNG and other images to PDF in your browser.", href: "/image-to-pdf", category: "Convert", status: "available" },
  { name: "Word to PDF", description: "Convert DOCX documents to PDF.", href: "/word-to-pdf", category: "Convert", status: "available" },
  { name: "PDF to Images", description: "Turn PDF pages into downloadable images.", href: "/pdf-to-images", category: "Convert", status: "available" },
  { name: "Compress PDF", description: "Reduce PDF file size while keeping useful quality.", href: "/compress-pdf", category: "PDF Tools", status: "available" },
  { name: "Merge PDF", description: "Combine multiple PDF files into one document.", href: "/merge-pdf", category: "PDF Tools", status: "available" },
  { name: "Split PDF", description: "Split a PDF into separate files or selected page ranges.", href: "/split-pdf", category: "PDF Tools", status: "available" },
  { name: "Rotate PDF", description: "Rotate PDF pages and save a corrected document.", href: "/rotate-pdf", category: "PDF Tools", status: "available" },
  { name: "Passport Photo Maker", description: "Create passport-size photos for common document needs.", href: "/passport-photo", category: "Image Tools", status: "available" },
  { name: "PDF to Word", description: "Convert PDF documents into editable Word files.", href: "/pdf-to-word", category: "Convert", status: "available" },
  { name: "JPG to PNG", description: "Convert JPG images to PNG format with optional background removal and manual erase/restore tools.", href: "/jpg-to-png", category: "Image Tools", status: "available" },
  { name: "Edit PDF", description: "Edit PDF text using detected font styling and add text directly on pages.", href: "/edit-pdf", category: "PDF Tools", status: "coming-soon" },
  { name: "PDF to Excel", description: "Extract useful PDF tables into Excel format.", href: "/pdf-to-excel", category: "Convert", status: "coming-soon" },
  { name: "PDF to PowerPoint", description: "Convert PDF content into presentation slides.", href: "/pdf-to-ppt", category: "Convert", status: "coming-soon" },
  { name: "PNG to JPG", description: "Convert PNG images to JPG format.", href: "/png-to-jpg", category: "Image Tools", status: "coming-soon" },
  { name: "Image Compressor", description: "Reduce image file size for sharing and uploads.", href: "/compress-image", category: "Image Tools", status: "coming-soon" },
  { name: "OCR", description: "Extract text from scanned documents and images.", href: "/ocr", category: "AI Tools", status: "coming-soon" },
  { name: "Chat with PDF", description: "Ask questions and get answers from your documents.", href: "/chat-pdf", category: "AI Tools", status: "coming-soon" },
  { name: "AI PDF Summarizer", description: "Create clear summaries from long documents.", href: "/ai-pdf-summarizer", category: "AI Tools", status: "coming-soon" },
  { name: "Invoice Generator", description: "Create professional invoices and export them to PDF.", href: "/invoice-generator", category: "Business Tools", status: "coming-soon" },
  { name: "Quotation Generator", description: "Create simple business quotations and export them to PDF.", href: "/quotation-generator", category: "Business Tools", status: "coming-soon" },
];

export const availableTools = tools.filter((tool) => tool.status === "available");
export const comingSoonTools = tools.filter((tool) => tool.status === "coming-soon");

export const megaMenuGroups = {
  "PDF Tools": ["Edit PDF", "Merge PDF", "Split PDF", "Compress PDF", "Rotate PDF"],
  Convert: ["Image to PDF", "Word to PDF", "PDF to Images", "PDF to Word", "PDF to Excel", "PDF to PowerPoint"],
  "Image Tools": ["Passport Photo Maker", "JPG to PNG", "PNG to JPG", "Image Compressor"],
  "AI Tools": ["OCR", "Chat with PDF", "AI PDF Summarizer"],
  "Business Tools": ["Invoice Generator", "Quotation Generator"],
} as const;
