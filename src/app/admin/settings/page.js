import AdminSettingsCta from "@/components/settings/admin-settings-cta";
import SettingsContent from "@/components/settings/settings-content";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";

export const metadata = {
  title: "Settings | Sales Tracker",
};

// ============================================
// ADMIN SETTINGS CTA DATA
// ============================================

const adminSettings = [
  {
    title: "Sales Configuration",
    description:
      "Manage sales targets, revenue settings and sales preferences.",
    href: "/admin/settings/sales-configuration",
  },
  {
    title: "Commission Rule",
    description: "Configure commission rates and calculation rules.",
    href: "/admin/settings/commission-rule",
  },
  {
    title: "Opportunity Management",
    description: "Manage opportunity stages and follow-up configurations.",
    href: "/admin/opportunities",
  },
  {
    title: "Salesman Management",
    description: "Manage sales team settings and salesperson preferences.",
    href: "/admin/salesmen",
  },
];

// ============================================
// ADMIN SETTINGS PAGE
// ============================================

export default function AdminSettingsPage() {
  return (
    <div className="flex min-h-full w-full flex-col">
      {/* BREADCRUMB */}

      <Breadcrumbs
        items={[
          {
            label: "Sales Tracker",
            href: "/admin",
          },
        ]}
        currentPage="Settings"
      />

      {/* PAGE CONTENT */}

      <section className="mt-5 w-full sm:mt-6">
        {/* PAGE HEADING */}

        <div className="space-y-1">
          <h1 className="text-base font-bold uppercase tracking-wide text-neutral-950 sm:text-lg">
            Settings
          </h1>

          <p className="text-sm text-[#777]">
            Manage your application preferences and configurations.
          </p>
        </div>

        {/* ADMIN SETTINGS CTA */}

        <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          {adminSettings.map((item) => (
            <AdminSettingsCta
              key={item.href}
              title={item.title}
              description={item.description}
              href={item.href}
            />
          ))}
        </div>

        {/* GENERAL SETTINGS */}

        <div className="mt-10 w-full">
          <SettingsContent />
        </div>
      </section>

      {/* PAGE TAGLINE */}

      <div className="mt-auto pt-24">
        <PageTagline>
          Iron sharpens iron, as one man sharpens another.
        </PageTagline>
      </div>
    </div>
  );
}
