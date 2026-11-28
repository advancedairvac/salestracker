
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

      <section className="w-full">

        {/* GENERAL SETTINGS */}

        <div className="w-full">
          <SettingsContent role="SALESPERSON" />
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
