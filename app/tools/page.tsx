import type { Metadata } from "next";
import Link from "next/link";
import { availableTools, comingSoonTools, tools, type ToolCategory } from "../data/tools";

export const metadata: Metadata = {
  title: "All Tools – Free PDF, Document & Image Tools",
  description:
    "Explore free MakeUdocs tools for PDF conversion, document preparation, image processing and more. Browser-first tools with no sign-up required.",
  alternates: { canonical: "https://makeudocs.com/tools" },
  openGraph: {
    type: "website",
    url: "https://makeudocs.com/tools",
    title: "All Tools – Free PDF, Document & Image Tools | MakeUdocs",
    description: "Explore free MakeUdocs tools for PDF conversion, document preparation, image processing and more.",
    siteName: "MakeUdocs",
  },
};

const categories: ToolCategory[] = ["PDF Tools", "Convert", "Image Tools", "AI Tools", "Business Tools"];

const categoryDescriptions: Record<ToolCategory, string> = {
  "PDF Tools": "Organize, optimize and prepare your PDF documents.",
  Convert: "Move between documents, PDFs and image formats with ease.",
  "Image Tools": "Prepare images for documents, applications and everyday use.",
  "AI Tools": "Smart document features we are building next.",
  "Business Tools": "Simple document generators for everyday business work.",
};

const categoryIcons: Record<ToolCategory, string> = {
  "PDF Tools": "▣",
  Convert: "↔",
  "Image Tools": "▧",
  "AI Tools": "✦",
  "Business Tools": "▤",
};

function ToolIcon({ category, large = false }: { category: ToolCategory; large?: boolean }) {
  return (
    <span className={`tools-icon ${large ? "tools-icon-lg" : ""}`} aria-hidden="true">
      {categoryIcons[category]}
    </span>
  );
}

export default function ToolsPage() {
  return (
    <main className="tools-directory min-h-screen text-zinc-900">
      <section className="tools-hero">
        <div className="mx-auto max-w-6xl px-6 pb-14 pt-10 sm:pt-14">
          <Link href="/" className="tools-back-link">← Back to MakeUdocs</Link>

          <div className="mt-9 max-w-3xl">
            <div className="tools-eyebrow"><span className="tools-eyebrow-dot" /> MakeUdocs Toolkit</div>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-6xl">
              Everything you need.<br className="hidden sm:block" /> All in one place.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
              Fast, simple tools for PDFs, documents and images — designed to get the job done without unnecessary steps.
            </p>
          </div>

          <div className="tools-stats mt-8">
            <div><strong>{availableTools.length}</strong><span>available now</span></div>
            <div><strong>{comingSoonTools.length}</strong><span>coming soon</span></div>
            <div><strong>100%</strong><span>browser-first</span></div>
            <div><strong>0</strong><span>sign-ups required</span></div>
          </div>

          <nav className="tools-category-nav" aria-label="Tool categories">
            {categories.map((category) => (
              <a key={category} href={`#${category.toLowerCase().replaceAll(" ", "-")}`}>{category}</a>
            ))}
          </nav>
        </div>
      </section>

      <section className="px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="tools-section-heading">
            <div>
              <p className="tools-kicker">Ready to use</p>
              <h2>Popular tools</h2>
              <p>Jump straight into the tools that are available today.</p>
            </div>
            <span className="tools-count-pill">{availableTools.length} live tools</span>
          </div>

          <div className="tools-feature-grid">
            {availableTools.map((tool, index) => (
              <Link key={tool.href} href={tool.href} className={`tools-feature-card ${index === 0 ? "tools-feature-card-primary" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <ToolIcon category={tool.category} large />
                  <span className="tools-open-pill">Open tool <span>↗</span></span>
                </div>
                <div className="mt-8">
                  <p className="tools-card-category">{tool.category}</p>
                  <h3>{tool.name}</h3>
                  <p className="tools-card-description">{tool.description}</p>
                </div>
                <div className="tools-card-footer"><span>Use it free</span><span>→</span></div>
              </Link>
            ))}
          </div>

          <div className="mt-16 space-y-14">
            {categories.map((category) => {
              const categoryTools = tools.filter((tool) => tool.category === category && tool.status !== "available");
              if (!categoryTools.length) return null;
              return (
                <section key={category} id={category.toLowerCase().replaceAll(" ", "-")} className="tools-category-section" aria-labelledby={`${category}-heading`}>
                  <div className="tools-section-heading">
                    <div className="flex items-start gap-3">
                      <ToolIcon category={category} />
                      <div>
                        <p className="tools-kicker">Coming next</p>
                        <h2 id={`${category}-heading`}>{category}</h2>
                        <p>{categoryDescriptions[category]}</p>
                      </div>
                    </div>
                    <span className="tools-count-pill">{categoryTools.length} planned</span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {categoryTools.map((tool) => (
                      <div key={tool.href} className="tools-coming-card">
                        <div className="flex items-start justify-between gap-3">
                          <h3>{tool.name}</h3>
                          <span className="tools-soon-badge">Soon</span>
                        </div>
                        <p>{tool.description}</p>
                        <div className="tools-coming-footer"><span>In the MakeUdocs roadmap</span><span>✦</span></div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </section>

      <section className="tools-bottom-cta px-6 pb-16">
        <div className="mx-auto max-w-6xl rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-700 px-7 py-9 text-white shadow-[0_24px_60px_rgba(37,99,235,.2)] sm:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.18em] text-blue-100">Made for simple workflows</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Pick a tool and get it done.</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">No account wall. No complicated setup. Just useful document tools when you need them.</p>
            </div>
            <Link href="/" className="tools-cta-button">Back to home <span>→</span></Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-100 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="font-extrabold text-zinc-900">Make<span className="text-blue-600">Udocs</span></Link>
          <div className="flex gap-4"><Link href="/about" className="hover:text-blue-600">About</Link><Link href="/contact" className="hover:text-blue-600">Contact</Link><Link href="/privacy" className="hover:text-blue-600">Privacy</Link></div>
        </div>
      </footer>
    </main>
  );
}
