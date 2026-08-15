import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Passport Photo Maker – Create Passport Size Photos Online",
  description:
    "Create passport-style photos online for free with MakeUdocs. Upload, crop, resize, adjust and compress your photo for common passport photo sizes directly in your browser.",
  alternates: {
    canonical: "https://makeudocs.com/passport-photo",
  },
  openGraph: {
    type: "website",
    url: "https://makeudocs.com/passport-photo",
    siteName: "MakeUdocs",
    title: "Passport Photo Maker – Create Passport Size Photos Online",
    description:
      "Create passport-style photos online for free. Crop, resize, adjust and compress your photo directly in your browser.",
  },
  twitter: {
    card: "summary",
    title: "Passport Photo Maker – Create Passport Size Photos Online",
    description:
      "Create passport-style photos online for free with MakeUdocs. Upload, crop, resize, adjust and compress your photo for common passport photo sizes directly in your browser.",
  },
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
