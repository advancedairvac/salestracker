
import Link from "next/link";

const sections = [
  {
    title: "1. Introduction",
    paragraphs: [
      "Advanced Air & Vacuum is the business name used by San Diego Compressed Air Power, LLC. Advanced Sales Tracker is a business application intended to support the company's sales, customer relationship management, quoting, follow-up, and reporting workflows.",
      "This Privacy Policy explains how information may be processed when authorized employees and other permitted users access Advanced Sales Tracker. It should be read together with any applicable customer, employee, vendor, or service-provider agreements.",
    ],
  },
  {
    title: "2. Information We May Process",
    paragraphs: [
      "Depending on the features used and information entered into the application, Advanced Sales Tracker may process the following categories of information:",
    ],
    bullets: [
      "User account information, including names, business email addresses, usernames, roles, and account settings.",
      "Customer and prospect information, including names, company names, business contact details, customer status, lead source, and assigned sales representatives.",
      "Sales and opportunity information, including estimates, quotes, sales amounts, opportunity stages, expected revenue, outcomes, and follow-up dates.",
      "Activity records, including notes, task history, customer interactions, reminders, and other information entered by authorized users.",
      "Business and financial records, including invoice references, transaction-related details, and accounting information where supported and authorized.",
      "Technical information, including timestamps, application errors, diagnostic events, and security logs where collected by the deployed infrastructure.",
      "Integration information required to connect authorized third-party services, such as QuickBooks.",
    ],
  },
  {
    title: "3. How Information Is Collected",
    paragraphs: [
      "Information may be entered by authorized employees, sales representatives, administrators, or other permitted users during normal business operations. Information may also be received from connected business systems when an authorized integration is enabled.",
      "The application may generate technical records when users sign in, navigate the system, or use supported features. The exact information collected depends on the deployed application's configuration.",
    ],
  },
  {
    title: "4. How Information Is Used",
    paragraphs: [
      "Information may be processed for legitimate business and operational purposes, including:",
    ],
    bullets: [
      "Managing leads, prospects, customers, and sales opportunities.",
      "Preparing and tracking estimates, quotes, and sales conversions.",
      "Assigning sales representatives and recording lead sources.",
      "Scheduling follow-ups and managing sales activities.",
      "Calculating sales totals and generating business reports.",
      "Maintaining customer and business records.",
      "Supporting authorized accounting integrations and reconciliation workflows.",
      "Maintaining application functionality, troubleshooting errors, and protecting system security.",
      "Meeting applicable legal, accounting, contractual, and recordkeeping obligations.",
    ],
  },
  {
    title: "5. Customer and Business Information",
    paragraphs: [
      "Advanced Sales Tracker is intended to help authorized personnel manage business relationships and sales activities. Information entered into customer records should be relevant to the company's business operations and limited to what is reasonably necessary.",
      "Authorized users are responsible for ensuring that information they enter is accurate and that they have the appropriate authority to collect and use it. Users should not enter passwords, payment-card security codes, or unnecessary sensitive personal information into notes or general-purpose fields.",
    ],
  },
  {
    title: "6. User Accounts and Access Permissions",
    paragraphs: [
      "Access to the application should be limited to authorized users. Role-based permissions may be used to distinguish administrative, sales, and technical responsibilities.",
      "Users should keep their credentials confidential, use approved access methods, and report suspected unauthorized access. Administrators should promptly review access when a user's responsibilities change or access is no longer required.",
      "The production application should enforce authentication and authorization on the server, including protected pages and API endpoints. Hiding a page or navigation item in the interface alone is not sufficient to secure information.",
    ],
  },
  {
    title: "7. QuickBooks and Other Third-Party Integrations",
    paragraphs: [
      "Where authorized and enabled, Advanced Sales Tracker may connect to QuickBooks or other business services to support accounting, reporting, or operational workflows.",
      "Information exchanged with an integrated service depends on the features enabled, permissions granted by the authorized account holder, and the provider's technical requirements. Users should connect only accounts they are authorized to use.",
      "Third-party services are governed by their own terms and privacy policies. The company should review the permissions requested by each integration and limit access to what is reasonably necessary.",
    ],
  },
  {
    title: "8. Service Providers and Data Storage",
    paragraphs: [
      "The application may rely on hosting, database, infrastructure, monitoring, and other service providers to operate. Information may be processed or stored by those providers as necessary to deliver the application.",
      "The company should review the providers actually configured in production, their security practices, applicable contractual terms, and any data-processing obligations before the application is used with live customer information.",
    ],
  },
  {
    title: "9. Data Disclosure",
    paragraphs: [
      "Information may be accessible to authorized company personnel and service providers who need it to support business operations, application maintenance, or security.",
      "Information may also be disclosed where required by applicable law, valid legal process, or when reasonably necessary to protect legal rights, investigate security incidents, or prevent misuse.",
      "Personal information should not be disclosed or used for unrelated purposes without an appropriate legal basis and any required notice or consent.",
    ],
  },
  {
    title: "10. Data Retention and Deletion",
    paragraphs: [
      "Information should be retained only for as long as reasonably necessary for the business purposes for which it was collected, applicable contractual requirements, accounting obligations, dispute resolution, and other legal requirements.",
      "Retention periods may vary by record type. Backups, system logs, and third-party services may have separate retention cycles. Deletion requests may be subject to legal, accounting, operational, or technical limitations.",
      "The company should establish and document its retention schedule and data-deletion procedures for the production application.",
    ],
  },
  {
    title: "11. Information Security",
    paragraphs: [
      "Appropriate administrative, technical, and organizational safeguards should be used to protect business and personal information against unauthorized access, loss, alteration, and disclosure.",
      "Depending on the deployed configuration, safeguards may include secure connections, server-side access controls, protected credentials, restricted database permissions, backups, and security monitoring.",
      "No electronic system can be guaranteed to be completely secure. The company should periodically review the actual security controls in place and address identified weaknesses.",
    ],
  },
  {
    title: "12. Cookies and Technical Technologies",
    paragraphs: [
      "The application may use cookies or similar technologies for authentication, session management, security, or user preferences when these features are configured.",
      "Any analytics, tracking technologies, or optional cookies used in production should be reviewed and disclosed as required by applicable law.",
    ],
  },
  {
    title: "13. Privacy Requests",
    paragraphs: [
      "Individuals may have rights under applicable privacy laws to request access to, correction of, or deletion of certain personal information, or to exercise other rights available in their jurisdiction.",
      "Privacy requests can be directed to Advanced Air & Vacuum using the contact information provided below. Requests may require identity verification and may be subject to applicable legal exceptions and recordkeeping obligations.",
    ],
  },
  {
    title: "14. Third-Party Websites",
    paragraphs: [
      "The application or related business websites may link to third-party services. Those services operate independently and are governed by their own privacy practices and terms. Users should review those policies before providing information directly to a third party.",
    ],
  },
  {
    title: "15. Policy Updates",
    paragraphs: [
      "This Privacy Policy may be updated when the application, business processes, service providers, or applicable legal requirements change. Updated wording will be published on this page with the appropriate effective date.",
    ],
  },
];

