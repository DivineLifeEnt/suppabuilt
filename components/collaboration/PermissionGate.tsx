"use client";

import type { ReactNode } from "react";
import { hasPermission, type Permission, type ProjectRole } from "@/lib/collaboration/permissions";

interface Props {
  role: ProjectRole | null;
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ role, permission, children, fallback = null }: Props) {
  if (!role || !hasPermission(role, permission)) return <>{fallback}</>;
  return <>{children}</>;
}
