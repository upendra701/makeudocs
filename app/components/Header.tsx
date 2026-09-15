"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { megaMenuGroups, tools } from "../data/tools";

const menuItems = ["PDF Tools", "Convert", "Image Tools", "AI Tools", "Business Tools"] as const;
type MenuItem = (typeof menuItems)[number];

const iconByCategory: Record<MenuItem, string> = {
  "PDF Tools": "▣",
  Convert: "↔",
  "Image Tools": "▧",
  "AI Tools": "✦",
  "Business Tools": "▤",
};

const sectionLabels: Record<MenuItem, string[]> = {
  "PDF Tools": ["Edit & Annotate", "Organize", "Optimize & Secure"],
  Convert: ["From PDF", "To PDF", "Image & Format"],
  "Image Tools": ["Photo & Documents", "Image Conversion", "Optimization"],
  "AI Tools": ["Understand Documents", "Create & Analyze", "Automation"],
  "Business Tools": ["Business Documents", "Generators", "Coming Next"],
};

const sectionAssignments: Record<MenuItem, Record<string, string[]>> = {
  "PDF Tools": {
    "Edit & Annotate": ["Edit PDF"],
    Organize: ["Merge PDF", "Split PDF", "Rotate PDF"],
    "Optimize & Secure": ["Compress PDF"],
  },
  Convert: {
    "From PDF": ["PDF to Word", "PDF to Excel", "PDF to PowerPoint", "PDF to Images"],
    "To PDF": ["Word to PDF", "Image to PDF"],
    "Image & Format": ["JPG to PNG", "PNG to JPG"],
  },
  "Image Tools": {
    "Photo & Documents": ["Passport Photo Maker"],
    "Image Conversion": ["JPG to PNG", "PNG to JPG"],
    Optimization: ["Image Compressor"],
  },
  "AI Tools": {
    "Understand Documents": ["OCR", "Chat with PDF"],
    "Create & Analyze": ["AI PDF Summarizer"],
    Automation: [],
  },
  "Business Tools": {
    "Business Documents": ["Invoice Generator", "Quotation Generator"],
    Generators: [],
    "Coming Next": [],
  },
};

export function Header() {
  const [openMenu, setOpenMenu] = useState<MenuItem | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const getTool = (name: string) => tools.find((tool) => tool.name === name);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/95 shadow-sm backdrop-blur">
      <div ref={menuRef} className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-[72px] items-center justify-between gap-4">
          <Link
            href="/"
            onClick={() => {
              setOpenMenu(null);
              setMobileOpen(false);
            }}
            className="shrink-0 text-[25px] font-extrabold tracking-tight text-zinc-950 sm:text-[27px]"
          >
            Make<span className="text-blue-600">Udocs</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            <Link
              href="/tools"
              className="rounded-xl px-3 py-2.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 hover:text-blue-600"
            >
              All Tools
            </Link>

            {menuItems.map((category) => (
              <div key={category} className="relative">
                <button
                  type="button"
                  aria-expanded={openMenu === category}
                  aria-haspopup="true"
                  onClick={() => setOpenMenu(openMenu === category ? null : category)}
                  className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                    openMenu === category
                      ? "bg-blue-50 text-blue-600"
                      : "text-zinc-700 hover:bg-zinc-100 hover:text-blue-600"
                  }`}
                >
                  {category}
                  <span className="ml-1 text-xs">⌄</span>
                </button>

                {openMenu === category && (
                  <div className="absolute left-1/2 top-[58px] w-[min(940px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/70 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-base font-bold text-blue-600">
                          {iconByCategory[category]}
                        </span>
                        <div>
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-600">
                            MakeUdocs
                          </p>
                          <h2 className="mt-0.5 text-lg font-extrabold text-zinc-950">
                            {category}
                          </h2>
                        </div>
                      </div>
                      <Link
                        href="/tools"
                        onClick={() => setOpenMenu(null)}
                        className="rounded-lg px-3 py-2 text-xs font-extrabold text-blue-600 transition hover:bg-blue-50"
                      >
                        View all tools →
                      </Link>
                    </div>

                    <div className="grid grid-cols-3 divide-x divide-zinc-100 px-2 py-5">
                      {sectionLabels[category].map((section) => (
                        <div key={section} className="px-4 first:pl-4 last:pr-4">
                          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-zinc-400">
                            {section}
                          </p>
                          <div className="space-y-1">
                            {sectionAssignments[category][section].map((name) => {
                              const tool = getTool(name);
                              if (!tool) return null;
                              const available = tool.status === "available";

                              if (!available) {
                                return (
                                  <div
                                    key={tool.name}
                                    className="flex items-center gap-3 rounded-xl p-2.5 opacity-70"
                                  >
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-bold text-zinc-500">
                                      {iconByCategory[category]}
                                    </span>
                                    <span className="min-w-0">
                                      <span className="block text-sm font-extrabold text-zinc-700">
                                        {tool.name}
                                      </span>
                                      <span className="mt-0.5 block text-[11px] text-zinc-400">
                                        Coming soon
                                      </span>
                                    </span>
                                  </div>
                                );
                              }

                              return (
                                <Link
                                  key={tool.name}
                                  href={tool.href}
                                  onClick={() => setOpenMenu(null)}
                                  className="group flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-blue-50"
                                >
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-bold text-zinc-500 transition group-hover:bg-white group-hover:text-blue-600">
                                    {iconByCategory[category]}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block text-sm font-extrabold text-zinc-800 group-hover:text-blue-600">
                                      {tool.name}
                                    </span>
                                    <span className="mt-0.5 block truncate text-[11px] text-zinc-400">
                                      {tool.description}
                                    </span>
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-zinc-100 bg-zinc-50/60 px-6 py-3 text-center text-[11px] text-zinc-500">
                      More tools are being added to MakeUdocs — always free to use.
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700">
              100% Free
            </span>
            <Link
              href="/tools"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700"
            >
              Explore Tools
            </Link>
          </div>

          <button
            type="button"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
            onClick={() => {
              setMobileOpen(!mobileOpen);
              setOpenMenu(null);
            }}
            className="rounded-xl border border-zinc-200 p-2.5 text-zinc-700 lg:hidden"
          >
            <span className="block text-lg leading-none">{mobileOpen ? "×" : "☰"}</span>
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-zinc-100 pb-5 pt-3 lg:hidden">
            <Link
              href="/tools"
              onClick={() => setMobileOpen(false)}
              className="block rounded-xl bg-blue-50 px-3 py-3 text-sm font-extrabold text-blue-600"
            >
              All Tools →
            </Link>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {menuItems.map((category) => (
                <details key={category} className="group rounded-xl border border-zinc-200 bg-white">
                  <summary className="cursor-pointer list-none px-3 py-3 text-sm font-extrabold text-zinc-800">
                    <span className="mr-2 text-blue-600">{iconByCategory[category]}</span>
                    {category}
                    <span className="float-right text-zinc-400 transition group-open:rotate-180">⌄</span>
                  </summary>
                  <div className="border-t border-zinc-100 px-3 pb-3 pt-2">
                    {sectionLabels[category].flatMap((section) => sectionAssignments[category][section]).map((name) => {
                      const tool = getTool(name);
                      if (!tool) return null;
                      const available = tool.status === "available";

                      return available ? (
                        <Link
                          key={tool.name}
                          href={tool.href}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-blue-600"
                        >
                          <span>{tool.name}</span>
                          <span className="text-blue-500">→</span>
                        </Link>
                      ) : (
                        <div key={tool.name} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-zinc-400">
                          <span>{tool.name}</span>
                          <span className="text-[10px] font-bold">SOON</span>
                        </div>
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
