
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

const publicNavigation = [
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
];

const techTrackerLink = {
  label: "Tech Tracker",
  href: "https://advancedtechtracker.com/",
  type: "secondary",
  external: true,
};

export function getNavigation(role = "salesperson", isAuthenticated = true) {
  const normalizedRole =
    String(role).toLowerCase() === "admin" ? "admin" : "salesperson";

  const primaryItems = isAuthenticated
    ? primaryNavigation[normalizedRole]
    : publicNavigation;

  const secondaryItems = [
    {
      label: "Settings",
      href: isAuthenticated
        ? normalizedRole === "admin"
          ? "/admin/settings"
          : "/salesperson/settings"
        : null,
      type: "secondary",
    },
    techTrackerLink,
    ...(isAuthenticated
      ? [
          {
            label: "Logout",
            href: null,
            action: "logout",
            type: "secondary",
          },
        ]
      : []),
  ];

  return [...primaryItems, ...secondaryItems];
}
