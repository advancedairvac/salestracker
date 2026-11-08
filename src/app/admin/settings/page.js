
import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";

function SettingsSection({ title, description, children }) {
  return (
    <section className="border border-[#d5d5d5] bg-white">
      <div className="border-b border-[#dedede] px-5 py-4 sm:px-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-black">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-xs leading-relaxed text-[#888]">
            {description}
          </p>
        )}
      </div>

      <div className="divide-y divide-[#e5e5e5] px-5 sm:px-6">
        {children}
      </div>
    </section>
  );
}

function SettingItem({
  title,
  description,
  children,
}) {
  return (
    <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-black">
          {title}
        </h3>

        {description && (
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-[#888]">
            {description}
          </p>
        )}
      </div>

      {children && (
        <div className="shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}

function PreviewSwitch({ enabled = false }) {
  return (
    <div
      role="img"
      aria-label={`Preview switch ${enabled ? "on" : "off"}`}
      className={`flex h-6 w-11 items-center rounded-full p-1 ${
        enabled ? "justify-end bg-black" : "justify-start bg-[#d5d5d5]"
      }`}
    >
      <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
    </div>
  );
}

function PreviewButton({ children }) {
  return (
    <span className="inline-flex min-h-9 items-center justify-center border border-[#d5d5d5] bg-white px-4 text-xs font-semibold text-[#555]">
      {children}
    </span>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5 text-[#777]"
      aria-hidden="true"
    >
      <path
        d="M9 5L16 12L9 19"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Breadcrumb */}
      <Breadcrumbs
        items={[{ label: "Sales Tracker", href: "/admin" }]}
        currentPage="Settings"
      />

      {/* Page Heading */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight text-black sm:text-3xl">
          Settings
        </h1>

        <p className="text-sm text-[#777]">
          Manage your account preferences and application settings.
        </p>
      </div>

      {/* Account Preferences */}
      <SettingsSection
        title="Account Preferences"
        description="Manage your account and personal preferences."
      >
        <SettingItem
          title="Profile Information"
          description="View your name, username, email address and job title."
        >
          <PreviewButton>
            View Profile
          </PreviewButton>
        </SettingItem>

        <SettingItem
          title="Account Type"
          description="Your access level within Advanced Sales Tracker."
        >
          <span className="border border-[#dedede] px-3 py-1.5 text-xs font-semibold uppercase text-[#555]">
            Administrator
          </span>
        </SettingItem>
      </SettingsSection>

      {/* Notification Preferences */}
      <SettingsSection
        title="Notification Preferences"
        description="Manage how you receive sales and follow-up notifications."
      >
        <SettingItem
          title="Follow-up Reminders"
          description="Receive reminders about upcoming customer follow-ups."
        >
          <PreviewSwitch enabled />
        </SettingItem>

        <SettingItem
          title="Overdue Follow-ups"
          description="Get notified when an assigned follow-up becomes overdue."
        >
          <PreviewSwitch enabled />
        </SettingItem>

        <SettingItem
          title="Sales Updates"
          description="Receive updates when an opportunity is marked as won or lost."
        >
          <PreviewSwitch />
        </SettingItem>

        <SettingItem
          title="Team Activity"
          description="Receive updates about team sales activities and performance."
        >
          <PreviewSwitch />
        </SettingItem>
      </SettingsSection>

      {/* Security */}
      <SettingsSection
        title="Security"
        description="Account security and password management."
      >
        <SettingItem
          title="Password"
          description="Manage your account password and security."
        >
          <div className="flex items-center gap-3">
            <span className="text-sm tracking-[3px] text-[#777]">
              ••••••••••
            </span>

            <PreviewButton>
              Change Password
            </PreviewButton>
          </div>
        </SettingItem>

        <SettingItem
          title="Account Access"
          description="Your account access is managed by the system administrator."
        >
          <span className="text-xs font-medium text-[#777]">
            Administrator Managed
          </span>
        </SettingItem>
      </SettingsSection>

      {/* Application Information */}
      <SettingsSection
        title="Application Information"
        description="Information about your sales management platform."
      >
        <SettingItem
          title="Application Name"
          description="The platform you are currently using."
        >
          <span className="text-sm font-semibold text-black">
            Advanced Sales Tracker
          </span>
        </SettingItem>

        <SettingItem
          title="Account Settings"
          description="Additional application preferences may be available in a future update."
        >
          <ArrowIcon />
        </SettingItem>
      </SettingsSection>

      {/* Preview Notice */}
      <div className="border border-[#dedede] bg-[#f8f8f8] px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="mt-0.5 h-5 w-5 shrink-0 text-[#666]"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M12 11V16M12 8H12.01"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#444]">
              Settings Preview
            </p>

            <p className="mt-1 text-xs leading-relaxed text-[#777]">
              These settings are currently displayed for design preview only.
              Interactive functionality will be added after the final design
              and requirements are approved.
            </p>
          </div>
        </div>
      </div>

      {/* Page Tagline */}
      <PageTagline>
        Iron sharpens iron, as one man sharpens another.
      </PageTagline>
    </div>
  );
}
