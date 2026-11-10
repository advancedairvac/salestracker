"use client";

import { useState } from "react";

// ============================================
// ACCORDION COMPONENT
// ============================================

function SettingsAccordion({ title, description, children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="border-t border-[#e5e5e5] last:border-b">
      {/* DROPDOWN HEADER */}

      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-bold uppercase tracking-wide text-black">
            {title}
          </h3>

          <p className="text-sm leading-relaxed text-[#777]">{description}</p>
        </div>

        {/* ARROW */}

        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`h-6 w-6 shrink-0 text-[#555] transition-transform duration-200 ${
            isOpen ? "rotate-90" : ""
          }`}
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
      </button>

      {/* DROPDOWN CONTENT */}

      {isOpen && <div className="pb-5">{children}</div>}
    </section>
  );
}

// ============================================
// SETTINGS CONTENT
// ============================================

export default function SettingsContent() {
  return (
    <div className="w-full space-y-3">
      {/* ========================================
          GENERAL SETTINGS
      ======================================== */}

      <section className="w-full space-y-3">
        {/* SECTION HEADING */}

        <div className="space-y-1">
          <h2 className="text-sm font-bold uppercase tracking-wide text-black">
            General Settings
          </h2>

          <p className="text-sm text-[#777]">
            Configure common application settings and preferences.
          </p>
        </div>

        {/* ========================================
            FOLLOW-UP SETTINGS
        ======================================== */}

        <SettingsAccordion
          title="Follow-up Settings"
          description="Configure automatic follow-up reminders for estimates."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="border border-[#e5e5e5] bg-white p-4">
              <p className="text-xs font-medium uppercase text-[#777]">
                First Follow-up
              </p>

              <p className="mt-2 text-base font-bold text-black">24 Hours</p>

              <p className="mt-1 text-xs text-[#777]">
                After estimate presentation
              </p>
            </div>

            <div className="border border-[#e5e5e5] bg-white p-4">
              <p className="text-xs font-medium uppercase text-[#777]">
                Second Follow-up
              </p>

              <p className="mt-2 text-base font-bold text-black">3 Days</p>

              <p className="mt-1 text-xs text-[#777]">After first follow-up</p>
            </div>

            <div className="border border-[#e5e5e5] bg-white p-4">
              <p className="text-xs font-medium uppercase text-[#777]">
                Third Follow-up
              </p>

              <p className="mt-2 text-base font-bold text-black">1 Week</p>

              <p className="mt-1 text-xs text-[#777]">After second follow-up</p>
            </div>
          </div>
        </SettingsAccordion>

        {/* ========================================
            SERVICETITAN INTEGRATION
        ======================================== */}

        <SettingsAccordion
          title="ServiceTitan Integration"
          description="Manage your ServiceTitan connection and integration preferences."
        >
          <div className="border border-[#e5e5e5] bg-white px-4">
            {["Customers", "Estimates", "Jobs"].map((item, index) => (
              <div
                key={item}
                className={`flex items-center justify-between gap-3 py-4 ${
                  index !== 2 ? "border-b border-[#e5e5e5]" : ""
                }`}
              >
                <span className="text-sm font-medium text-neutral-800">
                  {item}
                </span>

                <span className="text-xs text-[#777]">ServiceTitan</span>
              </div>
            ))}
          </div>
        </SettingsAccordion>

        {/* ========================================
            NOTIFICATIONS
        ======================================== */}

        <SettingsAccordion
          title="Notifications"
          description="Manage system notifications and sales team alerts."
        >
          <div className="border border-[#e5e5e5] bg-white p-4">
            <p className="text-sm leading-relaxed text-[#777]">
              Notification preferences will be available here.
            </p>
          </div>
        </SettingsAccordion>
      </section>
    </div>
  );
}
