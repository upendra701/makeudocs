import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-extrabold tracking-tight">
            Make<span className="text-blue-600">Udocs</span>
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-blue-300 hover:text-blue-600"
          >
            Back to Home
          </Link>
        </div>
      </header>

      <section className="px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
            About MakeUdocs
          </p>

          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">
            Simple tools for everyday documents.
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-600">
            MakeUdocs is a collection of simple document and photo tools
            designed to make everyday file preparation easier.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            <InfoCard icon="⚡" title="Simple" text="Choose a tool, make your changes and download your result." />
            <InfoCard icon="🎓" title="Useful" text="Built with assignments, applications and everyday document tasks in mind." />
            <InfoCard icon="🔒" title="Privacy-minded" text="Our browser-based tools are designed to process files locally whenever possible." />
          </div>

          <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-zinc-950">Our tools</h2>
            <p className="mt-3 leading-7 text-zinc-600">
              MakeUdocs currently provides tools for converting images and
              Word documents to PDF, converting PDF pages to images,
              compressing PDFs, merging PDFs, and creating passport-style
              photos.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {[
                ["/image-to-pdf", "Image to PDF"],
                ["/word-to-pdf", "Word to PDF"],
                ["/pdf-to-images", "PDF to Images"],
                ["/compress-pdf", "Compress PDF"],
                ["/merge-pdf", "Merge PDF"],
                ["/passport-photo", "Passport Photo Maker"],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-100"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-blue-100 bg-blue-50 p-7">
            <h2 className="text-xl font-bold text-zinc-950">
              Need help?
            </h2>
            <p className="mt-2 leading-7 text-zinc-600">
              If something isn't working as expected, contact us or report
              the issue so we can investigate it.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                Contact Us
              </Link>
              <Link
                href="/report-issue"
                className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-bold text-zinc-800 hover:border-blue-300"
              >
                Report an Issue
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="text-2xl">{icon}</div>
      <h2 className="mt-4 font-bold text-zinc-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{text}</p>
    </div>
  );
}
