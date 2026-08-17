import type { Metadata } from "next";
import Link from "next/link";
import { SiteStructuredData } from "./components/SiteStructuredData";

export const metadata: Metadata = {
  title: "Free Online PDF & Document Tools",
  description:
    "Free online tools to convert Word to PDF, images to PDF, merge and compress PDFs, convert PDF pages to images, and create passport-size photos. No sign-up required.",
  alternates: {
    canonical: "https://makeudocs.com/",
  },
  openGraph: {
    type: "website",
    url: "https://makeudocs.com/",
    title: "Free Online PDF & Document Tools | MakeUdocs",
    description:
      "Convert, merge and compress PDFs, convert Word and images to PDF, extract PDF pages as images, and create passport-size photos online for free.",
    siteName: "MakeUdocs",
  },
  twitter: {
    card: "summary",
    title: "Free Online PDF & Document Tools | MakeUdocs",
    description:
      "Free browser-based tools for Word to PDF, Image to PDF, PDF tools and passport-size photos.",
  },
};

const tools = [
  {
    icon: "📷",
    title: "Image to PDF",
    description: "Convert JPG, PNG and images to PDF",
    href: "/image-to-pdf",
    iconBg: "bg-blue-100",
    featured: true,
  },
  {
    icon: "📄",
    title: "Word to PDF",
    description: "Convert DOCX files to PDF",
    href: "/word-to-pdf",
    iconBg: "bg-sky-100",
  },
  {
    icon: "🖼️",
    title: "PDF to Images",
    description: "Extract pages from PDF as images",
    href: "/pdf-to-images",
    iconBg: "bg-purple-100",
  },
  {
    icon: "🗜️",
    title: "Compress PDF",
    description: "Reduce PDF file size with high quality",
    href: "/compress-pdf",
    iconBg: "bg-emerald-100",
  },
  {
    icon: "📑",
    title: "Merge PDF",
    description: "Combine multiple PDFs into one",
    href: "/merge-pdf",
    iconBg: "bg-orange-100",
  },
  {
    icon: "🪪",
    title: "Passport Photo Maker",
    description: "Create passport size photos and compress",
    href: "/passport-photo",
    iconBg: "bg-pink-100",
  },
];

