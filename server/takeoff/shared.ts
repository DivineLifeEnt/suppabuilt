// Shared factory for takeoff services (singleton per request in local mode)
import { createTakeoffRepositories } from "./repositories/index";
import { CatalogService } from "./catalog-service";
import { TakeoffService } from "./takeoff-service";
import { AssemblyService } from "./assembly-service";
import { ExportService } from "./export-service";

export function getTakeoffServices() {
  const repos = createTakeoffRepositories();
  return {
    repos,
    catalogService: new CatalogService(repos.catalog, repos.items),
    takeoffService: new TakeoffService(repos.items, repos.catalog),
    assemblyService: new AssemblyService(repos.assemblies, repos.items),
    exportService: new ExportService(repos.items, repos.catalog),
  };
}

export function apiError(code: string, message: string, status: number, details?: unknown) {
  const { NextResponse } = require("next/server") as typeof import("next/server");
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status }
  );
}

export const DEFAULT_ORG = "default";
