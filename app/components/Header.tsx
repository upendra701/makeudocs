"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { megaMenuGroups, tools } from "../data/tools";

const menuItems = ["PDF Tools", "Convert", "Image Tools", "AI Tools", "Business Tools"] as const;

const iconByCategory: Record<string, string> = {
  "PDF Tools": "▣",
  Convert: "↔",
  "Image Tools": "▧",
  "AI Tools": "✦",
  "Business Tools": "▤",
};

export function Header() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
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
                  <div className="absolute left-1/2 top-[58px] w-[min(820px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl">
                    <div className="mb-4 flex items-center justify-between border-b border-zinc-100 pb-4">
                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
                          MakeUdocs
                        </p>
                        <h2 className="mt-1 text-lg font-extrabold text-zinc-950">
                          {category}
                        </h2>
                      </div>
                      <Link
                        href="/tools"
                        onClick={() => setOpenMenu(null)}
                        className="text-xs font-extrabold text-blue-600 hover:underline"
                      >
                        View all tools →
                      </Link>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {megaMenuGroups[category].map((name) => {
                        const tool = getTool(name);
                        if (!tool) return null;
                        const available = tool.status === "available";

                        return (
                          <Link
                            key={tool.name}
                            href={available ? tool.href : "/tools"}
                            onClick={() => setOpenMenu(null)}
                            className="group rounded-xl border border-transparent p-3 transition hover:border-blue-100 hover:bg-blue-50/70"
                          >
                            <div className="flex items-start gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-sm font-bold text-zinc-600 transition group-hover:bg-white group-hover:text-blue-600">
                                {iconByCategory[category]}
                              </span>
                              <span className="min-w-0">
                                <span className="flex items-center gap-2 text-sm font-extrabold text-zinc-900 group-hover:text-blue-600">
                                  {tool.name}
                                  {!available && (
                                    <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-zinc-500">
                                      Soon
                                    </span>
                                  )}
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-zinc-500">
                                  {tool.description}
                                </span>
                              </span>
                            </div>
                          </Link>
                        );
                      })}
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
              className="block rounded-xl px-3 py-3 text-sm font-extrabold text-blue-600 hover:bg-blue-50"
            >
              All Tools →
            </Link>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {menuItems.map((category) => (
                <details key={category} className="group rounded-xl border border-zinc-200">
                  <summary className="cursor-pointer list-none px-3 py-3 text-sm font-extrabold text-zinc-800">
                    <span className="mr-2 text-blue-600">{iconByCategory[category]}</span>
                    {category}
                    <span className="float-right text-zinc-400 group-open:rotate-180">⌄</span>
                  </summary>
                  <div className="border-t border-zinc-100 px-3 pb-3 pt-2">
                    {megaMenuGroups[category].map((name) => {
                      const tool = getTool(name);
                      if (!tool) return null;
                      const available = tool.status === "available";

                      return (
                        <Link
                          key={tool.name}
                          href={available ? tool.href : "/tools"}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-blue-600"
                        >
                          <span>{tool.name}</span>
                          {!available && <span className="text-[10px] font-bold text-zinc-400">SOON</span>}
                        </Link>
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
