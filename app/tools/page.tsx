import type { Metadata } from "next";
import Link from "next/link";
import { availableTools, comingSoonTools, tools, type ToolCategory } from "../data/tools";

export const metadata: Metadata = {
  title: "All Tools – Free PDF, Document & Image Tools",
  description:
    "Explore free MakeUdocs tools for PDF conversion, document preparation, image processing and more. Browser-first tools with no sign-up required.",
  alternates: {
    canonical: "https://makeudocs.com/tools",
  },
  openGraph: {
    type: "website",
    url: "https://makeudocs.com/tools",
    title: "All Tools – Free PDF, Document & Image Tools | MakeUdocs",
    description:
      "Explore free MakeUdocs tools for PDF conversion, document preparation, image processing and more.",
    siteName: "MakeUdocs",
  },
};

const categories: ToolCategory[] = [
  "PDF Tools",
  "Convert",
  "Image Tools",
  "AI Tools",
  "Business Tools",
];

const categoryDescriptions: Record<ToolCategory, string> = {
  "PDF Tools": "Organize, optimize, edit and prepare PDF documents.",
  Convert: "Convert documents and images between useful formats.",
  "Image Tools": "Prepare, convert and optimize images for documents.",
  "AI Tools": "Smart document tools we are building next.",
  "Business Tools": "Simple tools for invoices and everyday business documents.",
};

function ToolIcon({ category }: { category: ToolCategory }) {
  const icon = {
    "PDF Tools": "▣",
    Convert: "↔",
    "Image Tools": "▧",
    "AI Tools": "✦",
    "Business Tools": "▤",
  }[category];

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-blue-600">
      {icon}
    </span>
  );
}

export default function ToolsPage() {
  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <section className="border-b border-zinc-100 bg-gradient-to-b from-blue-50/70 to-white px-6 pb-12 pt-12">
        <div className="mx-auto max-w-6xl">
          <Link href="/" className="text-sm font-bold text-blue-600 hover:underline">
            ← Back to MakeUdocs
          </Link>
          <p className="mt-8 text-sm font-extrabold uppercase tracking-[0.2em] text-blue-600">
            MakeUdocs Toolkit
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">
            Free PDF, document & image tools
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
            Everything in one place — from everyday PDF conversion and preparation to the new tools we are building for the MakeUdocs platform.
          </p>

          <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-emerald-50 px-3 py-2 text-emerald-700">{availableTools.length} available now</span>
            <span className="rounded-full bg-zinc-100 px-3 py-2 text-zinc-600">{comingSoonTools.length} coming soon</span>
            <span className="rounded-full bg-blue-50 px-3 py-2 text-blue-700">No sign-up required</span>
          </div>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl space-y-12">
          {categories.map((category) => {
            const categoryTools = tools.filter((tool) => tool.category === category);
            return (
              <section key={category} aria-labelledby={`${category}-heading`}>
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 id={`${category}-heading`} className="text-2xl font-extrabold tracking-tight text-zinc-950">
                      {category}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">{categoryDescriptions[category]}</p>
                  </div>
                  <span className="text-xs font-bold text-zinc-400">{categoryTools.length} tools</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryTools.map((tool) => {
                    const available = tool.status === "available";
                    const card = (
                      <div className={`flex h-full gap-3 rounded-2xl border p-4 transition ${available ? "border-zinc-200 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md" : "border-dashed border-zinc-200 bg-zinc-50/60"}`}>
                        <ToolIcon category={category} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={`text-sm font-extrabold ${available ? "text-zinc-950" : "text-zinc-700"}`}>
                              {tool.name}
                            </h3>
                            {!available && (
                              <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-zinc-500">
                                Coming soon
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 text-xs leading-5 text-zinc-500">{tool.description}</p>
                          <p className={`mt-3 text-xs font-extrabold ${available ? "text-blue-600" : "text-zinc-400"}`}>
                            {available ? "Open tool →" : "We are building this →"}
                          </p>
                        </div>
                      </div>
                    );

                    return available ? (
                      <Link key={tool.href} href={tool.href} aria-label={`Open ${tool.name}`}>
                        {card}
                      </Link>
                    ) : (
                      <div key={tool.href}>{card}</div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-zinc-100 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="font-extrabold text-zinc-900">
            Make<span className="text-blue-600">Udocs</span>
          </Link>
          <div className="flex gap-4">
            <Link href="/about" className="hover:text-blue-600">About</Link>
            <Link href="/contact" className="hover:text-blue-600">Contact</Link>
            <Link href="/privacy" className="hover:text-blue-600">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
