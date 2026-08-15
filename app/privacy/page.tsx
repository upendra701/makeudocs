import Link from "next/link";

export default function PrivacyPage() {
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

      <article className="px-6 py-14 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
            Legal
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-950">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-zinc-500">
            Last updated: August 14, 2026
          </p>

          <div className="mt-10 space-y-8 rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm sm:p-10">
            <Section title="1. About this policy">
              This Privacy Policy explains how MakeUdocs handles information
              when you use makeudocs.com and its document and photo tools.
              We aim to collect only information that is necessary to operate,
              protect and improve the website.
            </Section>

            <Section title="2. Files you process">
              Many MakeUdocs tools are designed to process files directly in
              your web browser. When a tool processes a file locally, the file
              is handled by your device and is not intentionally uploaded to a
              MakeUdocs server for that processing.
              <br />
              <br />
              The exact behavior can vary by tool and by future functionality.
              Please check the relevant tool instructions before relying on
              local-only processing for sensitive material.
            </Section>

            <Section title="3. Information you provide">
              If you contact MakeUdocs or report an issue, you may provide
              information such as your name, email address, the tool you used,
              and details about the problem. We use this information to respond
              to you, investigate issues and improve the service.
            </Section>

            <Section title="4. Website and technical information">
              Like most websites, MakeUdocs may receive basic technical
              information needed to deliver and secure the website, such as
              browser, device, network and request information. If analytics,
              advertising or other third-party services are added, this policy
              will be updated to describe the relevant data practices.
            </Section>

            <Section title="5. Cookies and similar technologies">
              MakeUdocs may use cookies or similar technologies where they are
              necessary for website functionality, security, analytics or
              advertising. Where required by applicable law, appropriate
              consent choices will be provided before non-essential
              technologies are used.
            </Section>

            <Section title="6. Advertising">
              MakeUdocs may introduce advertising in the future. If advertising
              services are enabled, third-party providers may use cookies,
              identifiers or similar technologies as permitted by their
              policies and applicable law. This policy will be kept updated
              when advertising is introduced.
            </Section>

            <Section title="7. Third-party services">
              MakeUdocs may use third-party services for functions such as
              hosting, email, analytics, security or advertising. Those
              providers may process information according to their own privacy
              policies and applicable requirements.
            </Section>

            <Section title="8. Support emails">
              Messages sent to support@makeudocs.com may be retained so that
              we can respond to requests, investigate technical problems and
              maintain support records.
            </Section>

            <Section title="9. Security">
              We take reasonable measures to protect information handled by
              the service. However, no website or internet transmission can be
              guaranteed to be completely secure.
            </Section>

            <Section title="10. Children">
              MakeUdocs is not intentionally designed to collect personal
              information from children. If you believe a child has provided
              personal information to us unnecessarily, please contact us.
            </Section>

            <Section title="11. Changes to this policy">
              We may update this Privacy Policy when the service, technology,
              legal requirements or data practices change. The updated version
              will be published on this page with a revised date.
            </Section>

            <Section title="12. Contact">
              For privacy questions or requests, contact:
              <br />
              <a
                href="mailto:support@makeudocs.com"
                className="font-bold text-blue-600 hover:text-blue-700"
              >
                support@makeudocs.com
              </a>
            </Section>
          </div>
        </div>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-bold text-zinc-950">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-zinc-600">{children}</p>
    </section>
  );
}
