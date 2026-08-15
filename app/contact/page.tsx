import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-extrabold tracking-tight">
            Make<span className="text-blue-600">Udocs</span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
            ← Home
          </Link>
        </div>
      </header>

      <section className="px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
            Support
          </p>

          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-950">
            Contact MakeUdocs
          </h1>

          <p className="mt-4 text-lg leading-8 text-zinc-600">
            Have a question, feedback or need help with one of our tools?
            We're happy to hear from you.
          </p>

          <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
              ✉️
            </div>

            <h2 className="mt-6 text-2xl font-bold text-zinc-950">
              Email support
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              For support requests, questions or feedback, email us at:
            </p>

            <a
              href="mailto:support@makeudocs.com"
              className="mt-4 inline-block text-lg font-extrabold text-blue-600 hover:text-blue-700"
            >
              support@makeudocs.com
            </a>
          </div>

          <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-7">
            <h2 className="text-xl font-bold text-zinc-950">
              Having a problem with a tool?
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Use our issue-report page and include the tool name and a
              description of what happened. This helps us investigate the
              problem faster.
            </p>

            <Link
              href="/report-issue"
              className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              Report an Issue
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
