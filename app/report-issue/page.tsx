import Link from "next/link";

const tools = [
  "Image to PDF",
  "Word to PDF",
  "PDF to Images",
  "Compress PDF",
  "Merge PDF",
  "Passport Photo Maker",
  "Other",
];

export default function ReportIssuePage() {
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

      <section className="px-6 py-14 sm:py-18">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
            Support
          </p>

          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-950">
            Report an Issue
          </h1>

          <p className="mt-4 text-lg leading-8 text-zinc-600">
            Tell us what went wrong. Please include enough detail for us to
            reproduce the problem.
          </p>

          <form
            action="mailto:support@makeudocs.com"
            method="post"
            encType="text/plain"
            className="mt-10 rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm sm:p-8"
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Your name" name="name" placeholder="Your name" />
              <Field label="Email address" name="email" type="email" placeholder="you@example.com" />
            </div>

            <div className="mt-6">
              <label htmlFor="tool" className="text-sm font-bold text-zinc-900">
                Tool
              </label>
              <select
                id="tool"
                name="tool"
                defaultValue=""
                required
                className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="" disabled>
                  Select a tool
                </option>
                {tools.map((tool) => (
                  <option key={tool} value={tool}>
                    {tool}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6">
              <label htmlFor="subject" className="text-sm font-bold text-zinc-900">
                What went wrong?
              </label>
              <input
                id="subject"
                name="subject"
                required
                placeholder="Example: Page 3 is blank after conversion"
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="mt-6">
              <label htmlFor="details" className="text-sm font-bold text-zinc-900">
                Details
              </label>
              <textarea
                id="details"
                name="details"
                required
                rows={6}
                placeholder="Tell us what you did, what you expected and what actually happened."
                className="mt-2 w-full resize-y rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <p className="mt-5 text-xs leading-5 text-zinc-500">
              Please don't include passwords, payment information, government
              identification numbers or other sensitive information.
            </p>

            <button
              type="submit"
              className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700"
            >
              Send Issue Report
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-zinc-400">
            You can also email{" "}
            <a
              href="mailto:support@makeudocs.com"
              className="font-semibold text-blue-600"
            >
              support@makeudocs.com
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-bold text-zinc-900">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}
