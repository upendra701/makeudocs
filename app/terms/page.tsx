import Link from "next/link";

export default function TermsPage() {
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
            Terms of Use
          </h1>
          <p className="mt-3 text-sm text-zinc-500">
            Last updated: August 14, 2026
          </p>

          <div className="mt-10 space-y-8 rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm sm:p-10">
            <Section title="1. Acceptance of these terms">
              By accessing or using MakeUdocs at makeudocs.com, you agree to
              these Terms of Use. If you do not agree with them, please do not
              use the service.
            </Section>

            <Section title="2. The service">
              MakeUdocs provides browser-based document and photo utilities,
              including conversion, PDF processing and passport-style photo
              preparation tools. Features may be changed, improved, suspended
              or discontinued as the service develops.
            </Section>

            <Section title="3. Your files and responsibility">
              You are responsible for the files and other content you choose
              to process through MakeUdocs and for having the necessary rights
              or permissions to use them. Do not use the service to process
              material that you are not legally permitted to use.
            </Section>

            <Section title="4. Sensitive information">
              Do not submit passwords, payment credentials, government
              identification numbers or other highly sensitive information
              through support forms. You are responsible for deciding whether
              a particular file is appropriate for processing with the
              service.
            </Section>

            <Section title="5. Acceptable use">
              You agree not to misuse the website, attempt to interfere with
              its operation or security, introduce malicious code, abuse
              automated systems, or use the service for unlawful purposes.
            </Section>

            <Section title="6. Free availability">
              MakeUdocs currently intends to provide its listed tools without
              charging users for ordinary use. We may change features or
              introduce additional services in the future. Any paid service
              will be clearly identified before a user is charged.
            </Section>

            <Section title="7. Results and accuracy">
              Document conversion, compression, image processing and similar
              operations can produce different results depending on the input
              file, browser and device. You should review important files
              before submitting, publishing or relying on them.
            </Section>

            <Section title="8. Availability">
              We aim to keep MakeUdocs useful and available, but we do not
              guarantee that the website or every tool will always be available,
              uninterrupted or error-free.
            </Section>

            <Section title="9. Intellectual property">
              MakeUdocs branding, website design, software and original
              website content belong to their respective owner or licensors.
              These Terms do not transfer ownership of those materials to you.
            </Section>

            <Section title="10. Third-party services and links">
              MakeUdocs may use or link to third-party services. Those services
              are governed by their own terms and policies, and MakeUdocs is
              not responsible for third-party services outside its control.
            </Section>

            <Section title="11. Changes to these terms">
              We may update these Terms of Use as the service changes. The
              updated version will be published on this page with a revised
              date. Continued use of MakeUdocs after an update means you accept
              the revised terms.
            </Section>

            <Section title="12. Contact">
              Questions about these terms can be sent to:
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
