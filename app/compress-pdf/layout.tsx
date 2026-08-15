import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compress PDF Online – Reduce PDF File Size",
  description:
    "Compress PDF files online for free with MakeUdocs. Reduce PDF file size with balanced, strong, or maximum compression directly in your browser.",
  alternates: {
    canonical: "https://makeudocs.com/compress-pdf",
  },
  openGraph: {
    type: "website",
    url: "https://makeudocs.com/compress-pdf",
    siteName: "MakeUdocs",
    title: "Compress PDF Online – Reduce PDF File Size",
    description:
      "Reduce PDF file size online for free with MakeUdocs. Choose your compression level and download a smaller PDF directly in your browser.",
  },
  twitter: {
    card: "summary",
    title: "Compress PDF Online – Reduce PDF File Size",
    description:
      "Compress PDF files online for free with MakeUdocs. Reduce PDF file size with balanced, strong, or maximum compression directly in your browser.",
  },
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
