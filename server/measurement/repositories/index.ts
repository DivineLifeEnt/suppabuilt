import type {
  MeasurementRepository,
  CalibrationRepository,
  MeasurementGroupRepository,
} from "./measurement-repository";

export {
  ConflictError,
  NotFoundError,
  DependencyError,
} from "./measurement-repository";

let _measurementRepo: MeasurementRepository | null = null;
let _calibrationRepo: CalibrationRepository | null = null;
let _groupRepo: MeasurementGroupRepository | null = null;

export function getMeasurementRepository(): MeasurementRepository {
  if (_measurementRepo) return _measurementRepo;

  if (process.env.DATABASE_URL) {
    const { PrismaClient } = require("@prisma/client") as { PrismaClient: new () => unknown };
    const prisma = new PrismaClient() as import("./prisma-measurement-repository").DuckPrismaClient;
    const { PrismaMeasurementRepository } = require("./prisma-measurement-repository") as {
      PrismaMeasurementRepository: new (p: typeof prisma) => MeasurementRepository;
    };
    _measurementRepo = new PrismaMeasurementRepository(prisma);
  } else {
    const { LocalMeasurementRepository } = require("./local-measurement-repository") as {
      LocalMeasurementRepository: new () => MeasurementRepository;
    };
    _measurementRepo = new LocalMeasurementRepository();
  }

  return _measurementRepo;
}

export function getCalibrationRepository(): CalibrationRepository {
  if (_calibrationRepo) return _calibrationRepo;

  if (process.env.DATABASE_URL) {
    const { PrismaClient } = require("@prisma/client") as { PrismaClient: new () => unknown };
    const prisma = new PrismaClient() as import("./prisma-measurement-repository").DuckPrismaClient;
    const { PrismaCalibrationRepository } = require("./prisma-measurement-repository") as {
      PrismaCalibrationRepository: new (p: typeof prisma) => CalibrationRepository;
    };
    _calibrationRepo = new PrismaCalibrationRepository(prisma);
  } else {
    const { LocalCalibrationRepository } = require("./local-measurement-repository") as {
      LocalCalibrationRepository: new () => CalibrationRepository;
    };
    _calibrationRepo = new LocalCalibrationRepository();
  }

  return _calibrationRepo;
}

export function getMeasurementGroupRepository(): MeasurementGroupRepository {
  if (_groupRepo) return _groupRepo;

  if (process.env.DATABASE_URL) {
    const { PrismaClient } = require("@prisma/client") as { PrismaClient: new () => unknown };
    const prisma = new PrismaClient() as import("./prisma-measurement-repository").DuckPrismaClient;
    const { PrismaGroupRepository } = require("./prisma-measurement-repository") as {
      PrismaGroupRepository: new (p: typeof prisma) => MeasurementGroupRepository;
    };
    _groupRepo = new PrismaGroupRepository(prisma);
  } else {
    const { LocalGroupRepository } = require("./local-measurement-repository") as {
      LocalGroupRepository: new () => MeasurementGroupRepository;
    };
    _groupRepo = new LocalGroupRepository();
  }

  return _groupRepo;
}
