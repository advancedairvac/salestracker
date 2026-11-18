
const primaryNavigation = {
  admin: [
    { label: "DASHBOARD", href: "/admin", type: "primary" },
    { label: "GENERATE REPORT", href: "/admin/reports", type: "primary" },
    { label: "MY PROFILE", href: "/admin/profile", type: "primary" },
    { label: "NEW SALESMAN", href: "/admin/salesmen/new", type: "primary" },
    {
      label: "NEW OPPORTUNITY",
      href: "/admin/opportunities/new",
      type: "primary",
    },
  ],

  salesperson: [
    { label: "DASHBOARD", href: "/salesperson", type: "primary" },
    {
      label: "GENERATE REPORT",
      href: "/salesperson/reports",
      type: "primary",
    },
    {
      label: "MY PROFILE",
      href: "/salesperson/profile",
      type: "primary",
    },
    {
      label: "NEW OPPORTUNITY",
      href: "/salesperson/opportunities/new",
      type: "primary",
    },
  ],
};

// ============================================
// EXTERNAL NAVIGATION
// ============================================

const techTrackerLink = {
  label: "Tech Tracker",
  href: "https://advancedtechtracker.com/",
  type: "secondary",
  external: true,
};

// ============================================
// NAVIGATION CONFIGURATION
// ============================================

export function getNavigation(role = "salesperson") {
  const normalizedRole =
    String(role).toLowerCase() === "admin" ? "admin" : "salesperson";

  const secondaryItems = [
    {
      label: "Settings",
      href:
        normalizedRole === "admin"
          ? "/admin/settings"
          : "/salesperson/settings",
      type: "secondary",
    },

    techTrackerLink,

    {
      label: "Logout",
      href: null,
      action: "logout",
      type: "secondary",
    },
  ];

  return [...primaryNavigation[normalizedRole], ...secondaryItems];
}
