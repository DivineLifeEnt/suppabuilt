import {
  LocalCatalogRepository,
  LocalTakeoffItemRepository,
  LocalAssemblyRepository,
  LocalProjectSystemRepository,
  LocalProjectZoneRepository,
  LocalProjectLevelRepository,
  LocalProjectPhaseRepository,
  LocalTakeoffGroupRepository,
} from "./local-takeoff-repository";

import {
  PrismaCatalogRepository,
  PrismaTakeoffItemRepository,
  PrismaAssemblyRepository,
  PrismaProjectSystemRepository,
  PrismaProjectZoneRepository,
  PrismaProjectLevelRepository,
  PrismaProjectPhaseRepository,
  PrismaTakeoffGroupRepository,
} from "./prisma-takeoff-repository";

import type {
  CatalogRepository,
  TakeoffItemRepository,
  AssemblyRepository,
  ProjectSystemRepository,
  ProjectZoneRepository,
  ProjectLevelRepository,
  ProjectPhaseRepository,
  TakeoffGroupRepository,
} from "./takeoff-repository";

export type TakeoffRepositories = {
  catalog: CatalogRepository;
  items: TakeoffItemRepository;
  assemblies: AssemblyRepository;
  systems: ProjectSystemRepository;
  zones: ProjectZoneRepository;
  levels: ProjectLevelRepository;
  phases: ProjectPhaseRepository;
  groups: TakeoffGroupRepository;
};

/** Factory: pick local JSON or Prisma based on DATABASE_URL */
export function createTakeoffRepositories(): TakeoffRepositories {
  const dbUrl = process.env["DATABASE_URL"];

  if (!dbUrl || dbUrl.startsWith("file:") || process.env["USE_LOCAL_STORAGE"] === "true") {
    return {
      catalog: new LocalCatalogRepository(),
      items: new LocalTakeoffItemRepository(),
      assemblies: new LocalAssemblyRepository(),
      systems: new LocalProjectSystemRepository(),
      zones: new LocalProjectZoneRepository(),
      levels: new LocalProjectLevelRepository(),
      phases: new LocalProjectPhaseRepository(),
      groups: new LocalTakeoffGroupRepository(),
    };
  }

  // Lazy-load Prisma to avoid import errors in environments without DB
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient } = require("@prisma/client") as { PrismaClient: new () => unknown };
  const db = new PrismaClient() as ConstructorParameters<typeof PrismaCatalogRepository>[0];

  return {
    catalog: new PrismaCatalogRepository(db),
    items: new PrismaTakeoffItemRepository(db),
    assemblies: new PrismaAssemblyRepository(db),
    systems: new PrismaProjectSystemRepository(db),
    zones: new PrismaProjectZoneRepository(db),
    levels: new PrismaProjectLevelRepository(db),
    phases: new PrismaProjectPhaseRepository(db),
    groups: new PrismaTakeoffGroupRepository(db),
  };
}

// Re-export individual classes for direct use in tests
export {
  LocalCatalogRepository,
  LocalTakeoffItemRepository,
  LocalAssemblyRepository,
  LocalProjectSystemRepository,
  LocalProjectZoneRepository,
  LocalProjectLevelRepository,
  LocalProjectPhaseRepository,
  LocalTakeoffGroupRepository,
};

export type {
  CatalogRepository,
  TakeoffItemRepository,
  AssemblyRepository,
  ProjectSystemRepository,
  ProjectZoneRepository,
  ProjectLevelRepository,
  ProjectPhaseRepository,
  TakeoffGroupRepository,
};

export { ConflictError, NotFoundError } from "./takeoff-repository";