export default function PrivacyPolicyPage() {
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
            San Diego Compressed Air Power, LLC
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
            How information is handled in connection with Advanced Sales
            Tracker and authorized business operations.
          </p>
          <p className="mt-5 text-xs text-white/60">
            Effective date: October 24, 2026
          </p>
        </header>

        <article className="mt-8 rounded-2xl border border-black/[0.07] bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm leading-7 text-gray-600">
            Advanced Sales Tracker supports the company's sales and customer
            management activities. This policy describes the categories of
            information that may be processed through the application and
            should be applied consistently with the actual production
            configuration and applicable legal obligations.
          </p>

          <nav
            aria-label="Privacy Policy contents"
            className="mt-8 rounded-xl bg-[#f2f2f2] p-5 sm:p-6"
          >
            <h2 className="text-sm font-bold">Contents</h2>
            <ol className="mt-4 grid gap-x-6 gap-y-2 text-sm text-gray-600 sm:grid-cols-2">
              {sections.map((section, index) => (
                <li key={section.title}>
                  <a
                    href={`#privacy-section-${index + 1}`}
                    className="transition hover:text-[#067da9]"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#privacy-contact"
                  className="transition hover:text-[#067da9]"
                >
                  16. Contact Us
                </a>
              </li>
            </ol>
          </nav>

          <div className="mt-8 space-y-8">
            {sections.map((section, index) => (
              <section
                key={section.title}
                id={`privacy-section-${index + 1}`}
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
              id="privacy-contact"
              className="scroll-mt-8 rounded-xl bg-[#f2f2f2] p-5 sm:p-6"
            >
              <h2 className="text-lg font-bold">16. Contact Us</h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                For questions about this Privacy Policy or requests
                concerning information processed through Advanced Sales
                Tracker, contact Advanced Air & Vacuum.
              </p>

              <div className="mt-4 space-y-2 text-sm leading-6 text-gray-700">
                <p>
                  <strong>Legal company name:</strong>{" "}
                  San Diego Compressed Air Power, LLC
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
                <p>
                  <strong>Website:</strong>{" "}
                  <a
                    href="https://advancedairvac.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#067da9] hover:underline"
                  >
                    advancedairvac.com
                  </a>
                </p>
              </div>
            </section>
          </div>
        </article>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500">
          <span>Advanced Air & Vacuum · Advanced Sales Tracker</span>
          <Link
            href="/license-agreement"
            className="font-semibold text-[#067da9] hover:underline"
          >
            License Agreement →
          </Link>
        </footer>
      </div>
    </main>
  );
}
