import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ userId: "user-1", orgId: "org-1", name: "Test", email: "test@test.com" }),
}));

vi.mock("@/server/ai/ai-policy-service", () => ({
  isAIEnabled: vi.fn().mockReturnValue(true),
}));

vi.mock("@/server/ai/ai-run-service", () => ({
  createRun: vi.fn(),
  getRunStatus: vi.fn(),
  cancelRun: vi.fn(),
  listRunsForSession: vi.fn(),
}));

vi.mock("@/server/ai/ai-job-runner", () => ({
  runAIAnalysis: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/ai/providers/fake-provider", () => ({
  buildFakeProviders: vi.fn().mockReturnValue({}),
}));

import { isAIEnabled } from "@/server/ai/ai-policy-service";
import { createRun } from "@/server/ai/ai-run-service";
import { POST } from "@/app/api/ai/runs/route";

const mockIsAIEnabled = isAIEnabled as ReturnType<typeof vi.fn>;
const mockCreateRun = createRun as ReturnType<typeof vi.fn>;

const mockRun = {
  id: "run-1",
  sessionId: "session-1",
  orgId: "org-1",
  pageIds: ["page-1"],
  providerName: "fake",
  modelVersion: "1.0",
  status: "queued",
  suggestionsCount: 0,
  tokensUsed: 0,
  estimatedCostUsd: 0.05,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAIEnabled.mockReturnValue(true);
  mockCreateRun.mockResolvedValue(mockRun);
});

describe("POST /api/ai/runs", () => {
  it("returns 403 when AI is disabled", async () => {
    mockIsAIEnabled.mockReturnValue(false);
    const req = new Request("http://localhost/api/ai/runs", {
      method: "POST",
      body: JSON.stringify({ sessionId: "session-1", pageIds: ["page-1"] }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("AI_DISABLED");
  });

  it("returns 422 for invalid input (missing sessionId)", async () => {
    const req = new Request("http://localhost/api/ai/runs", {
      method: "POST",
      body: JSON.stringify({ pageIds: ["page-1"] }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION");
  });

  it("returns 422 for empty pageIds array", async () => {
    const req = new Request("http://localhost/api/ai/runs", {
      method: "POST",
      body: JSON.stringify({ sessionId: "session-1", pageIds: [] }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("creates a run and returns 201 with run id", async () => {
    const req = new Request("http://localhost/api/ai/runs", {
      method: "POST",
      body: JSON.stringify({ sessionId: "session-1", pageIds: ["page-1"] }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json() as { run: { id: string } };
    expect(body.run.id).toBe("run-1");
  });

  it("returns 402 when budget is exceeded", async () => {
    const budgetError = Object.assign(new Error("Budget exceeded"), { code: "BUDGET_EXCEEDED" });
    mockCreateRun.mockRejectedValue(budgetError);

    const req = new Request("http://localhost/api/ai/runs", {
      method: "POST",
      body: JSON.stringify({ sessionId: "session-1", pageIds: ["page-1"] }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(402);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("BUDGET_EXCEEDED");
  });
});
