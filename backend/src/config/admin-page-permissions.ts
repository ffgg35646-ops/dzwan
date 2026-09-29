export type AdminPageRouteRule = {
  prefixes: string[];
  pages: string[];
};

export const ADMIN_PAGE_ROUTE_RULES: AdminPageRouteRule[] = [
  {
    prefixes: [
      "/api/requirements/dashboard/operations",
      "/api/system/status",
    ],
    pages: ["/dashboard"],
  },

  {
    prefixes: ["/api/orders"],
    pages: [
      "/orders",
      "/dashboard",
      "/reports",
      "/operations-center",
    ],
  },

  {
    prefixes: ["/api/captains"],
    pages: [
      "/captains",
      "/dashboard",
      "/reports",
      "/notifications",
      "/operations-center",
      "/cash-accounting",
      "/captain-attendance",
    ],
  },

  {
    prefixes: ["/api/establishments"],
    pages: [
      "/establishments",
      "/dashboard",
      "/reports",
      "/notifications",
      "/pricing",
    ],
  },

  {
    prefixes: [
      "/api/captain-registration",
      "/api/establishment-registration",
    ],
    pages: ["/registration-requests"],
  },

  {
    prefixes: ["/api/leaders"],
    pages: ["/leaders"],
  },

  {
    prefixes: ["/api/locations", "/api/areas"],
    pages: [
      "/locations",
      "/geofencing",
      "/pricing",
      "/establishments",
      "/leaders",
      "/reports",
      "/dashboard",
    ],
  },

  {
    prefixes: [
      "/api/captain-work-areas",
      "/api/geofences",
    ],
    pages: [
      "/geofencing",
      "/pricing",
    ],
  },

  {
    prefixes: [
      "/api/pricing",
      "/api/core11/settings",
    ],
    pages: ["/pricing"],
  },

  {
    prefixes: [
      "/api/settings",
      "/api/system-settings",
    ],
    pages: ["/settings"],
  },

  {
    prefixes: ["/api/completion/sub-admins"],
    pages: ["/sub-admins"],
  },

  {
    prefixes: ["/api/captain-shifts"],
    pages: ["/captain-shifts"],
  },

  {
    prefixes: [
      "/api/audit-logs",
      "/api/ops/security-events",
    ],
    pages: [
      "/security-log",
      "/operations-center",
    ],
  },

  {
    prefixes: ["/api/ops/app-versions"],
    pages: ["/app-versions"],
  },

  {
    prefixes: ["/api/support-tickets"],
    pages: ["/complaints"],
  },

  {
    prefixes: ["/api/requirements/reports/admin"],
    pages: ["/reports"],
  },

  {
    prefixes: [
      "/api/admin/notifications",
      "/api/users",
      "/api/notifications",
    ],
    pages: [
      "/notifications",
      "/dashboard",
    ],
  },

  {
    prefixes: [
      "/api/ops/emergencies",
      "/api/ops/stuck",
    ],
    pages: [
      "/operations-center",
      "/dashboard",
    ],
  },

  {
    prefixes: ["/api/completion/audit"],
    pages: ["/audit-logs"],
  },

  {
    prefixes: [
      "/api/completion/settings",
      "/api/dispatch/settings",
      "/api/ops/maintenance",
    ],
    pages: ["/operations-settings"],
  },

  {
    prefixes: [
      "/api/completion/ratings/captains",
    ],
    pages: ["/captain-ratings"],
  },

  {
    prefixes: ["/api/captain-ledger"],
    pages: ["/cash-accounting"],
  },

  {
    prefixes: ["/api/captain-attendance"],
    pages: ["/captain-attendance"],
  },
];

export function getAdminPagePermissions(
  url: string,
): string[] {
  const path = url.split("?")[0];
  const result = new Set<string>();

  for (const rule of ADMIN_PAGE_ROUTE_RULES) {
    if (
      rule.prefixes.some(
        (prefix) =>
          path === prefix ||
          path.startsWith(`${prefix}/`),
      )
    ) {
      for (const page of rule.pages) {
        result.add(`page:${page}`);
      }
    }
  }

  return [...result];
}

export function getPagesForManagementPermission(
  required: string,
): string[] {
  const rules: Record<string, string[]> = {
    captains: ["/captains"],
    orders: ["/orders"],
    establishments: ["/establishments"],
    leaders: ["/leaders"],
    pricing: ["/pricing"],
    locations: [
      "/locations",
      "/geofencing",
      "/pricing",
      "/establishments",
      "/leaders",
    ],
    areas: [
      "/locations",
      "/geofencing",
      "/pricing",
      "/establishments",
      "/leaders",
    ],
    reports: ["/reports"],
    audit: [
      "/security-log",
      "/audit-logs",
    ],
    "captain-ratings": ["/captain-ratings"],
    "captain-attendance": [
      "/captain-attendance",
    ],
    "captain-ledger": ["/cash-accounting"],
    "captain-shifts": ["/captain-shifts"],
    "app-versions": ["/app-versions"],
    "support-tickets": ["/complaints"],
    notifications: ["/notifications"],
    operations: [
      "/operations-center",
      "/operations-settings",
    ],
  };

  for (const [key, pages] of Object.entries(rules)) {
    if (
      required === key ||
      required.startsWith(`${key}.`)
    ) {
      return pages.map(
        (page) => `page:${page}`,
      );
    }
  }

  return [];
}
