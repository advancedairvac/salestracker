
"use client";

import { useState } from "react";

export default function Tabs({
  tabs = [],
  defaultTab,
  title,
  countLabel = "Items",
  panels = {},
}) {
  const [activeTab, setActiveTab] = useState(
    defaultTab || tabs[0]?.id
  );

  const activeTabData = tabs.find((tab) => tab.id === activeTab);
  const activeContent = panels[activeTab];

  return (
    <section className="space-y-4">
      {/* STATUS TABS */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 border px-3 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? "border-[#222] bg-[#222] text-white"
                  : "border-[#d5d5d5] bg-white text-[#555] hover:bg-[#f5f5f5]"
              }`}
            >
              <span>{tab.label}</span>

              <span
                className={`inline-flex min-w-[20px] items-center justify-center px-1.5 py-0.5 text-[10px] ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "bg-[#f1f1f1] text-[#777]"
                }`}
              >
                {tab.count ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* SUMMARY */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#555]">
          {title || activeTabData?.label}
        </h2>

        <span className="shrink-0 text-xs text-[#777]">
          {activeTabData?.count ?? 0}{" "}
          {countLabel}
        </span>
      </div>

      {/* TAB CONTENT */}
      <div>{activeContent}</div>
    </section>
  );
}
