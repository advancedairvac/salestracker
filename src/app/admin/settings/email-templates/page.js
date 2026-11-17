
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";

import EmailTemplatesContent from "@/components/settings/email-templates/email-templates-content";

export const metadata = {
  title: "Email Templates | Sales Tracker",
};

const TEMPLATE_ORDER = [
  "H24",
  "H36",
  "W1",
  "W2",
  "M1",
  "MANUAL",
];

export default async function EmailTemplatesPage() {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== "ADMIN") {
    redirect("/admin");
  }

  const templates = await prisma.emailTemplate.findMany({
    where: {
      userId: null,
      eventType: {
        in: TEMPLATE_ORDER,
      },
    },
    select: {
      id: true,
      eventType: true,
      name: true,
      subject: true,
      body: true,
      isActive: true,
      updatedAt: true,
    },
  });

  const sortedTemplates = TEMPLATE_ORDER.map((eventType) =>
    templates.find((template) => template.eventType === eventType),
  ).filter(Boolean);

  return (
    <div className="flex min-h-full w-full flex-col">
      <Breadcrumbs
        items={[
          {
            label: "Sales Tracker",
            href: "/admin",
          },
          {
            label: "Settings",
            href: "/admin/settings",
          },
        ]}
        currentPage="Email Templates"
      />

      <section className="mt-5 w-full sm:mt-6">
        <div className="space-y-1">
          <h1 className="text-base font-bold uppercase tracking-wide text-neutral-950 sm:text-lg">
            Email Templates
          </h1>

          <p className="text-sm text-[#777]">
            Manage your default follow-up email templates.
          </p>
        </div>

        <div className="mt-6">
          <div className="border border-[#e5e5e5] bg-white p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#e5e5e5] text-sm font-bold">
                6
              </div>

              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-black">
                  Default Templates
                </h2>

                <p className="mt-1 text-sm leading-relaxed text-[#777]">
                  These six predefined templates are used for automatic and
                  manual follow-up notifications. You can edit their email
                  subject and message, preview them, and send test emails.
                </p>
              </div>
            </div>
          </div>

          {sortedTemplates.length === 6 ? (
            <EmailTemplatesContent templates={sortedTemplates} />
          ) : (
            <div className="mt-5 border border-[#e5e5e5] bg-white p-5">
              <p className="text-sm font-semibold text-[#777]">
                Six default email templates are required.
              </p>

              <p className="mt-2 text-sm text-[#777]">
                Currently found {sortedTemplates.length} of 6 templates.
                Please run the email template seed before continuing.
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="mt-auto pt-24">
        <PageTagline>
          Iron sharpens iron, as one man sharpens another.
        </PageTagline>
      </div>
    </div>
  );
}