export default function Home() {
  return (
    <>
      <SiteStructuredData />

      <main className="min-h-screen bg-white text-zinc-900">
      {/* Header */}
      <header className="border-b border-zinc-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-[27px] font-extrabold tracking-tight text-zinc-950"
          >
            Make<span className="text-blue-600">Udocs</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-600">
              <span>🛡️</span>
              100% Free
            </span>

            <span className="rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-600">
              6 Free Tools
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-blue-50/20 to-white px-6 pb-10 pt-12">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-blue-100/40 blur-3xl" />

        <div className="relative mx-auto max-w-5xl text-center">
          <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-blue-600">
            Simple Document Tools
          </p>

          <h1 className="mt-4 text-5xl font-extrabold leading-[1.02] tracking-tight text-zinc-950 sm:text-6xl">
            Make your documents
            <span className="block text-blue-600">
              submission ready.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-zinc-600 sm:text-lg">
            Convert, edit, compress, merge and prepare your documents and
            photos — directly in your browser.
          </p>

          <div className="mx-auto mt-7 grid max-w-3xl gap-3 sm:grid-cols-3">
            <TrustCard
              icon="🛡️"
              title="100% Free"
              description="Always free, forever"
              color="text-emerald-600"
            />

            <TrustCard
              icon="🔒"
              title="Private"
              description="Your files stay on your device"
              color="text-blue-600"
            />

            <TrustCard
              icon="🛡️"
              title="Secure"
              description="No uploads, completely safe"
              color="text-blue-600"
            />
          </div>
        </div>
      </section>

      {/* Toolkit */}
      <section className="px-6 pb-6 pt-2">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wider text-blue-600">
                Your Toolkit
              </p>

              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-950">
                Everything you need
              </h2>

              <p className="mt-1.5 text-sm text-zinc-500">
                Simple tools for assignments, applications and everyday
                document preparation.
              </p>
            </div>

            <div className="sm:text-right">
              <p className="text-sm font-bold text-blue-600">
                🎁 All 6 tools are completely free
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                No sign up. No limits. No hidden charges.
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {tools.map((tool) => (
              <ToolCard key={tool.href} {...tool} />
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-6 pb-5 pt-2">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-2xl border border-zinc-200 bg-blue-50/40 md:grid-cols-3">
          <BenefitCard
            icon="🛡️"
            title="Your files stay in your browser"
            description="MakeUdocs works locally in your browser. Your files never leave your device."
            color="text-blue-600"
          />

          <BenefitCard
            icon="⚡"
            title="Fast & Easy"
            description="No uploading, no waiting. Get results instantly."
            color="text-emerald-600"
            bordered
          />

          <BenefitCard
            icon="🎓"
            title="Built for Students"
            description="Perfect for assignments, applications, forms and everyday document needs."
            color="text-purple-600"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 bg-white px-6 pb-6 pt-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Link
                href="/"
                className="text-2xl font-extrabold tracking-tight text-zinc-950"
              >
                Make<span className="text-blue-600">Udocs</span>
              </Link>

              <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-500">
                Simple document and photo tools for students and everyday
                document preparation.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-zinc-950">
                Tools
              </h3>

              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-zinc-500">
                {tools.map((tool) => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="transition hover:text-blue-600"
                  >
                    {tool.title}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-zinc-950">
                Support
              </h3>

              <div className="mt-3 flex flex-col items-start gap-2 text-sm text-zinc-500">
                <Link
                  href="/about"
                  className="transition hover:text-blue-600"
                >
                  About MakeUdocs
                </Link>

                <Link
                  href="/contact"
                  className="transition hover:text-blue-600"
                >
                  Contact Us
                </Link>

                <Link
                  href="/report-issue"
                  className="transition hover:text-blue-600"
                >
                  Report an Issue
                </Link>

                <a
                  href="mailto:support@makeudocs.com"
                  className="transition hover:text-blue-600"
                >
                  support@makeudocs.com
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-zinc-950">
                Legal
              </h3>

              <div className="mt-3 flex flex-col items-start gap-2 text-sm text-zinc-500">
                <Link
                  href="/privacy"
                  className="transition hover:text-blue-600"
                >
                  Privacy Policy
                </Link>

                <Link
                  href="/terms"
                  className="transition hover:text-blue-600"
                >
                  Terms of Use
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-zinc-100 pt-5 text-xs text-zinc-400 sm:flex-row">
            <p>
              Made with <span className="text-blue-600">♥</span> for students
              and professionals everywhere.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://makeudocs.com"
                className="font-semibold text-zinc-500 transition hover:text-blue-600"
              >
                makeudocs.com
              </a>

              <span className="text-zinc-300">|</span>

              <p>© 2026 MakeUdocs. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </main>
    </>
  );
}

function TrustCard({
  icon,
  title,
  description,
  color,
}: {
  icon: string;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-3.5 text-left shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`text-xl ${color}`} aria-hidden="true">
          {icon}
        </span>

        <div>
          <p className="text-sm font-extrabold text-zinc-900">{title}</p>
          <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

function ToolCard({
  icon,
  title,
  description,
  href,
  iconBg,
  featured,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
  iconBg: string;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex min-h-[194px] flex-col rounded-2xl border p-4 transition duration-200 hover:-translate-y-1 hover:shadow-lg ${
        featured
          ? "border-blue-300 bg-blue-50/70"
          : "border-zinc-200 bg-white hover:border-blue-200"
      }`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${iconBg}`}
        >
          {icon}
        </div>

        {featured && (
          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-extrabold text-blue-600">
            Popular
          </span>
        )}
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-extrabold leading-5 text-zinc-950">
          {title}
        </h3>

        <p className="mt-1.5 text-xs leading-5 text-zinc-500">
          {description}
        </p>
      </div>

      <p className="mt-auto pt-5 text-xs font-extrabold text-blue-600">
        Open tool
        <span className="ml-1 transition-transform group-hover:inline-block group-hover:translate-x-1">
          →
        </span>
      </p>
    </Link>
  );
}

function BenefitCard({
  icon,
  title,
  description,
  color,
  bordered,
}: {
  icon: string;
  title: string;
  description: string;
  color: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-4 p-5 ${
        bordered ? "border-y border-zinc-200 md:border-x md:border-y-0" : ""
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm ${color}`}
      >
        {icon}
      </div>

      <div>
        <h3 className={`text-sm font-extrabold ${color}`}>{title}</h3>

        <p className="mt-1 text-xs leading-5 text-zinc-500">
          {description}
        </p>
      </div>
    </div>
  );
}