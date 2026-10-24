
import Link from "next/link";

const sections = [
  {
    title: "1. Parties and Purpose",
    paragraphs: [
      "This License Agreement governs authorized access to and use of Advanced Sales Tracker (the “Software”), a business application intended to support sales management, customer records, estimates, quotes, follow-ups, activities, and reporting.",
      "The business using the Software is Advanced Air & Vacuum, operated under the legal company name San Diego Compressed Air Power, LLC. The rights of the software developer, licensor, and customer are subject to the applicable development or commercial agreement between the parties.",
    ],
  },
  {
    title: "2. License and Authorized Use",
    paragraphs: [
      "The Software may be accessed only by users authorized by the company or by the party responsible for administering the deployment.",
      "The Software is intended for legitimate internal business operations, including managing leads, customers, sales opportunities, estimates, quotes, sales outcomes, follow-ups, and business reports.",
      "Any license duration, permitted user count, fees, deployment rights, or additional license conditions must be established in the applicable written agreement.",
    ],
  },
  {
    title: "3. Ownership and Intellectual Property",
    paragraphs: [
      "The ownership of source code, application design, documentation, trademarks, and other intellectual property is governed by the relevant development contract, license, or written assignment between the parties.",
      "Unless a signed agreement expressly states otherwise, access to the Software does not itself transfer ownership of source code, copyright, or other intellectual property rights.",
      "Any agreed transfer of ownership, exclusive license, source-code delivery, or right to modify and redistribute the Software should be documented in a separate written agreement.",
    ],
  },
  {
    title: "4. User Accounts and Roles",
    paragraphs: [
      "The company is responsible for authorizing users, assigning appropriate roles, reviewing access permissions, and removing access when it is no longer required.",
      "Users must keep their login credentials confidential, use the Software only within their authorized permissions, and promptly report suspected unauthorized access.",
      "The production deployment should enforce authentication and authorization on the server. Demo credentials or demonstration-only login flows must not be relied upon to protect production information.",
    ],
  },
  {
    title: "5. Acceptable Use",
    paragraphs: [
      "Users must use the Software lawfully and in accordance with their authorized business responsibilities.",
    ],
    bullets: [
      "Enter only information they are authorized to use and process.",
      "Maintain appropriate confidentiality of customer and business records.",
      "Use access permissions and integrations only for approved business purposes.",
      "Report suspected security incidents or unauthorized access.",
      "Follow applicable company policies and relevant legal requirements.",
    ],
  },
  {
    title: "6. Prohibited Activities",
    paragraphs: [
      "Users must not engage in activities that compromise the Software, its users, or its data.",
    ],
    bullets: [
      "Attempt to gain unauthorized access to accounts, databases, APIs, or infrastructure.",
      "Interfere with the availability, security, or normal operation of the application.",
      "Upload malicious code or knowingly introduce harmful content.",
      "Copy, resell, sublicense, or redistribute the Software beyond rights expressly granted by the applicable agreement.",
      "Reverse engineer or decompile the Software except where applicable law permits or protects such activity.",
      "Use the Software for unlawful activities or unauthorized disclosure of customer information.",
    ],
  },
  {
    title: "7. Customer Data",
    paragraphs: [
      "The company retains its rights in the customer, prospect, sales, and business information it provides to the Software, subject to any applicable third-party rights.",
      "The company is responsible for ensuring it has the necessary authority to enter and process information in the application. Users should avoid storing unnecessary sensitive information in general-purpose notes or records.",
      "Data access, retention, deletion, and privacy requests are addressed by the applicable Privacy Policy and any separate data-processing or commercial agreement.",
    ],
  },
  {
    title: "8. Third-Party Services and QuickBooks",
    paragraphs: [
      "The Software may integrate with third-party services, including QuickBooks, hosting providers, and database services. Use of these services is subject to their own terms, permissions, availability, and privacy policies.",
      "The company is responsible for authorizing the third-party accounts it connects and maintaining the permissions required for those integrations.",
      "Changes made by third-party providers to their APIs, products, or policies may affect integration functionality. The Software provider should not be considered the operator of a third-party service merely because an integration is available.",
    ],
  },
  {
    title: "9. Fees and Commercial Terms",
    paragraphs: [
      "Development fees, license fees, hosting charges, maintenance services, support arrangements, and payment terms are determined by the applicable written agreement between the parties.",
      "This License Agreement does not establish fees or payment obligations that have not otherwise been agreed in writing.",
    ],
  },
  {
    title: "10. Maintenance and Support",
    paragraphs: [
      "Maintenance scope, support availability, response times, bug fixes, upgrades, backups, and service-level commitments apply only to the extent provided in an applicable written agreement.",
      "Changes to the Software may be necessary to address defects, security issues, compatibility, or changes to third-party services. The scope and cost of substantial new features should be agreed separately where applicable.",
    ],
  },
  {
    title: "11. Confidentiality",
    paragraphs: [
      "Users must handle non-public customer, financial, operational, and technical information responsibly and must not disclose it to unauthorized parties.",
      "Any additional confidentiality obligations between the software developer and the company are governed by their applicable contract or confidentiality agreement.",
    ],
  },
  {
    title: "12. Suspension and Termination",
    paragraphs: [
      "Access may be suspended or terminated in accordance with the applicable agreement or where reasonably necessary to address unauthorized use, a material breach, a security risk, or a legal requirement, subject to applicable law.",
      "After termination, the customer's access rights are governed by the applicable agreement. The parties should follow the agreed process for data export, return, deletion, and retention, subject to legal obligations and technical limitations.",
    ],
  },
  {
    title: "13. Disclaimer",
    paragraphs: [
      "The Software's available features depend on its actual implementation, configuration, and supported integrations. The Software does not guarantee a particular sales result, revenue outcome, or uninterrupted service.",
      "Any express warranties or service commitments must be documented in the applicable written agreement. Nothing in this section excludes rights or warranties that cannot lawfully be excluded.",
    ],
  },
  {
    title: "14. Limitation of Liability",
    paragraphs: [
      "Any exclusions of damages, liability caps, exceptions, or allocation of risk between the parties must be established in the applicable agreement and assessed under the governing law.",
      "Nothing in this Agreement limits liability to the extent that such limitation is prohibited by applicable law.",
    ],
  },
  {
    title: "15. Governing Law and Disputes",
    paragraphs: [
      "The governing law and jurisdiction should be specified in the signed development or commercial agreement between the relevant parties. This page does not independently determine a governing law where the parties have not agreed to one.",
      "The parties should attempt to resolve disputes in good faith, without limiting rights or remedies available under applicable law.",
    ],
  },
  {
    title: "16. Changes to This Agreement",
    paragraphs: [
      "This Agreement may be updated to reflect changes in the Software or its permitted use. Changes to contractual rights and obligations should be documented and accepted in accordance with the applicable agreement and law.",
    ],
  },
];

