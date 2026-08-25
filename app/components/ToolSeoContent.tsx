import Link from "next/link";

type ToolSeoContentProps = {
  intro: string;
  benefits: string[];
  steps: string[];
  faq: { question: string; answer: string }[];
  related: { name: string; href: string }[];
};

export default function ToolSeoContent({
  intro,
  benefits,
  steps,
  faq,
  related,
}: ToolSeoContentProps) {
  return (
    <section className="mt-12 border-t border-zinc-200 pt-12">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">About this tool</h2>
        <p className="mt-3 max-w-3xl leading-7 text-zinc-600">{intro}</p>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold text-zinc-900">Why use MakeUdocs?</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {benefits.map((benefit) => (
            <li key={benefit} className="rounded-2xl bg-zinc-50 p-4 leading-6 text-zinc-700">
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold text-zinc-900">How to use it</h2>
        <ol className="mt-4 space-y-3">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-3 leading-6 text-zinc-700">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold text-zinc-900">Frequently asked questions</h2>
        <div className="mt-4 space-y-4">
          {faq.map((item) => (
            <div key={item.question} className="border-b border-zinc-200 py-5 last:border-b-0">
              <h3 className="font-semibold text-zinc-900">{item.question}</h3>
              <p className="mt-2 max-w-3xl leading-6 text-zinc-600">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold text-zinc-900">Related MakeUdocs tools</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {related.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:border-blue-300 hover:bg-blue-50"
            >
              {tool.name}
            </Link>
          ))}
        </div>
      </div>

      <p className="mt-10 border-t border-zinc-200 pt-6 text-sm leading-6 text-zinc-500">
        MakeUdocs processes these document tasks directly in your browser where the tool supports local processing. This keeps the workflow simple and helps you work with your files without unnecessary uploads.
      </p>
    </section>
  );
}
