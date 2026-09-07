export type OrganizationRole = "owner" | "admin" | "member";
export type ProjectRole = "project-admin" | "editor" | "commenter" | "viewer";

export type Permission =
  | "view"
  | "markup:write"
  | "measurement:write"
  | "takeoff:write"
  | "comment:write"
  | "comment:resolve-any"
  | "session:manage"
  | "project:manage"
  // Sprint 7: Estimating
  | "estimate:view"
  | "estimate:view-cost"
  | "estimate:edit"
  | "estimate:submit-review"
  | "estimate:approve"
  | "estimate:lock"
  // Sprint 7: Rates
  | "rates:view"
  | "rates:manage"
  // Sprint 7: Exports
  | "export:create-internal"
  | "export:create-customer"
  | "export:template-manage"
  | "export:download";

const PROJECT_ROLE_PERMISSIONS: Record<ProjectRole, Permission[]> = {
  "project-admin": [
    "view",
    "markup:write",
    "measurement:write",
    "takeoff:write",
    "comment:write",
    "comment:resolve-any",
    "session:manage",
    "project:manage",
    // Estimating
    "estimate:view",
    "estimate:view-cost",
    "estimate:edit",
    "estimate:submit-review",
    "estimate:approve",
    "estimate:lock",
    // Rates
    "rates:view",
    "rates:manage",
    // Exports
    "export:create-internal",
    "export:create-customer",
    "export:template-manage",
    "export:download",
  ],
  "editor": [
    "view",
    "markup:write",
    "measurement:write",
    "takeoff:write",
    "comment:write",
    "estimate:view",
    "estimate:view-cost",
    "estimate:edit",
    "estimate:submit-review",
    "rates:view",
    "export:create-internal",
    "export:download",
  ],
  "commenter": ["view", "comment:write", "estimate:view"],
  "viewer": ["view", "estimate:view"],
};

export function hasPermission(role: ProjectRole, permission: Permission): boolean {
  return PROJECT_ROLE_PERMISSIONS[role].includes(permission);
}

export function getEffectiveProjectRole(
  orgRole: OrganizationRole,
  projectRole: ProjectRole | null
): ProjectRole {
  // org owner/admin get at least "editor" on all projects
  if (orgRole === "owner" || orgRole === "admin") {
    if (projectRole === null) return "editor";
    // Return the higher of the two roles
    const roleOrder: ProjectRole[] = ["viewer", "commenter", "editor", "project-admin"];
    const orgMin: ProjectRole = "editor";
    const orgIdx = roleOrder.indexOf(orgMin);
    const projIdx = projectRole ? roleOrder.indexOf(projectRole) : -1;
    return projIdx > orgIdx ? projectRole! : orgMin;
  }
  return projectRole ?? "viewer";
}
