import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-zinc-900"
          >
            Make<span className="text-blue-600">Udoc</span>
          </Link>

          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
            Student Tools
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pb-16 pt-20 sm:pb-24 sm:pt-28">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
            📄
          </div>

          <h1 className="mt-7 text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl">
            Make your documents
            <span className="block text-blue-600">
              submission ready.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
            Convert assignment photos into clean PDFs,
            arrange pages, crop images, rotate them and
            download your final document — directly from
            your browser.
          </p>

          {/* Main Actions */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/image-to-pdf"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-4 font-semibold text-white shadow-lg transition hover:bg-blue-700 sm:w-auto"
            >
              📸 Upload Assignment Photos
            </Link>

            <Link
              href="/image-to-pdf"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-7 py-4 font-semibold text-zinc-800 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 sm:w-auto"
            >
              📄 Image to PDF
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-200 bg-white px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              Simple workflow
            </p>

            <h2 className="mt-2 text-3xl font-bold text-zinc-900">
              Everything you need
            </h2>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon="📸"
              title="Upload"
              description="Select multiple assignment photos at once."
            />

            <FeatureCard
              icon="✂️"
              title="Edit"
              description="Crop, zoom and rotate your pages."
            />

            <FeatureCard
              icon="↔️"
              title="Arrange"
              description="Move pages into the correct order."
            />

            <FeatureCard
              icon="📄"
              title="Create PDF"
              description="Generate a clean A4 PDF instantly."
            />
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-3xl border border-blue-100 bg-blue-50 p-8 text-center">
          <div className="text-3xl">🔒</div>

          <h3 className="mt-4 text-xl font-bold text-zinc-900">
            Your files stay in your browser
          </h3>

          <p className="mt-2 text-sm leading-6 text-zinc-600">
            MakeUdoc processes your images locally in the
            browser. Your assignment photos don't need to
            be uploaded to a server just to create a PDF.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-sm text-zinc-500 sm:flex-row">
          <p>
            © 2026 MakeUdoc
          </p>

          <p>
            Built for simple document preparation.
          </p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 transition hover:-translate-y-1 hover:bg-white hover:shadow-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
        {icon}
      </div>

      <h3 className="mt-5 font-bold text-zinc-900">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-zinc-500">
        {description}
      </p>
    </div>
  );
}