export default function LicenseAgreementPage() {
  return (
    <main className="min-h-screen bg-[#f8f9fb] px-4 py-12 text-[#0d0d0d] sm:px-6 lg:py-16">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#067da9] transition hover:text-[#0d0d0d]"
        >
          <span aria-hidden="true">←</span>
          Back to Sign In
        </Link>

        <header className="mt-8 rounded-2xl bg-[#0d0d0d] px-6 py-10 text-white sm:px-10 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#55c7f0]">
            Advanced Air & Vacuum
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Software License Agreement
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
            Terms for authorized use of Advanced Sales Tracker.
          </p>
          <p className="mt-5 text-xs text-white/60">
            San Diego Compressed Air Power, LLC
          </p>
        </header>

        <article className="mt-8 rounded-2xl border border-black/[0.07] bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm leading-7 text-gray-600">
            This Agreement describes the general terms applicable to
            authorized use of Advanced Sales Tracker. It should be read
            together with any signed development contract, ownership
            assignment, commercial proposal, or other agreement between
            the parties.
          </p>

          <nav
            aria-label="License Agreement contents"
            className="mt-8 rounded-xl bg-[#f2f2f2] p-5 sm:p-6"
          >
            <h2 className="text-sm font-bold">Contents</h2>
            <ol className="mt-4 grid gap-x-6 gap-y-2 text-sm text-gray-600 sm:grid-cols-2">
              {sections.map((section, index) => (
                <li key={section.title}>
                  <a
                    href={`#license-section-${index + 1}`}
                    className="transition hover:text-[#067da9]"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#license-contact"
                  className="transition hover:text-[#067da9]"
                >
                  17. Contact Information
                </a>
              </li>
            </ol>
          </nav>

          <div className="mt-8 space-y-8">
            {sections.map((section, index) => (
              <section
                key={section.title}
                id={`license-section-${index + 1}`}
                className="scroll-mt-8 border-b border-black/[0.07] pb-8"
              >
                <h2 className="text-lg font-bold tracking-tight sm:text-xl">
                  {section.title}
                </h2>

                <div className="mt-3 space-y-3 text-sm leading-7 text-gray-600">
                  {section.paragraphs.map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex}>{paragraph}</p>
                  ))}

                  {section.bullets && (
                    <ul className="list-disc space-y-2 pl-5">
                      {section.bullets.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}

            <section
              id="license-contact"
              className="scroll-mt-8 rounded-xl bg-[#f2f2f2] p-5 sm:p-6"
            >
              <h2 className="text-lg font-bold">17. Contact Information</h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                For questions about business use of Advanced Sales Tracker,
                contact Advanced Air & Vacuum. Questions about software
                ownership, licensing rights, and development obligations
                should be directed to the relevant parties under their
                written agreement.
              </p>

              <div className="mt-4 space-y-2 text-sm leading-6 text-gray-700">
                <p>
                  <strong>Company:</strong> San Diego Compressed Air Power,
                  LLC
                </p>
                <p>
                  <strong>Business name:</strong> Advanced Air & Vacuum
                </p>
                <p>
                  <strong>Address:</strong> 1685 N Marshall Ave., El Cajon,
                  CA 92020
                </p>
                <p>
                  <strong>Phone:</strong>{" "}
                  <a
                    href="tel:+16195623373"
                    className="text-[#067da9] hover:underline"
                  >
                    (619) 562-3373
                  </a>
                </p>
                <p>
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:info@aavsales.com"
                    className="text-[#067da9] hover:underline"
                  >
                    info@aavsales.com
                  </a>
                </p>
              </div>
            </section>
          </div>
        </article>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500">
          <span>Advanced Air & Vacuum · Advanced Sales Tracker</span>
          <Link
            href="/privacy-policy"
            className="font-semibold text-[#067da9] hover:underline"
          >
            Privacy Policy →
          </Link>
        </footer>
      </div>
    </main>
  );
}
