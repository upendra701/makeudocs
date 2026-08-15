import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://makeudocs.com"),

  title: {
    default: "MakeUdocs – Free Online Document Tools",
    template: "%s | MakeUdocs",
  },

  description:
    "Free online tools to convert, merge and compress PDFs, convert Word documents, turn PDF pages into images, and create passport-style photos.",

  applicationName: "MakeUdocs",

  keywords: [
    "MakeUdocs",
    "PDF tools",
    "free PDF tools",
    "image to PDF",
    "Word to PDF",
    "PDF to images",
    "compress PDF",
    "merge PDF",
    "passport photo maker",
  ],

  alternates: {
    canonical: "https://makeudocs.com",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  openGraph: {
    type: "website",
    url: "https://makeudocs.com",
    siteName: "MakeUdocs",
    title: "MakeUdocs – Free Online Document Tools",
    description:
      "Simple tools for PDF conversion, compression, merging, PDF images and passport-style photos.",
  },

  twitter: {
    card: "summary",
    title: "MakeUdocs – Free Online Document Tools",
    description:
      "Simple tools for PDF conversion, compression, merging, PDF images and passport-style photos.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
