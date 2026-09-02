import type { MarkupRepository } from "./markup-repository";

let _repo: MarkupRepository | null = null;

export function getMarkupRepository(): MarkupRepository {
  if (_repo) return _repo;

  if (process.env.DATABASE_URL) {
    // Lazy import to avoid pulling Prisma client into edge/client bundles
    const { PrismaMarkupRepository } = require("./prisma-markup-repository") as typeof import("./prisma-markup-repository");
    _repo = new PrismaMarkupRepository();
  } else {
    const { LocalMarkupRepository } = require("./local-markup-repository") as typeof import("./local-markup-repository");
    _repo = new LocalMarkupRepository();
  }

  return _repo;
}

export type { MarkupRepository } from "./markup-repository";
export { ConflictError, NotFoundError } from "./markup-repository";
