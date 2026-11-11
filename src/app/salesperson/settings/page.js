
import SettingsContent from "@/components/settings/settings-content";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";

export const metadata = {
  title: "Settings | Sales Tracker",
};

// ============================================
// SALESPERSON SETTINGS PAGE
// ============================================

export default function SalespersonSettingsPage() {
  return (
    <div className="flex min-h-full w-full flex-col">
      {/* BREADCRUMB */}

      <Breadcrumbs
        items={[
          {
            label: "Sales Tracker",
            href: "/salesperson",
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
